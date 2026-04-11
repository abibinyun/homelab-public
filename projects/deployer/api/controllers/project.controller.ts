import { Request, Response } from 'express';
import projectService from '../services/project.service.js';
import { dockerService } from '../services/docker.js';
import { deployService } from '../services/deploy.js';
import composeService from '../services/compose.service.js';
import databaseService from '../services/database.service.js';
import domainService from '../services/domain.service.js';
import db from '../db/index.js';
import { UpdateEnvRequest } from '../types/index.js';
import { ResponseSerializer } from '../utils/response.js';
import { paginate } from '../utils/pagination.js';
import { paginationSchema } from '../schemas/index.js';
import logger from '../utils/logger.js';

export class ProjectController {
  async list(req: Request, res: Response): Promise<void> {
    const paginationParams = paginationSchema.parse(req.query);
    const userId = req.user!.userId;
    const clientId = req.user!.clientId;

    const projects = await projectService.getAllProjects(userId, clientId);
    const containers = await dockerService.listContainers();

    const enriched = projects.map(p => {
      const container = containers.find(c => c.Names.includes(`/${p.name}`));
      return { ...p, status: container?.State || (p as any).status || 'not-found', containerId: container?.Id };
    });

    const result = paginate(enriched, paginationParams);
    ResponseSerializer.paginated(res, result.data, result.pagination);
  }

  async create(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const clientId = req.user!.clientId;
    // Merge clientId from token if user is a client
    const data = { ...req.body, ...(clientId ? { clientId } : {}) };
    const project = await projectService.createProject(data, userId);
    ResponseSerializer.success(res, project, { message: 'Project created successfully' });
  }

  async deploy(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const userId = req.user!.userId;
    const clientId = req.user!.clientId;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const project = await projectService.getProjectByName(name as string, userId, clientId);
      const p = project as any;

      // v2: use full deploy config if deployType is set
      let result;
      if (p.deployType && p.deployType !== 'DOCKERFILE') {
        result = await deployService.deploy({
          name: project.name,
          slug: p.slug || project.name,
          subdomain: project.subdomain,
          subdomainType: p.subdomainType || 'subdomain',
          domainId: p.domainRef || p.domainId,
          deployType: p.deployType,
          gitUrl: project.gitUrl,
          gitToken: project.gitToken,
          gitBranch: p.gitBranch || 'main',
          registryImage: p.registryImage,
          templateId: p.templateId,
          composeVars: p.composeVars || {},
          env: project.env || {},
          port: project.port,
          dbMode: p.dbMode || 'NONE',
          redisMode: p.redisMode || 'NONE',
          resources: project.resources,
        }, (step, message) => sendEvent('progress', { step, message }));
      } else {
        result = await deployService.deployLegacy(project, (step, message) => sendEvent('progress', { step, message }));
      }

      if (result.port !== project.port) {
        await projectService.updateProjectPort(name as string, result.port, userId);
      }
      await projectService.updateProjectStatus(name as string, 'RUNNING');

      sendEvent('complete', { message: `🚀 Deployed successfully! https://${result.domain}` });
      res.end();
    } catch (error: any) {
      await projectService.updateProjectStatus(name as string, 'FAILED').catch(() => {});
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
    const clientId = req.user!.clientId;
    await projectService.getProjectByName(name as string, userId, clientId); // scope check
    await projectService.updateProjectEnv(name as string, env, userId);
    ResponseSerializer.success(res, null, { message: 'Environment variables updated. Redeploy to apply changes.' });
  }

  async updateResources(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const userId = req.user!.userId;
    const clientId = req.user!.clientId;
    await projectService.getProjectByName(name as string, userId, clientId); // scope check
    await projectService.updateProjectResources(name as string, req.body, userId);
    ResponseSerializer.success(res, null, { message: 'Resources updated. Redeploy to apply changes.' });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const userId = req.user!.userId;
    const clientId = req.user!.clientId;
    const project = await projectService.getProjectByName(name as string, userId, clientId);

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
        // v2: use domain service to remove DNS record via Cloudflare API
        await domainService.removeDns(project.subdomain, (project as any).domainId);
        logger.info('DNS record removed via domain service', { subdomain: project.subdomain });
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

    // Drop shared database if provisioned
    try {
      const p = project as any;
      if (p.dbMode === 'SHARED') {
        await databaseService.dropShared(p.slug || name as string);
      }
    } catch (error) {
      logger.warn('Failed to drop shared database', { name });
    }

    // Remove compose stack if exists
    try {
      const p = project as any;
      const slug = p.slug || name as string;
      if (await composeService.exists(slug)) {
        await composeService.down(composeService.stackDir(slug));
        const fsModule = await import('fs/promises');
        await fsModule.rm(composeService.stackDir(slug), { recursive: true, force: true });
      }
    } catch (error) {
      logger.warn('Failed to remove compose stack', { name });
    }

    await projectService.deleteProject(name as string, userId, clientId);
    ResponseSerializer.success(res, null, { message: 'Project deleted successfully' });
  }

  async services(req: Request, res: Response): Promise<void> {    const { name } = req.params;
    // Get project_services from DB
    const r = await db.query(
      `SELECT id, name, is_public as "isPublic", subdomain, port, created_at as "createdAt"
       FROM project_services ps
       JOIN projects p ON p.id = ps.project_id
       WHERE p.name = $1
       ORDER BY ps.name ASC`,
      [name]
    );
    // Enrich with container status
    const containers = await dockerService.listContainers();
    const services = r.rows.map((s: any) => {
      // docker compose names: {slug}-{service}-1 or {slug}_{service}_1
      const c = containers.find(x =>
        x.Names.some(n => n.includes(`${name}-${s.name}`) || n.includes(`${name}_${s.name}`))
      );
      return { ...s, status: c?.State || 'not-found' };
    });
    ResponseSerializer.success(res, services);
  }

  async composeLogs(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const tail = Number(req.query.tail) || 100;
    const r = await db.query(`SELECT slug FROM projects WHERE name = $1`, [name]);
    const slug = r.rows[0]?.slug || name;
    const stackDir = composeService.stackDir(slug);
    const exists = await composeService.exists(slug);
    if (!exists) return ResponseSerializer.error(res, 404, 'No compose stack found for this project');
    const logs = await composeService.logs(stackDir, tail);
    ResponseSerializer.success(res, { logs });
  }

  async history(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const limit = Number(req.query.limit) || 20;
    const r = await db.query(
      `SELECT id, project_name as "projectName", triggered_by as "triggeredBy",
              trigger_type as "triggerType", status, image_tag_before as "imageTagBefore",
              started_at as "startedAt", finished_at as "finishedAt",
              EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at))::int as "durationSec"
       FROM deploy_logs
       WHERE project_name = $1
       ORDER BY started_at DESC LIMIT $2`,
      [name, limit]
    );
    ResponseSerializer.success(res, r.rows);
  }

  async rollback(req: Request, res: Response): Promise<void> {
    const name = String(req.params.name);
    const userId = req.user!.userId;
    const clientId = req.user!.clientId;

    const project = await projectService.getProjectByName(name, userId, clientId);
    const p = project as any;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const sendEvent = (event: string, data: any) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      if (p.deployType === 'COMPOSE') {
        // Compose rollback: re-run deploy with previous git commit
        const slug = p.slug || name;
        const stackDir = composeService.stackDir(slug);
        if (!(await composeService.exists(slug))) throw new Error('No compose stack found to rollback');

        sendEvent('progress', { step: 'rollback', message: 'Stopping current compose stack...' });
        await composeService.down(stackDir);

        sendEvent('progress', { step: 'rollback', message: 'Restarting previous compose stack...' });
        await composeService.up(stackDir, (step, message) => sendEvent('progress', { step, message }));

        await projectService.updateProjectStatus(name, 'RUNNING');
        sendEvent('complete', { message: '✅ Compose stack rolled back to previous state' });
      } else {
        // DOCKERFILE / IMAGE rollback: docker tag :previous → :latest
        const imageName = `deployer-${name}`;

        sendEvent('progress', { step: 'rollback', message: 'Checking previous image...' });
        const rolled = await deployService.rollbackToPrevious(imageName);
        if (!rolled) throw new Error('No previous image found to rollback to');

        sendEvent('progress', { step: 'stop', message: 'Stopping current container...' });
        await dockerService.stopAndRemove(name);

        sendEvent('progress', { step: 'start', message: 'Starting previous version...' });
        const domainId = p.domainRef || p.domainId;
        const domain = domainId
          ? await domainService.setupDns(project.subdomain, domainId)
          : `${project.subdomain}.${process.env.DOMAIN || 'yourdomain.com'}`;
        await deployService.startContainer(
          { name, slug: p.slug || name, subdomain: project.subdomain, deployType: 'DOCKERFILE', env: project.env || {}, port: project.port, dbMode: 'NONE', redisMode: 'NONE', resources: project.resources as any },
          `${imageName}:latest`, domain
        );

        await projectService.updateProjectStatus(name, 'RUNNING');
        sendEvent('complete', { message: '✅ Rolled back to previous version' });
      }
      res.end();
    } catch (err: any) {
      await projectService.updateProjectStatus(name, 'FAILED').catch(() => {});
      sendEvent('error', { message: err.message });
      res.end();
    }
  }

  async stats(req: Request, res: Response): Promise<void> {
    const name = String(req.params.name);
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);
      const { stdout } = await execFileAsync('docker', [
        'stats', name, '--no-stream', '--format',
        '{"cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}","memPerc":"{{.MemPerc}}","net":"{{.NetIO}}","block":"{{.BlockIO}}"}'
      ]);
      ResponseSerializer.success(res, JSON.parse(stdout.trim()));
    } catch {
      ResponseSerializer.success(res, null);
    }
  }
}

export default new ProjectController();
