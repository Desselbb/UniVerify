require('dotenv').config();

const app = require('./app');
const { sequelize } = require('./models');
const { connectBlockchain } = require('./config/blockchain');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await sequelize.authenticate();
    logger.info('Database connected');

    // Connect to blockchain
    await connectBlockchain();
    logger.info('Blockchain connected');

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
