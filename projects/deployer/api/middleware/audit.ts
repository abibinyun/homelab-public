import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';

export function auditLog(action: string, resourceType?: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    next();
    // fire-and-forget after response
    if (!db.isConnected()) return;
    const resourceId = req.params?.name || req.params?.id || undefined;
    db.query(
      `INSERT INTO audit_logs (user_id, client_id, action, resource_type, resource_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user?.userId || null,
        req.user?.clientId || null,
        action,
        resourceType || null,
        resourceId || null,
        JSON.stringify({ method: req.method, path: req.path }),
        req.ip || null,
      ]
    ).catch(() => {});
  };
}
