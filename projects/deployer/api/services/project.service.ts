import { Project, ConflictError, NotFoundError, ProjectResources } from '../types/index.js';
import storageRepository from '../repositories/storage.repository.js';
import settingsService from './settings.service.js';
import { encryptToken } from '../utils/crypto.js';
import logger from '../utils/logger.js';

class ProjectService {
  async getAllProjects(userId: number): Promise<Omit<Project, 'gitToken'>[]> {
    const projects = await storageRepository.getProjects(userId);
    return projects.map(p => {
      const { gitToken, ...rest } = p;
      return rest;
    });
  }

  async getProjectByName(name: string, userId?: number): Promise<Project> {
    const project = await storageRepository.getProjectByName(name, userId);
    if (!project) {
      throw new NotFoundError(`Project '${name}' not found`);
    }
    return project;
  }

  async createProject(data: {
    name: string;
    gitUrl: string;
    gitBranch?: string;
    subdomain: string;
    env?: Record<string, string>;
    port?: number;
    gitToken?: string;
    resources?: ProjectResources;
    clientId?: number;
    domainId?: number;
  }, userId: number): Promise<Omit<Project, 'gitToken'>> {
    const existing = await storageRepository.getProjectByName(data.name);
    if (existing) throw new ConflictError(`Project '${data.name}' already exists`);

    const maxProjects = process.env.MAX_PROJECTS ? parseInt(process.env.MAX_PROJECTS) : 0;
    if (maxProjects > 0) {
      const userProjects = await storageRepository.getProjects(userId);
      if (userProjects.length >= maxProjects) {
        throw new ConflictError(`Project limit reached (max ${maxProjects}). Increase MAX_PROJECTS in .env to allow more.`);
      }
    }

    const defaultResources = await settingsService.getDefaultResources();
    const resources: ProjectResources = { ...defaultResources, ...data.resources };

    const project: Project = {
      name: data.name,
      gitUrl: data.gitUrl,
      gitBranch: data.gitBranch || 'main',
      subdomain: data.subdomain,
      env: data.env || {},
      userId,
      clientId: data.clientId,
      domainId: data.domainId,
      port: data.port || 3000,
      gitToken: data.gitToken ? encryptToken(data.gitToken) || '' : '',
      resources,
      createdAt: new Date().toISOString(),
    };

    await storageRepository.createProject(project);
    logger.info('Project created', { name: project.name });

    const { gitToken, ...rest } = project;
    return rest;
  }

  async updateProjectResources(name: string, resources: ProjectResources, userId: number): Promise<void> {
    await this.getProjectByName(name, userId);
    await storageRepository.updateProject(name, { resources });
    logger.info('Project resources updated', { name, resources });
  }

  async updateProjectEnv(name: string, env: Record<string, string>, userId: number): Promise<void> {
    await this.getProjectByName(name, userId);
    await storageRepository.updateProject(name, { env });
    
    logger.info('Project env updated', { name, userId });
  }

  async updateProjectPort(name: string, port: number, userId: number): Promise<void> {
    await this.getProjectByName(name, userId);
    await storageRepository.updateProject(name, { port });
    
    logger.info('Project port updated', { name, port, userId });
  }

  async deleteProject(name: string, userId: number): Promise<void> {
    await this.getProjectByName(name, userId);
    await storageRepository.deleteProject(name, userId);
    
    logger.info('Project deleted', { name, userId });
  }
}

export default new ProjectService();
