const jwt = require('jsonwebtoken');
const request = require('supertest');
const { startStack, stopStack, ADMIN, GRADUATE, db } = require('./setup');

const app = require('../../src/app');

jest.setTimeout(120000);

let adminToken;
let graduateToken;
let institutionId;

beforeAll(async () => {
  const fixtures = await startStack();
  institutionId = fixtures.institution.id;

  adminToken = (await request(app).post('/api/auth/login').send(ADMIN)).body.token;
  graduateToken = (await request(app).post('/api/auth/login').send(GRADUATE)).body.token;
});

afterAll(async () => {
  await stopStack();
});

describe('injection resistance', () => {
  test("SQL metacharacters in the verify path are rejected before reaching the database", async () => {
    const res = await request(app).get("/api/verify/0x' OR 1=1--");

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/select|syntax|postgres/i);
  });

  test('a SQL injection payload in the login email does not authenticate', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: "admin@example.edu' OR '1'='1", password: "' OR '1'='1" });

    expect([400, 401]).toContain(res.status);
    expect(res.body.token).toBeUndefined();
  });

  test('a script payload stored in a credential is returned as inert data, not markup', async () => {
    const payload = '<script>alert(1)</script>';
    const issue = await request(app)
      .post('/api/admin/credentials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentName: payload,
        studentId: 'SEC-XSS-1',
        degree: 'BSc Security',
        graduationDate: '2024-06-30'
      });

    expect(issue.status).toBe(201);

    const verify = await request(app).get(`/api/verify/${issue.body.credential.hash}`);
    expect(verify.headers['content-type']).toContain('application/json');
    expect(verify.body.credential.studentName).toBe(payload);
  });
});

describe('token handling', () => {
  test('a token whose role claim was edited fails signature verification', async () => {
    const [header, payload] = graduateToken.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    decoded.role = 'system_admin';
    const forged = `${header}.${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${graduateToken.split('.')[2]}`;

    const res = await request(app)
      .get('/api/admin/credentials')
      .set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
  });

  test('an unsigned (alg=none) token is rejected', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 1, role: 'system_admin' })).toString('base64url');

    const res = await request(app)
      .get('/api/admin/credentials')
      .set('Authorization', `Bearer ${header}.${payload}.`);

    expect(res.status).toBe(401);
  });

  test('a token signed with the wrong secret is rejected', async () => {
    const token = jwt.sign({ sub: 1, role: 'system_admin' }, 'not-the-real-secret', { expiresIn: '15m' });

    const res = await request(app)
      .get('/api/admin/credentials')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  test('an expired token is rejected', async () => {
    const token = jwt.sign(
      { sub: 1, role: 'university_admin', institutionId },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await request(app)
      .get('/api/admin/credentials')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});

describe('tenant isolation', () => {
  test('an admin cannot revoke a credential belonging to another institution', async () => {
    const other = await db.Institution.create({
      name: 'Rival University',
      registrationCode: 'SEC-RIVAL',
      isActive: true
    });

    const foreign = await db.Credential.create({
      hash: `0x${'cd'.repeat(32)}`,
      studentName: 'Foreign Student',
      studentId: 'SEC-2001',
      degree: 'BSc Elsewhere',
      graduationDate: '2024-06-30',
      graduationYear: 2024,
      institutionId: other.id,
      issuerId: 1,
      isRevoked: false,
      issuedAt: new Date()
    });

    const res = await request(app)
      .post(`/api/admin/credentials/${foreign.hash}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Cross-tenant attempt' });

    expect(res.status).toBe(403);

    await foreign.reload();
    expect(foreign.isRevoked).toBe(false);
  });

  test("an admin cannot create staff for another institution", async () => {
    const other = await db.Institution.findOne({ where: { registrationCode: 'SEC-RIVAL' } });

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'planted-staff@example.com',
        password: 'password123',
        fullName: 'Planted Staff',
        role: 'university_admin',
        institutionId: other.id
      });

    expect(res.status).toBe(201);
    expect(res.body.user.institutionId).toBe(institutionId);
  });

  test('an admin cannot create a system administrator', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'planted-root@example.com',
        password: 'password123',
        fullName: 'Planted Root',
        role: 'system_admin'
      });

    expect(res.status).toBe(403);
    expect(await db.User.findOne({ where: { email: 'planted-root@example.com' } })).toBeNull();
  });
});

describe('data exposure', () => {
  test('authentication responses never include the password hash', async () => {
    const res = await request(app).post('/api/auth/login').send(ADMIN);

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  test('a password reset request does not disclose whether the account exists', async () => {
    const known = await request(app).post('/api/auth/password/reset').send({ email: ADMIN.email });
    const unknown = await request(app).post('/api/auth/password/reset').send({ email: 'nobody@example.com' });

    expect(known.status).toBe(unknown.status);
    expect(JSON.stringify(known.body)).not.toMatch(/token/i);
  });

  test('admin user listings never include password hashes', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe('upload hardening', () => {
  test('a non-whitelisted file type is refused', async () => {
    const res = await request(app)
      .post('/api/verify/file')
      .attach('certificateFile', Buffer.from('MZ binary'), {
        filename: 'payload.exe',
        contentType: 'application/x-msdownload'
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('a file above the configured size limit is refused', async () => {
    const res = await request(app)
      .post('/api/verify/file')
      .attach('certificateFile', Buffer.alloc(11 * 1024 * 1024, 0x41), {
        filename: 'huge.pdf',
        contentType: 'application/pdf'
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('transport and headers', () => {
  test('helmet security headers are present on API responses', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('brute-force resistance', () => {
  test('repeated failed logins are rate limited with 429', async () => {
    const statuses = [];
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bruteforce@example.edu', password: `wrong-password-${attempt}` });
      statuses.push(res.status);
    }

    expect(statuses).toContain(429);
  });
});
