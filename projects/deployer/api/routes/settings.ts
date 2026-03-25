import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import settingsController from '../controllers/settings.controller.js';

const router = express.Router();

router.get('/', requireAuth, asyncHandler(settingsController.get.bind(settingsController)));
router.patch('/', requireAuth, asyncHandler(settingsController.update.bind(settingsController)));

export default router;
