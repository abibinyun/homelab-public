import { Request, Response, NextFunction } from 'express';

interface Attempt { count: number; firstAt: number; blockedUntil?: number; }

const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000; // 15 menit
const MAX_ATTEMPTS = 10;
const BLOCK_MS = 15 * 60 * 1000;

export function loginRateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry?.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    res.status(429).json({ success: false, error: `Too many login attempts. Try again in ${retryAfter}s.` });
    return;
  }

  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
  } else {
    entry.count++;
    if (entry.count >= MAX_ATTEMPTS) {
      entry.blockedUntil = now + BLOCK_MS;
      res.status(429).json({ success: false, error: 'Too many login attempts. Try again in 15 minutes.' });
      return;
    }
  }

  next();
}

export function loginRateLimitReset(ip: string): void {
  attempts.delete(ip);
}
