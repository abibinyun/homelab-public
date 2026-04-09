import express from 'express';
import bcrypt from 'bcrypt';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ResponseSerializer } from '../utils/response.js';
import { ValidationError, ConflictError } from '../types/index.js';
import storageRepository from '../repositories/storage.repository.js';
import db from '../db/index.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/users — list semua user (superadmin/admin)
router.get('/', requireRole('superadmin', 'admin'), asyncHandler(async (_req, res) => {
  const result = await db.query(`
    SELECT id, username, email, role, client_id, email_verified, created_at
    FROM users ORDER BY created_at DESC
  `);
  ResponseSerializer.success(res, result.rows);
}));

// POST /api/users — create user (superadmin/admin)
router.post('/', requireRole('superadmin', 'admin'), asyncHandler(async (req, res) => {
  const { username, email, password, role, clientId } = req.body;
  if (!username || !password) throw new ValidationError('username dan password wajib diisi');
  if (!['superadmin', 'admin', 'client'].includes(role)) throw new ValidationError('role tidak valid');
  if (role === 'client' && !clientId) throw new ValidationError('clientId wajib untuk role client');

  const existing = await storageRepository.getUserByUsername(username);
  if (existing) throw new ConflictError(`Username '${username}' sudah dipakai`);

  const hashed = await bcrypt.hash(password, 10);
  await storageRepository.createUser({
    username,
    email: email || `${username}@localhost`,
    password: hashed,
    role,
    clientId,
    email_verified: true,
    createdAt: new Date().toISOString(),
  } as any);

  ResponseSerializer.success(res, { username, role, clientId });
}));

// DELETE /api/users/:username — hapus user (superadmin)
router.delete('/:username', requireRole('superadmin'), asyncHandler(async (req, res) => {
  if (req.params.username === 'admin') throw new ValidationError('Tidak bisa hapus user admin utama');
  await db.query(`DELETE FROM users WHERE username = $1`, [req.params.username]);
  ResponseSerializer.success(res, { message: 'Deleted' });
}));

// PATCH /api/users/:username — update role/clientId (superadmin)
router.patch('/:username', requireRole('superadmin'), asyncHandler(async (req, res) => {
  const { role, clientId, password } = req.body;
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (role) { fields.push(`role = $${i++}`); values.push(role); }
  if (clientId !== undefined) { fields.push(`client_id = $${i++}`); values.push(clientId || null); }
  if (password) { fields.push(`password = $${i++}`); values.push(await bcrypt.hash(password, 10)); }
  if (!fields.length) throw new ValidationError('Tidak ada field yang diupdate');
  values.push(req.params.username);
  await db.query(`UPDATE users SET ${fields.join(', ')} WHERE username = $${i}`, values);
  ResponseSerializer.success(res, { message: 'Updated' });
}));

export default router;
