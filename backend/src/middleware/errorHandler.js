const { logger } = require('../utils/logger');

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.name === 'SequelizeValidationError' ? 400 : 500);

  if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack, url: req.originalUrl });
  } else {
    logger.warn(err.message, { url: req.originalUrl });
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error' : err.message,
    ...(err.details ? { details: err.details } : {})
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' });
}

module.exports = { errorHandler, notFoundHandler, ApiError };
