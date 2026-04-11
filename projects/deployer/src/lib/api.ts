import { Project } from '../types';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
}

interface ApiCallOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function apiCall(url: string, options: ApiCallOptions = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Request failed');
  }

  if (json.data === undefined && res.status !== 204) {
    throw new Error('No data in response');
  }

  return (json.data ?? null) as T;
}

export async function login(username: string, password: string): Promise<{ token: string; username: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Login failed');
  }

  return json.data;
}

export async function logout(): Promise<void> {
  await apiCall('/api/auth/logout', { method: 'POST' });
  localStorage.clear();
}

export async function getProjects(): Promise<Project[]> {
  const res = await apiCall('/api/projects');
  return handleResponse(res);
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  const res = await apiCall('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function projectAction(name: string, action: string): Promise<any> {
  const res = await apiCall(`/api/projects/${name}/${action}`, { method: 'POST' });
  return handleResponse(res);
}

export async function getProjectLogs(name: string): Promise<{ logs: string }> {
  const res = await apiCall(`/api/projects/${name}/logs`);
  return handleResponse(res);
}

export async function deleteProject(name: string): Promise<any> {
  const res = await apiCall(`/api/projects/${name}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function getSSHKey(): Promise<{ publicKey: string }> {
  const res = await apiCall('/api/ssh-key/');
  return handleResponse(res);
}

export async function updateProjectEnv(name: string, env: Record<string, string>): Promise<any> {
  const res = await apiCall(`/api/projects/${name}/env`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ env })
  });
  return handleResponse(res);
}

export async function updateProjectResources(name: string, resources: {
  memoryLimit?: string;
  cpuLimit?: string;
  restartPolicy?: string;
}): Promise<any> {
  const res = await apiCall(`/api/projects/${name}/resources`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resources)
  });
  return handleResponse(res);
}

export async function getClients(): Promise<any[]> {
  const res = await apiCall('/api/clients');
  const j = await res.json();
  return j.data || [];
}

export async function getClientDomains(clientId: number): Promise<any[]> {
  const res = await apiCall(`/api/clients/${clientId}/domains`);
  const j = await res.json();
  return j.data || [];
}

export async function getDeployLogs(projectName: string): Promise<any[]> {
  const res = await apiCall(`/api/projects/${projectName}/deploys`);
  const j = await res.json();
  return j.data || [];
}

export async function getUsers(): Promise<any[]> {
  const res = await apiCall('/api/users');
  const j = await res.json();
  return j.data || [];
}

export async function createUser(data: { username: string; email?: string; password: string; role: string; clientId?: number }): Promise<any> {
  const res = await apiCall('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteUser(username: string): Promise<void> {
  const res = await apiCall(`/api/users/${username}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function updateUser(username: string, data: { role?: string; clientId?: number; password?: string }): Promise<void> {
  const res = await apiCall(`/api/users/${username}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getSettings(): Promise<any> {
  const res = await apiCall('/api/settings');
  return handleResponse(res);
}

export async function updateSettings(settings: any): Promise<any> {
  const res = await apiCall('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  return handleResponse(res);
}

export async function getProjectDomains(projectName: string): Promise<any[]> {
  const res = await apiCall(`/api/domains/project/${projectName}`);
  return handleResponse(res);
}

export async function addCustomDomain(projectName: string, domain: string): Promise<any> {
  const res = await apiCall('/api/domains', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName, domain })
  });
  return handleResponse(res);
}

export async function verifyCustomDomain(domainId: number): Promise<any> {
  const res = await apiCall(`/api/domains/${domainId}/verify`, { method: 'POST' });
  return handleResponse(res);
}

export async function deleteCustomDomain(domainId: number): Promise<any> {
  const res = await apiCall(`/api/domains/${domainId}`, { method: 'DELETE' });
  return handleResponse(res);
}

// ── v2 API ────────────────────────────────────────────────────────────────────

export async function getDomains(): Promise<any[]> {
  const res = await apiCall('/api/v2/domains');
  const j = await res.json();
  return j.data || [];
}

export async function createDomain(data: { name: string; cfZoneId?: string; cfTunnelId?: string; cfApiToken?: string }): Promise<any> {
  const res = await apiCall('/api/v2/domains', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateDomain(id: number, data: any): Promise<any> {
  const res = await apiCall(`/api/v2/domains/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteDomain(id: number): Promise<void> {
  const res = await apiCall(`/api/v2/domains/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function getTemplates(): Promise<any[]> {
  const res = await apiCall('/api/v2/templates');
  const j = await res.json();
  return j.data || [];
}

export async function getDomainsForClient(clientId: number): Promise<any[]> {
  // Get domains assigned to a specific client via client_domains
  const res = await apiCall(`/api/clients/${clientId}/domains`);
  const j = await res.json();
  return j.data || [];
}

export async function assignDomainToClient(domainId: number, clientId: number): Promise<void> {
  const res = await apiCall(`/api/v2/domains/${domainId}/assign/${clientId}`, { method: 'POST' });
  return handleResponse(res);
}

export async function unassignDomainFromClient(domainId: number, clientId: number): Promise<void> {
  const res = await apiCall(`/api/v2/domains/${domainId}/assign/${clientId}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function getProjectServices(name: string): Promise<any[]> {
  const res = await apiCall(`/api/projects/${name}/services`);
  const j = await res.json();
  return j.data || [];
}

export async function getComposeLogs(name: string, tail = 100): Promise<{ logs: string }> {
  const res = await apiCall(`/api/projects/${name}/compose-logs?tail=${tail}`);
  return handleResponse(res);
}

export async function getDeployHistory(name: string, limit = 20): Promise<any[]> {
  const res = await apiCall(`/api/projects/${name}/history?limit=${limit}`);
  const j = await res.json();
  return j.data || [];
}

export async function triggerRollback(name: string): Promise<void> {
  const res = await apiCall(`/api/projects/${name}/rollback`, { method: 'POST' });
  return handleResponse(res);
}

export async function getProjectStats(name: string): Promise<any> {
  const res = await apiCall(`/api/projects/${name}/stats`);
  const j = await res.json();
  return j.data;
}

export async function triggerBackup(): Promise<{ output: string }> {
  const res = await apiCall('/api/backup', { method: 'POST' });
  return handleResponse(res);
}
