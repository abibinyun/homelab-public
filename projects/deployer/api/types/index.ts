// Core domain types
export interface ProjectResources {
  memoryLimit?: string;   // e.g. "512m", "1g", "0" = unlimited
  cpuLimit?: string;      // e.g. "0.5", "1", "0" = unlimited
  restartPolicy?: 'unless-stopped' | 'always' | 'on-failure' | 'no';
}

export interface Project {
  name: string;
  gitUrl: string;
  subdomain: string;
  env: Record<string, string>;
  port: number;
  userId?: number;
  gitToken?: string;
  webhookSecret?: string;
  resources?: ProjectResources;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  username: string;
  email: string;
  password: string;
  role?: string;
  email_verified: boolean;
  verification_token?: string;
  verification_token_expires?: Date;
  reset_token?: string;
  reset_token_expires?: Date;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomDomain {
  id: number;
  projectId: number;
  domain: string;
  verificationToken: string;
  verified: boolean;
  verifiedAt?: string;
  cloudflareDnsId?: string;
  sslStatus: 'pending' | 'active' | 'failed';
  status: 'pending' | 'active' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: number;
  userId: number;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'suspended';
  startDate: string;
  started_at?: string;
  endDate?: string;
  expires_at?: string;
  grace_period_days?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanConfig {
  id: number;
  plan: 'free' | 'pro' | 'enterprise';
  maxProjects: number;
  max_projects?: number;
  maxRamMb: number;
  max_ram_mb?: number;
  maxCpuCores: number;
  max_cpu_cores?: number;
  max_storage_mb?: number;
  price: number;
  price_monthly?: number;
  features: string[];
  active: boolean;
}

export interface PlanLimits {
  maxProjects: number;
  maxRamMb: number;
  maxCpuCores: number;
  maxStorageMb?: number;
}

export interface PaymentRequest {
  id: number;
  userId: number;
  user_id?: number;
  plan: 'pro' | 'enterprise';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  proofUrl?: string;
  payment_proof?: string;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: number;
  username: string;
  email: string;
  email_verified: boolean;
  created_at: Date;
}

export interface Session {
  username: string;
  createdAt: number;
  expiresAt: number;
}

export interface DeployResult {
  success: boolean;
  domain: string;
  port: number;
  containerId?: string;
}

export interface ContainerInfo {
  Id: string;
  Names: string[];
  State: string;
  Status: string;
}

export interface DockerResult {
  success: boolean;
  error?: string;
  logs?: string;
  containerId?: string;
}

// API Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface CreateProjectRequest {
  name: string;
  gitUrl: string;
  subdomain: string;
  env?: Record<string, string>;
  port?: number;
  gitToken?: string;
}

export interface UpdateEnvRequest {
  env: Record<string, string>;
}

// Error types
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}
