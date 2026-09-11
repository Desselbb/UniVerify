jest.mock('../src/models', () => ({
  User: { findOne: jest.fn(), create: jest.fn() },
  Institution: { findByPk: jest.fn() }
}));
jest.mock('../src/services/auditService', () => ({ record: jest.fn() }));

const { User, Institution } = require('../src/models');
const authController = require('../src/controllers/authController');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

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

async function register(body) {
  const req = { body, ip: '127.0.0.1', get: () => 'jest' };
  const res = makeRes();
  const next = jest.fn();
  await authController.register(req, res, next);
  return { res, next };
}

describe('public registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (attrs) => ({ id: 1, uuid: 'u', ...attrs }));
    Institution.findByPk.mockResolvedValue({ id: 5, isActive: true });
  });

  test('ignores a requested privileged role and creates a graduate', async () => {
    const { res, next } = await register({
      email: 'attacker@example.com',
      password: 'password123',
      fullName: 'Attacker',
      role: 'university_admin'
    });

    expect(next).not.toHaveBeenCalled();
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'graduate' }));
    expect(res.body.user.role).toBe('graduate');
  });

  test('ignores a requested system_admin role', async () => {
    await register({
      email: 'attacker@example.com',
      password: 'password123',
      fullName: 'Attacker',
      role: 'system_admin'
    });

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'graduate' }));
  });

  test('rejects an unknown institution affiliation', async () => {
    Institution.findByPk.mockResolvedValue(null);

    const { next } = await register({
      email: 'grad@example.com',
      password: 'password123',
      fullName: 'Grad',
      institutionId: 404
    });

    expect(User.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('rejects an inactive institution affiliation', async () => {
    Institution.findByPk.mockResolvedValue({ id: 5, isActive: false });

    const { next } = await register({
      email: 'grad@example.com',
      password: 'password123',
      fullName: 'Grad',
      institutionId: 5
    });

    expect(User.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('keeps a valid institution affiliation without granting privileges', async () => {
    await register({
      email: 'grad@example.com',
      password: 'password123',
      fullName: 'Grad',
      institutionId: 5
    });

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'graduate', institutionId: 5 })
    );
  });
});
