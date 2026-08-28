const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate, authorize('system_admin', 'university_admin'));

router.get('/institutions', adminController.listInstitutions);

router.post('/institutions',
  authorize('system_admin'),
  [
    body('name').notEmpty(),
    body('registrationCode').notEmpty(),
    body('contactEmail').optional().isEmail()
  ],
  validate,
  adminController.createInstitution
);

router.get('/credentials', adminController.listCredentials);

router.post('/credentials',
  [
    body('studentName').notEmpty(),
    body('studentId').notEmpty(),
    body('degree').notEmpty(),
    body('graduationDate').isISO8601()
  ],
  validate,
  adminController.issueCredential
);

router.post('/credentials/:hash/revoke',
  [
    param('hash').matches(/^0x[a-fA-F0-9]{64}$/),
    body('reason').notEmpty()
  ],
  validate,
  adminController.revokeCredential
);

router.get('/users', adminController.listUsers);
router.get('/audit-logs', adminController.listAuditLogs);

module.exports = router;
