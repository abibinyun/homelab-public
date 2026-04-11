import { Project, ConflictError, NotFoundError, ProjectResources } from '../types/index.js';
import storageRepository from '../repositories/storage.repository.js';
import settingsService from './settings.service.js';
import { encryptToken } from '../utils/crypto.js';
import logger from '../utils/logger.js';

class ProjectService {
  async getAllProjects(userId: number, clientId?: number): Promise<Omit<Project, 'gitToken'>[]> {
    const projects = await storageRepository.getProjects(userId, clientId);
    return projects.map(({ gitToken, ...rest }) => rest);
  }

  async getProjectByName(name: string, userId?: number, clientId?: number): Promise<Project> {
    const project = await storageRepository.getProjectByName(name, userId, clientId);
    if (!project) throw new NotFoundError(`Project '${name}' not found`);
    return project;
  }

  async createProject(data: {
    name: string;
    gitUrl?: string;
    gitBranch?: string;
    subdomain: string;
    subdomainType?: 'subdomain' | 'root';
    env?: Record<string, string>;
    port?: number;
    gitToken?: string;
    resources?: ProjectResources;
    clientId?: number;
    domainId?: number;
    // v2
    deployType?: string;
    templateId?: number;
    registryImage?: string;
    composeVars?: Record<string, string>;
    dbMode?: string;
    redisMode?: string;
    domainRef?: number;
  }, userId: number): Promise<Omit<Project, 'gitToken'>> {
    const existing = await storageRepository.getProjectByName(data.name);
    if (existing) throw new ConflictError(`Project '${data.name}' already exists`);

    const maxProjects = process.env.MAX_PROJECTS ? parseInt(process.env.MAX_PROJECTS) : 0;
    if (maxProjects > 0) {
      const userProjects = await storageRepository.getProjects(userId);
      if (userProjects.length >= maxProjects) {
        throw new ConflictError(`Project limit reached (max ${maxProjects})`);
      }
    }

    const defaultResources = await settingsService.getDefaultResources();
    const resources: ProjectResources = { ...defaultResources, ...data.resources };

    const project: any = {
      name: data.name,
      slug: data.name,
      gitUrl: data.gitUrl || '',
      gitBranch: data.gitBranch || 'main',
      subdomain: data.subdomain,
      subdomainType: data.subdomainType || 'subdomain',
      env: data.env || {},
      userId,
      clientId: data.clientId,
      domainId: data.domainId,
      domainRef: data.domainRef || data.domainId,
      port: data.port || 3000,
      gitToken: data.gitToken ? encryptToken(data.gitToken) || '' : '',
      resources,
      deployType: data.deployType || 'DOCKERFILE',
      templateId: data.templateId || null,
      registryImage: data.registryImage || null,
      dbMode: data.dbMode || 'NONE',
      redisMode: data.redisMode || 'NONE',
      status: 'IDLE',
      createdAt: new Date().toISOString(),
    };

    await storageRepository.createProject(project);
    logger.info('Project created', { name: project.name, deployType: project.deployType });

    const { gitToken, ...rest } = project;
    return rest;
  }

  async updateProjectResources(name: string, resources: ProjectResources, userId: number): Promise<void> {
    await this.getProjectByName(name, userId);
    await storageRepository.updateProject(name, { resources });
  }

  async updateProjectEnv(name: string, env: Record<string, string>, userId: number): Promise<void> {
    await this.getProjectByName(name, userId);
    await storageRepository.updateProject(name, { env });
  }

  async updateProjectPort(name: string, port: number, userId: number): Promise<void> {
    await this.getProjectByName(name, userId);
    await storageRepository.updateProject(name, { port });
  }

  async updateProjectStatus(name: string, status: string): Promise<void> {
    await storageRepository.updateProject(name, { status } as any);
  }

  async deleteProject(name: string, userId: number, clientId?: number): Promise<void> {
    await this.getProjectByName(name, userId, clientId);
    await storageRepository.deleteProject(name, userId, clientId);
    logger.info('Project deleted', { name, userId });
  }
}

export default new ProjectService();
