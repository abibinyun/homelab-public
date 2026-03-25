/**
 * Server-side input sanitization utilities
 */

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Sanitize email
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize project name
 */
export function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Sanitize subdomain
 */
export function sanitizeSubdomain(subdomain: string): string {
  return subdomain
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Escape SQL LIKE pattern
 */
export function escapeSqlLike(pattern: string): string {
  return pattern.replace(/[%_\\]/g, '\\$&');
}

/**
 * Validate and sanitize Git URL
 */
export function sanitizeGitUrl(url: string): string {
  const trimmed = url.trim();
  
  // Remove credentials from HTTPS URLs
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    try {
      const parsed = new URL(trimmed);
      parsed.username = '';
      parsed.password = '';
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }
  
  // SSH format - return as-is
  return trimmed;
}

/**
 * Sanitize environment variable key
 */
export function sanitizeEnvKey(key: string): string {
  return key
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Validate port number
 */
export function validatePort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/__+/g, '_')
    .substring(0, 255); // Max filename length
}
