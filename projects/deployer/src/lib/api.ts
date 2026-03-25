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
