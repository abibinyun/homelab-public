import { Request, Response, NextFunction } from 'express';
import { ResponseSerializer } from '../utils/response.js';

export function validateProjectCreate(req: Request, res: Response, next: NextFunction): void | Response {
  const { name, gitUrl, subdomain } = req.body;
  
  if (!name || !gitUrl || !subdomain) {
    return ResponseSerializer.error(res, 400, 'Missing required fields: name, gitUrl, subdomain');
  }
  
  if (!/^[a-z0-9-]+$/.test(name)) {
    return ResponseSerializer.error(res, 400, 'Project name must be lowercase alphanumeric with dashes only');
  }
  
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return ResponseSerializer.error(res, 400, 'Subdomain must be lowercase alphanumeric with dashes only');
  }
  
  next();
}

export function validateProjectName(req: Request, res: Response, next: NextFunction): void | Response {
  const { name } = req.params;
  
  if (!name) {
    return ResponseSerializer.error(res, 400, 'Project name is required');
  }
  
  next();
}
