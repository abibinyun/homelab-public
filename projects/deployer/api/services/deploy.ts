import { simpleGit } from 'simple-git';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { decryptToken } from '../utils/crypto.js';
import { generateDockerfile } from '../utils/dockerfile.js';
import { dockerService } from './docker.js';
import domainService from './domain.service.js';
import composeService from './compose.service.js';
import databaseService from './database.service.js';
import logger from '../utils/logger.js';

const execFileAsync = promisify(execFile);
const DATA_DIR = './data';
const HOMELAB_PATH = process.env.HOMELAB_PATH || '/homelab';

export type DeployType = 'IMAGE' | 'DOCKERFILE' | 'COMPOSE';
export type DbMode = 'NONE' | 'SHARED' | 'DEDICATED';
export type RedisMode = 'NONE' | 'SHARED' | 'DEDICATED';

export interface ProjectDeployConfig {
  // identity
  name: string;       // unique container/stack name
  slug: string;       // url-safe slug
  subdomain: string;
  subdomainType?: 'subdomain' | 'root';  // 'root' = deploy to root domain (no subdomain prefix)
  domainId?: number;
  // deploy type
  deployType: DeployType;
  // git (for DOCKERFILE / COMPOSE)
  gitUrl?: string;
  gitToken?: string;
  gitBranch?: string;
  // image (for IMAGE type)
  registryImage?: string;
  // compose (for COMPOSE type)
  templateId?: number;
  composeVars?: Record<string, string>;  // {{PLACEHOLDER}} values
  // env injected into container / .env file
  env: Record<string, string>;
  port: number;
  // db/redis
  dbMode: DbMode;
  redisMode: RedisMode;
  // resources
  resources?: {
    memoryLimit?: string;
    cpuLimit?: string;
    restartPolicy?: string;
  };
}

export interface DeployResult {
  domain: string;
  port: number;
}

type ProgressCallback = (step: string, message: string) => void;

export class DeployService {
  // ── Git ──────────────────────────────────────────────────────────────────────

  async cloneOrPullRepo(gitUrl: string, gitToken: string | undefined, branch: string = 'main', repoPath: string, onProgress?: ProgressCallback): Promise<void> {
    onProgress?.('git', 'Fetching latest code...');
    let cloneUrl = gitUrl;
    if (gitToken) {
      const token = decryptToken(gitToken);
      if (token && cloneUrl.startsWith('https://')) {
        const prefix = cloneUrl.includes('gitlab.com') ? 'oauth2:' : '';
        cloneUrl = cloneUrl.replace('https://', `https://${prefix}${token}@`);
      }
    }
    if (await fs.access(repoPath).then(() => true).catch(() => false)) {
      const git = simpleGit(repoPath);
      await git.pull('origin', branch);
    } else {
      await fs.mkdir(path.dirname(repoPath), { recursive: true });
      await simpleGit().clone(cloneUrl, repoPath, ['--branch', branch, '--depth', '1']);
    }
    onProgress?.('git', '✓ Code fetched');
  }

  // ── Image tag helpers (for rollback) ─────────────────────────────────────────

  async tagImageAsPrevious(imageName: string): Promise<void> {
    try {
      await execFileAsync('docker', ['tag', `${imageName}:latest`, `${imageName}:previous`]);
    } catch {
      // no previous image yet — ok
    }
  }

  async rollbackToPrevious(imageName: string): Promise<boolean> {
    try {
      await execFileAsync('docker', ['tag', `${imageName}:previous`, `${imageName}:latest`]);
      return true;
    } catch {
      return false;
    }
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  async buildImage(name: string, repoPath: string, onProgress?: ProgressCallback): Promise<string> {
    onProgress?.('build', 'Building Docker image...');
    const imageName = `deployer-${name}`;
    await this.tagImageAsPrevious(imageName);
    await execFileAsync('docker', ['build', '-t', `${imageName}:latest`, repoPath]);
    onProgress?.('build', '✓ Image built');
    return imageName;
  }

  async pullImage(registryImage: string, onProgress?: ProgressCallback): Promise<string> {
    onProgress?.('pull', `Pulling image ${registryImage}...`);
    await execFileAsync('docker', ['pull', registryImage]);
    onProgress?.('pull', '✓ Image pulled');
    return registryImage;
  }

  // ── DNS ──────────────────────────────────────────────────────────────────────

  async setupDns(subdomain: string, domainId?: number, onProgress?: ProgressCallback, subdomainType?: string): Promise<string> {
    if (domainId) return domainService.setupDns(subdomain, domainId, onProgress, subdomainType);

    // Legacy fallback: global env
    onProgress?.('cloudflare', 'Configuring Cloudflare route...');
    const baseDomain = process.env.DOMAIN || 'yourdomain.com';
    const domain = subdomainType === 'root' ? baseDomain : `${subdomain}.${baseDomain}`;
    const hasCredentials = process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_TUNNEL_ID && process.env.CLOUDFLARE_ZONE_ID;
    if (!hasCredentials) {
      onProgress?.('cloudflare', '⚠ Cloudflare not configured — add DNS manually');
      return domain;
    }
    const scriptPath = path.join(HOMELAB_PATH, 'scripts', 'cloudflare-route.sh');
    try {
      await execFileAsync('sh', [scriptPath, domain], { env: { ...process.env } });
      onProgress?.('cloudflare', '✓ Route configured');
    } catch (err) {
      onProgress?.('cloudflare', `⚠ Cloudflare route failed: ${(err as Error).message}`);
    }
    return domain;
  }

  // ── DB/Redis provisioning ────────────────────────────────────────────────────

  async provisionDb(config: ProjectDeployConfig): Promise<Record<string, string>> {
    const extra: Record<string, string> = {};
    if (config.dbMode === 'SHARED') {
      extra['DATABASE_URL'] = await databaseService.provisionShared(config.slug);
      logger.info(`Shared DB provisioned for ${config.slug}`);
    }
    if (config.redisMode === 'SHARED') {
      const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
      // Prefix key namespace per project
      extra['REDIS_URL'] = redisUrl;
      extra['REDIS_KEY_PREFIX'] = `${config.slug}:`;
    }
    return extra;
  }

  // ── Single container start ───────────────────────────────────────────────────

  async startContainer(config: ProjectDeployConfig, imageName: string, domain: string, onProgress?: ProgressCallback): Promise<void> {
    onProgress?.('start', 'Starting container...');
    const res = config.resources || {};

    const parseMemory = (v?: string) => {
      if (!v || v === '0') return 0;
      const n = parseFloat(v);
      if (v.endsWith('g')) return Math.floor(n * 1024 ** 3);
      if (v.endsWith('m')) return Math.floor(n * 1024 ** 2);
      return Math.floor(n);
    };
    const parseCPU = (v?: string) => (!v || v === '0') ? 0 : Math.floor(parseFloat(v) * 1e9);

    const result = await dockerService.createContainer({
      name: config.name,
      Image: imageName,
      Env: Object.entries(config.env).map(([k, v]) => `${k}=${v}`),
      Labels: {
        'traefik.enable': 'true',
        [`traefik.http.routers.${config.name}.rule`]: `Host(\`${domain}\`)`,
        [`traefik.http.routers.${config.name}.entrypoints`]: 'web',
        [`traefik.http.services.${config.name}.loadbalancer.server.port`]: String(config.port),
      },
      HostConfig: {
        NetworkMode: process.env.DOCKER_NETWORK || 'homelab-public_web',
        RestartPolicy: { Name: (res.restartPolicy as any) || 'unless-stopped' },
        ...(parseMemory(res.memoryLimit) > 0 && { Memory: parseMemory(res.memoryLimit) }),
        ...(parseCPU(res.cpuLimit) > 0 && { NanoCPUs: parseCPU(res.cpuLimit) }),
      },
    });
    if (!result.success) throw new Error(result.error);
    onProgress?.('start', '✓ Container started');
  }

  // ── Health check ─────────────────────────────────────────────────────────────

  async waitHealthy(name: string, timeoutMs = 60_000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const containers = await dockerService.listContainers();
      const c = containers.find(x => x.Names.includes(`/${name}`));
      if (c && (c.State === 'running' || c.Status.includes('Up'))) return true;
      await new Promise(r => setTimeout(r, 2000));
    }
    return false;
  }

  // ── Main deploy entry point ──────────────────────────────────────────────────

  async deploy(config: ProjectDeployConfig, onProgress?: ProgressCallback): Promise<DeployResult> {
    const repoPath = path.join(DATA_DIR, 'repos', config.name);

    // 1. Provision DB/Redis (inject into env)
    const dbEnv = await this.provisionDb(config);
    config.env = { ...config.env, ...dbEnv };

    // 2. Setup DNS
    const domain = await this.setupDns(config.subdomain, config.domainId, onProgress, config.subdomainType);

    // 3. Branch by deploy type
    if (config.deployType === 'COMPOSE') {
      return this.deployCompose(config, repoPath, domain, onProgress);
    } else if (config.deployType === 'IMAGE') {
      return this.deployImage(config, domain, onProgress);
    } else {
      return this.deployDockerfile(config, repoPath, domain, onProgress);
    }
  }

  // ── COMPOSE deploy ───────────────────────────────────────────────────────────

  private async deployCompose(config: ProjectDeployConfig, repoPath: string, domain: string, onProgress?: ProgressCallback): Promise<DeployResult> {
    if (!config.templateId) throw new Error('templateId required for COMPOSE deploy type');

    // Clone/pull repo
    if (config.gitUrl) {
      await this.cloneOrPullRepo(config.gitUrl, config.gitToken, config.gitBranch, repoPath, onProgress);
    }

    // Prepare compose file (merge template + vars + env)
    onProgress?.('compose', 'Preparing compose stack...');
    const stackDir = await composeService.prepare(
      config.slug,
      config.templateId,
      config.composeVars || {},
      config.env
    );

    // Stop old stack if exists
    if (await composeService.exists(config.slug)) {
      onProgress?.('compose', 'Stopping old stack...');
      await composeService.down(stackDir);
    }

    // Start new stack
    await composeService.up(stackDir, onProgress);

    // Health check (check first service container)
    const healthy = await this.waitHealthy(`${config.slug}-web-1`).catch(() => false)
      || await this.waitHealthy(`${config.slug}_web_1`).catch(() => false);
    if (!healthy) {
      logger.warn('Health check timeout for compose stack', { slug: config.slug });
      onProgress?.('health', '⚠ Health check timeout — stack may still be starting');
    } else {
      onProgress?.('health', '✓ Stack healthy');
    }

    return { domain, port: config.port };
  }

  // ── IMAGE deploy ─────────────────────────────────────────────────────────────

  private async deployImage(config: ProjectDeployConfig, domain: string, onProgress?: ProgressCallback): Promise<DeployResult> {
    if (!config.registryImage) throw new Error('registryImage required for IMAGE deploy type');

    const imageName = await this.pullImage(config.registryImage, onProgress);

    onProgress?.('stop', 'Stopping old container...');
    await dockerService.stopAndRemove(config.name);

    await this.startContainer(config, imageName, domain, onProgress);

    const healthy = await this.waitHealthy(config.name);
    if (!healthy) onProgress?.('health', '⚠ Health check timeout');
    else onProgress?.('health', '✓ Container healthy');

    return { domain, port: config.port };
  }

  // ── DOCKERFILE deploy ────────────────────────────────────────────────────────

  private async deployDockerfile(config: ProjectDeployConfig, repoPath: string, domain: string, onProgress?: ProgressCallback): Promise<DeployResult> {
    if (!config.gitUrl) throw new Error('gitUrl required for DOCKERFILE deploy type');

    await this.cloneOrPullRepo(config.gitUrl, config.gitToken, config.gitBranch, repoPath, onProgress);

    // Auto-generate Dockerfile if not present
    const dockerfilePath = path.join(repoPath, 'Dockerfile');
    const hasDockerfile = await fs.access(dockerfilePath).then(() => true).catch(() => false);
    if (!hasDockerfile) {
      onProgress?.('dockerfile', 'Generating Dockerfile...');
      const result = await generateDockerfile(repoPath, config.port);
      const content = typeof result === 'string' ? result : result.dockerfile;
      const detectedPort = typeof result === 'object' ? result.port : config.port;
      await fs.writeFile(dockerfilePath, content);
      config.port = detectedPort;
      onProgress?.('dockerfile', `✓ Dockerfile generated (port: ${detectedPort})`);
    }

    const imageName = await this.buildImage(config.name, repoPath, onProgress);

    onProgress?.('stop', 'Stopping old container...');
    await dockerService.stopAndRemove(config.name);

    await this.startContainer(config, `${imageName}:latest`, domain, onProgress);

    const healthy = await this.waitHealthy(config.name);
    if (!healthy) {
      // Rollback
      onProgress?.('rollback', 'Health check failed — rolling back...');
      await dockerService.stopAndRemove(config.name);
      const rolled = await this.rollbackToPrevious(imageName);
      if (rolled) {
        await this.startContainer(config, `${imageName}:latest`, domain, onProgress);
        onProgress?.('rollback', '✓ Rolled back to previous version');
      }
      throw new Error('Deploy failed: health check timeout, rolled back');
    }
    onProgress?.('health', '✓ Container healthy');

    return { domain, port: config.port };
  }

  // ── Legacy deploy (backward compat for old project controller) ───────────────

  async deployLegacy(project: {
    name: string; gitUrl: string; gitToken?: string; subdomain: string;
    port: number; domainId?: number; env?: Record<string, string>;
    resources?: any;
  }, onProgress?: ProgressCallback): Promise<DeployResult> {
    return this.deploy({
      name: project.name,
      slug: project.name,
      subdomain: project.subdomain,
      domainId: project.domainId,
      deployType: 'DOCKERFILE',
      gitUrl: project.gitUrl,
      gitToken: project.gitToken,
      gitBranch: 'main',
      env: project.env || {},
      port: project.port,
      dbMode: 'NONE',
      redisMode: 'NONE',
      resources: project.resources,
    }, onProgress);
  }
}

export const deployService = new DeployService();
