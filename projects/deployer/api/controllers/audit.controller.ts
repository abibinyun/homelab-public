import { Request, Response } from 'express';
import auditLogRepository from '../repositories/auditLog.repository.js';
import { ResponseSerializer } from '../utils/response.js';

class AuditController {
  async list(req: Request, res: Response) {
    const limit = Number(req.query.limit) || 100;
    const offset = Number(req.query.offset) || 0;
    const logs = await auditLogRepository.getAll(limit, offset);
    ResponseSerializer.success(res, logs);
  }
}

export default new AuditController();
