require('dotenv').config();

const { sequelize, Institution, User, Credential } = require('../src/models');
const { hashCredentialData } = require('../src/services/hashService');
const { logger } = require('../src/utils/logger');

async function seed() {
  await sequelize.sync({ alter: true });

  const [institution] = await Institution.findOrCreate({
    where: { registrationCode: 'UNI-001' },
    defaults: {
      name: 'Example University',
      contactEmail: 'registrar@example.edu',
      onChainId: 1
    }
  });

  const [admin] = await User.findOrCreate({
    where: { email: 'admin@example.edu' },
    defaults: {
      passwordHash: 'password123',
      fullName: 'University Admin',
      role: 'university_admin',
      institutionId: institution.id,
      emailVerified: true
    }
  });

  await User.findOrCreate({
    where: { email: 'graduate@example.edu' },
    defaults: {
      passwordHash: 'password123',
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

  await Credential.findOrCreate({
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

  logger.info('Seed data created');
  await sequelize.close();
}

seed().catch((error) => {
  logger.error('Seeding failed', { error: error.message });
  process.exit(1);
});
