const rateLimit = require('express-rate-limit');

/**
 * Standard JSON rate limit handler
 */
const rateLimitHandler = (req, res) => {
  return res.status(429).json({
    success: false,
    message: 'Too many requests from this IP. Please try again later',
    retry_after: res.getHeader('Retry-After') || 60,
  });
};

// Auth endpoints rate limiter (login / register)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 500, // 500 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => process.env.DISABLE_RATE_LIMIT === 'true',
});

// Bulk operations rate limiter
const bulkLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_BULK_WINDOW_MS, 10) || 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_BULK_MAX, 10) || 100, // 100 bulk requests per min
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => process.env.DISABLE_RATE_LIMIT === 'true',
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_API_MAX, 10) || 2000, // 2000 requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => process.env.DISABLE_RATE_LIMIT === 'true',
});

module.exports = {
  authLimiter,
  bulkLimiter,
  apiLimiter,
};
