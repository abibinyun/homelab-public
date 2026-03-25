import { Request, Response } from 'express';
import crypto from 'crypto';
import projectService from '../services/project.service.js';
import { UnauthorizedError } from '../types/index.js';
import { ResponseSerializer } from '../utils/response.js';
import logger from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
    const port = process.env.PORT || 3000;
    const internalToken = process.env.INTERNAL_WEBHOOK_TOKEN || 'webhook';
    execAsync(`curl -X POST http://localhost:${port}/api/projects/${projectName}/deploy -H "Authorization: Bearer ${internalToken}" > /dev/null 2>&1 &`)
      .then(() => logger.info('Deploy triggered', { project: projectName }))
      .catch((error) => logger.error('Deploy trigger failed', error));
  }
}

export default new WebhookController();
