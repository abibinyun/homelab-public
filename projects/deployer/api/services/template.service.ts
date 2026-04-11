import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import templateRepository from '../repositories/template.repository.js';
import logger from '../utils/logger.js';
import type { Template } from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');

// Built-in template metadata (variables definition per template)
const BUILTIN_TEMPLATES: Record<string, { description: string; variables: any[] }> = {
  'nextjs-nestjs': {
    description: 'Next.js 16 + NestJS 11 monorepo (Turborepo)',
    variables: [
      { key: 'WEB_DOMAIN', description: 'Domain for web (e.g. app.digitor.id)', required: true },
      { key: 'API_DOMAIN', description: 'Domain for API (e.g. api.digitor.id)', required: true },
      { key: 'NEXT_PUBLIC_API_URL', description: 'Public API URL', required: true },
      { key: 'API_URL', description: 'Internal API URL', required: true },
      { key: 'DATABASE_URL', description: 'PostgreSQL connection string', required: true },
      { key: 'REDIS_URL', description: 'Redis connection string', required: true },
      { key: 'JWT_SECRET', description: 'JWT secret (min 32 chars)', required: true },
      { key: 'JWT_REFRESH_SECRET', description: 'JWT refresh secret (min 32 chars)', required: true },
      { key: 'REVALIDATE_SECRET', description: 'Next.js revalidate secret', required: true },
      { key: 'ALLOWED_ORIGINS', description: 'CORS allowed origins', required: true },
      { key: 'NEXT_PUBLIC_BASE_URL', description: 'Public base URL', required: true },
    ],
  },
  'nextjs-only': {
    description: 'Next.js standalone app',
    variables: [
      { key: 'WEB_DOMAIN', description: 'Domain for web', required: true },
      { key: 'NEXT_PUBLIC_API_URL', description: 'Public API URL', required: false },
    ],
  },
  'laravel': {
    description: 'Laravel (PHP) app',
    variables: [
      { key: 'WEB_DOMAIN', description: 'Domain for app', required: true },
      { key: 'APP_KEY', description: 'Laravel app key', required: true },
      { key: 'APP_URL', description: 'App URL', required: true },
      { key: 'DB_HOST', description: 'Database host', required: true },
      { key: 'DB_DATABASE', description: 'Database name', required: true },
      { key: 'DB_USERNAME', description: 'Database user', required: true },
      { key: 'DB_PASSWORD', description: 'Database password', required: true },
      { key: 'REDIS_HOST', description: 'Redis host', required: false },
      { key: 'REDIS_PASSWORD', description: 'Redis password', required: false },
    ],
  },
  'static': {
    description: 'Static HTML/CSS/JS site (Nginx)',
    variables: [
      { key: 'WEB_DOMAIN', description: 'Domain for site', required: true },
    ],
  },
  'node-express': {
    description: 'Generic Node.js / Express app',
    variables: [
      { key: 'WEB_DOMAIN', description: 'Domain for app', required: true },
      { key: 'DATABASE_URL', description: 'Database connection string', required: false },
      { key: 'REDIS_URL', description: 'Redis connection string', required: false },
    ],
  },
};

class TemplateService {
  async getAll(activeOnly = false): Promise<Template[]> {
    return templateRepository.getAll(activeOnly);
  }

  async getById(id: number): Promise<Template | null> {
    return templateRepository.getById(id);
  }

  async create(data: {
    name: string;
    description?: string;
    composeContent: string;
    variables?: any[];
  }): Promise<Template> {
    const existing = await templateRepository.getByName(data.name);
    if (existing) throw new Error(`Template "${data.name}" already exists`);
    return templateRepository.create(data);
  }

  async update(id: number, data: {
    name?: string;
    description?: string;
    composeContent?: string;
    variables?: any[];
    isActive?: boolean;
  }): Promise<Template | null> {
    const t = await templateRepository.getById(id);
    if (!t) throw new Error('Template not found');
    return templateRepository.update(id, data);
  }

  async delete(id: number): Promise<void> {
    const inUse = await templateRepository.isUsedByProject(id);
    if (inUse) throw new Error('Template is used by one or more projects');
    await templateRepository.delete(id);
  }

  /**
   * Merge base template compose content with project-specific values.
   * Replaces {{PLACEHOLDER}} tokens with actual values.
   */
  merge(composeContent: string, vars: Record<string, string>): string {
    return composeContent.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  /**
   * Seed built-in templates from ./templates/*.yml files into DB.
   * Skips if already exists (idempotent).
   */
  async seed(): Promise<void> {
    for (const [name, meta] of Object.entries(BUILTIN_TEMPLATES)) {
      const existing = await templateRepository.getByName(name);
      if (existing) continue;

      try {
        const filePath = path.join(TEMPLATES_DIR, `${name}.yml`);
        const composeContent = await fs.readFile(filePath, 'utf-8');
        await templateRepository.create({
          name,
          description: meta.description,
          composeContent,
          variables: meta.variables,
        });
        logger.info(`Template seeded: ${name}`);
      } catch (err) {
        logger.warn(`Failed to seed template "${name}"`, { error: (err as Error).message });
      }
    }
  }
}

export default new TemplateService();
