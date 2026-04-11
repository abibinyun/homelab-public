import db from '../db/index.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';
import type { Domain } from '../types/index.js';

const SELECT = `
  id, name,
  cf_zone_id as "cfZoneId",
  cf_tunnel_id as "cfTunnelId",
  is_active as "isActive",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

class DomainRepository {
  async getAll(): Promise<Domain[]> {
    const r = await db.query(`SELECT ${SELECT} FROM domains ORDER BY name ASC`);
    return r.rows;
  }

  async getById(id: number): Promise<Domain | null> {
    const r = await db.query(`SELECT ${SELECT} FROM domains WHERE id = $1`, [id]);
    return r.rows[0] || null;
  }

  async getByName(name: string): Promise<Domain | null> {
    const r = await db.query(`SELECT ${SELECT} FROM domains WHERE name = $1`, [name]);
    return r.rows[0] || null;
  }

  async getApiToken(id: number): Promise<string | null> {
    const r = await db.query(`SELECT cf_api_token FROM domains WHERE id = $1`, [id]);
    const encrypted = r.rows[0]?.cf_api_token;
    return encrypted ? decryptToken(encrypted) : null;
  }

  async create(data: {
    name: string;
    cfZoneId?: string;
    cfTunnelId?: string;
    cfApiToken?: string;
  }): Promise<Domain> {
    const encrypted = data.cfApiToken ? encryptToken(data.cfApiToken) : null;
    const r = await db.query(
      `INSERT INTO domains (name, cf_zone_id, cf_tunnel_id, cf_api_token)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT}`,
      [data.name, data.cfZoneId || null, data.cfTunnelId || null, encrypted]
    );
    return r.rows[0];
  }

  async update(id: number, data: {
    name?: string;
    cfZoneId?: string;
    cfTunnelId?: string;
    cfApiToken?: string;
    isActive?: boolean;
  }): Promise<Domain | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (data.name !== undefined) { fields.push(`name = $${i++}`); values.push(data.name); }
    if (data.cfZoneId !== undefined) { fields.push(`cf_zone_id = $${i++}`); values.push(data.cfZoneId); }
    if (data.cfTunnelId !== undefined) { fields.push(`cf_tunnel_id = $${i++}`); values.push(data.cfTunnelId); }
    if (data.cfApiToken !== undefined) { fields.push(`cf_api_token = $${i++}`); values.push(encryptToken(data.cfApiToken)); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${i++}`); values.push(data.isActive); }
    if (!fields.length) return this.getById(id);
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const r = await db.query(
      `UPDATE domains SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${SELECT}`,
      values
    );
    return r.rows[0] || null;
  }

  async delete(id: number): Promise<void> {
    await db.query(`DELETE FROM domains WHERE id = $1`, [id]);
  }

  async isUsedByProject(id: number): Promise<boolean> {
    const r = await db.query(`SELECT 1 FROM projects WHERE domain_ref = $1 LIMIT 1`, [id]);
    return r.rows.length > 0;
  }
}

export default new DomainRepository();
