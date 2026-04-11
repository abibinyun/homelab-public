import type { Request, Response } from 'express';
import domainService from '../services/domain.service.js';

export const domainController = {
  async list(_req: Request, res: Response) {
    const domains = await domainService.getAll();
    res.json({ data: domains });
  },

  async get(req: Request, res: Response) {
    const domain = await domainService.getById(Number(req.params.id));
    if (!domain) return res.status(404).json({ error: 'Domain not found' });
    res.json({ data: domain });
  },

  async create(req: Request, res: Response) {
    const { name, cfZoneId, cfTunnelId, cfApiToken } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const domain = await domainService.create({ name, cfZoneId, cfTunnelId, cfApiToken });
    res.status(201).json({ data: domain });
  },

  async update(req: Request, res: Response) {
    const domain = await domainService.update(Number(req.params.id), req.body);
    if (!domain) return res.status(404).json({ error: 'Domain not found' });
    res.json({ data: domain });
  },

  async remove(req: Request, res: Response) {
    await domainService.delete(Number(req.params.id));
    res.json({ message: 'Domain deleted' });
  },
};
