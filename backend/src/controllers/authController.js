const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { User } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const audit = require('../services/auditService');
const { logger } = require('../utils/logger');

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, institutionId: user.institutionId },
    process.env.JWT_SECRET,
    { expiresIn: parseInt(process.env.JWT_EXPIRY, 10) || 900 }
  );
}

async function login(req, res, next) {
  try {
    const { email, password, mfaToken } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ApiError(423, 'Account temporarily locked');
    }
    if (!user.isActive) {
      throw new ApiError(403, 'Account is disabled');
    }

    const valid = await user.validatePassword(password);
    if (!valid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      await audit.record('login_failed', { req, userId: user.id, entityType: 'user', entityId: user.id });
      throw new ApiError(401, 'Invalid credentials');
    }

    if (user.mfaEnabled) {
      if (!mfaToken) {
        res.status(200).json({ mfaRequired: true });
        return;
      }
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaToken,
        window: 1
      });
      if (!verified) {
        throw new ApiError(401, 'Invalid MFA token');
      }
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date();
    await user.save();

    await audit.record('login', { req, userId: user.id, entityType: 'user', entityId: user.id });

    res.json({ token: signToken(user), user });
  } catch (error) {
    next(error);
  }
}

async function register(req, res, next) {
  try {
    const { email, password, fullName, role, institutionId } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new ApiError(409, 'Email already registered');
    }

    const user = await User.create({
      email,
      passwordHash: password,
      fullName,
      role,
      institutionId: institutionId ?? null,
      emailVerificationToken: crypto.randomBytes(32).toString('hex')
    });

    await audit.record('register', { req, userId: user.id, entityType: 'user', entityId: user.id });

    res.status(201).json({ token: signToken(user), user });
  } catch (error) {
    next(error);
  }
}

async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      // Delivery is handled by the mailer in production; the token is logged in development.
      logger.info('Password reset requested', { userId: user.id, token: process.env.NODE_ENV === 'production' ? undefined : token });
      await audit.record('password_reset_requested', { req, userId: user.id, entityType: 'user', entityId: user.id });
    }

    // Always 202 so the endpoint cannot be used to enumerate accounts.
    res.status(202).json({ message: 'If the account exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ where: { passwordResetToken: hashedToken } });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    user.passwordHash = req.body.password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    await audit.record('password_reset', { req, userId: user.id, entityType: 'user', entityId: user.id });

    res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await audit.record('logout', { req, entityType: 'user', entityId: req.user.id });
    res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}

async function refreshToken(req, res, next) {
  try {
    res.json({ token: signToken(req.user) });
  } catch (error) {
    next(error);
  }
}

async function setupMFA(req, res, next) {
  try {
    const secret = speakeasy.generateSecret({ name: `Uni-Verify (${req.user.email})` });
    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));

    req.user.mfaSecret = secret.base32;
    req.user.mfaBackupCodes = backupCodes;
    await req.user.save();

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({ secret: secret.base32, otpauthUrl: secret.otpauth_url, qrCodeDataUrl, backupCodes });
  } catch (error) {
    next(error);
  }
}

async function verifyMFA(req, res, next) {
  try {
    const { token } = req.body;
    if (!req.user.mfaSecret) {
      throw new ApiError(400, 'MFA has not been set up');
    }

    const verified = speakeasy.totp.verify({
      secret: req.user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) {
      throw new ApiError(401, 'Invalid MFA token');
    }

    req.user.mfaEnabled = true;
    await req.user.save();
    await audit.record('mfa_enabled', { req, entityType: 'user', entityId: req.user.id });

    res.json({ message: 'MFA enabled' });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res) {
  res.json({ user: req.user });
}

async function updateProfile(req, res, next) {
  try {
    const { fullName, email } = req.body;
    if (fullName) req.user.fullName = fullName;
    if (email) req.user.email = email;
    await req.user.save();

    await audit.record('profile_updated', { req, entityType: 'user', entityId: req.user.id });

    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  register,
  requestPasswordReset,
  resetPassword,
  logout,
  refreshToken,
  setupMFA,
  verifyMFA,
  getMe,
  updateProfile
};
