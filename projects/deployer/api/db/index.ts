import { Pool } from 'pg';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class Database {
  private pool: Pool | null = null;

  async connect(): Promise<void> {
    if (!config.databaseUrl) {
      logger.warn('No DATABASE_URL configured, using JSON file storage');
      return;
    }

    this.pool = new Pool({
      connectionString: config.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      logger.info('Database connected successfully');
      client.release();
    } catch (error) {
      logger.error('Database connection failed', error);
      throw error;
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.query(text, params);
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database disconnected');
    }
  }

  isConnected(): boolean {
    return this.pool !== null;
  }
}

export default new Database();
