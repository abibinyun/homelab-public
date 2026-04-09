export interface ProjectResources {
  memoryLimit?: string;
  cpuLimit?: string;
  restartPolicy?: 'unless-stopped' | 'always' | 'on-failure' | 'no';
}

export interface Project {
  name: string;
  gitUrl: string;
  gitBranch?: string;
  subdomain: string;
  env: Record<string, string>;
  port: number;
  gitToken?: string;
  resources?: ProjectResources;
  clientId?: number;
  domainId?: number;
  createdAt: string;
  status?: string;
  containerId?: string;
}

export type UserRole = 'superadmin' | 'admin' | 'client';

export interface Client {
  id: number;
  name: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ClientPermission {
  id: number;
  clientId: number;
  canViewProjects: boolean;
  canViewLogs: boolean;
  canRestart: boolean;
  canStartStop: boolean;
  canUpdateEnv: boolean;
  canTriggerDeploy: boolean;
  canManageDomains: boolean;
  canViewMetrics: boolean;
  updatedAt: string;
}

export interface ClientDomain {
  id: number;
  clientId: number;
  domain: string;
  cfMode: 'managed' | 'unmanaged';
  isPrimary: boolean;
  verifiedAt?: string;
  createdAt: string;
}

export interface DeployLog {
  id: number;
  projectName: string;
  triggeredBy?: number;
  triggerType: 'manual' | 'webhook' | 'schedule';
  status: 'running' | 'success' | 'failed';
  logOutput?: string;
  startedAt: string;
  finishedAt?: string;
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

export interface DomainVerificationInstructions {
  recordType: string;
  name: string;
  value: string;
}

export interface DeployProgress {
  step: string;
  message: string;
}

export interface SSEEvent {
  event: 'progress' | 'complete' | 'error';
  data: DeployProgress | { message: string };
}

export interface EnvVar {
  key: string;
  value: string;
}

export interface WebhookUrls {
  github: string;
  gitlab: string;
  generic: string;
}
