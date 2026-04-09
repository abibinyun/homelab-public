import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema } from '../schemas/index.js';
import authService from '../services/auth.service.js';
import { ResponseSerializer } from '../utils/response.js';
import { loginRateLimit, loginRateLimitReset } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/login', loginRateLimit, validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const result = await authService.login(username, password);
  loginRateLimitReset(req.ip ?? '');
  ResponseSerializer.success(res, result);
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  await authService.logout(token);
  ResponseSerializer.success(res, { message: 'Logged out' });
}));

router.get('/me', requireAuth, (req, res) => {
  const u = req.user!;
  ResponseSerializer.success(res, {
    username: u.username,
    userId: u.userId,
    isAdmin: u.isAdmin,
    role: u.role,
    clientId: u.clientId,
  });
});

export default router;
