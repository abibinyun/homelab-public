import { Request, Response } from 'express';
import crypto from 'crypto';
import projectService from '../services/project.service.js';
import { deployService } from '../services/deploy.js';
import { UnauthorizedError } from '../types/index.js';
import { ResponseSerializer } from '../utils/response.js';
import logger from '../utils/logger.js';

export class WebhookController {
  async github(req: Request, res: Response): Promise<void> {
    const { projectName } = req.params;
    const signature = req.headers['x-hub-signature-256'] as string;
    const event = req.headers['x-github-event'] as string;
    
    if (event !== 'push') {
      ResponseSerializer.success(res, null, { message: 'Event ignored' });
      return;
    }
    
    const project = await projectService.getProjectByName(projectName as string);

    // Require signature verification if webhookSecret is set
    if (project.webhookSecret) {
      if (!signature) throw new UnauthorizedError('Missing X-Hub-Signature-256 header');
      const hmac = crypto.createHmac('sha256', project.webhookSecret);
      const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        throw new UnauthorizedError('Invalid signature');
      }
    }
    
    this.triggerDeploy(projectName as string);
    logger.info('GitHub webhook triggered', { project: projectName, requestId: req.id });
    
    ResponseSerializer.success(res, { project: projectName }, { message: 'Deploy triggered' });
  }

  async gitlab(req: Request, res: Response): Promise<void> {
    const { projectName } = req.params;
    const token = req.headers['x-gitlab-token'] as string;
    const event = req.headers['x-gitlab-event'] as string;
    
    if (event !== 'Push Hook') {
      ResponseSerializer.success(res, null, { message: 'Event ignored' });
      return;
    }
    
    const project = await projectService.getProjectByName(projectName as string);

    if (project.webhookSecret) {
      if (!token) throw new UnauthorizedError('Missing X-Gitlab-Token header');
      if (token !== project.webhookSecret) throw new UnauthorizedError('Invalid token');
    }
    
    this.triggerDeploy(projectName as string);
    logger.info('GitLab webhook triggered', { project: projectName, requestId: req.id });
    
    ResponseSerializer.success(res, { project: projectName }, { message: 'Deploy triggered' });
  }

  async generic(req: Request, res: Response): Promise<void> {
    const { projectName } = req.params;
    
    await projectService.getProjectByName(projectName as string);
    
    this.triggerDeploy(projectName as string);
    logger.info('Generic webhook triggered', { project: projectName, requestId: req.id });
    
    ResponseSerializer.success(res, { project: projectName }, { message: 'Deploy triggered' });
  }

  private triggerDeploy(projectName: string): void {
    projectService.getProjectByName(projectName)
      .then(async (project) => {
        const p = project as any;
        const config = p.deployType && p.deployType !== 'DOCKERFILE'
          ? {
              name: project.name,
              slug: p.slug || project.name,
              subdomain: project.subdomain,
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
            }
          : null;

        if (config) {
          await deployService.deploy(config);
        } else {
          await deployService.deployLegacy(project);
        }
        await projectService.updateProjectStatus(projectName, 'RUNNING');
        logger.info('Webhook deploy completed', { project: projectName });
      })
      .catch((error) => {
        projectService.updateProjectStatus(projectName, 'FAILED').catch(() => {});
        logger.error('Webhook deploy failed', { project: projectName, error: error.message });
      });
  }
}

export default new WebhookController();
