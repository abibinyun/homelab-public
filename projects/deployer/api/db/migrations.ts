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

    // ── Users: role + client_id ────────────────────────────────
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin'`).catch(() => {});
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id INTEGER`).catch(() => {});

    // ── Clients ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Client Permissions ─────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS client_permissions (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
        can_view_projects BOOLEAN DEFAULT true,
        can_view_logs BOOLEAN DEFAULT false,
        can_restart BOOLEAN DEFAULT false,
        can_start_stop BOOLEAN DEFAULT false,
        can_update_env BOOLEAN DEFAULT false,
        can_trigger_deploy BOOLEAN DEFAULT false,
        can_manage_domains BOOLEAN DEFAULT false,
        can_view_metrics BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Client Domains ─────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS client_domains (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        domain VARCHAR(255) NOT NULL,
        cloudflare_zone_id VARCHAR(255),
        cloudflare_api_token TEXT,
        tunnel_id VARCHAR(255),
        cf_mode VARCHAR(20) DEFAULT 'managed',
        is_primary BOOLEAN DEFAULT false,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_client_domains_client ON client_domains(client_id)`).catch(() => {});

    // ── Projects: extend with client_id + domain_id ────────────
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id)`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain_id INTEGER REFERENCES client_domains(id)`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS git_branch VARCHAR(100) DEFAULT 'main'`).catch(() => {});

    // ── Deploy Logs ────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS deploy_logs (
        id SERIAL PRIMARY KEY,
        project_name VARCHAR(50) NOT NULL,
        triggered_by INTEGER,
        trigger_type VARCHAR(20) DEFAULT 'manual',
        status VARCHAR(20) DEFAULT 'running',
        log_output TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_deploy_logs_project ON deploy_logs(project_name)`).catch(() => {});

    // ── Audit Logs ─────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        client_id INTEGER,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)`).catch(() => {});

    // ── v2: Domains (global, replaces client_domains as primary routing entity) ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        cf_zone_id VARCHAR(255),
        cf_tunnel_id VARCHAR(255),
        cf_api_token TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_domains_name ON domains(name)`).catch(() => {});

    // ── v2: Templates ──────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        compose_content TEXT NOT NULL,
        variables JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── v2: Projects — extend columns ──────────────────────────
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS deploy_type VARCHAR(20) DEFAULT 'DOCKERFILE'`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS registry_image TEXT`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain_ref INTEGER REFERENCES domains(id) ON DELETE SET NULL`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS db_mode VARCHAR(20) DEFAULT 'NONE'`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS redis_mode VARCHAR(20) DEFAULT 'NONE'`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'IDLE'`).catch(() => {});
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_deployed_at TIMESTAMP`).catch(() => {});
    // Backfill slug from name for existing rows
    await db.query(`UPDATE projects SET slug = name WHERE slug IS NULL`).catch(() => {});
    // subdomain_type: 'subdomain' (default) or 'root' (deploy to root domain)
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS subdomain_type VARCHAR(20) DEFAULT 'subdomain'`).catch(() => {});

    // ── v2: Project Services (for COMPOSE type) ────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS project_services (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        is_public BOOLEAN DEFAULT false,
        subdomain VARCHAR(100),
        port INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, name)
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_project_services_project ON project_services(project_id)`).catch(() => {});

    // ── v2: Deploy Logs — extend columns ───────────────────────
    await db.query(`ALTER TABLE deploy_logs ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL`).catch(() => {});
    await db.query(`ALTER TABLE deploy_logs ADD COLUMN IF NOT EXISTS image_tag_before TEXT`).catch(() => {});
    // Backfill project_id from project_name for existing rows
    await db.query(`
      UPDATE deploy_logs dl
      SET project_id = p.id
      FROM projects p
      WHERE dl.project_name = p.name AND dl.project_id IS NULL
    `).catch(() => {});
    await db.query(`CREATE INDEX IF NOT EXISTS idx_deploy_logs_project_id ON deploy_logs(project_id)`).catch(() => {});

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migration failed', error);
    throw error;
  }
}
