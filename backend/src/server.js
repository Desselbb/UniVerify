require('dotenv').config();

const app = require('./app');
const { sequelize } = require('./models');
const { connectBlockchain } = require('./config/blockchain');
const { bootstrap, needsBootstrap } = require('./services/bootstrapService');
const { seedBaseData } = require('./services/seedService');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const AUTO_BOOTSTRAP = process.env.AUTO_BOOTSTRAP === 'true';
const RECONCILE_INTERVAL = parseInt(process.env.CHAIN_RECONCILE_INTERVAL, 10) || 60000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries(label, fn, attempts = 10) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      logger.warn(`${label} failed (attempt ${attempt}/${attempts}): ${error.message}`);
      if (attempt === attempts) {
        throw error;
      }
      await delay(Math.min(30000, 2000 * attempt));
    }
  }
}

// Hosted deployments run the chain and database on ephemeral storage, so the schema,
// demo data and on-chain records are reconciled on every boot.
async function runBootstrap() {
  await sequelize.sync({ alter: true });
  await seedBaseData();
  await bootstrap();
}

// Free hosting tiers stop idle instances, which wipes the chain while the API keeps
// running, so the registry is redeployed and refilled whenever it disappears.
function scheduleReconcile() {
  setInterval(async () => {
    try {
      if (await needsBootstrap()) {
        logger.warn('Registry missing on chain; re-running bootstrap');
        await bootstrap();
      }
    } catch (error) {
      logger.warn(`Chain reconcile failed: ${error.message}`);
    }
  }, RECONCILE_INTERVAL).unref();
}

async function startServer() {
  try {
    await withRetries('Database connection', () => sequelize.authenticate());
    logger.info('Database connected');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  try {
    await withRetries('Blockchain connection', () => connectBlockchain());
    logger.info('Blockchain connected');

    if (AUTO_BOOTSTRAP) {
      await withRetries('Bootstrap', runBootstrap, 5);
      scheduleReconcile();
    }
  } catch (error) {
    logger.error(`Blockchain bootstrap failed, API running without chain: ${error.message}`);
    if (AUTO_BOOTSTRAP) {
      scheduleReconcile();
    }
  }
}

startServer();
