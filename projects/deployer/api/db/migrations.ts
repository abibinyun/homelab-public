import db from './index.js';
import logger from '../utils/logger.js';

export async function runMigrations(): Promise<void> {
  if (!db.isConnected()) {
    logger.info('Database not connected, skipping migrations');
    return;
  }

  logger.info('Running database migrations...');

  try {
    // ── Users ──────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT true,
        verification_token TEXT,
        verification_token_expires TIMESTAMP,
        reset_token TEXT,
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Upgrade columns for existing installs
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`).catch(() => {});
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true`).catch(() => {});
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT`).catch(() => {});
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP`).catch(() => {});
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`).catch(() => {});
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`).catch(() => {});
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).catch(() => {});

    // ── Projects ───────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        git_url TEXT NOT NULL,
        subdomain VARCHAR(50) NOT NULL,
        env JSONB DEFAULT '{}',
        port INTEGER DEFAULT 3000,
        user_id INTEGER,
        git_token TEXT,
        webhook_secret TEXT,
        resources JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Upgrade columns for existing installs
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id INTEGER`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS webhook_secret TEXT`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '{}'`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).catch(() => {});

    // ── Indexes ────────────────────────────────────────────────
    await db.query(`CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)`).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC)`).catch(() => {});

    // ── Settings ───────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Custom Domains ─────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_domains (
        id SERIAL PRIMARY KEY,
        project_name VARCHAR(50) NOT NULL,
        domain VARCHAR(255) UNIQUE NOT NULL,
        verification_token VARCHAR(255) NOT NULL,
        verified BOOLEAN DEFAULT false,
        verified_at TIMESTAMP,
        cloudflare_dns_id VARCHAR(255),
        ssl_status VARCHAR(20) DEFAULT 'pending',
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_custom_domains_project ON custom_domains(project_name)`).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain)`).catch(() => {});

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migration failed', error);
    throw error;
  }
}
