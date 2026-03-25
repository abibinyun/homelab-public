import crypto from 'crypto';

const rawKey = process.env.ENCRYPTION_KEY || '';
// Pad or hash key to ensure exactly 32 bytes for AES-256
const ENCRYPTION_KEY = rawKey.length >= 32
  ? rawKey.slice(0, 32)
  : crypto.createHash('sha256').update(rawKey || crypto.randomBytes(32).toString('hex')).digest('hex').slice(0, 32);
const IV_LENGTH = 16;

export function encryptToken(token: string): string | null {
  if (!token) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptToken(encrypted: string): string | null {
  if (!encrypted) return null;
  try {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
