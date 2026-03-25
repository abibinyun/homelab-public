import dns from 'dns/promises';
import crypto from 'crypto';
import logger from '../utils/logger.js';

export class DnsService {
  /**
   * Generate verification token
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify domain ownership via TXT record
   * Expected: _deployer-verify.domain.com TXT "token"
   */
  async verifyDomainOwnership(domain: string, expectedToken: string): Promise<boolean> {
    try {
      const verificationDomain = `_deployer-verify.${domain}`;
      
      logger.info('Verifying domain ownership', { domain, verificationDomain });
      
      const records = await dns.resolveTxt(verificationDomain);
      
      // Check if any TXT record matches our token
      for (const record of records) {
        const value = Array.isArray(record) ? record.join('') : record;
        if (value === expectedToken) {
          logger.info('Domain verification successful', { domain });
          return true;
        }
      }
      
      logger.warn('Domain verification failed - token not found', { domain });
      return false;
    } catch (error: any) {
      logger.error('Domain verification error', { domain, error: error.message });
      return false;
    }
  }

  /**
   * Check if domain resolves (basic DNS check)
   */
  async checkDomainExists(domain: string): Promise<boolean> {
    try {
      await dns.resolve4(domain);
      return true;
    } catch {
      try {
        await dns.resolve6(domain);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Get domain's current DNS records
   */
  async getDnsRecords(domain: string): Promise<{
    a?: string[];
    aaaa?: string[];
    cname?: string[];
    txt?: string[][];
  }> {
    const records: any = {};
    
    try {
      records.a = await dns.resolve4(domain);
    } catch {}
    
    try {
      records.aaaa = await dns.resolve6(domain);
    } catch {}
    
    try {
      records.cname = await dns.resolveCname(domain);
    } catch {}
    
    try {
      records.txt = await dns.resolveTxt(domain);
    } catch {}
    
    return records;
  }

  /**
   * Validate domain format
   */
  isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(domain);
  }

  /**
   * Extract root domain from subdomain
   */
  getRootDomain(domain: string): string {
    const parts = domain.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return domain;
  }
}

export default new DnsService();
