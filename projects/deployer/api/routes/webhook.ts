import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateParams } from '../middleware/validate.js';

import { webhookProjectNameSchema } from '../schemas/index.js';
import webhookController from '../controllers/webhook.controller.js';

const router = express.Router();

router.post('/github/:projectName', validateParams(webhookProjectNameSchema), asyncHandler(webhookController.github.bind(webhookController)));
router.post('/gitlab/:projectName', validateParams(webhookProjectNameSchema), asyncHandler(webhookController.gitlab.bind(webhookController)));
router.post('/deploy/:projectName', validateParams(webhookProjectNameSchema), asyncHandler(webhookController.generic.bind(webhookController)));

export default router;
