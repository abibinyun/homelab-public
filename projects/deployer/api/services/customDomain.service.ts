import customDomainRepo from '../repositories/customDomain.repository.js';
import dnsService from './dns.service.js';
import cloudflareService from './cloudflare.service.js';
import logger from '../utils/logger.js';
import { CustomDomain, AppError } from '../types/index.js';
import { InputSanitizer } from '../utils/sanitizer.js';

export class CustomDomainService {
  /**
   * Add custom domain to project
   */
  async addDomain(projectName: string, domain: string): Promise<{
    domain: CustomDomain;
    verificationInstructions: {
      recordType: string;
      name: string;
      value: string;
    };
  }> {
    // Sanitize domain
    const sanitizedDomain = InputSanitizer.sanitizeDomain(domain);
    
    // Validate domain format
    if (!dnsService.isValidDomain(sanitizedDomain)) {
      throw new AppError(400, 'Invalid domain format');
    }

    // Check if domain already exists
    const existing = await customDomainRepo.findByDomain(sanitizedDomain);
    if (existing) {
      throw new AppError(409, 'Domain already registered');
    }

    // Generate verification token
    const verificationToken = dnsService.generateVerificationToken();

    // Create domain record
    const customDomain = await customDomainRepo.create(
      projectName,
      sanitizedDomain,
      verificationToken
    );

    logger.info('Custom domain added', { projectName, domain: sanitizedDomain });

    return {
      domain: customDomain,
      verificationInstructions: {
        recordType: 'TXT',
        name: `_deployer-verify.${sanitizedDomain}`,
        value: verificationToken
      }
    };
  }

  /**
   * Verify domain ownership and setup Cloudflare
   */
  async verifyDomain(domainId: number): Promise<boolean> {
    const domain = await customDomainRepo.findById(domainId);
    if (!domain) {
      throw new AppError(404, 'Domain not found');
    }

    if (domain.verified) {
      return true; // Already verified
    }

    // Verify DNS TXT record
    const isVerified = await dnsService.verifyDomainOwnership(
      domain.domain,
      domain.verificationToken
    );

    if (!isVerified) {
      return false;
    }

    // Mark as verified
    await customDomainRepo.markAsVerified(domainId);
    
    // Setup Cloudflare (if configured)
    if (cloudflareService.isConfigured()) {
      try {
        // Add DNS record
        const dnsRecordId = await cloudflareService.addDnsRecord(domain.domain);
        
        // Update with Cloudflare DNS ID
        await customDomainRepo.markAsVerified(domainId, dnsRecordId);
        
        // Update SSL status
        await customDomainRepo.updateSslStatus(domainId, 'pending');
        
        logger.info('Domain setup in Cloudflare', { domain: domain.domain });
        
        // Check SSL status after a delay
        setTimeout(async () => {
          const sslStatus = await cloudflareService.checkSslStatus(domain.domain);
          await customDomainRepo.updateSslStatus(domainId, sslStatus);
        }, 5000);
      } catch (error: any) {
        logger.error('Failed to setup Cloudflare', {
          domain: domain.domain,
          error: error.message
        });
        // Don't fail verification if Cloudflare setup fails
      }
    }
    
    logger.info('Domain verified successfully', { domain: domain.domain });
    return true;
  }

  /**
   * Get domains for project
   */
  async getProjectDomains(projectName: string): Promise<CustomDomain[]> {
    return customDomainRepo.findByProjectName(projectName);
  }

  /**
   * Delete custom domain
   */
  async deleteDomain(domainId: number): Promise<void> {
    const domain = await customDomainRepo.findById(domainId);
    if (!domain) {
      throw new AppError(404, 'Domain not found');
    }

    // Remove from Cloudflare if configured
    if (cloudflareService.isConfigured() && domain.cloudflareDnsId) {
      try {
        await cloudflareService.removeDnsRecord(domain.cloudflareDnsId);
        logger.info('Domain removed from Cloudflare', { domain: domain.domain });
      } catch (error: any) {
        logger.error('Failed to remove from Cloudflare', {
          domain: domain.domain,
          error: error.message
        });
        // Continue with deletion even if Cloudflare removal fails
      }
    }

    await customDomainRepo.delete(domainId);
    logger.info('Custom domain deleted', { domain: domain.domain });
  }

  /**
   * Check domain status
   */
  async checkDomainStatus(domainId: number): Promise<{
    verified: boolean;
    dnsRecords: any;
    sslStatus: string;
  }> {
    const domain = await customDomainRepo.findById(domainId);
    if (!domain) {
      throw new AppError(404, 'Domain not found');
    }

    const dnsRecords = await dnsService.getDnsRecords(domain.domain);

    // Update SSL status if Cloudflare is configured
    let sslStatus = domain.sslStatus;
    if (cloudflareService.isConfigured() && domain.verified) {
      try {
        sslStatus = await cloudflareService.checkSslStatus(domain.domain);
        if (sslStatus !== domain.sslStatus) {
          await customDomainRepo.updateSslStatus(domainId, sslStatus);
        }
      } catch (error) {
        // Ignore SSL check errors
      }
    }

    return {
      verified: domain.verified,
      dnsRecords,
      sslStatus
    };
  }
}

export default new CustomDomainService();
