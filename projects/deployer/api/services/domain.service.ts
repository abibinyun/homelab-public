import clientDomainRepository from '../repositories/clientDomain.repository.js';
import type { ClientDomain } from '../types/index.js';
import { CloudflareService } from './cloudflare.service.js';
import { dockerService } from './docker.js';
import logger from '../utils/logger.js';

class DomainService {
  async list(clientId: number) {
    return clientDomainRepository.getByClient(clientId);
  }

  async add(clientId: number, data: Omit<ClientDomain, 'id' | 'clientId' | 'createdAt'>) {
    const domain = await clientDomainRepository.create({ ...data, clientId });
    // Auto-provision cloudflared tunnel container untuk domain ini
    await this.provisionTunnel(domain).catch(err =>
      logger.warn('Tunnel provision failed (manual setup needed)', { domain: domain.domain, error: err.message })
    );
    return domain;
  }

  async remove(domainId: number) {
    const domain = await clientDomainRepository.getById(domainId);
    if (domain) await this.deprovisionTunnel(domain).catch(() => {});
    return clientDomainRepository.delete(domainId);
  }

  async verify(domainId: number) {
    return clientDomainRepository.verify(domainId);
  }

  // ── Tunnel provisioning ──────────────────────────────────────────────────────

  /**
   * Spawn cloudflared container untuk domain ini.
   * - managed: pakai TUNNEL_TOKEN dari env (shared tunnel, sudah jalan — skip)
   * - unmanaged: spawn container baru dengan token client
   */
  async provisionTunnel(domain: ClientDomain): Promise<void> {
    if (domain.cfMode === 'managed') {
      // Shared tunnel sudah jalan, tidak perlu container baru
      logger.info('Managed domain — using shared tunnel', { domain: domain.domain });
      return;
    }

    if (!domain.tunnelId) {
      logger.warn('Unmanaged domain tanpa tunnelId — skip provision', { domain: domain.domain });
      return;
    }

    const containerName = `cloudflared-${domain.domain.replace(/\./g, '-')}`;

    // Cek apakah sudah jalan
    const containers = await dockerService.listContainers();
    const existing = containers.find(c => c.Names.includes(`/${containerName}`));
    if (existing) {
      logger.info('Tunnel container sudah ada', { containerName });
      return;
    }

    // Ambil tunnel token — untuk unmanaged pakai CF API token sebagai tunnel token
    // (tunnel token berbeda dari API token, tapi kita simpan di cloudflareApiToken field)
    const tunnelToken = domain.cloudflareApiToken;
    if (!tunnelToken) {
      logger.warn('Tidak ada tunnel token untuk unmanaged domain', { domain: domain.domain });
      return;
    }

    const networkName = process.env.DOCKER_NETWORK || 'homelab-public_web';

    await dockerService.createContainer({
      name: containerName,
      Image: 'cloudflare/cloudflared:latest',
      Cmd: ['tunnel', 'run'],
      Env: [`TUNNEL_TOKEN=${tunnelToken}`],
      HostConfig: {
        RestartPolicy: { Name: 'unless-stopped' },
        NetworkMode: networkName,
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [networkName]: {},
        },
      },
    });

    logger.info('Tunnel container provisioned', { containerName, domain: domain.domain });
  }

  /**
   * Stop dan remove cloudflared container untuk domain ini.
   */
  async deprovisionTunnel(domain: ClientDomain): Promise<void> {
    if (domain.cfMode === 'managed') return;
    const containerName = `cloudflared-${domain.domain.replace(/\./g, '-')}`;
    await dockerService.stopAndRemove(containerName).catch(() => {});
    logger.info('Tunnel container removed', { containerName });
  }

  // ── CF helpers ───────────────────────────────────────────────────────────────

  private getCfService(clientDomain: ClientDomain): CloudflareService {
    if (clientDomain.cfMode === 'unmanaged' && clientDomain.cloudflareApiToken) {
      return new CloudflareService({
        apiToken: clientDomain.cloudflareApiToken,
        zoneId: clientDomain.cloudflareZoneId,
        tunnelId: clientDomain.tunnelId || process.env.CLOUDFLARE_TUNNEL_ID,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      });
    }
    return new CloudflareService();
  }

  /**
   * Saat domain pertama kali ditambahkan (unmanaged):
   * buat wildcard DNS record *.domain.com → tunnel
   * sehingga semua subdomain otomatis resolve tanpa perlu tambah record satu-satu.
   */
  async setupWildcardDns(domain: ClientDomain): Promise<void> {
    if (domain.cfMode !== 'unmanaged') return;
    const cf = this.getCfService(domain);
    if (!cf.isConfigured()) return;
    try {
      await cf.addDnsRecord(`*.${domain.domain}`);
      logger.info('Wildcard DNS created', { domain: domain.domain });
    } catch (err) {
      logger.warn('Wildcard DNS failed', { domain: domain.domain, error: (err as Error).message });
    }
  }

  /**
   * Called after project deploy — create DNS record for subdomain.domain
   * Untuk managed: buat record per subdomain
   * Untuk unmanaged: wildcard sudah cover semua subdomain, skip
   */
  async setupDnsForProject(
    subdomain: string,
    domainId: number,
    onProgress?: (step: string, msg: string) => void
  ): Promise<string> {
    const clientDomain = await clientDomainRepository.getById(domainId);
    if (!clientDomain) {
      logger.warn('Client domain not found, skipping DNS setup', { domainId });
      return subdomain;
    }

    const fullDomain = `${subdomain}.${clientDomain.domain}`;
    onProgress?.('cloudflare', `Configuring DNS for ${fullDomain}...`);

    try {
      const cf = this.getCfService(clientDomain);
      if (!cf.isConfigured()) {
        onProgress?.('cloudflare', '⚠ Cloudflare not configured — add DNS manually');
        return fullDomain;
      }

      if (clientDomain.cfMode === 'unmanaged') {
        // Wildcard sudah cover — tidak perlu buat record per subdomain
        onProgress?.('cloudflare', `✓ Covered by wildcard *.${clientDomain.domain}`);
      } else {
        await cf.addDnsRecord(fullDomain);
        onProgress?.('cloudflare', `✓ DNS record created: ${fullDomain}`);
      }
    } catch (err) {
      onProgress?.('cloudflare', `⚠ DNS setup failed: ${(err as Error).message}`);
      logger.warn('DNS setup failed', { fullDomain, error: (err as Error).message });
    }

    return fullDomain;
  }

  async removeDnsForProject(subdomain: string, domainId: number): Promise<void> {
    const clientDomain = await clientDomainRepository.getById(domainId);
    if (!clientDomain) return;
    if (clientDomain.cfMode === 'unmanaged') return; // wildcard, tidak perlu hapus per subdomain

    const fullDomain = `${subdomain}.${clientDomain.domain}`;
    try {
      const cf = this.getCfService(clientDomain);
      if (!cf.isConfigured()) return;
      const record = await cf.getDnsRecord(fullDomain);
      if (record?.id) await cf.removeDnsRecord(record.id);
      logger.info('DNS record removed', { fullDomain });
    } catch (err) {
      logger.warn('DNS removal failed', { fullDomain, error: (err as Error).message });
    }
  }
}

export default new DomainService();
