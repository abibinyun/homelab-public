import express from 'express';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs/promises';
import db from './db/index.js';
import redis from './db/redis.js';
import { runMigrations } from './db/migrations.js';
import authService from './services/auth.service.js';
import templateService from './services/template.service.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { corsOptions } from './middleware/cors.js';
import { requestId } from './middleware/requestId.js';
import authRoutes from './routes/auth.js';
import projectsRoutes from './routes/projects.js';
import webhookRoutes from './routes/webhook.js';
import domainRoutes from './routes/customDomain.routes.js';
import settingsRoutes from './routes/settings.js';
import clientsRoutes from './routes/clients.js';
import auditRoutes from './routes/audit.js';
import usersRoutes from './routes/users.js';
import domainsRoutes from './routes/domains.js';
import templatesRoutes from './routes/templates.js';
import healthController from './controllers/health.controller.js';
import { ResponseSerializer } from './utils/response.js';
import config from './config/index.js';
import logger from './utils/logger.js';

const app = express();

// Static files sebelum CORS & middleware lain
app.use(express.static('dist'));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(corsOptions);
app.use(requestId);
app.use(express.json());

// Health checks
app.get('/health', healthController.check.bind(healthController));
app.get('/health/live', healthController.liveness.bind(healthController));
app.get('/health/ready', healthController.readiness.bind(healthController));
app.get('/health/config', healthController.config.bind(healthController));

// Validate ENCRYPTION_KEY at startup
if (!process.env.ENCRYPTION_KEY) {
  logger.warn('⚠️  ENCRYPTION_KEY is not set. Git tokens for private repos will not be encrypted persistently. Set ENCRYPTION_KEY in .env for production use.');
}

// Initialize services
try {
  await db.connect();
} catch (error) {
  logger.warn('Database unavailable, falling back to JSON file storage');
}

try {
  await redis.connect();
} catch (error) {
  logger.warn('Redis unavailable, sessions will use in-memory storage');
}

try {
  await runMigrations();
} catch (error) {
  logger.warn('Migrations skipped (no database)');
}

try {
  await authService.initialize();
} catch (error) {
  logger.error('Failed to initialize auth service, server cannot start safely', { error: String(error) });
  process.exit(1);
}

// Seed built-in templates (idempotent)
await templateService.seed().catch(err => logger.warn('Template seed failed', { error: String(err) }));

logger.info('Server ready');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/v2/domains', domainsRoutes);
app.use('/api/v2/templates', templatesRoutes);

app.post('/api/backup', requireAuth, async (_req, res, next) => {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    const HOMELAB_PATH = process.env.HOMELAB_PATH || '/homelab';
    const scriptPath = path.join(HOMELAB_PATH, 'scripts', 'backup-projects.sh');
    const { stdout } = await execFileAsync('sh', [scriptPath]);
    ResponseSerializer.success(res, { output: stdout }, { message: 'Backup completed' });
  } catch (error: any) {
    next(error);
  }
});

app.get('/api/ssh-key', requireAuth, async (_req, res, next) => {
  try {
    const keyPath = process.env.SSH_KEY_PATH || '/root/.ssh/id_ed25519.pub';
    let publicKey: string;
    try {
      publicKey = await fs.readFile(keyPath, 'utf-8');
    } catch {
      // Key belum ada — generate dulu
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);
      const dir = keyPath.substring(0, keyPath.lastIndexOf('/'));
      await fs.mkdir(dir, { recursive: true });
      await execFileAsync('ssh-keygen', ['-t', 'ed25519', '-f', keyPath.replace('.pub', ''), '-N', '', '-C', 'deployer@homelab']);
      publicKey = await fs.readFile(keyPath, 'utf-8');
    }
    ResponseSerializer.success(res, { publicKey: publicKey.trim() });
  } catch (error) {
    next(error);
  }
});

// SPA fallback — harus setelah semua API routes
app.get('*', (_req, res, next) => {
  const filePath = path.join(process.cwd(), 'dist', 'index.html');
  res.sendFile(filePath, (err) => {
    if (err) next(); // fallback ke notFoundHandler
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info('Server started', { port: config.port, env: config.nodeEnv });
});

process.on('SIGTERM', async () => {
  await db.disconnect();
  await redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await db.disconnect();
  await redis.disconnect();
  process.exit(0);
});
