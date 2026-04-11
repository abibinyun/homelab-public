import logger from '../utils/logger.js';

/**
 * Provisions database for a project.
 * SHARED: creates a new database in the homelab postgres instance.
 * DEDICATED: handled by compose template (postgres service included).
 */
class DatabaseService {
  /**
   * Ensure a database exists for the given slug.
   * Returns the DATABASE_URL to inject into project env.
   */
  async provisionShared(slug: string): Promise<string> {
    const dbName = `proj_${slug.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

    // Use a superuser connection to create the database
    const adminUrl = process.env.DATABASE_URL!;

    // Connect directly via pg to run CREATE DATABASE (cannot use pool for this)
    const { Pool } = await import('pg');
    const adminPool = new Pool({ connectionString: adminUrl });

    try {
      // Check if DB exists
      const check = await adminPool.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
      );
      if (check.rows.length === 0) {
        // CREATE DATABASE cannot run in a transaction — use raw query
        await adminPool.query(`CREATE DATABASE "${dbName}"`);
        logger.info(`Database created: ${dbName}`);
      } else {
        logger.info(`Database already exists: ${dbName}`);
      }
    } finally {
      await adminPool.end();
    }

    // Build connection URL for the project (same host, different db)
    const base = new URL(adminUrl);
    base.pathname = `/${dbName}`;
    return base.toString();
  }

  /**
   * Drop a shared database (called on project delete).
   * Safe: checks existence first.
   */
  async dropShared(slug: string): Promise<void> {
    const dbName = `proj_${slug.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    const { Pool } = await import('pg');
    const adminPool = new Pool({ connectionString: process.env.DATABASE_URL! });
    try {
      await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      logger.info(`Database dropped: ${dbName}`);
    } finally {
      await adminPool.end();
    }
  }
}

export default new DatabaseService();
