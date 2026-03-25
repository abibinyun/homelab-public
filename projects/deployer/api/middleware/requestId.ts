import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Use existing request ID from header or generate new one
  const id = (req.headers['x-request-id'] as string) || uuidv4();
  
  req.id = id;
  res.setHeader('X-Request-ID', id);
  
  next();
}
