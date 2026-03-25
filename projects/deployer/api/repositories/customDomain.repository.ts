import db from '../db/index.js';
import { CustomDomain } from '../types/index.js';

// In-memory fallback (no DB)
const mockDomains: Map<string, CustomDomain[]> = new Map();
let nextId = 1;

function rowToCustomDomain(row: any): CustomDomain {
  return {
    id: row.id,
    projectId: 0,
    domain: row.domain,
    verificationToken: row.verification_token,
    verified: row.verified,
    verifiedAt: row.verified_at?.toISOString(),
    cloudflareDnsId: row.cloudflare_dns_id,
    sslStatus: row.ssl_status,
    status: row.status,
    createdAt: row.created_at?.toISOString(),
    updatedAt: row.updated_at?.toISOString(),
  };
}

export class CustomDomainRepository {
  async create(projectName: string, domain: string, verificationToken: string): Promise<CustomDomain> {
    if (db.isConnected()) {
      const result = await db.query(
        `INSERT INTO custom_domains (project_name, domain, verification_token)
         VALUES ($1, $2, $3) RETURNING *`,
        [projectName, domain, verificationToken]
      );
      return rowToCustomDomain(result.rows[0]);
    }
    const newDomain: CustomDomain = {
      id: nextId++, projectId: 0, domain, verificationToken,
      verified: false, sslStatus: 'pending', status: 'pending',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const domains = mockDomains.get(projectName) || [];
    domains.push(newDomain);
    mockDomains.set(projectName, domains);
    return newDomain;
  }

  async findById(id: number): Promise<CustomDomain | null> {
    if (db.isConnected()) {
      const result = await db.query(`SELECT * FROM custom_domains WHERE id = $1`, [id]);
      return result.rows[0] ? rowToCustomDomain(result.rows[0]) : null;
    }
    for (const domains of mockDomains.values()) {
      const found = domains.find(d => d.id === id);
      if (found) return found;
    }
    return null;
  }

  async findByDomain(domain: string): Promise<CustomDomain | null> {
    if (db.isConnected()) {
      const result = await db.query(`SELECT * FROM custom_domains WHERE domain = $1`, [domain]);
      return result.rows[0] ? rowToCustomDomain(result.rows[0]) : null;
    }
    for (const domains of mockDomains.values()) {
      const found = domains.find(d => d.domain === domain);
      if (found) return found;
    }
    return null;
  }

  async findByProjectName(projectName: string): Promise<CustomDomain[]> {
    if (db.isConnected()) {
      const result = await db.query(
        `SELECT * FROM custom_domains WHERE project_name = $1 ORDER BY created_at DESC`,
        [projectName]
      );
      return result.rows.map(rowToCustomDomain);
    }
    return mockDomains.get(projectName) || [];
  }

  async markAsVerified(id: number, cloudflareDnsId?: string): Promise<void> {
    if (db.isConnected()) {
      await db.query(
        `UPDATE custom_domains SET verified = true, verified_at = NOW(), cloudflare_dns_id = $2, status = 'active', updated_at = NOW() WHERE id = $1`,
        [id, cloudflareDnsId || null]
      );
      return;
    }
    for (const domains of mockDomains.values()) {
      const d = domains.find(d => d.id === id);
      if (d) { d.verified = true; d.verifiedAt = new Date().toISOString(); d.cloudflareDnsId = cloudflareDnsId; d.status = 'active'; }
    }
  }

  async updateSslStatus(id: number, sslStatus: string): Promise<void> {
    if (db.isConnected()) {
      await db.query(`UPDATE custom_domains SET ssl_status = $2, updated_at = NOW() WHERE id = $1`, [id, sslStatus]);
      return;
    }
    for (const domains of mockDomains.values()) {
      const d = domains.find(d => d.id === id);
      if (d) d.sslStatus = sslStatus as any;
    }
  }

  async updateStatus(id: number, status: string): Promise<void> {
    if (db.isConnected()) {
      await db.query(`UPDATE custom_domains SET status = $2, updated_at = NOW() WHERE id = $1`, [id, status]);
      return;
    }
    for (const domains of mockDomains.values()) {
      const d = domains.find(d => d.id === id);
      if (d) { d.status = status as any; d.updatedAt = new Date().toISOString(); }
    }
  }

  async delete(id: number): Promise<void> {
    if (db.isConnected()) {
      await db.query(`DELETE FROM custom_domains WHERE id = $1`, [id]);
      return;
    }
    for (const [projectName, domains] of mockDomains.entries()) {
      const index = domains.findIndex(d => d.id === id);
      if (index !== -1) { domains.splice(index, 1); mockDomains.set(projectName, domains); return; }
    }
  }
}

export default new CustomDomainRepository();
