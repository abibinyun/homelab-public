import type { Request, Response } from 'express';
import templateService from '../services/template.service.js';

export const templateController = {
  async list(req: Request, res: Response) {
    const activeOnly = req.query.active === 'true';
    const templates = await templateService.getAll(activeOnly);
    res.json({ data: templates });
  },

  async get(req: Request, res: Response) {
    const t = await templateService.getById(Number(req.params.id));
    if (!t) return res.status(404).json({ error: 'Template not found' });
    res.json({ data: t });
  },

  async create(req: Request, res: Response) {
    const { name, description, composeContent, variables } = req.body;
    if (!name || !composeContent) return res.status(400).json({ error: 'name and composeContent are required' });
    const t = await templateService.create({ name, description, composeContent, variables });
    res.status(201).json({ data: t });
  },

  async update(req: Request, res: Response) {
    const t = await templateService.update(Number(req.params.id), req.body);
    if (!t) return res.status(404).json({ error: 'Template not found' });
    res.json({ data: t });
  },

  async remove(req: Request, res: Response) {
    await templateService.delete(Number(req.params.id));
    res.json({ message: 'Template deleted' });
  },
};
