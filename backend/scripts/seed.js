require('dotenv').config();

const { sequelize } = require('../src/models');
const { connectBlockchain } = require('../src/config/blockchain');
const { seedBaseData } = require('../src/services/seedService');
const { bootstrap } = require('../src/services/bootstrapService');
const { logger } = require('../src/utils/logger');

async function seed() {
  await sequelize.sync({ alter: true });
  await seedBaseData();

  try {
    await connectBlockchain();
    await bootstrap();
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
