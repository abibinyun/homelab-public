import { simpleGit } from 'simple-git';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { decryptToken } from '../utils/crypto.js';
import { generateDockerfile } from '../utils/dockerfile.js';
import { dockerService } from './docker.js';
import domainService from './domain.service.js';
import logger from '../utils/logger.js';

const execFileAsync = promisify(execFile);
const DATA_DIR = './data';
const HOMELAB_PATH = process.env.HOMELAB_PATH || '/homelab';

interface Project {
  name: string;
  gitUrl: string;
  gitToken?: string;
  subdomain: string;
  port: number;
  domainId?: number;
  env?: Record<string, string>;
  resources?: {
    memoryLimit?: string;
    cpuLimit?: string;
    restartPolicy?: string;
  };
}

type ProgressCallback = (step: string, message: string) => void;

interface DeployResult {
  domain: string;
  port: number;
}

export class DeployService {
  async cloneOrPullRepo(project: Project, repoPath: string, onProgress?: ProgressCallback): Promise<void> {
    onProgress?.('git', 'Fetching latest code...');
    
    let cloneUrl = project.gitUrl;
    if (project.gitToken) {
      const decryptedToken = decryptToken(project.gitToken);
      if (decryptedToken && cloneUrl.startsWith('https://')) {
        const isGitLab = cloneUrl.includes('gitlab.com');
        const tokenPrefix = isGitLab ? 'oauth2:' : '';
        cloneUrl = cloneUrl.replace('https://', `https://${tokenPrefix}${decryptedToken}@`);
      }
    }
    
    if (await fs.access(repoPath).then(() => true).catch(() => false)) {
      const git = simpleGit(repoPath);
      await git.pull();
    } else {
      await fs.mkdir(path.dirname(repoPath), { recursive: true });
      await simpleGit().clone(cloneUrl, repoPath);
    }
    
    onProgress?.('git', '✓ Code fetched');
  }

  async generateDockerfileForProject(project: Project, repoPath: string, onProgress?: ProgressCallback): Promise<number> {
    onProgress?.('dockerfile', 'Generating Dockerfile...');
    
    const dockerfilePath = path.join(repoPath, 'Dockerfile');
    const result = await generateDockerfile(repoPath, project.port);
    const dockerfile = typeof result === 'string' ? result : result.dockerfile;
    const detectedPort = typeof result === 'object' ? result.port : project.port;
    await fs.writeFile(dockerfilePath, dockerfile);
    
    onProgress?.('dockerfile', `✓ Dockerfile ready (port: ${detectedPort})`);
    
    return detectedPort;
  }

  async buildImage(projectName: string, repoPath: string, onProgress?: ProgressCallback): Promise<string> {
    onProgress?.('build', 'Building Docker image...');
    const imageName = `deployer-${projectName}:latest`;
    await execFileAsync('docker', ['build', '-t', imageName, repoPath]);
    onProgress?.('build', '✓ Image built');
    return imageName;
  }

  async setupCloudflareRoute(subdomain: string, onProgress?: ProgressCallback, domainId?: number): Promise<string> {
    // Multi-domain mode: client has a specific domain assigned
    if (domainId) {
      return domainService.setupDnsForProject(subdomain, domainId, onProgress);
    }

    // Legacy mode: use global env vars + cloudflare-route.sh script
    onProgress?.('cloudflare', 'Configuring Cloudflare route...');
    const domain = `${subdomain}.${process.env.DOMAIN || 'yourdomain.com'}`;

    const hasCredentials = process.env.CLOUDFLARE_API_TOKEN &&
      process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_TUNNEL_ID &&
      process.env.CLOUDFLARE_ZONE_ID;

    if (!hasCredentials) {
      onProgress?.('cloudflare', '⚠ Cloudflare API tidak dikonfigurasi — tambah DNS manual');
      return domain;
    }

    const scriptPath = path.join(HOMELAB_PATH, 'scripts', 'cloudflare-route.sh');
    try {
      await execFileAsync('sh', [scriptPath, domain], {
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
          CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
          CLOUDFLARE_TUNNEL_ID: process.env.CLOUDFLARE_TUNNEL_ID,
          CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID,
        }
      });
      onProgress?.('cloudflare', '✓ Route configured');
    } catch (err) {
      onProgress?.('cloudflare', `⚠ Cloudflare route gagal: ${(err as Error).message}`);
      logger.warn('Cloudflare route setup failed', { domain, error: (err as Error).message });
    }
    return domain;
  }

  async startNewContainer(projectName: string, imageName: string, project: Project, domain: string, onProgress?: ProgressCallback): Promise<void> {
    onProgress?.('start', 'Starting new container...');

    const envArray = Object.entries(project.env || {}).map(([k, v]) => `${k}=${v}`);
    const res = project.resources || {};

    // Parse memory limit: "512m" → bytes, "1g" → bytes, "0" → unlimited
    const parseMemory = (val?: string): number => {
      if (!val || val === '0') return 0;
      const n = parseFloat(val);
      if (val.endsWith('g')) return Math.floor(n * 1024 * 1024 * 1024);
      if (val.endsWith('m')) return Math.floor(n * 1024 * 1024);
      return Math.floor(n);
    };

    // Parse CPU: "0.5" → 500000000 NanoCPUs, "0" → unlimited
    const parseCPU = (val?: string): number => {
      if (!val || val === '0') return 0;
      return Math.floor(parseFloat(val) * 1e9);
    };

    const result = await dockerService.createContainer({
      name: projectName,
      Image: imageName,
      Env: envArray,
      Labels: {
        'traefik.enable': 'true',
        [`traefik.http.routers.${projectName}.rule`]: `Host(\`${domain}\`)`,
        [`traefik.http.routers.${projectName}.entrypoints`]: 'web',
        [`traefik.http.services.${projectName}.loadbalancer.server.port`]: String(project.port)
      },
      HostConfig: {
        NetworkMode: process.env.DOCKER_NETWORK || 'homelab_web',
        RestartPolicy: { Name: res.restartPolicy || 'unless-stopped' },
        ...(parseMemory(res.memoryLimit) > 0 && { Memory: parseMemory(res.memoryLimit) }),
        ...(parseCPU(res.cpuLimit) > 0 && { NanoCPUs: parseCPU(res.cpuLimit) }),
      }
    });

    if (!result.success) throw new Error(result.error);
    onProgress?.('start', '✓ Container started');
  }

  async deploy(project: Project, onProgress?: ProgressCallback): Promise<DeployResult> {
    const repoPath = path.join(DATA_DIR, 'repos', project.name);
    
    // Step 1: Clone/Pull
    await this.cloneOrPullRepo(project, repoPath, onProgress);
    
    // Step 2: Generate Dockerfile
    const detectedPort = await this.generateDockerfileForProject(project, repoPath, onProgress);
    if (detectedPort !== project.port) {
      project.port = detectedPort;
    }
    
    // Step 3: Build image
    const imageName = await this.buildImage(project.name, repoPath, onProgress);
    
    // Step 4: Stop old container
    onProgress?.('stop', 'Stopping old container...');
    await dockerService.stopAndRemove(project.name);
    onProgress?.('stop', '✓ Old container removed');
    
    // Step 5: Setup Cloudflare
    const domain = await this.setupCloudflareRoute(project.subdomain, onProgress, project.domainId);
    
    // Step 6: Start new container
    await this.startNewContainer(project.name, imageName, project, domain, onProgress);
    
    return { domain, port: project.port };
  }
}

export const deployService = new DeployService();
