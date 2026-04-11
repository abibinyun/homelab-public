import { useState, useEffect } from 'react';
import { apiCall, getClients, projectAction, deleteProject } from '../../lib/api';
import type { Project, Client } from '../../types';
import Layout from '../../components/Layout';
import { Button } from '@/components/ui/button';
import { useToast } from '../../hooks/useToast';

const STATUS_COLOR: Record<string, string> = {
  running: 'bg-green-100 text-green-700',
  stopped: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-700',
};

type Domain = { id: number; name: string; isActive: boolean };

const EMPTY_FORM = {
  name: '', gitUrl: '', gitBranch: 'main', subdomain: '',
  subdomainType: 'subdomain' as 'subdomain' | 'root',
  port: '3000', clientId: '', domainId: '', gitToken: '',
  memoryLimit: '', cpuLimit: '', restartPolicy: 'unless-stopped',
  envRaw: '',
};

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const toast = useToast();

  const load = () => apiCall('/api/projects').then(r => r.json()).then(j => setProjects(j.data || []));

  useEffect(() => {
    load();
    getClients().then(setClients);
    apiCall('/api/v2/domains').then(r => r.json()).then(j => setDomains((j.data || []).filter((d: Domain) => d.isActive)));
  }, []);

  const selectedDomain = domains.find(d => String(d.id) === form.domainId);

  const previewUrl = () => {
    if (!selectedDomain) return null;
    if (form.subdomainType === 'root') return selectedDomain.name;
    if (form.subdomain) return `${form.subdomain}.${selectedDomain.name}`;
    return null;
  };

  const handleCreate = async () => {
    if (!form.name || !form.gitUrl) {
      toast.error('Name dan Git URL wajib diisi');
      return;
    }
    if (form.subdomainType === 'subdomain' && !form.subdomain) {
      toast.error('Subdomain wajib diisi');
      return;
    }
    setLoading('create');
    try {
      const env: Record<string, string> = {};
      form.envRaw.split('\n').forEach(line => {
        const idx = line.indexOf('=');
        if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      });

      const res = await apiCall('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          gitUrl: form.gitUrl,
          gitBranch: form.gitBranch || 'main',
          subdomain: form.subdomainType === 'root' ? form.name : form.subdomain,
          subdomainType: form.subdomainType,
          port: Number(form.port) || 3000,
          gitToken: form.gitToken || undefined,
          clientId: form.clientId ? Number(form.clientId) : undefined,
          domainRef: form.domainId ? Number(form.domainId) : undefined,
          env: Object.keys(env).length ? env : undefined,
          resources: {
            memoryLimit: form.memoryLimit || undefined,
            cpuLimit: form.cpuLimit || undefined,
            restartPolicy: form.restartPolicy || 'unless-stopped',
          },
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Project created');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create project');
    } finally {
      setLoading(null);
    }
  };

  const handleAction = async (name: string, action: string) => {
    setLoading(`${name}-${action}`);
    try {
      await projectAction(name, action);
      toast.success(`${action} triggered`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete project "${name}"?`)) return;
    setLoading(`${name}-delete`);
    try {
      await deleteProject(name);
      toast.success('Deleted');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Projects</h1>
          <Button onClick={() => setShowForm(v => !v)}>+ New Project</Button>
        </div>

        {showForm && (
          <div className="border rounded-lg p-4 space-y-3 bg-card">
            <h2 className="font-semibold">Create Project</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2 text-sm" placeholder="Project name (unik, no spasi)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} />
              <input className="border rounded px-3 py-2 text-sm col-span-full" placeholder="Git URL (https://github.com/...)" value={form.gitUrl} onChange={e => setForm(f => ({ ...f, gitUrl: e.target.value }))} />
              <input className="border rounded px-3 py-2 text-sm" placeholder="Branch (default: main)" value={form.gitBranch} onChange={e => setForm(f => ({ ...f, gitBranch: e.target.value }))} />
              <input className="border rounded px-3 py-2 text-sm" placeholder="Port (default: 3000)" value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} />

              {/* Domain picker */}
              <div className="col-span-full space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Domain</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.domainId} onChange={e => setForm(f => ({ ...f, domainId: e.target.value, subdomainType: 'subdomain', subdomain: '' }))}>
                  <option value="">— Pilih domain —</option>
                  {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Subdomain type */}
              {form.domainId && (
                <div className="col-span-full space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Install di</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="subdomainType" value="subdomain" checked={form.subdomainType === 'subdomain'} onChange={() => setForm(f => ({ ...f, subdomainType: 'subdomain' }))} />
                      <span className="text-sm">Subdomain</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="subdomainType" value="root" checked={form.subdomainType === 'root'} onChange={() => setForm(f => ({ ...f, subdomainType: 'root', subdomain: '' }))} />
                      <span className="text-sm">Root domain ({selectedDomain?.name})</span>
                    </label>
                  </div>
                  {form.subdomainType === 'subdomain' && (
                    <div className="flex items-center gap-2">
                      <input className="border rounded px-3 py-2 text-sm flex-1" placeholder="subdomain" value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
                      {selectedDomain && <span className="text-sm text-muted-foreground">.{selectedDomain.name}</span>}
                    </div>
                  )}
                  {previewUrl() && (
                    <p className="text-xs text-green-600">→ akan deploy ke: <strong>https://{previewUrl()}</strong></p>
                  )}
                </div>
              )}

              <input className="border rounded px-3 py-2 text-sm" placeholder="Git Token (opsional, untuk private repo)" value={form.gitToken} onChange={e => setForm(f => ({ ...f, gitToken: e.target.value }))} />
              <select className="border rounded px-3 py-2 text-sm" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                <option value="">— Assign ke Client (opsional) —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="border rounded px-3 py-2 text-sm" placeholder="Memory limit (e.g. 512m, 1g — kosong = unlimited)" value={form.memoryLimit} onChange={e => setForm(f => ({ ...f, memoryLimit: e.target.value }))} />
              <input className="border rounded px-3 py-2 text-sm" placeholder="CPU limit (e.g. 0.5, 1 — kosong = unlimited)" value={form.cpuLimit} onChange={e => setForm(f => ({ ...f, cpuLimit: e.target.value }))} />
              <select className="border rounded px-3 py-2 text-sm" value={form.restartPolicy} onChange={e => setForm(f => ({ ...f, restartPolicy: e.target.value }))}>
                <option value="unless-stopped">unless-stopped</option>
                <option value="always">always</option>
                <option value="on-failure">on-failure</option>
                <option value="no">no</option>
              </select>
              <div className="col-span-full space-y-1">
                <label className="text-xs text-muted-foreground">Environment Variables (KEY=VALUE per baris)</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm font-mono" rows={4} placeholder={"NODE_ENV=production\nPORT=3000\nDATABASE_URL=..."} value={form.envRaw} onChange={e => setForm(f => ({ ...f, envRaw: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={loading === 'create'}>{loading === 'create' ? 'Creating...' : 'Create'}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {projects.map(p => (
            <div key={p.name} className="border rounded-lg px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground truncate">{p.subdomain} · {p.gitUrl}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[p.status || ''] || 'bg-gray-100 text-gray-600'}`}>
                  {p.status || 'unknown'}
                </span>
                <Button size="sm" variant="outline" onClick={() => handleAction(p.name, 'deploy')} disabled={!!loading}>Deploy</Button>
                <Button size="sm" variant="outline" onClick={() => handleAction(p.name, 'restart')} disabled={!!loading}>Restart</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(p.name)} disabled={!!loading}>Delete</Button>
              </div>
            </div>
          ))}
          {projects.length === 0 && <p className="text-muted-foreground text-sm">No projects yet.</p>}
        </div>
      </div>
    </Layout>
  );
}
