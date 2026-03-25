import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import customDomainService from '../services/customDomain.service.js';
import { ResponseSerializer } from '../utils/response.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Add custom domain to project
 * POST /api/domains
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { projectName, domain } = req.body;

    if (!projectName || !domain) {
      return ResponseSerializer.error(res, 400, 'Project name and domain are required');
    }

    const result = await customDomainService.addDomain(projectName, domain);

    ResponseSerializer.success(res, result);
  } catch (error: any) {
    logger.error('Add domain error', { error: error.message });
    next(error);
  }
});

/**
 * Verify domain ownership
 * POST /api/domains/:id/verify
 */
router.post('/:id/verify', requireAuth, async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.id as string);
    
    const verified = await customDomainService.verifyDomain(domainId);

    if (verified) {
      ResponseSerializer.success(res, { verified: true });
    } else {
      ResponseSerializer.error(res, 400, 'Domain verification failed. Please check your DNS records.');
    }
  } catch (error: any) {
    logger.error('Verify domain error', { error: error.message });
    next(error);
  }
});

/**
 * Get domains for project
 * GET /api/domains/project/:projectName
 */
router.get('/project/:projectName', requireAuth, async (req, res, next) => {
  try {
    const projectName = req.params.projectName as string;
    
    const domains = await customDomainService.getProjectDomains(projectName);

    ResponseSerializer.success(res, domains);
  } catch (error: any) {
    logger.error('Get project domains error', { error: error.message });
    next(error);
  }
});

/**
 * Check domain status
 * GET /api/domains/:id/status
 */
router.get('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.id as string);
    
    const status = await customDomainService.checkDomainStatus(domainId);

    ResponseSerializer.success(res, status);
  } catch (error: any) {
    logger.error('Check domain status error', { error: error.message });
    next(error);
  }
});

/**
 * Delete custom domain
 * DELETE /api/domains/:id
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.id as string);
    
    await customDomainService.deleteDomain(domainId);

    ResponseSerializer.success(res, { deleted: true });
  } catch (error: any) {
    logger.error('Delete domain error', { error: error.message });
    next(error);
  }
});

export default router;
