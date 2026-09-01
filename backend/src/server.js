require('dotenv').config();

const app = require('./app');
const { sequelize } = require('./models');
const { connectBlockchain } = require('./config/blockchain');
const { bootstrap } = require('./services/bootstrapService');
const { seedBaseData } = require('./services/seedService');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const AUTO_BOOTSTRAP = process.env.AUTO_BOOTSTRAP === 'true';

// Hosted deployments run the chain and database on ephemeral storage, so the schema,
// demo data and on-chain records are reconciled on every boot.
async function runBootstrap() {
  await sequelize.sync({ alter: true });
  await seedBaseData();
  await bootstrap();
}

async function startServer() {
  try {
    // Connect to database
    await sequelize.authenticate();
    logger.info('Database connected');

    // Connect to blockchain
    await connectBlockchain();
    logger.info('Blockchain connected');

    if (AUTO_BOOTSTRAP) {
      await runBootstrap();
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
