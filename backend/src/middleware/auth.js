const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ApiError } = require('./errorHandler');

async function authenticate(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Missing or malformed Authorization header');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.sub);

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User is not active');
    }

    req.user = user;
    req.token = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Invalid or expired token'));
      return;
    }
    next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }
    if (roles.length && !roles.includes(req.user.role)) {
      next(new ApiError(403, 'Insufficient permissions'));
      return;
    }
    next();
  };
}

module.exports = { authenticate, authorize };
