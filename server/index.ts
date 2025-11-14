import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// =============================================================================
// TRUST PROXY - Required for correct client IP detection behind Cloudflare/DO proxy
// =============================================================================
app.set('trust proxy', true);

// =============================================================================
// SECURITY MIDDLEWARE - APPLY IN THIS ORDER
// =============================================================================

// 1. Helmet - Security Headers
// @ts-ignore - JS module
import helmetConfig from "../security-middleware/01-helmet-config.js";
app.use(helmetConfig);
console.log('✅ Security headers configured (Helmet)');

// 2. CORS Configuration
// @ts-ignore - JS module
import corsConfig from "../security-middleware/05-cors-config.js";
app.use(corsConfig);
console.log('✅ CORS configured');

// 3. Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// 4. Session Store (FIXES MEMORY LEAK)
// @ts-ignore - JS module
import sessionMiddleware from "../security-middleware/02-session-store.js";
app.use(sessionMiddleware);
console.log('✅ Session store configured (PostgreSQL)');

// 5. Input Validation Protection
// @ts-ignore - JS module
import { xssProtection, detectSQLInjection } from "../security-middleware/04-input-validation.js";
app.use(xssProtection);
app.use(detectSQLInjection);
console.log('✅ Input validation configured');

// 6. Rate Limiting
// @ts-ignore - JS module
import { apiLimiter } from "../security-middleware/03-rate-limiting.js";
app.use('/api/', apiLimiter);
console.log('✅ Rate limiting configured');

// =============================================================================
// REQUEST LOGGING MIDDLEWARE
// =============================================================================

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// =============================================================================
// ROUTES REGISTRATION
// =============================================================================

(async () => {
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Vite dev server or static file serving
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`✅ MindFit server running on port ${port}`);
    log('🔒 All security middleware active');
  });
})();
