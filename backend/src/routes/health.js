const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { getWeb3 } = require('../config/blockchain');

router.get('/', async (req, res) => {
  const checks = { database: 'down', blockchain: 'down' };

  try {
    await sequelize.authenticate();
    checks.database = 'up';
  } catch (error) {
    checks.database = 'down';
  }

  try {
    await getWeb3().eth.getBlockNumber();
    checks.blockchain = 'up';
  } catch (error) {
    checks.blockchain = 'down';
  }

  const healthy = Object.values(checks).every(status => status === 'up');
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', checks, uptime: process.uptime() });
});

module.exports = router;
