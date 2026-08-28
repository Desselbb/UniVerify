const { validationResult } = require('express-validator');
const { ApiError } = require('./errorHandler');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new ApiError(400, 'Validation failed', errors.array()));
    return;
  }
  next();
}

module.exports = { validate };
