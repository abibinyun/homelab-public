import axios from 'axios';
import logger from '../utils/logger.js';

interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
  tunnelId: string;
  accountId: string;
}

export class CloudflareService {
  private config: CloudflareConfig;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor() {
    this.config = {
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
      tunnelId: process.env.CLOUDFLARE_TUNNEL_ID || '',
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || ''
    };
  }

  /**
   * Check if Cloudflare is configured
   */
  isConfigured(): boolean {
    return !!(this.config.apiToken && this.config.zoneId && this.config.tunnelId);
  }

  /**
   * Add domain to Cloudflare Tunnel
   */
  async addTunnelRoute(domain: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/accounts/${this.config.accountId}/cfd_tunnel/${this.config.tunnelId}/configurations`,
        {
          config: {
            ingress: [
              {
                hostname: domain,
                service: 'http://traefik:80'
              }
            ]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Domain added to Cloudflare Tunnel', { domain });
      return response.data.result.id;
    } catch (error: any) {
      logger.error('Failed to add domain to Cloudflare Tunnel', {
        domain,
        error: error.response?.data || error.message
      });
      throw new Error('Failed to add domain to Cloudflare Tunnel');
    }
  }

  /**
   * Add DNS record for domain
   */
  async addDnsRecord(domain: string, type: 'CNAME' | 'A' = 'CNAME'): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare not configured');
    }

    try {
      const tunnelDomain = `${this.config.tunnelId}.cfargotunnel.com`;
      
      const response = await axios.post(
        `${this.baseUrl}/zones/${this.config.zoneId}/dns_records`,
        {
          type,
          name: domain,
          content: type === 'CNAME' ? tunnelDomain : '192.0.2.1', // Placeholder IP for A record
          proxied: true, // Enable Cloudflare proxy (SSL + DDoS protection)
          ttl: 1 // Auto TTL
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('DNS record added', { domain, type });
      return response.data.result.id;
    } catch (error: any) {
      // If record already exists, try to get it
      if (error.response?.data?.errors?.[0]?.code === 81057) {
        logger.info('DNS record already exists', { domain });
        const existing = await this.getDnsRecord(domain);
        return existing?.id || '';
      }

      logger.error('Failed to add DNS record', {
        domain,
        error: error.response?.data || error.message
      });
      throw new Error('Failed to add DNS record');
    }
  }

  /**
   * Get DNS record by name
   */
  async getDnsRecord(domain: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/zones/${this.config.zoneId}/dns_records?name=${domain}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`
          }
        }
      );

      return response.data.result[0] || null;
    } catch (error: any) {
      logger.error('Failed to get DNS record', { domain, error: error.message });
      return null;
    }
  }

  /**
   * Remove DNS record
   */
  async removeDnsRecord(recordId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare not configured');
    }

    try {
      await axios.delete(
        `${this.baseUrl}/zones/${this.config.zoneId}/dns_records/${recordId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`
          }
        }
      );

      logger.info('DNS record removed', { recordId });
    } catch (error: any) {
      logger.error('Failed to remove DNS record', {
        recordId,
        error: error.response?.data || error.message
      });
      throw new Error('Failed to remove DNS record');
    }
  }

  /**
   * Check SSL status for domain
   */
  async checkSslStatus(domain: string): Promise<'active' | 'pending' | 'failed'> {
    if (!this.isConfigured()) {
      return 'pending';
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/zones/${this.config.zoneId}/ssl/verification?hostname=${domain}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`
          }
        }
      );

      const status = response.data.result[0]?.certificate_status;
      
      if (status === 'active') return 'active';
      if (status === 'pending_validation') return 'pending';
      return 'failed';
    } catch (error: any) {
      logger.error('Failed to check SSL status', { domain, error: error.message });
      return 'pending';
    }
  }

  /**
   * Enable Universal SSL for domain
   */
  async enableUniversalSSL(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare not configured');
    }

    try {
      await axios.patch(
        `${this.baseUrl}/zones/${this.config.zoneId}/settings/ssl`,
        {
          value: 'flexible' // or 'full' for stricter SSL
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Universal SSL enabled');
    } catch (error: any) {
      logger.error('Failed to enable Universal SSL', {
        error: error.response?.data || error.message
      });
    }
  }

  /**
   * Get zone details
   */
  async getZoneInfo(): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/zones/${this.config.zoneId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`
          }
        }
      );

      return response.data.result;
    } catch (error: any) {
      logger.error('Failed to get zone info', { error: error.message });
      throw new Error('Failed to get zone info');
    }
  }
}

export default new CloudflareService();
