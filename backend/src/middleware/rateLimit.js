const expressRateLimit = require('express-rate-limit');

const limiters = new Map();

/**
 * Returns a named rate limiter, creating it on first use so that a single
 * limiter instance (and therefore a single counter store) is shared by all
 * routes using the same name.
 */
function rateLimit(name, { max = 100, windowMs = 3600000 } = {}) {
  if (!limiters.has(name)) {
    limiters.set(name, expressRateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.' }
    }));
  }
  return limiters.get(name);
}

module.exports = { rateLimit };
