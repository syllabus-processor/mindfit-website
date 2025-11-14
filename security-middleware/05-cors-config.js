/**
 * MindFit CORS Configuration
 * File: security-middleware/05-cors-config.js
 *
 * PURPOSE: Prevent CSRF attacks and unauthorized cross-origin access
 * PRIORITY: P1 - HIGH
 * EFFORT: 1 hour
 *
 * INSTALLATION:
 * npm install cors
 *
 * USAGE:
 * import corsConfig from './security-middleware/05-cors-config';
 * app.use(corsConfig);
 */

import cors from 'cors';

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

/**
 * Allowed origins for CORS requests
 * Add more origins as needed (e.g., staging, mobile app)
 */
const ALLOWED_ORIGINS = [
  'https://mindfit.ruha.io',
  'https://www.mindfit.ruha.io',
  // Add staging/dev origins if needed:
  // 'https://staging.mindfit.ruha.io',
  // 'http://localhost:3000', // Local development only
];

/**
 * Development mode - allow localhost
 */
if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push(
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
  );
}

/**
 * CORS Options
 */
const corsOptions = {
  // Origin validation function
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('[SECURITY] CORS blocked request from unauthorized origin', {
        origin,
        timestamp: new Date().toISOString()
      });
      callback(new Error('Not allowed by CORS'));
    }
  },

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Allowed request headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],

  // Exposed response headers (visible to client JavaScript)
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'X-Request-Id'
  ],

  // Preflight request cache duration (seconds)
  maxAge: 86400, // 24 hours

  // Success status for OPTIONS requests
  optionsSuccessStatus: 204,

  // Fail OPTIONS requests if CORS check fails
  preflightContinue: false,
};

// =============================================================================
// CORS MIDDLEWARE
// =============================================================================

const corsMiddleware = cors(corsOptions);

// =============================================================================
// ADDITIONAL CORS SECURITY
// =============================================================================

/**
 * Additional CORS-related security headers
 * Apply after CORS middleware
 */
function additionalCORSHeaders(req, res, next) {
  // Prevent embedding in iframes (extra layer beyond X-Frame-Options)
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  next();
}

// =============================================================================
// EXPORTS
// =============================================================================

export default [corsMiddleware, additionalCORSHeaders];
export { corsMiddleware, additionalCORSHeaders, ALLOWED_ORIGINS };

/**
 * IMPLEMENTATION EXAMPLE:
 *
 * import corsConfig from './security-middleware/05-cors-config';
 *
 * // Apply CORS to all routes
 * app.use(corsConfig);
 *
 * // OR apply selectively:
 * import { corsMiddleware } from './security-middleware/05-cors-config';
 * app.use('/api/', corsMiddleware);
 */

/**
 * ROUTE-SPECIFIC CORS:
 *
 * For public API endpoints that need different CORS settings:
 *
 * import cors from 'cors';
 *
 * // Public endpoint - allow all origins
 * app.get('/api/public/status', cors(), statusHandler);
 *
 * // Admin endpoint - use strict CORS
 * import corsConfig from './security-middleware/05-cors-config';
 * app.post('/api/admin/login', corsConfig, loginHandler);
 */

/**
 * TESTING:
 *
 * 1. Test allowed origin:
 *    curl -H "Origin: https://mindfit.ruha.io" \
 *      -H "Access-Control-Request-Method: POST" \
 *      -X OPTIONS https://mindfit.ruha.io/api/contact/submit \
 *      -v
 *    # Should return 204 with Access-Control-Allow-Origin header
 *
 * 2. Test blocked origin:
 *    curl -H "Origin: https://evil.com" \
 *      -H "Access-Control-Request-Method: POST" \
 *      -X OPTIONS https://mindfit.ruha.io/api/contact/submit \
 *      -v
 *    # Should be blocked or return error
 *
 * 3. Test actual request:
 *    curl -H "Origin: https://mindfit.ruha.io" \
 *      -X POST https://mindfit.ruha.io/api/contact/submit \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Test","email":"test@example.com","preferredContact":"email","message":"test"}' \
 *      -v
 *    # Should succeed with CORS headers
 */

/**
 * BROWSER TESTING:
 *
 * 1. Open browser console on https://mindfit.ruha.io
 * 2. Try fetch request:
 *    fetch('/api/contact/submit', {
 *      method: 'POST',
 *      headers: { 'Content-Type': 'application/json' },
 *      body: JSON.stringify({
 *        name: 'Test',
 *        email: 'test@example.com',
 *        preferredContact: 'email',
 *        message: 'test'
 *      })
 *    }).then(r => r.json()).then(console.log);
 *    # Should succeed
 *
 * 3. Try from different origin (e.g., jsfiddle.net):
 *    fetch('https://mindfit.ruha.io/api/contact/submit', {
 *      method: 'POST',
 *      headers: { 'Content-Type': 'application/json' },
 *      body: JSON.stringify({
 *        name: 'Test',
 *        email: 'test@example.com',
 *        preferredContact': 'email',
 *        message: 'test'
 *      })
 *    });
 *    # Should be blocked by CORS
 */

/**
 * CSRF PROTECTION:
 *
 * CORS provides CSRF protection for:
 * - Cross-origin AJAX requests
 * - Fetch API calls
 * - XMLHttpRequest
 *
 * CORS does NOT protect against:
 * - Simple form submissions (traditional POST forms)
 * - Image requests
 * - Script includes
 *
 * For additional CSRF protection, consider:
 * npm install csurf
 *
 * import csrf from 'csurf';
 * const csrfProtection = csrf({ cookie: true });
 * app.use(csrfProtection);
 */

/**
 * TROUBLESHOOTING:
 *
 * Common CORS errors and solutions:
 *
 * 1. "No 'Access-Control-Allow-Origin' header is present"
 *    - Ensure origin is in ALLOWED_ORIGINS list
 *    - Check that CORS middleware is applied before route handlers
 *
 * 2. "CORS policy: credentials mode is 'include'"
 *    - Ensure credentials: true in CORS config
 *    - Cannot use Access-Control-Allow-Origin: * with credentials
 *
 * 3. "Method XYZ is not allowed by Access-Control-Allow-Methods"
 *    - Add method to methods array in CORS config
 *
 * 4. "Header ABC is not allowed by Access-Control-Allow-Headers"
 *    - Add header to allowedHeaders array in CORS config
 */

/**
 * SECURITY NOTES:
 *
 * 1. NEVER use Access-Control-Allow-Origin: * in production
 *    - This disables CORS protection entirely
 *    - Always specify explicit allowed origins
 *
 * 2. Be careful with credentials: true
 *    - Only enable for trusted origins
 *    - Allows cookies/auth headers to be sent cross-origin
 *
 * 3. Keep ALLOWED_ORIGINS list minimal
 *    - Only add origins you control
 *    - Review and update regularly
 *
 * 4. Use HTTPS for all allowed origins
 *    - HTTP origins are insecure
 *    - Mixed content issues
 */
