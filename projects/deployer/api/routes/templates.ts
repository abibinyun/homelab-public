import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { auditLog } from '../middleware/audit.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { templateController } from '../controllers/template.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', asyncHandler(templateController.list));
router.get('/:id', asyncHandler(templateController.get));
router.post('/', requireRole('superadmin', 'admin'), auditLog('template.create', 'template'), asyncHandler(templateController.create));
router.patch('/:id', requireRole('superadmin', 'admin'), auditLog('template.update', 'template'), asyncHandler(templateController.update));
router.delete('/:id', requireRole('superadmin', 'admin'), auditLog('template.delete', 'template'), asyncHandler(templateController.remove));

export default router;
