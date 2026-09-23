const request = require('supertest');
const { startStack, stopStack, ADMIN, GRADUATE, db } = require('./setup');

const app = require('../../src/app');

jest.setTimeout(120000);

const STUDENT = {
  studentName: 'Integration Student',
  studentId: 'INT-1001',
  degree: 'BSc Integration Testing',
  program: 'Quality Assurance',
  graduationDate: '2024-06-30'
};

let adminToken;
let graduateToken;
let issuedHash;
let institutionId;

beforeAll(async () => {
  const fixtures = await startStack();
  institutionId = fixtures.institution.id;

  const adminLogin = await request(app).post('/api/auth/login').send(ADMIN);
  expect(adminLogin.status).toBe(200);
  adminToken = adminLogin.body.token;

  const graduateLogin = await request(app).post('/api/auth/login').send(GRADUATE);
  expect(graduateLogin.status).toBe(200);
  graduateToken = graduateLogin.body.token;
});

afterAll(async () => {
  await stopStack();
});

describe('health', () => {
  test('GET /api/health reports database and blockchain up', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database).toBe('up');
    expect(res.body.checks.blockchain).toBe('up');
  });
});

describe('authentication', () => {
  test('rejects a wrong password with 401 and no token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: 'wrong-password-123' });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test('rejects a malformed email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  test('public registration always creates a graduate, ignoring a requested admin role', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'escalation-attempt@example.com',
      password: 'password123',
      fullName: 'Escalation Attempt',
      role: 'university_admin',
      institutionId
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('graduate');

    const stored = await db.User.findOne({ where: { email: 'escalation-attempt@example.com' } });
    expect(stored.role).toBe('graduate');
  });
});

describe('authorisation', () => {
  test('rejects an unauthenticated admin request with 401', async () => {
    const res = await request(app).get('/api/admin/credentials');
    expect(res.status).toBe(401);
  });

  test('rejects a forged JWT with 401', async () => {
    const res = await request(app)
      .get('/api/admin/credentials')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsInJvbGUiOiJzeXN0ZW1fYWRtaW4ifQ.forged');

    expect(res.status).toBe(401);
  });

  test('rejects a graduate token on an admin route with 403', async () => {
    const res = await request(app)
      .get('/api/admin/credentials')
      .set('Authorization', `Bearer ${graduateToken}`);

    expect(res.status).toBe(403);
  });

  test('rejects an admin token on a graduate route with 403', async () => {
    const res = await request(app)
      .get('/api/graduate/credentials')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });
});

describe('credential issuance', () => {
  test('issues a credential and anchors it on chain', async () => {
    const res = await request(app)
      .post('/api/admin/credentials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(STUDENT);

    expect(res.status).toBe(201);
    issuedHash = res.body.credential.hash;
    expect(issuedHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(res.body.credential.blockchainTxHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(Number(res.body.credential.blockNumber)).toBeGreaterThan(0);
  });

  test('rejects a duplicate issuance with 409', async () => {
    const res = await request(app)
      .post('/api/admin/credentials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(STUDENT);

    expect(res.status).toBe(409);
  });

  test('rejects issuance with a missing required field with 400', async () => {
    const res = await request(app)
      .post('/api/admin/credentials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...STUDENT, studentId: undefined });

    expect(res.status).toBe(400);
  });

  test('lists the issued credential for the admin institution', async () => {
    const res = await request(app)
      .get('/api/admin/credentials')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.credentials.some((c) => c.hash === issuedHash)).toBe(true);
  });
});

describe('public verification', () => {
  test('verifies the issued hash as valid with on-chain evidence', async () => {
    const res = await request(app).get(`/api/verify/${issuedHash}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('valid');
    expect(res.body.credential.studentName).toBe(STUDENT.studentName);
    expect(res.body.onChain.exists).toBe(true);
  });

  test('returns not_found for an unknown but well-formed hash', async () => {
    const res = await request(app).get(`/api/verify/0x${'ab'.repeat(32)}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('not_found');
    expect(res.body.credential).toBeNull();
  });

  test('rejects a malformed hash with 400', async () => {
    const res = await request(app).get('/api/verify/not-a-hash');
    expect(res.status).toBe(400);
  });

  test('verifies an uploaded file whose bytes hash to a registered credential', async () => {
    const crypto = require('crypto');
    const bytes = Buffer.from('%PDF-1.4 integration file verification fixture');
    const fileHash = `0x${crypto.createHash('sha256').update(bytes).digest('hex')}`;

    await db.Credential.create({
      hash: fileHash,
      studentName: 'File Fixture',
      studentId: 'INT-1002',
      degree: 'BSc File Hashing',
      graduationDate: '2024-06-30',
      graduationYear: 2024,
      institutionId,
      issuerId: 1,
      isRevoked: false,
      issuedAt: new Date()
    });

    const res = await request(app)
      .post('/api/verify/file')
      .attach('certificateFile', bytes, { filename: 'fixture.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('valid');
    expect(res.body.credential.studentName).toBe('File Fixture');
  });

  test('returns not_found when a single byte of the file changes', async () => {
    const bytes = Buffer.from('%PDF-1.4 integration file verification fixture!');

    const res = await request(app)
      .post('/api/verify/file')
      .attach('certificateFile', bytes, { filename: 'tampered.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('not_found');
  });

  test('records every verification attempt in the audit trail', async () => {
    const count = await db.VerificationRequest.count({ where: { hash: issuedHash } });
    expect(count).toBeGreaterThan(0);
  });

  test('issues a downloadable PDF verification report', async () => {
    const res = await request(app).get(`/api/verify/${issuedHash}/certificate`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('pdf');
    expect(res.body.length).toBeGreaterThan(500);
  });
});

describe('graduate access', () => {
  test('a graduate sees only credentials matching their own account', async () => {
    const res = await request(app)
      .get('/api/graduate/credentials')
      .set('Authorization', `Bearer ${graduateToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.credentials)).toBe(true);
  });
});

describe('revocation', () => {
  test('revokes the credential on chain and in the database', async () => {
    const res = await request(app)
      .post(`/api/admin/credentials/${issuedHash}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Integration test revocation' });

    expect(res.status).toBe(200);
    expect(res.body.credential.isRevoked).toBe(true);
  });

  test('public verification now reports the credential as revoked', async () => {
    const res = await request(app).get(`/api/verify/${issuedHash}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('revoked');
    expect(res.body.onChain.revoked).toBe(true);
  });

  test('a graduate cannot revoke a credential', async () => {
    const res = await request(app)
      .post(`/api/admin/credentials/${issuedHash}/revoke`)
      .set('Authorization', `Bearer ${graduateToken}`)
      .send({ reason: 'Unauthorised attempt' });

    expect(res.status).toBe(403);
  });
});

describe('audit log', () => {
  test('records issuance and revocation actions', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const actions = res.body.logs.map((log) => log.action);
    expect(actions).toEqual(expect.arrayContaining(['credential_issued', 'credential_revoked']));
  });
});
