export interface ProjectResources {
  memoryLimit?: string;
  cpuLimit?: string;
  restartPolicy?: 'unless-stopped' | 'always' | 'on-failure' | 'no';
}

export interface Project {
  name: string;
  gitUrl: string;
  subdomain: string;
  env: Record<string, string>;
  port: number;
  gitToken?: string;
  resources?: ProjectResources;
  createdAt: string;
  status?: string;
  containerId?: string;
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
