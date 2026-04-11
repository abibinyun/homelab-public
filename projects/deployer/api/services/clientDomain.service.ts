import clientDomainRepository from '../repositories/clientDomain.repository.js';
import { dockerService } from './docker.js';
import logger from '../utils/logger.js';
import type { ClientDomain } from '../types/index.js';

/**
 * Legacy service for client_domains table (Phase 3 will migrate this to domains table).
 */
class ClientDomainService {
  async list(clientId: number): Promise<ClientDomain[]> {
    return clientDomainRepository.getByClient(clientId);
  }

  async add(clientId: number, data: any): Promise<ClientDomain> {
    const domain = await clientDomainRepository.create({ ...data, clientId });
    await this.provisionTunnel(domain).catch(err =>
      logger.warn('Tunnel provision failed', { domain: domain.domain, error: err.message })
    );
    return domain;
  }

  async remove(domainId: number): Promise<void> {
    const domain = await clientDomainRepository.getById(domainId);
    if (domain) await this.deprovisionTunnel(domain).catch(() => {});
    await clientDomainRepository.delete(domainId);
  }

  async verify(domainId: number): Promise<void> {
    return clientDomainRepository.verify(domainId);
  }

  private async provisionTunnel(domain: ClientDomain): Promise<void> {
    if (domain.cfMode === 'managed') return;
    if (!domain.tunnelId) return;
    const containerName = `cloudflared-${domain.domain.replace(/\./g, '-')}`;
    const containers = await dockerService.listContainers();
    if (containers.find(c => c.Names.includes(`/${containerName}`))) return;
    const tunnelToken = domain.cloudflareApiToken;
    if (!tunnelToken) return;
    const networkName = process.env.DOCKER_NETWORK || 'homelab-public_web';
    await dockerService.createContainer({
      name: containerName,
      Image: 'cloudflare/cloudflared:latest',
      Cmd: ['tunnel', 'run'],
      Env: [`TUNNEL_TOKEN=${tunnelToken}`],
      HostConfig: { RestartPolicy: { Name: 'unless-stopped' }, NetworkMode: networkName },
    });
  }

  private async deprovisionTunnel(domain: ClientDomain): Promise<void> {
    if (domain.cfMode === 'managed') return;
    const containerName = `cloudflared-${domain.domain.replace(/\./g, '-')}`;
    await dockerService.stopAndRemove(containerName).catch(() => {});
  }
}

export default new ClientDomainService();
