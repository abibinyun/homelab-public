import { Request, Response } from 'express';
import domainService from '../services/domain.service.js';
import { ResponseSerializer } from '../utils/response.js';

class DomainController {
  async list(req: Request, res: Response) {
    const domains = await domainService.list(Number(req.params.id));
    ResponseSerializer.success(res, domains);
  }

  async add(req: Request, res: Response) {
    const domain = await domainService.add(Number(req.params.id), req.body);
    res.status(201);
    ResponseSerializer.success(res, domain);
  }

  async remove(req: Request, res: Response) {
    await domainService.remove(Number(req.params.domainId));
    ResponseSerializer.success(res, { message: 'Deleted' });
  }

  async verify(req: Request, res: Response) {
    await domainService.verify(Number(req.params.domainId));
    ResponseSerializer.success(res, { message: 'Verified' });
  }
}

export default new DomainController();
