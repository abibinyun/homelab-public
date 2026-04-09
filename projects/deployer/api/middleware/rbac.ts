import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../types/index.js';
import type { UserRole, ClientPermission } from '../types/index.js';
import db from '../db/index.js';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role as UserRole;
    if (!role || !roles.includes(role)) {
      return next(new UnauthorizedError('Insufficient role'));
    }
    next();
  };
}

export function requirePermission(permission: keyof Omit<ClientPermission, 'id' | 'clientId' | 'updatedAt'>) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const role = req.user?.role as UserRole;
      // superadmin & admin bypass all permission gates
      if (role === 'superadmin' || role === 'admin') return next();

      const clientId = req.user?.clientId;
      if (!clientId) return next(new UnauthorizedError('No client associated'));

      const result = await db.query(
        `SELECT * FROM client_permissions WHERE client_id = $1`,
        [clientId]
      );
      const perms: ClientPermission = result.rows[0];
      if (!perms || !perms[permission]) {
        return next(new UnauthorizedError('Permission denied'));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
