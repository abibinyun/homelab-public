import type { Request, Response } from 'express';
import clientDomainService from '../services/clientDomain.service.js';
import { ResponseSerializer } from '../utils/response.js';

class ClientDomainController {
  async list(req: Request, res: Response) {
    const domains = await clientDomainService.list(Number(req.params.id));
    ResponseSerializer.success(res, domains);
  }

  async add(req: Request, res: Response) {
    const domain = await clientDomainService.add(Number(req.params.id), req.body);
    res.status(201);
    ResponseSerializer.success(res, domain);
  }

  async remove(req: Request, res: Response) {
    await clientDomainService.remove(Number(req.params.domainId));
    ResponseSerializer.success(res, { message: 'Deleted' });
  }

  async verify(req: Request, res: Response) {
    await clientDomainService.verify(Number(req.params.domainId));
    ResponseSerializer.success(res, { message: 'Verified' });
  }
}

export default new ClientDomainController();
