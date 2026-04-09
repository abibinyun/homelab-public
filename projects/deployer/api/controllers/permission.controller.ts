import { Request, Response } from 'express';
import permissionService from '../services/permission.service.js';
import { ResponseSerializer } from '../utils/response.js';

class PermissionController {
  async get(req: Request, res: Response) {
    const perms = await permissionService.get(Number(req.params.id));
    ResponseSerializer.success(res, perms);
  }

  async update(req: Request, res: Response) {
    const perms = await permissionService.update(Number(req.params.id), req.body);
    ResponseSerializer.success(res, perms);
  }
}

export default new PermissionController();
