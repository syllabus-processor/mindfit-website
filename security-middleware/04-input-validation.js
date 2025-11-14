/**
 * MindFit Input Validation Middleware
 * File: security-middleware/04-input-validation.js
 *
 * PURPOSE: Prevent XSS, SQL injection, command injection attacks
 * PRIORITY: P0 - CRITICAL (BLOCKING PRODUCTION)
 * EFFORT: 4 hours
 *
 * INSTALLATION:
 * npm install express-validator
 *
 * USAGE:
 * import { validateContactForm, validateLogin, validate } from './security-middleware/04-input-validation';
 *
 * app.post('/api/contact/submit', validateContactForm, contactHandler);
 * app.post('/api/admin/login', validateLogin, loginHandler);
 */

import { body, param, query, validationResult } from 'express-validator';

// =============================================================================
// VALIDATION MIDDLEWARE - Apply to all routes that use validation
// =============================================================================

/**
 * Check validation results and return 400 if errors exist
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[SECURITY] Validation failed', {
      ip: req.ip,
      path: req.path,
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid input data',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value // Be careful not to expose sensitive data
      }))
    });
  }

  next();
}

// =============================================================================
// CONTACT FORM VALIDATION
// =============================================================================

const validateContactForm = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-'.]+$/).withMessage('Name contains invalid characters')
    .escape(), // HTML escape to prevent XSS

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail() // Standardize email format
    .isLength({ max: 255 }).withMessage('Email too long'),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone number format')
    .isLength({ max: 20 }).withMessage('Phone number too long'),

  body('preferredContact')
    .trim()
    .notEmpty().withMessage('Preferred contact method is required')
    .isIn(['email', 'phone', 'text']).withMessage('Invalid contact method'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters')
    .escape(), // HTML escape

  validate
];

// =============================================================================
// NEWSLETTER SUBSCRIPTION VALIDATION
// =============================================================================

const validateNewsletter = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email too long'),

  validate
];

// =============================================================================
// ADMIN LOGIN VALIDATION
// =============================================================================

const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_\-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .escape(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters'),
    // Note: Don't validate password complexity on login (only on registration/change)
    // Note: Don't escape password (it's hashed, not displayed)

  validate
];

// =============================================================================
// PASSWORD CHANGE VALIDATION (with complexity requirements)
// =============================================================================

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 12, max: 128 }).withMessage('Password must be at least 12 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character')
    .not().matches(/\s/).withMessage('Password cannot contain spaces')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  validate
];

// =============================================================================
// ID PARAMETER VALIDATION (for routes like /api/submissions/:id)
// =============================================================================

const validateUUID = [
  param('id')
    .trim()
    .notEmpty().withMessage('ID is required')
    .isUUID().withMessage('Invalid ID format'),

  validate
];

// =============================================================================
// PAGINATION VALIDATION
// =============================================================================

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 }).withMessage('Page must be between 1 and 10000')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sort')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Sort must be asc or desc'),

  validate
];

// =============================================================================
// CUSTOM SANITIZATION FUNCTION
// =============================================================================

/**
 * Additional sanitization for database queries
 * Use this AFTER express-validator for extra safety
 */
function sanitizeForDatabase(input) {
  if (typeof input !== 'string') return input;

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newline and tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit consecutive whitespace
    .replace(/\s{2,}/g, ' ')
    // Trim
    .trim();
}

/**
 * Sanitize all string values in an object recursively
 */
function deepSanitize(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeForDatabase(value);
    } else if (typeof value === 'object') {
      sanitized[key] = deepSanitize(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// =============================================================================
// XSS PROTECTION MIDDLEWARE
// =============================================================================

/**
 * Additional XSS protection layer
 * Apply to all routes that handle user input
 */
function xssProtection(req, res, next) {
  // Sanitize request body
  if (req.body) {
    req.body = deepSanitize(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = deepSanitize(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = deepSanitize(req.params);
  }

  next();
}

// =============================================================================
// SQL INJECTION PROTECTION
// =============================================================================

/**
 * Detect common SQL injection patterns
 * This is a DETECTIVE control, not PREVENTIVE
 * Always use parameterized queries as primary defense
 */
function detectSQLInjection(req, res, next) {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+SELECT)/gi,
    /(--|;|\/\*|\*\/)/g,
    /('|")\s*(OR|AND)\s*('|")?/gi,
    /(SLEEP|BENCHMARK|WAITFOR)/gi,
  ];

  const checkInput = (input) => {
    if (typeof input !== 'string') return false;
    return suspiciousPatterns.some(pattern => pattern.test(input));
  };

  const checkObject = (obj) => {
    for (const value of Object.values(obj)) {
      if (typeof value === 'string' && checkInput(value)) {
        return true;
      } else if (typeof value === 'object' && value !== null) {
        if (checkObject(value)) return true;
      }
    }
    return false;
  };

  let suspicious = false;
  if (req.body && checkObject(req.body)) suspicious = true;
  if (req.query && checkObject(req.query)) suspicious = true;
  if (req.params && checkObject(req.params)) suspicious = true;

  if (suspicious) {
    console.error('[SECURITY] Potential SQL injection detected', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
      body: req.body,
      query: req.query,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      error: 'Invalid input',
      message: 'Your request contains suspicious patterns'
    });
  }

  next();
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Validation chains
  validateContactForm,
  validateNewsletter,
  validateLogin,
  validatePasswordChange,
  validateUUID,
  validatePagination,

  // Generic validation middleware
  validate,

  // Sanitization utilities
  sanitizeForDatabase,
  deepSanitize,

  // Protection middleware
  xssProtection,
  detectSQLInjection,
};

/**
 * IMPLEMENTATION EXAMPLE:
 *
 * const {
 *   validateContactForm,
 *   validateLogin,
 *   validateNewsletter,
 *   xssProtection,
 *   detectSQLInjection
 * } = require('./security-middleware/04-input-validation');
 *
 * // Apply XSS and SQL injection protection globally
 * app.use(xssProtection);
 * app.use(detectSQLInjection);
 *
 * // Apply specific validation to routes
 * app.post('/api/contact/submit', validateContactForm, contactHandler);
 * app.post('/api/admin/login', validateLogin, loginHandler);
 * app.post('/api/newsletter/subscribe', validateNewsletter, subscribeHandler);
 */

/**
 * TESTING:
 *
 * 1. Test XSS prevention:
 *    curl -X POST https://mindfit.ruha.io/api/contact/submit \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"<script>alert(1)</script>","email":"test@example.com","preferredContact":"email","message":"test"}'
 *    # Should return validation error or sanitized input
 *
 * 2. Test SQL injection detection:
 *    curl -X POST https://mindfit.ruha.io/api/contact/submit \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"admin","email":"admin@example.com OR 1=1--","preferredContact":"email","message":"test"}'
 *    # Should return 400 error with "suspicious patterns" message
 *
 * 3. Test valid input:
 *    curl -X POST https://mindfit.ruha.io/api/contact/submit \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"John Doe","email":"john@example.com","preferredContact":"email","message":"Hello, I would like to learn more."}'
 *    # Should succeed
 */
