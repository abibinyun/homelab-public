import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import templateService from './template.service.js';
import logger from '../utils/logger.js';

const execFileAsync = promisify(execFile);
const STACKS_DIR = './data/stacks';

type ProgressCallback = (step: string, message: string) => void;

class ComposeService {
  /**
   * Generate final docker-compose.yml for a project by merging template + vars.
   * Writes to data/stacks/{slug}/docker-compose.yml.
   * Returns the stack directory path.
   */
  async prepare(
    slug: string,
    templateId: number,
    vars: Record<string, string>,
    envOverride: Record<string, string> = {}
  ): Promise<string> {
    const template = await templateService.getById(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    // Merge {{PLACEHOLDER}} tokens
    let content = templateService.merge(template.composeContent, { PROJECT_SLUG: slug, ...vars });

    // Inject env override into all services as x-env-override (appended as comment for traceability)
    // Actual env injection happens via .env file in the stack dir
    const stackDir = path.join(STACKS_DIR, slug);
    await fs.mkdir(stackDir, { recursive: true });

    // Write compose file
    const composePath = path.join(stackDir, 'docker-compose.yml');
    await fs.writeFile(composePath, content, 'utf-8');

    // Write .env file for docker compose
    const envContent = Object.entries(envOverride)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    await fs.writeFile(path.join(stackDir, '.env'), envContent, 'utf-8');

    logger.info(`Compose prepared for stack: ${slug}`, { composePath });
    return stackDir;
  }

  async up(stackDir: string, onProgress?: ProgressCallback): Promise<void> {
    onProgress?.('compose', 'Running docker compose up...');
    try {
      await execFileAsync('docker', ['compose', '-f', path.join(stackDir, 'docker-compose.yml'), '--env-file', path.join(stackDir, '.env'), 'up', '-d', '--build', '--remove-orphans']);
      onProgress?.('compose', '✓ Stack started');
    } catch (err) {
      const msg = (err as any).stderr || (err as Error).message;
      onProgress?.('compose', `✗ Compose failed: ${msg}`);
      throw new Error(`docker compose up failed: ${msg}`);
    }
  }

  async down(stackDir: string): Promise<void> {
    try {
      await execFileAsync('docker', ['compose', '-f', path.join(stackDir, 'docker-compose.yml'), 'down', '--remove-orphans']);
      logger.info(`Stack stopped: ${stackDir}`);
    } catch (err) {
      logger.warn(`Stack down failed (may already be stopped)`, { error: (err as Error).message });
    }
  }

  async logs(stackDir: string, tail = 100): Promise<string> {
    try {
      const { stdout } = await execFileAsync('docker', ['compose', '-f', path.join(stackDir, 'docker-compose.yml'), 'logs', '--tail', String(tail), '--no-color']);
      return stdout;
    } catch (err) {
      return (err as any).stderr || (err as Error).message;
    }
  }

  stackDir(slug: string): string {
    return path.join(STACKS_DIR, slug);
  }

  async exists(slug: string): Promise<boolean> {
    return fs.access(path.join(STACKS_DIR, slug, 'docker-compose.yml'))
      .then(() => true).catch(() => false);
  }
}

export default new ComposeService();
