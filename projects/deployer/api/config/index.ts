import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenvConfig({ path: envFile });

// Environment schema
const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ENCRYPTION_KEY: z.string().optional(),
  HOMELAB_PATH: z.string().default('/homelab'),
  DOMAIN: z.string().default('yourdomain.com'),
  ALLOWED_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

// Validate environment variables
const envValidation = envSchema.safeParse(process.env);

if (!envValidation.success) {
  console.error('❌ Invalid environment variables:');
  console.error(envValidation.error.format());
  process.exit(1);
}

const env = envValidation.data;

interface Config {
  port: number;
  nodeEnv: string;
  encryptionKey: string;
  sessionExpiryHours: number;
  maxLoginAttempts: number;
  rateLimitWindow: number;
  homelabPath: string;
  dataDir: string;
  allowedOrigins: string[];
  databaseUrl?: string;
  redisUrl?: string;
}

const config: Config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  encryptionKey: env.ENCRYPTION_KEY || '',
  sessionExpiryHours: 24,
  maxLoginAttempts: 5,
  rateLimitWindow: 60000, // 1 minute
  homelabPath: env.HOMELAB_PATH,
  dataDir: './data',
  allowedOrigins: env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    `https://deploy.${env.DOMAIN || 'yourdomain.com'}`,
  ],
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
};

export default config;
