/**
 * Sanitize HTML to prevent XSS attacks (basic version)
 */
export function sanitizeHtml(dirty: string): string {
  const div = document.createElement('div');
  div.textContent = dirty;
  return div.innerHTML;
}

/**
 * Sanitize user input (remove HTML, trim, normalize)
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize project name (alphanumeric, dash, underscore only)
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
 * Sanitize subdomain (alphanumeric and dash only)
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
export function escapeLikePattern(pattern: string): string {
  return pattern.replace(/[%_\\]/g, '\\$&');
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize Git URL
 */
export function sanitizeGitUrl(url: string): string {
  const trimmed = url.trim();
  
  // Remove credentials from URL if present
  try {
    const parsed = new URL(trimmed);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    // If not a valid URL, return as-is (might be SSH format)
    return trimmed;
  }
}
