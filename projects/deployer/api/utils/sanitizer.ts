import validator from 'validator';

/**
 * Sanitize and validate user inputs
 */
export class InputSanitizer {
  /**
   * Sanitize string input (remove dangerous characters)
   */
  static sanitizeString(input: string): string {
    if (!input) return '';
    
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > 10000) {
      sanitized = sanitized.substring(0, 10000);
    }
    
    return sanitized;
  }

  /**
   * Validate and sanitize email
   */
  static sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeString(email).toLowerCase();
    
    if (!validator.isEmail(sanitized)) {
      throw new Error('Invalid email format');
    }
    
    return sanitized;
  }

  /**
   * Validate and sanitize URL
   */
  static sanitizeUrl(url: string): string {
    const sanitized = this.sanitizeString(url);
    
    if (!validator.isURL(sanitized, { protocols: ['http', 'https'], require_protocol: true })) {
      throw new Error('Invalid URL format');
    }
    
    return sanitized;
  }

  /**
   * Validate and sanitize domain
   */
  static sanitizeDomain(domain: string): string {
    const sanitized = this.sanitizeString(domain).toLowerCase();
    
    if (!validator.isFQDN(sanitized)) {
      throw new Error('Invalid domain format');
    }
    
    return sanitized;
  }

  /**
   * Sanitize project name (alphanumeric, dash, underscore only)
   */
  static sanitizeProjectName(name: string): string {
    const sanitized = this.sanitizeString(name).toLowerCase();
    
    if (!/^[a-z0-9-_]+$/.test(sanitized)) {
      throw new Error('Project name must contain only lowercase letters, numbers, dashes, and underscores');
    }
    
    if (sanitized.length < 3 || sanitized.length > 50) {
      throw new Error('Project name must be between 3 and 50 characters');
    }
    
    return sanitized;
  }

  /**
   * Sanitize environment variables (remove dangerous patterns)
   */
  static sanitizeEnvVars(env: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(env)) {
      // Validate key (uppercase letters, numbers, underscore only)
      if (!/^[A-Z0-9_]+$/.test(key)) {
        throw new Error(`Invalid environment variable name: ${key}`);
      }
      
      // Sanitize value
      sanitized[key] = this.sanitizeString(value);
    }
    
    return sanitized;
  }

  /**
   * Sanitize subdomain
   */
  static sanitizeSubdomain(subdomain: string): string {
    const sanitized = this.sanitizeString(subdomain).toLowerCase();
    
    if (!/^[a-z0-9-]+$/.test(sanitized)) {
      throw new Error('Subdomain must contain only lowercase letters, numbers, and dashes');
    }
    
    if (sanitized.length < 3 || sanitized.length > 63) {
      throw new Error('Subdomain must be between 3 and 63 characters');
    }
    
    if (sanitized.startsWith('-') || sanitized.endsWith('-')) {
      throw new Error('Subdomain cannot start or end with a dash');
    }
    
    return sanitized;
  }
}
