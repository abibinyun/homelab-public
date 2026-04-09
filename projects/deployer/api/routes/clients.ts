import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import clientController from '../controllers/client.controller.js';
import permissionController from '../controllers/permission.controller.js';
import domainController from '../controllers/domain.controller.js';
import deployLogController from '../controllers/deployLog.controller.js';

const router = express.Router();

// All routes require auth
router.use(requireAuth);

// Clients CRUD (admin+)
router.get('/', requireRole('superadmin', 'admin'), asyncHandler(clientController.list.bind(clientController)));
router.post('/', requireRole('superadmin', 'admin'), auditLog('client.create', 'client'), asyncHandler(clientController.create.bind(clientController)));
router.get('/:id', requireRole('superadmin', 'admin'), asyncHandler(clientController.get.bind(clientController)));
router.put('/:id', requireRole('superadmin', 'admin'), auditLog('client.update', 'client'), asyncHandler(clientController.update.bind(clientController)));
router.delete('/:id', requireRole('superadmin'), auditLog('client.delete', 'client'), asyncHandler(clientController.delete.bind(clientController)));
router.get('/:id/summary', requireRole('superadmin', 'admin'), asyncHandler(clientController.summary.bind(clientController)));

// Permissions
router.get('/:id/permissions', requireRole('superadmin', 'admin'), asyncHandler(permissionController.get.bind(permissionController)));
router.put('/:id/permissions', requireRole('superadmin', 'admin'), auditLog('permission.update', 'client'), asyncHandler(permissionController.update.bind(permissionController)));

// Domains
router.get('/:id/domains', requireRole('superadmin', 'admin'), asyncHandler(domainController.list.bind(domainController)));
router.post('/:id/domains', requireRole('superadmin', 'admin'), auditLog('domain.add', 'client'), asyncHandler(domainController.add.bind(domainController)));
router.delete('/:id/domains/:domainId', requireRole('superadmin', 'admin'), auditLog('domain.remove', 'client'), asyncHandler(domainController.remove.bind(domainController)));
router.post('/:id/domains/:domainId/verify', requireRole('superadmin', 'admin'), asyncHandler(domainController.verify.bind(domainController)));

// Deploy logs per project (accessible from client routes too)
router.get('/projects/:name/deploys', asyncHandler(deployLogController.listByProject.bind(deployLogController)));
router.get('/deploys/:id/logs', asyncHandler(deployLogController.getById.bind(deployLogController)));

export default router;
