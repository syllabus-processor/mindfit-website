/**
 * MindFit PostgreSQL Session Store Configuration
 * File: security-middleware/02-session-store.js
 *
 * PURPOSE: Fix CRITICAL memory leak by storing sessions in PostgreSQL instead of memory
 * PRIORITY: P0 - CRITICAL (BLOCKING PRODUCTION)
 * EFFORT: 2 hours
 *
 * INSTALLATION:
 * npm install express-session connect-pg-simple
 *
 * DATABASE SETUP (Run once):
 * The connect-pg-simple package will auto-create the sessions table if createTableIfMissing: true
 *
 * USAGE:
 * import sessionMiddleware from './security-middleware/02-session-store';
 * app.use(sessionMiddleware);
 */

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
const pgSession = connectPgSimple(session);
import pg from 'pg';

// Database configuration
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for DigitalOcean managed databases
  },
  max: 10, // Maximum number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL session pool client', err);
  process.exit(-1);
});

// Session configuration
const sessionConfig = {
  // Session store configuration
  store: new pgSession({
    pool: pool,
    tableName: 'sessions', // Table name for sessions
    createTableIfMissing: true, // Auto-create table on first run
    pruneSessionInterval: 60 * 15, // Cleanup expired sessions every 15 minutes
    errorLog: console.error.bind(console), // Log errors
  }),

  // Session secret - MUST be set via environment variable
  secret: process.env.SESSION_SECRET || (() => {
    console.error('⚠️  WARNING: SESSION_SECRET not set! Using default (INSECURE)');
    return 'CHANGE-THIS-IN-PRODUCTION';
  })(),

  // Session options
  name: 'mindfit.sid', // Custom session cookie name (obscures framework)
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  rolling: true, // Reset cookie expiration on every request

  // Cookie configuration
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    sameSite: 'strict', // CSRF protection (strict/lax/none)
    path: '/', // Cookie available on all paths
    domain: process.env.NODE_ENV === 'production' ? '.ruha.io' : undefined,
  },

  // Session configuration
  proxy: true, // Trust first proxy (Cloudflare/DO App Platform)
  unset: 'destroy', // Destroy session when unset
};

// Export session middleware
const sessionMiddleware = session(sessionConfig);

// Health check for session store
async function checkSessionStoreHealth() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) FROM sessions');
    client.release();
    return {
      healthy: true,
      sessionCount: parseInt(result.rows[0].count),
      poolSize: pool.totalCount,
      poolIdle: pool.idleCount,
      poolWaiting: pool.waitingCount
    };
  } catch (error) {
    console.error('Session store health check failed:', error);
    return {
      healthy: false,
      error: error.message
    };
  }
}

// Cleanup function for graceful shutdown
async function cleanupSessionStore() {
  console.log('Closing session store pool...');
  await pool.end();
  console.log('Session store pool closed');
}

// Handle graceful shutdown
process.on('SIGTERM', cleanupSessionStore);
process.on('SIGINT', cleanupSessionStore);

export default sessionMiddleware;
export const checkSessionStoreHealth;
export const cleanupSessionStore;
export const pool; // Export pool for advanced usage

/**
 * MIGRATION NOTES:
 *
 * 1. BEFORE DEPLOYING:
 *    - Ensure DATABASE_URL environment variable is set
 *    - Ensure SESSION_SECRET is set to a strong random value
 *
 * 2. FIRST DEPLOYMENT:
 *    - The sessions table will be created automatically
 *    - Old in-memory sessions will be lost (users need to re-login)
 *    - This is expected and acceptable
 *
 * 3. VERIFICATION:
 *    - After deployment, check sessions table exists:
 *      SELECT * FROM sessions LIMIT 5;
 *    - Monitor session count:
 *      SELECT COUNT(*) FROM sessions;
 *    - Check for expired sessions cleanup:
 *      SELECT COUNT(*) FROM sessions WHERE expire < NOW();
 *
 * 4. MONITORING:
 *    - Add to health check endpoint:
 *      import { checkHealth } from './security-middleware/02-session-store';
 *      app.get('/health', async (req, res) => {
 *        const sessionHealth = await checkHealth();
 *        res.json({ sessions: sessionHealth });
 *      });
 *
 * 5. PERFORMANCE:
 *    - Session reads/writes are now database operations
 *    - Expect ~50ms latency per request (acceptable)
 *    - Monitor database connection pool usage
 *    - Scale database if needed (currently: db-amd-2vcpu-4gb is sufficient)
 *
 * BENEFITS:
 * ✅ Sessions persist across app restarts
 * ✅ Sessions work with multiple app instances (horizontal scaling)
 * ✅ No memory leaks
 * ✅ Automatic session cleanup
 * ✅ Can query/manage sessions via SQL
 *
 * TESTING:
 * 1. Login to admin panel
 * 2. Check sessions table: SELECT * FROM sessions;
 * 3. Restart app
 * 4. Verify still logged in (session persisted)
 * 5. Wait 24 hours, verify auto-logout (cookie expiration)
 */

/**
 * SESSIONS TABLE SCHEMA (auto-created):
 *
 * CREATE TABLE sessions (
 *   sid VARCHAR NOT NULL PRIMARY KEY,
 *   sess JSON NOT NULL,
 *   expire TIMESTAMP(6) NOT NULL
 * );
 * CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
 *
 * Fields:
 * - sid: Session ID (encrypted cookie value)
 * - sess: Session data (JSON) - contains user info, cart, etc.
 * - expire: Expiration timestamp - auto-cleanup when expired
 */
