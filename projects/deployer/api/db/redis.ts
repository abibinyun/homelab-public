import { Redis as RedisType, Redis } from 'ioredis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class RedisClient {
  private client: RedisType | null = null;

  async connect(): Promise<void> {
    if (!config.redisUrl) {
      logger.warn('No REDIS_URL configured, sessions will use memory');
      return;
    }

    this.client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.client.on('error', (error: Error) => {
      logger.error('Redis error', error);
    });
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    if (!this.client) return;
    if (expirySeconds) {
      await this.client.setex(key, expirySeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    const result = await this.client.exists(key);
    return result === 1;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis disconnected');
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }
}

export default new RedisClient();
