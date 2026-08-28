const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { rateLimit } = require('../middleware/rateLimit');

// Public routes
router.post('/login',
  rateLimit('auth', { max: 10, windowMs: 300000 }),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 })
  ],
  validate,
  authController.login
);

router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('fullName').notEmpty(),
    body('role').isIn(['graduate', 'university_admin'])
  ],
  validate,
  authController.register
);

router.post('/password/reset',
  [body('email').isEmail().normalizeEmail()],
  validate,
  authController.requestPasswordReset
);

router.post('/password/reset/:token',
  [
    body('password').isLength({ min: 8 }),
    body('confirmPassword').custom((value, { req }) => value === req.body.password)
  ],
  validate,
  authController.resetPassword
);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', authenticate, authController.refreshToken);
router.post('/mfa/setup', authenticate, authController.setupMFA);
router.post('/mfa/verify', authenticate, [body('token').notEmpty()], validate, authController.verifyMFA);
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateProfile);

module.exports = router;
