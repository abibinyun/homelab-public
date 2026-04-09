import { Request, Response } from 'express';
import clientService from '../services/client.service.js';
import { ResponseSerializer } from '../utils/response.js';
import { NotFoundError } from '../types/index.js';

class ClientController {
  async list(_req: Request, res: Response) {
    const clients = await clientService.list();
    ResponseSerializer.success(res, clients);
  }

  async get(req: Request, res: Response) {
    const client = await clientService.get(Number(req.params.id));
    if (!client) throw new NotFoundError('Client not found');
    ResponseSerializer.success(res, client);
  }

  async create(req: Request, res: Response) {
    const client = await clientService.create(req.body);
    res.status(201);
    ResponseSerializer.success(res, client);
  }

  async update(req: Request, res: Response) {
    const client = await clientService.update(Number(req.params.id), req.body);
    if (!client) throw new NotFoundError('Client not found');
    ResponseSerializer.success(res, client);
  }

  async delete(req: Request, res: Response) {
    await clientService.delete(Number(req.params.id));
    ResponseSerializer.success(res, { message: 'Deleted' });
  }

  async summary(req: Request, res: Response) {
    const data = await clientService.summary(Number(req.params.id));
    ResponseSerializer.success(res, data);
  }
}

export default new ClientController();
