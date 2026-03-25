import express from 'express';
import healthController from '../controllers/health.controller.js';

const router = express.Router();

router.get('/health', healthController.check.bind(healthController));
router.get('/health/live', healthController.liveness.bind(healthController));
router.get('/health/ready', healthController.readiness.bind(healthController));
router.get('/health/config', healthController.config.bind(healthController));

export default router;
