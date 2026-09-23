const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

const { connectBlockchain } = require('../../src/config/blockchain');
const { bootstrap } = require('../../src/services/bootstrapService');
const db = require('../../src/models');

const ADMIN = { email: 'int-admin@example.edu', password: 'password123' };
const GRADUATE = { email: 'int-graduate@example.edu', password: 'password123' };

async function resetDatabase() {
  await db.sequelize.sync({ force: true });

  const institution = await db.Institution.create({
    name: 'Integration University',
    registrationCode: 'INT-001',
    contactEmail: 'registry@integration.edu',
    isActive: true
  });

  const admin = await db.User.create({
    email: ADMIN.email,
    passwordHash: ADMIN.password,
    fullName: 'Integration Admin',
    role: 'university_admin',
    institutionId: institution.id,
    isActive: true
  });

  const graduate = await db.User.create({
    email: GRADUATE.email,
    passwordHash: GRADUATE.password,
    fullName: 'Integration Graduate',
    role: 'graduate',
    institutionId: institution.id,
    isActive: true
  });

  return { institution, admin, graduate };
}

async function startStack() {
  await connectBlockchain();
  const fixtures = await resetDatabase();
  await bootstrap();
  return fixtures;
}

async function stopStack() {
  await db.sequelize.close();
}

module.exports = { startStack, stopStack, resetDatabase, ADMIN, GRADUATE, db };
