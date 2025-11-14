/**
 * MindFit Rate Limiting Configuration
 * File: security-middleware/03-rate-limiting.js
 *
 * PURPOSE: Prevent brute force attacks, credential stuffing, and DoS
 * PRIORITY: P0 - CRITICAL (BLOCKING PRODUCTION)
 * EFFORT: 3 hours
 *
 * INSTALLATION:
 * npm install express-rate-limit
 *
 * USAGE:
 * import { loginLimiter, apiLimiter, strictLimiter } from './security-middleware/03-rate-limiting';
 *
 * // Apply to routes:
 * app.post('/api/admin/login', loginLimiter, loginHandler);
 * app.use('/api/', apiLimiter);
 */

import rateLimit from 'express-rate-limit';

// =============================================================================
// RATE LIMIT STORES
// =============================================================================

/**
 * NOTE: For production with multiple instances, use Redis or PostgreSQL store
 * Current implementation uses in-memory store (acceptable for single instance)
 *
 * For Redis (recommended):
 * npm install rate-limit-redis ioredis
 *
 * import RedisStore from 'rate-limit-redis';
 * import Redis from 'ioredis';
 * const redis = new Redis(process.env.REDIS_URL);
 */

// =============================================================================
// LOGIN RATE LIMITER - Strictest protection
// =============================================================================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: false, // Count successful logins
  skipFailedRequests: false, // Count failed logins

  // Custom key generator - Rate limit by IP + username combination
  keyGenerator: (req) => {
    const username = req.body?.username || 'anonymous';
    return `${req.ip}:${username}`;
  },

  // Custom response handler
  handler: (req, res) => {
    const retryAfter = Math.ceil(req.rateLimit.resetTime / 1000);

    console.warn('[SECURITY] Rate limit exceeded for login attempt', {
      ip: req.ip,
      username: req.body?.username,
      timestamp: new Date().toISOString(),
      attemptsRemaining: 0,
      resetTime: new Date(req.rateLimit.resetTime).toISOString()
    });

    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Please try again later',
      retryAfter: retryAfter,
      resetTime: new Date(req.rateLimit.resetTime).toISOString()
    });
  },

  // Skip rate limiting for health checks
  skip: (req) => {
    return req.ip === '127.0.0.1' && req.path === '/health';
  },

  // Standard headers
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// =============================================================================
// API RATE LIMITER - General API protection
// =============================================================================

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: 'Too many requests from this IP, please slow down',

  handler: (req, res) => {
    console.warn('[SECURITY] API rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please slow down',
      limit: 100,
      window: '1 minute'
    });
  },

  skip: (req) => {
    // Skip rate limiting for:
    // 1. Health checks
    // 2. Static assets
    // 3. Internal requests
    return (
      req.path === '/health' ||
      req.path.startsWith('/static/') ||
      req.path.startsWith('/assets/') ||
      req.ip === '127.0.0.1'
    );
  },

  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// CONTACT FORM LIMITER - Prevent spam submissions
// =============================================================================

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 submissions per hour per IP
  message: 'Too many contact form submissions',

  handler: (req, res) => {
    console.warn('[SECURITY] Contact form rate limit exceeded', {
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      error: 'Too many submissions',
      message: 'Please wait before submitting another message',
      limit: 10,
      window: '1 hour'
    });
  },

  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// NEWSLETTER LIMITER - Prevent subscription abuse
// =============================================================================

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 subscriptions per hour per IP
  message: 'Too many newsletter subscription attempts',

  handler: (req, res) => {
    console.warn('[SECURITY] Newsletter rate limit exceeded', {
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      error: 'Too many subscription attempts',
      message: 'Please try again later',
      limit: 5,
      window: '1 hour'
    });
  },

  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// STRICT LIMITER - For sensitive operations
// =============================================================================

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many attempts for this sensitive operation',

  handler: (req, res) => {
    console.error('[SECURITY] Strict rate limit exceeded - Potential attack', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      userAgent: req.get('user-agent')
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many attempts. Your IP has been temporarily blocked.',
      limit: 3,
      window: '1 hour'
    });
  },

  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// GLOBAL LIMITER - Last resort protection
// =============================================================================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes per IP
  message: 'Too many requests from this IP address',

  handler: (req, res) => {
    console.error('[SECURITY] Global rate limit exceeded - Possible attack', {
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
    });
  },

  skip: (req) => {
    return req.ip === '127.0.0.1';
  },

  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// EXPORTS
// =============================================================================

export {
  loginLimiter,
  apiLimiter,
  contactLimiter,
  newsletterLimiter,
  strictLimiter,
  globalLimiter,
};

/**
 * IMPLEMENTATION EXAMPLE:
 *
 * const {
 *   loginLimiter,
 *   apiLimiter,
 *   contactLimiter,
 *   newsletterLimiter,
 *   globalLimiter
 * } = require('./security-middleware/03-rate-limiting');
 *
 * // Apply global rate limit to all routes (optional)
 * app.use(globalLimiter);
 *
 * // Apply API rate limit to all API routes
 * app.use('/api/', apiLimiter);
 *
 * // Apply specific rate limits to sensitive endpoints
 * app.post('/api/admin/login', loginLimiter, loginHandler);
 * app.post('/api/contact/submit', contactLimiter, contactHandler);
 * app.post('/api/newsletter/subscribe', newsletterLimiter, subscribeHandler);
 *
 * // Apply strict rate limit to password reset
 * app.post('/api/password/reset', strictLimiter, resetHandler);
 */

/**
 * TESTING:
 *
 * 1. Test login rate limiting:
 *    for i in {1..6}; do
 *      curl -X POST https://mindfit.ruha.io/api/admin/login \
 *        -H "Content-Type: application/json" \
 *        -d '{"username":"test","password":"wrong"}'
 *      echo ""
 *    done
 *    # Should see 429 error on 6th attempt
 *
 * 2. Test API rate limiting:
 *    for i in {1..110}; do
 *      curl -s https://mindfit.ruha.io/api/health > /dev/null
 *    done
 *    # Should see 429 error after 100 requests
 *
 * 3. Check rate limit headers:
 *    curl -I https://mindfit.ruha.io/api/some-endpoint
 *    # Look for RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset headers
 */

/**
 * MONITORING:
 *
 * Rate limit events are logged with [SECURITY] prefix.
 * Set up log aggregation to monitor:
 * - grep "Rate limit exceeded" /var/log/app.log
 * - Count by IP: grep "Rate limit exceeded" | grep -oP 'ip: \K[^,]+' | sort | uniq -c
 * - Identify attack patterns
 */

/**
 * PRODUCTION UPGRADE (Optional):
 *
 * For multi-instance deployments, use Redis store:
 *
 * import RedisStore from 'rate-limit-redis';
 * import Redis from 'ioredis';
 *
 * const redis = new Redis({
 *   host: process.env.REDIS_HOST,
 *   port: process.env.REDIS_PORT,
 *   password: process.env.REDIS_PASSWORD,
 * });
 *
 * const loginLimiter = rateLimit({
 *   store: new RedisStore({
 *     client: redis,
 *     prefix: 'rl:login:',
 *   }),
 *   // ... rest of config
 * });
 */
