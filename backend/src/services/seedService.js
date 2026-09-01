const { Institution, User, Credential } = require('../models');
const { hashCredentialData } = require('./hashService');

// Idempotent demo data: an institution, an admin, a graduate and one credential.
async function seedBaseData() {
  const [institution] = await Institution.findOrCreate({
    where: { registrationCode: 'UNI-001' },
    defaults: {
      name: 'Example University',
      contactEmail: 'registrar@example.edu'
    }
  });

  const [admin] = await User.findOrCreate({
    where: { email: 'admin@example.edu' },
    defaults: {
      passwordHash: process.env.SEED_ADMIN_PASSWORD || 'password123',
      fullName: 'University Admin',
      role: 'university_admin',
      institutionId: institution.id,
      emailVerified: true
    }
  });

  await User.findOrCreate({
    where: { email: 'graduate@example.edu' },
    defaults: {
      passwordHash: process.env.SEED_GRADUATE_PASSWORD || 'password123',
      fullName: 'Jane Graduate',
      role: 'graduate',
      institutionId: institution.id,
      emailVerified: true
    }
  });

  const credentialData = {
    studentName: 'Jane Graduate',
    studentId: 'S12345',
    degree: 'BSc Computer Science',
    graduationDate: '2024-06-30',
    institutionId: institution.id
  };

  const [credential] = await Credential.findOrCreate({
    where: { hash: hashCredentialData(credentialData) },
    defaults: {
      ...credentialData,
      hash: hashCredentialData(credentialData),
      program: 'Computer Science',
      honors: 'First Class',
      graduationYear: 2024,
      issuerId: admin.id
    }
  });

  return { institution, admin, credential };
}

module.exports = { seedBaseData };
