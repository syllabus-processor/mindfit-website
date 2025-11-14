/**
 * MindFit Security Headers Configuration
 * File: security-middleware/01-helmet-config.js
 *
 * PURPOSE: Add comprehensive security headers to prevent XSS, clickjacking, and other attacks
 * PRIORITY: P0 - CRITICAL
 * EFFORT: 1 hour
 *
 * INSTALLATION:
 * npm install helmet
 *
 * USAGE:
 * const helmetConfig = require('./security-middleware/01-helmet-config');
 * app.use(helmetConfig);
 */

const helmet = require('helmet');

const helmetConfig = helmet({
  // Content Security Policy - Prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],

      // Scripts - Allow inline scripts for now, refine later
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // TODO: Remove after migrating to CSP-compliant scripts
        "https://cdn.jsdelivr.net", // If using CDN for libraries
        "https://cdnjs.cloudflare.com"
      ],

      // Styles - Allow inline styles for now
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // TODO: Remove after extracting inline styles
        "https://fonts.googleapis.com"
      ],

      // Images - Allow from self and data URIs
      imgSrc: [
        "'self'",
        "data:",
        "https:", // Allow HTTPS images
        "blob:"
      ],

      // Fonts
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:"
      ],

      // API connections
      connectSrc: [
        "'self'",
        "https://mindfit.ruha.io",
        "https://api.mindfit.ruha.io" // If using separate API domain
      ],

      // Forms - Only allow submission to self
      formAction: ["'self'"],

      // Frames - Deny all framing
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],

      // Objects/Embeds - Block all plugins
      objectSrc: ["'none'"],

      // Media
      mediaSrc: ["'self'"],

      // Base URI restriction
      baseUri: ["'self'"],

      // Upgrade insecure requests
      upgradeInsecureRequests: [],
    },

    // Report violations (optional - set up endpoint first)
    // reportOnly: false,
    // reportUri: '/api/csp-violation-report'
  },

  // HSTS - Force HTTPS for 1 year
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true // Submit to browsers' HSTS preload list
  },

  // X-Frame-Options - Prevent clickjacking
  frameguard: {
    action: 'deny' // DENY or SAMEORIGIN
  },

  // X-Content-Type-Options - Prevent MIME sniffing
  noSniff: true,

  // X-XSS-Protection - Legacy XSS filter (for older browsers)
  xssFilter: true,

  // Referrer Policy - Control referrer information
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Permissions Policy (formerly Feature Policy)
  // Disable unnecessary browser features
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'none'"],
      usb: ["'none'"],
      magnetometer: ["'none'"],
      gyroscope: ["'none'"],
      accelerometer: ["'none'"]
    }
  },

  // Remove X-Powered-By header (already done in app.js, but enforce here too)
  hidePoweredBy: true,

  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false
  },

  // IE No Open
  ieNoOpen: true,

  // Expect-CT (Certificate Transparency)
  expectCt: {
    maxAge: 86400, // 24 hours
    enforce: true
  }
});

// Custom middleware to add additional security headers
function additionalSecurityHeaders(req, res, next) {
  // Remove potentially sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  next();
}

// Export middleware
module.exports = [helmetConfig, additionalSecurityHeaders];

/**
 * TESTING:
 *
 * 1. After implementing, test with:
 *    curl -I https://mindfit.ruha.io
 *
 * 2. Verify headers present:
 *    - Strict-Transport-Security
 *    - Content-Security-Policy
 *    - X-Frame-Options: DENY
 *    - X-Content-Type-Options: nosniff
 *    - Referrer-Policy
 *
 * 3. Test CSP with: https://csp-evaluator.withgoogle.com/
 * 4. Test headers with: https://securityheaders.com/?q=mindfit.ruha.io
 *
 * EXPECTED RESULT: A+ rating on securityheaders.com
 */
