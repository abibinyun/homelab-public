import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import auditController from '../controllers/audit.controller.js';

const router = express.Router();

router.get('/', requireAuth, requireRole('superadmin', 'admin'), asyncHandler(auditController.list.bind(auditController)));

export default router;
