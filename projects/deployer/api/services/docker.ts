import Docker from 'dockerode';

const dockerHost = process.env.DOCKER_HOST;
const docker = dockerHost?.startsWith('tcp://')
  ? new Docker({ host: dockerHost.replace('tcp://', '').split(':')[0], port: parseInt(dockerHost.split(':')[2] || '2375') })
  : new Docker({ socketPath: '/var/run/docker.sock' });

interface ServiceResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

interface ContainerLogsResult extends ServiceResult<string> {
  logs?: string;
}

export class DockerService {
  async listContainers(all = true): Promise<Docker.ContainerInfo[]> {
    return docker.listContainers({ all });
  }

  async getContainer(name: string): Promise<Docker.Container> {
    return docker.getContainer(name);
  }

  async stopContainer(name: string): Promise<ServiceResult> {
    try {
      const container = docker.getContainer(name);
      await container.stop().catch(() => {});
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async removeContainer(name: string, force = true): Promise<ServiceResult> {
    try {
      const container = docker.getContainer(name);
      await container.remove({ force });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async startContainer(name: string): Promise<ServiceResult> {
    try {
      const container = docker.getContainer(name);
      await container.start();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async restartContainer(name: string): Promise<ServiceResult> {
    try {
      const container = docker.getContainer(name);
      await container.restart();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getContainerLogs(name: string, tail = 100): Promise<ContainerLogsResult> {
    try {
      const container = docker.getContainer(name);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail
      });
      return { success: true, logs: logs.toString() };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async createContainer(config: Docker.ContainerCreateOptions): Promise<ServiceResult<Docker.Container>> {
    try {
      const container = await docker.createContainer(config);
      await container.start();
      return { success: true, data: container };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async stopAndRemove(name: string): Promise<ServiceResult> {
    await this.stopContainer(name);
    return this.removeContainer(name);
  }
}

export const dockerService = new DockerService();
