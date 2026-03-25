import { Request, Response } from 'express';
import { dockerService } from '../services/docker.js';
import storageRepository from '../repositories/storage.repository.js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    storage: { status: 'ok' | 'error'; message?: string };
    docker: { status: 'ok' | 'error'; message?: string };
  };
}

export class HealthController {
  async check(_req: Request, res: Response): Promise<void> {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        storage: { status: 'ok' },
        docker: { status: 'ok' },
      },
    };

    // Check storage
    try {
      await storageRepository.getProjects();
    } catch (error: any) {
      health.checks.storage = { status: 'error', message: error.message };
      health.status = 'degraded';
    }

    // Check Docker
    try {
      await dockerService.listContainers();
    } catch (error: any) {
      health.checks.docker = { status: 'error', message: error.message };
      health.status = 'degraded';
    }

    // Set HTTP status based on health
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  }

  async liveness(_req: Request, res: Response): Promise<void> {
    // Simple liveness check - is the process running?
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  }

  async readiness(_req: Request, res: Response): Promise<void> {
    // Readiness check - can we serve traffic?
    try {
      await storageRepository.getProjects();
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(503).json({ 
        status: 'not ready', 
        error: error.message,
        timestamp: new Date().toISOString() 
      });
    }
  }

  async config(_req: Request, res: Response): Promise<void> {
    res.json({
      demo: process.env.DEMO_MODE === 'true',
      cloudflare: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID && process.env.CLOUDFLARE_TUNNEL_ID),
      customDomain: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID),
    });
  }
}

export default new HealthController();
