 // Build script for server with proper alias resolution
  import esbuild from 'esbuild';
  import path from 'path';
  import { fileURLToPath } from 'url';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  await esbuild.build({
    entryPoints: ['server/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outdir: 'dist',
    packages: 'external',
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
    // Externalize node_modules to avoid bundling them
    external: [
      'express',
      'ws',
      'pg',
      '@neondatabase/serverless',
      'drizzle-orm',
      'express-session',
      'passport',
      'passport-local',
      'bcryptjs',
      'connect-pg-simple',
      'memorystore'
    ],
  });

  console.log('✓ Server build complete');
