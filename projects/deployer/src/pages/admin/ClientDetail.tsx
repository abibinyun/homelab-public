import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiCall } from '../../lib/api';
import type { Client, ClientPermission, ClientDomain, Project } from '../../types';
import Layout from '../../components/Layout';
import { Button } from '@/components/ui/button';
import { useToast } from '../../hooks/useToast';

const PERM_KEYS: (keyof Omit<ClientPermission, 'id' | 'clientId' | 'updatedAt'>)[] = [
  'canViewProjects', 'canViewLogs', 'canRestart', 'canStartStop',
  'canUpdateEnv', 'canTriggerDeploy', 'canManageDomains', 'canViewMetrics',
];

const PERM_LABEL: Record<string, string> = {
  canViewProjects: 'View Projects', canViewLogs: 'View Logs',
  canRestart: 'Restart', canStartStop: 'Start / Stop',
  canUpdateEnv: 'Update Env', canTriggerDeploy: 'Trigger Deploy',
  canManageDomains: 'Manage Domains', canViewMetrics: 'View Metrics',
};

type Tab = 'info' | 'permissions' | 'domains' | 'projects';

export default function ClientDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('info');
  const [client, setClient] = useState<Client | null>(null);
  const [perms, setPerms] = useState<ClientPermission | null>(null);
  const [domains, setDomains] = useState<ClientDomain[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [domainForm, setDomainForm] = useState({ domain: '', cfMode: 'managed', isPrimary: false, cloudflareZoneId: '', cloudflareApiToken: '', tunnelId: '' });
  const [saving, setSaving] = useState(false);

  const loadClient = async () => {
    const j = await apiCall('/api/clients').then(r => r.json());
    const found: Client = (j.data || []).find((c: Client) => c.slug === slug);
    if (!found) return;
    setClient(found);
    setEditForm({ name: found.name, slug: found.slug, contactEmail: found.contactEmail, contactPhone: found.contactPhone, notes: found.notes, isActive: found.isActive });
    apiCall(`/api/clients/${found.id}/permissions`).then(r => r.json()).then(j => setPerms(j.data));
    apiCall(`/api/clients/${found.id}/domains`).then(r => r.json()).then(j => setDomains(j.data || []));
    apiCall('/api/projects').then(r => r.json()).then(j => setProjects((j.data || []).filter((p: Project) => p.clientId === found.id)));
  };

  useEffect(() => { loadClient(); }, [slug]);

  const saveInfo = async () => {
    if (!client) return;
    setSaving(true);
    try {
      const res = await apiCall(`/api/clients/${client.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Saved');
      if (editForm.slug && editForm.slug !== client.slug) navigate(`/admin/clients/${editForm.slug}`);
      else loadClient();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const savePerms = async () => {
    if (!client || !perms) return;
    setSaving(true);
    try {
      await apiCall(`/api/clients/${client.id}/permissions`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(perms) });
      toast.success('Permissions saved');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const addDomain = async () => {
    if (!client || !domainForm.domain) return;
    setSaving(true);
    try {
      const res = await apiCall(`/api/clients/${client.id}/domains`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(domainForm) });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Domain added');
      setDomainForm({ domain: '', cfMode: 'managed', isPrimary: false, cloudflareZoneId: '', cloudflareApiToken: '', tunnelId: '' });
      apiCall(`/api/clients/${client.id}/domains`).then(r => r.json()).then(j => setDomains(j.data || []));
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const removeDomain = async (domainId: number) => {
    if (!client || !confirm('Remove domain?')) return;
    await apiCall(`/api/clients/${client.id}/domains/${domainId}`, { method: 'DELETE' });
    setDomains(d => d.filter(x => x.id !== domainId));
    toast.success('Domain removed');
  };

  const deleteClient = async () => {
    if (!client || !confirm(`Delete client "${client.name}"? Semua data akan hilang.`)) return;
    await apiCall(`/api/clients/${client.id}`, { method: 'DELETE' });
    toast.success('Client deleted');
    navigate('/admin/clients');
  };

  if (!client) return <Layout><div className="p-6 text-muted-foreground">Loading...</div></Layout>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'permissions', label: 'Permissions' },
    { key: 'domains', label: `Domains (${domains.length})` },
    { key: 'projects', label: `Projects (${projects.length})` },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <span className={`text-xs px-2 py-1 rounded-full ${client.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {client.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">{client.slug} {client.contactEmail && `· ${client.contactEmail}`}</p>
          </div>
          <Button variant="destructive" size="sm" onClick={deleteClient}>Delete Client</Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Info */}
        {tab === 'info' && (
          <div className="space-y-3 max-w-lg">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Slug</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={editForm.slug || ''} onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Contact Email</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={editForm.contactEmail || ''} onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Contact Phone</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={editForm.contactPhone || ''} onChange={e => setEditForm(f => ({ ...f, contactPhone: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs text-muted-foreground">Notes</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm col-span-2">
                <input type="checkbox" checked={!!editForm.isActive} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))} />
                Active
              </label>
            </div>
            <Button onClick={saveInfo} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        )}

        {/* Tab: Permissions */}
        {tab === 'permissions' && (
          <div className="space-y-4 max-w-sm">
            {perms ? (
              <>
                <div className="space-y-2">
                  {PERM_KEYS.map(k => (
                    <label key={k} className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={!!perms[k]} onChange={e => setPerms(p => p ? { ...p, [k]: e.target.checked } : p)} />
                      {PERM_LABEL[k]}
                    </label>
                  ))}
                </div>
                <Button onClick={savePerms} disabled={saving}>{saving ? 'Saving...' : 'Save Permissions'}</Button>
              </>
            ) : <p className="text-muted-foreground text-sm">Loading...</p>}
          </div>
        )}

        {/* Tab: Domains */}
        {tab === 'domains' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {domains.map(d => (
                <div key={d.id} className="flex items-center justify-between border rounded px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{d.domain}</p>
                    <p className="text-xs text-muted-foreground">{d.cfMode} {d.isPrimary && '· primary'} {d.verifiedAt && '· verified'}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => removeDomain(d.id)}>Remove</Button>
                </div>
              ))}
              {domains.length === 0 && <p className="text-muted-foreground text-sm">No domains yet.</p>}
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-sm">Add Domain</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="border rounded px-3 py-2 text-sm" placeholder="domain.com" value={domainForm.domain} onChange={e => setDomainForm(f => ({ ...f, domain: e.target.value }))} />
                <select className="border rounded px-3 py-2 text-sm" value={domainForm.cfMode} onChange={e => setDomainForm(f => ({ ...f, cfMode: e.target.value }))}>
                  <option value="managed">Managed (CF akun induk)</option>
                  <option value="unmanaged">Unmanaged (CF akun client)</option>
                </select>
                {domainForm.cfMode === 'unmanaged' && (
                  <>
                    <input className="border rounded px-3 py-2 text-sm" placeholder="Cloudflare Zone ID" value={domainForm.cloudflareZoneId} onChange={e => setDomainForm(f => ({ ...f, cloudflareZoneId: e.target.value }))} />
                    <input className="border rounded px-3 py-2 text-sm" placeholder="Cloudflare API Token" value={domainForm.cloudflareApiToken} onChange={e => setDomainForm(f => ({ ...f, cloudflareApiToken: e.target.value }))} />
                    <input className="border rounded px-3 py-2 text-sm" placeholder="Tunnel ID (opsional)" value={domainForm.tunnelId} onChange={e => setDomainForm(f => ({ ...f, tunnelId: e.target.value }))} />
                  </>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={domainForm.isPrimary} onChange={e => setDomainForm(f => ({ ...f, isPrimary: e.target.checked }))} />
                  Set as primary
                </label>
              </div>
              <Button onClick={addDomain} disabled={saving || !domainForm.domain}>Add Domain</Button>
            </div>
          </div>
        )}

        {/* Tab: Projects */}
        {tab === 'projects' && (
          <div className="space-y-2">
            {projects.map(p => (
              <div key={p.name} className="border rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.subdomain} · {p.gitUrl}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {p.status || 'unknown'}
                </span>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No projects assigned to this client.</p>
                <p className="mt-1">Buat project di menu <strong>Projects</strong> dan assign ke client ini.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
