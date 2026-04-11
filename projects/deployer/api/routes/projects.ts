import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateBody, validateParams } from '../middleware/validate.js';

import { createProjectSchema, updateEnvSchema, projectNameSchema, projectActionSchema } from '../schemas/index.js';
import projectController from '../controllers/project.controller.js';
import deployLogController from '../controllers/deployLog.controller.js';

const router = express.Router();

router.get('/', requireAuth, asyncHandler(projectController.list.bind(projectController)));
router.post('/', requireAuth, validateBody(createProjectSchema), asyncHandler(projectController.create.bind(projectController)));
router.get('/:name/services', requireAuth, asyncHandler(projectController.services.bind(projectController)));
router.get('/:name/compose-logs', requireAuth, asyncHandler(projectController.composeLogs.bind(projectController)));
router.get('/:name/history', requireAuth, asyncHandler(projectController.history.bind(projectController)));
router.get('/:name/deploys', requireAuth, asyncHandler(deployLogController.listByProject.bind(deployLogController)));
router.post('/:name/rollback', requireAuth, asyncHandler(projectController.rollback.bind(projectController)));
router.get('/:name/stats', requireAuth, asyncHandler(projectController.stats.bind(projectController)));
router.post('/:name/deploy', requireAuth, validateParams(projectNameSchema), asyncHandler(projectController.deploy.bind(projectController)));
router.post('/:name/:action', requireAuth, validateParams(projectActionSchema), asyncHandler(projectController.action.bind(projectController)));
router.get('/:name/logs', requireAuth, validateParams(projectNameSchema), asyncHandler(projectController.logs.bind(projectController)));
router.put('/:name/env', requireAuth, validateParams(projectNameSchema), validateBody(updateEnvSchema), asyncHandler(projectController.updateEnv.bind(projectController)));
router.patch('/:name/resources', requireAuth, validateParams(projectNameSchema), asyncHandler(projectController.updateResources.bind(projectController)));
router.delete('/:name', requireAuth, validateParams(projectNameSchema), asyncHandler(projectController.delete.bind(projectController)));

export default router;
