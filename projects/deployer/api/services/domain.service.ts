import domainRepository from '../repositories/domain.repository.js';
import { CloudflareService } from './cloudflare.service.js';
import logger from '../utils/logger.js';
import type { Domain } from '../types/index.js';

class DomainService {
  async getAll(): Promise<Domain[]> {
    return domainRepository.getAll();
  }

  async getById(id: number): Promise<Domain | null> {
    return domainRepository.getById(id);
  }

  async create(data: {
    name: string;
    cfZoneId?: string;
    cfTunnelId?: string;
    cfApiToken?: string;
  }): Promise<Domain> {
    const existing = await domainRepository.getByName(data.name);
    if (existing) throw new Error(`Domain "${data.name}" already exists`);
    return domainRepository.create(data);
  }

  async update(id: number, data: {
    name?: string;
    cfZoneId?: string;
    cfTunnelId?: string;
    cfApiToken?: string;
    isActive?: boolean;
  }): Promise<Domain | null> {
    const domain = await domainRepository.getById(id);
    if (!domain) throw new Error('Domain not found');
    return domainRepository.update(id, data);
  }

  async delete(id: number): Promise<void> {
    const inUse = await domainRepository.isUsedByProject(id);
    if (inUse) throw new Error('Domain is still used by one or more projects');
    await domainRepository.delete(id);
  }

  /**
   * Assign a domain to a client (for multi-tenant scoping in Phase 3).
   * Stored in client_domains table for backward compat.
   */
  async assignToClient(domainId: number, clientId: number): Promise<void> {
    const domain = await domainRepository.getById(domainId);
    if (!domain) throw new Error('Domain not found');
    // Upsert into client_domains
    await (await import('../db/index.js')).default.query(
      `INSERT INTO client_domains (client_id, domain, cf_mode)
       VALUES ($1, $2, 'managed')
       ON CONFLICT DO NOTHING`,
      [clientId, domain.name]
    );
  }

  async unassignFromClient(domainId: number, clientId: number): Promise<void> {
    const domain = await domainRepository.getById(domainId);
    if (!domain) throw new Error('Domain not found');
    await (await import('../db/index.js')).default.query(
      `DELETE FROM client_domains WHERE client_id = $1 AND domain = $2`,
      [clientId, domain.name]
    );
  }

  /**
   * Setup DNS record for a subdomain using the domain's own CF credentials.
   * Falls back to global env credentials if domain has no token.
   */
  async setupDns(subdomain: string, domainId: number, onProgress?: (step: string, msg: string) => void, subdomainType?: string): Promise<string> {
    const domain = await domainRepository.getById(domainId);
    if (!domain) throw new Error('Domain not found');

    const fullDomain = subdomainType === 'root' ? domain.name : `${subdomain}.${domain.name}`;
    onProgress?.('cloudflare', `Configuring DNS for ${fullDomain}...`);

    const apiToken = await domainRepository.getApiToken(domainId);
    const cf = new CloudflareService({
      apiToken: apiToken || undefined,
      zoneId: domain.cfZoneId || undefined,
      tunnelId: domain.cfTunnelId || undefined,
    });

    if (!cf.isConfigured()) {
      onProgress?.('cloudflare', `⚠ Cloudflare not configured for ${domain.name} — add DNS manually`);
      return fullDomain;
    }

    try {
      await cf.addDnsRecord(fullDomain);
      onProgress?.('cloudflare', `✓ DNS configured for ${fullDomain}`);
    } catch (err) {
      logger.warn('DNS setup failed', { fullDomain, error: (err as Error).message });
      onProgress?.('cloudflare', `⚠ DNS setup failed: ${(err as Error).message}`);
    }

    return fullDomain;
  }

  /**
   * Remove DNS record for a subdomain using the domain's own CF credentials.
   */
  async removeDns(subdomain: string, domainId: number): Promise<void> {
    const domain = await domainRepository.getById(domainId);
    if (!domain) return;

    const fullDomain = `${subdomain}.${domain.name}`;
    const apiToken = await domainRepository.getApiToken(domainId);
    const cf = new CloudflareService({
      apiToken: apiToken || undefined,
      zoneId: domain.cfZoneId || undefined,
      tunnelId: domain.cfTunnelId || undefined,
    });

    if (!cf.isConfigured()) {
      logger.warn('Cloudflare not configured — DNS record not removed', { fullDomain });
      return;
    }

    try {
      const record = await cf.getDnsRecord(fullDomain);
      if (record?.id) {
        await cf.removeDnsRecord(record.id);
        logger.info('DNS record removed', { fullDomain });
      }
    } catch (err) {
      logger.warn('DNS removal failed', { fullDomain, error: (err as Error).message });
    }
  }
}

export default new DomainService();
