import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-z0-9_-]+$/, 'Username must be lowercase alphanumeric with dashes/underscores only'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const verifyEmailSchema = z.object({
  token: z.string().length(64, 'Invalid verification token'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().length(64, 'Invalid reset token'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Project schemas
export const createProjectSchema = z.object({
  name: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Name must be lowercase alphanumeric with hyphens'),
  gitUrl: z.string().url(),
  subdomain: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Subdomain must be lowercase alphanumeric with hyphens'),
  env: z.record(z.string(), z.string()).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  gitToken: z.string().optional(),
});

export const updateEnvSchema = z.object({
  env: z.record(z.string(), z.string()),
});

export const projectNameSchema = z.object({
  name: z.string().min(1).max(50),
});

export const projectActionSchema = z.object({
  name: z.string().min(1).max(50),
  action: z.enum(['start', 'stop', 'restart']),
});

// Webhook schemas
export const webhookProjectNameSchema = z.object({
  projectName: z.string().min(1).max(50),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateEnvInput = z.infer<typeof updateEnvSchema>;

// Pagination schema
export const paginationSchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
