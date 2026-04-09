import { Request, Response } from 'express';
import projectService from '../services/project.service.js';
import { dockerService } from '../services/docker.js';
import { deployService } from '../services/deploy.js';
import domainService from '../services/domain.service.js';
import { CreateProjectRequest, UpdateEnvRequest } from '../types/index.js';
import { ResponseSerializer } from '../utils/response.js';
import { paginate } from '../utils/pagination.js';
import { paginationSchema } from '../schemas/index.js';
import logger from '../utils/logger.js';

export class ProjectController {
  async list(req: Request, res: Response): Promise<void> {
    // Parse pagination params
    const paginationParams = paginationSchema.parse(req.query);
    
    const userId = req.user!.userId;
    const projects = await projectService.getAllProjects(userId);
    const containers = await dockerService.listContainers();
    
    const enriched = projects.map(p => {
      const container = containers.find(c => c.Names.includes(`/${p.name}`));
      return {
        ...p,
        status: container?.State || 'not-found',
        containerId: container?.Id
      };
    });
    
    // Apply pagination
    const result = paginate(enriched, paginationParams);
    
    ResponseSerializer.paginated(res, result.data, result.pagination);
  }

  async create(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateProjectRequest;
    const userId = req.user!.userId;
    const project = await projectService.createProject(data, userId);
    ResponseSerializer.success(res, project, { message: 'Project created successfully' });
  }

  async deploy(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const userId = req.user!.userId;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const project = await projectService.getProjectByName(name as string, userId);
      
      const result = await deployService.deploy(project, (step: string, message: string) => {
        sendEvent('progress', { step, message });
      });
      
      if (result.port !== project.port) {
        await projectService.updateProjectPort(name as string, result.port, userId);
      }
      
      sendEvent('complete', { message: `🚀 Deployed successfully! https://${result.domain}` });
      res.end();
    } catch (error: any) {
      sendEvent('error', { message: error.message });
      res.end();
    }
  }

  async action(req: Request, res: Response): Promise<void> {
    const { name, action } = req.params;
    
    logger.info('Action request', { name, action, type: typeof action });
    
    let result;
    switch (action) {
      case 'start':
        result = await dockerService.startContainer(name as string);
        break;
      case 'stop':
        result = await dockerService.stopContainer(name as string);
        break;
      case 'restart':
        result = await dockerService.restartContainer(name as string);
        break;
      default:
        logger.warn('Invalid action received', { name, action });
        return ResponseSerializer.error(res, 400, 'Invalid action');
    }
    
    if (!result.success) {
      return ResponseSerializer.error(res, 500, result.error || 'Action failed');
    }
    
    ResponseSerializer.success(res, { action, container: name }, { message: `Container ${action}ed successfully` });
  }

  async logs(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const result = await dockerService.getContainerLogs(name as string);

    if (!result.success) {
      // Container belum ada = belum pernah di-deploy, bukan error fatal
      const notFound = result.error?.includes('No such container') || result.error?.includes('no such container');
      return ResponseSerializer.error(res, notFound ? 404 : 500,
        notFound ? 'Container belum ada. Deploy project terlebih dahulu.' : (result.error || 'Failed to get logs')
      );
    }

    ResponseSerializer.success(res, { logs: result.logs });
  }

  async updateEnv(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const { env } = req.body as UpdateEnvRequest;
    const userId = req.user!.userId;
    await projectService.updateProjectEnv(name as string, env, userId);
    ResponseSerializer.success(res, null, { message: 'Environment variables updated. Redeploy to apply changes.' });
  }

  async updateResources(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const userId = req.user!.userId;
    await projectService.updateProjectResources(name as string, req.body, userId);
    ResponseSerializer.success(res, null, { message: 'Resources updated. Redeploy to apply changes.' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const userId = req.user!.userId;
    const project = await projectService.getProjectByName(name as string, userId);

    // Stop and remove container
    await dockerService.stopAndRemove(name as string);

    // Remove Docker image
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);
      const imageName = `deployer-${name}:latest`;
      await execFileAsync('docker', ['rmi', imageName]);
    } catch (error) {
      logger.warn('Failed to remove Docker image', { name });
    }

    // Remove repo directory
    try {
      const fsModule = await import('fs/promises');
      const pathModule = await import('path');
      const repoPath = pathModule.join('./data', 'repos', name as string);
      await fsModule.rm(repoPath, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Failed to remove repo directory', { name });
    }

    // Remove Cloudflare route
    try {
      if ((project as any).domainId) {
        // Multi-domain mode: remove via domain service
        await domainService.removeDnsForProject(project.subdomain, (project as any).domainId);
      } else {
        // Legacy mode: use cloudflare-remove.sh script
        const { execFile } = await import('child_process');
        const { promisify } = await import('util');
        const execFileAsync = promisify(execFile);
        const pathModule = await import('path');
        const domain = `${project.subdomain}.${process.env.DOMAIN || 'yourdomain.com'}`;
        const HOMELAB_PATH = process.env.HOMELAB_PATH || '/homelab';
        const scriptPath = pathModule.join(HOMELAB_PATH, 'scripts', 'cloudflare-remove.sh');
        await execFileAsync('sh', [scriptPath, domain]);
      }
    } catch (error) {
      logger.warn('Failed to remove Cloudflare route', { name });
    }

    await projectService.deleteProject(name as string, userId);
    ResponseSerializer.success(res, null, { message: 'Project deleted successfully' });
  }
}

export default new ProjectController();
