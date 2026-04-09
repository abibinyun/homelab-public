import { Request, Response } from 'express';
import deployLogRepository from '../repositories/deployLog.repository.js';
import { ResponseSerializer } from '../utils/response.js';

class DeployLogController {
  async listByProject(req: Request, res: Response) {
    const logs = await deployLogRepository.getByProject(String(req.params.name));
    ResponseSerializer.success(res, logs);
  }

  async getById(req: Request, res: Response) {
    const log = await deployLogRepository.getById(Number(req.params.id));
    ResponseSerializer.success(res, log);
  }
}

export default new DeployLogController();
