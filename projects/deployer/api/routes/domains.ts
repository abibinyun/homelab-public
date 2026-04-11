import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { domainController } from '../controllers/domain.controller.js';
import domainService from '../services/domain.service.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', asyncHandler(domainController.list));
router.get('/:id', asyncHandler(domainController.get));
router.post('/', requireRole('superadmin', 'admin'), auditLog('domain.create', 'domain'), asyncHandler(domainController.create));
router.patch('/:id', requireRole('superadmin', 'admin'), auditLog('domain.update', 'domain'), asyncHandler(domainController.update));
router.delete('/:id', requireRole('superadmin', 'admin'), auditLog('domain.delete', 'domain'), asyncHandler(domainController.remove));

// Domain ↔ Client assignment
router.post('/:id/assign/:clientId', requireRole('superadmin', 'admin'), asyncHandler(async (req, res) => {
  await domainService.assignToClient(Number(req.params.id), Number(req.params.clientId));
  res.json({ message: 'Domain assigned to client' });
}));
router.delete('/:id/assign/:clientId', requireRole('superadmin', 'admin'), asyncHandler(async (req, res) => {
  await domainService.unassignFromClient(Number(req.params.id), Number(req.params.clientId));
  res.json({ message: 'Domain unassigned from client' });
}));

export default router;
