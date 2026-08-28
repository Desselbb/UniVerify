require('dotenv').config();

const { sequelize } = require('../src/models');
const { logger } = require('../src/utils/logger');

async function migrate() {
  const alter = process.env.NODE_ENV !== 'production';
  await sequelize.sync({ alter });
  logger.info(`Schema synchronised (alter=${alter})`);
  await sequelize.close();
}

migrate().catch((error) => {
  logger.error('Migration failed', { error: error.message });
  process.exit(1);
});
