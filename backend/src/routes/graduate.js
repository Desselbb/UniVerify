const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const graduateController = require('../controllers/graduateController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate, authorize('graduate', 'system_admin'));

router.get('/credentials', graduateController.listMyCredentials);

router.get('/credentials/:hash/share',
  [param('hash').matches(/^0x[a-fA-F0-9]{64}$/)],
  validate,
  graduateController.getShareLink
);

module.exports = router;
