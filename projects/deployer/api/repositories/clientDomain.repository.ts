import db from '../db/index.js';
import type { ClientDomain } from '../types/index.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';

class ClientDomainRepository {
  private mapRow(row: any): ClientDomain {
    return {
      id: row.id,
      clientId: row.client_id,
      domain: row.domain,
      cloudflareZoneId: row.cloudflare_zone_id || undefined,
      cloudflareApiToken: row.cloudflare_api_token ? decryptToken(row.cloudflare_api_token) || undefined : undefined,
      tunnelId: row.tunnel_id || undefined,
      cfMode: row.cf_mode,
      isPrimary: row.is_primary,
      verifiedAt: row.verified_at || undefined,
      createdAt: row.created_at,
    };
  }

  async getByClient(clientId: number): Promise<ClientDomain[]> {
    const r = await db.query(`SELECT * FROM client_domains WHERE client_id = $1 ORDER BY is_primary DESC, created_at`, [clientId]);
    return r.rows.map(this.mapRow);
  }

  async getById(id: number): Promise<ClientDomain | null> {
    const r = await db.query(`SELECT * FROM client_domains WHERE id = $1`, [id]);
    return r.rows[0] ? this.mapRow(r.rows[0]) : null;
  }

  async create(data: Omit<ClientDomain, 'id' | 'createdAt'>): Promise<ClientDomain> {
    const encToken = data.cloudflareApiToken ? encryptToken(data.cloudflareApiToken) : null;
    const r = await db.query(
      `INSERT INTO client_domains (client_id, domain, cloudflare_zone_id, cloudflare_api_token, tunnel_id, cf_mode, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.clientId, data.domain, data.cloudflareZoneId || null, encToken, data.tunnelId || null, data.cfMode, data.isPrimary]
    );
    return this.mapRow(r.rows[0]);
  }

  async delete(id: number): Promise<void> {
    await db.query(`DELETE FROM client_domains WHERE id = $1`, [id]);
  }

  async verify(id: number): Promise<void> {
    await db.query(`UPDATE client_domains SET verified_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
  }
}

export default new ClientDomainRepository();
