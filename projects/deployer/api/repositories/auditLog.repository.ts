import db from '../db/index.js';
import type { AuditLog } from '../types/index.js';

class AuditLogRepository {
  async insert(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
    await db.query(
      `INSERT INTO audit_logs (user_id, client_id, action, resource_type, resource_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [data.userId || null, data.clientId || null, data.action, data.resourceType || null,
       data.resourceId || null, JSON.stringify(data.metadata), data.ipAddress || null]
    );
  }

  async getAll(limit = 100, offset = 0): Promise<AuditLog[]> {
    const r = await db.query(
      `SELECT id, user_id as "userId", client_id as "clientId", action, resource_type as "resourceType",
              resource_id as "resourceId", metadata, ip_address as "ipAddress", created_at as "createdAt"
       FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return r.rows;
  }
}

export default new AuditLogRepository();
