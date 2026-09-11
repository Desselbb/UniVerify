jest.mock('../src/models', () => ({
  User: { findOne: jest.fn(), create: jest.fn(), findAll: jest.fn() },
  Institution: { findByPk: jest.fn(), create: jest.fn(), findAll: jest.fn() },
  Credential: {},
  AuditLog: {}
}));
jest.mock('../src/services/auditService', () => ({ record: jest.fn() }));
jest.mock('../src/services/blockchainService', () => ({
  registerInstitution: jest.fn(),
  issueCredential: jest.fn(),
  revokeCredential: jest.fn()
}));

const { User, Institution } = require('../src/models');
const adminController = require('../src/controllers/adminController');

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

async function createUser(actor, body) {
  const req = { user: actor, body, ip: '127.0.0.1', get: () => 'jest' };
  const res = makeRes();
  const next = jest.fn();
  await adminController.createUser(req, res, next);
  return { res, next };
}

describe('admin user creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (attrs) => ({ id: 2, ...attrs }));
    Institution.findByPk.mockResolvedValue({ id: 5, isActive: true });
  });

  test('a university admin can create staff for their own institution', async () => {
    const { res } = await createUser(
      { id: 1, role: 'university_admin', institutionId: 5 },
      { email: 'staff@example.edu', password: 'password123', fullName: 'Staff', role: 'university_admin' }
    );

    expect(res.statusCode).toBe(201);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ institutionId: 5 }));
  });

  test('a university admin cannot create users in another institution', async () => {
    await createUser(
      { id: 1, role: 'university_admin', institutionId: 5 },
      {
        email: 'staff@example.edu',
        password: 'password123',
        fullName: 'Staff',
        role: 'university_admin',
        institutionId: 99
      }
    );

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ institutionId: 5 }));
  });

  test('a university admin cannot create a system admin', async () => {
    const { next } = await createUser(
      { id: 1, role: 'university_admin', institutionId: 5 },
      { email: 'root@example.edu', password: 'password123', fullName: 'Root', role: 'system_admin' }
    );

    expect(User.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  test('a system admin can target any institution', async () => {
    await createUser(
      { id: 1, role: 'system_admin', institutionId: null },
      {
        email: 'staff@example.edu',
        password: 'password123',
        fullName: 'Staff',
        role: 'university_admin',
        institutionId: 5
      }
    );

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ institutionId: 5 }));
  });

  test('duplicate emails are rejected', async () => {
    User.findOne.mockResolvedValue({ id: 9 });

    const { next } = await createUser(
      { id: 1, role: 'system_admin', institutionId: null },
      {
        email: 'staff@example.edu',
        password: 'password123',
        fullName: 'Staff',
        role: 'university_admin',
        institutionId: 5
      }
    );

    expect(User.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
  });
});
