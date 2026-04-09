import bcrypt from 'bcrypt';
import { Session, UnauthorizedError, ValidationError } from '../types/index.js';
import { generateToken } from '../utils/crypto.js';
import storageRepository from '../repositories/storage.repository.js';
import redis from '../db/redis.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class AuthService {
  private sessions = new Map<string, Session>();
  private loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

  async initialize(): Promise<void> {
    if (!redis.isConnected()) {
      this.sessions = await storageRepository.getSessions();
    }

    // Create owner account from env if not exists
    const users = await storageRepository.getUsers();
    if (users.length === 0) {
      const username = process.env.ADMIN_USER || 'admin';
      const password = process.env.ADMIN_PASSWORD;
      if (!password) throw new Error('ADMIN_PASSWORD env variable is required for initial setup');
      const hashedPassword = await bcrypt.hash(password, 10);
      await storageRepository.createUser({
        username,
        email: process.env.ADMIN_EMAIL || 'admin@localhost',
        password: hashedPassword,
        role: 'superadmin',
        email_verified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      logger.info('Owner account created', { username });
    }

    // Seed dummy projects in demo mode (after user is guaranteed to exist)
    if (process.env.DEMO_MODE === 'true') {
      const existing = await storageRepository.getProjects();
      if (existing.length === 0) {
        const demoProjects = [
          { name: 'my-nextjs-app', gitUrl: 'https://github.com/user/my-nextjs-app.git', subdomain: 'my-nextjs-app', env: { NODE_ENV: 'production' }, port: 3001, createdAt: new Date().toISOString() },
          { name: 'api-service', gitUrl: 'https://github.com/user/api-service.git', subdomain: 'api', env: { PORT: '8080' }, port: 8080, createdAt: new Date().toISOString() },
          { name: 'landing-page', gitUrl: 'https://github.com/user/landing-page.git', subdomain: 'landing', env: {}, port: 80, createdAt: new Date().toISOString() },
        ];
        for (const p of demoProjects) {
          await storageRepository.createProject(p as any);
        }
        logger.info('Demo projects seeded');
      }
    }
  }

  private checkRateLimit(username: string): void {
    const now = Date.now();
    const attempt = this.loginAttempts.get(username);
    if (attempt) {
      const timeSinceLastAttempt = now - attempt.lastAttempt;
      if (timeSinceLastAttempt < config.rateLimitWindow && attempt.count >= config.maxLoginAttempts) {
        throw new ValidationError('Too many login attempts. Try again later.');
      }
      if (timeSinceLastAttempt >= config.rateLimitWindow) {
        this.loginAttempts.delete(username);
      }
    }
  }

  private recordLoginAttempt(username: string): void {
    const now = Date.now();
    const attempt = this.loginAttempts.get(username);
    if (attempt) {
      attempt.count++;
      attempt.lastAttempt = now;
    } else {
      this.loginAttempts.set(username, { count: 1, lastAttempt: now });
    }
  }

  async login(username: string, password: string): Promise<{ token: string; username: string }> {
    this.checkRateLimit(username);

    const user = await storageRepository.getUserByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      this.recordLoginAttempt(username);
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = generateToken();
    const expiresAt = Date.now() + (config.sessionExpiryHours * 60 * 60 * 1000);
    const session: Session = { username: user.username, createdAt: Date.now(), expiresAt };

    if (redis.isConnected()) {
      await redis.set(`session:${token}`, JSON.stringify(session), config.sessionExpiryHours * 60 * 60);
    } else {
      this.sessions.set(token, session);
      await storageRepository.saveSessions(this.sessions);
    }

    logger.info('User logged in', { username });
    return { token, username: user.username };
  }

  async logout(token?: string): Promise<void> {
    if (!token) return;
    if (redis.isConnected()) {
      await redis.del(`session:${token}`);
    } else {
      this.sessions.delete(token);
      await storageRepository.saveSessions(this.sessions);
    }
  }

  async validateSession(token: string): Promise<Session> {
    let session: Session | null = null;

    if (redis.isConnected()) {
      const data = await redis.get(`session:${token}`);
      if (data) session = JSON.parse(data);
    } else {
      session = this.sessions.get(token) || null;
    }

    if (!session) throw new UnauthorizedError('Invalid session');
    if (Date.now() > session.expiresAt) {
      await this.logout(token);
      throw new UnauthorizedError('Session expired');
    }

    return session;
  }
}

export default new AuthService();
