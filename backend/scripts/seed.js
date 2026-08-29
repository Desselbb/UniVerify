require('dotenv').config();

const { sequelize, Institution, User, Credential } = require('../src/models');
const { hashCredentialData } = require('../src/services/hashService');
const { connectBlockchain } = require('../src/config/blockchain');
const blockchain = require('../src/services/blockchainService');
const { logger } = require('../src/utils/logger');

async function anchor(institution, credential) {
  await connectBlockchain();

  if (!institution.onChainId) {
    const onChainId = await blockchain.registerInstitution({
      name: institution.name,
      registrationCode: institution.registrationCode
    });
    await institution.update({ onChainId });
  }

  if (credential.blockchainTxHash) {
    return;
  }

  const { txHash, blockNumber } = await blockchain.issueCredential({
    hash: credential.hash,
    institutionId: institution.onChainId
  });

  await credential.update({ blockchainTxHash: txHash, blockNumber, blockTimestamp: new Date() });
}

async function seed() {
  await sequelize.sync({ alter: true });

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

  try {
    await anchor(institution, credential);
  } catch (error) {
    logger.warn('Could not anchor seed credential on chain', { error: error.message });
  }

  logger.info('Seed data created');
  await sequelize.close();
}

seed().catch((error) => {
  logger.error('Seeding failed', { error: error.message });
  process.exit(1);
});
