import { useState, useEffect } from 'react';
import { getDomains, createDomain, updateDomain, deleteDomain } from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import Layout from '../../components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '../../components/Modal';

export default function Domains() {
  const [domains, setDomains] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', cfZoneId: '', cfTunnelId: '', cfApiToken: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => { load(); }, []);

  const load = () => getDomains().then(setDomains).catch(() => {});

  const openCreate = () => { setEditing(null); setForm({ name: '', cfZoneId: '', cfTunnelId: '', cfApiToken: '' }); setShowModal(true); };
  const openEdit = (d: any) => { setEditing(d); setForm({ name: d.name, cfZoneId: d.cfZoneId || '', cfTunnelId: d.cfTunnelId || '', cfApiToken: '' }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await updateDomain(editing.id, form);
        toast.success('Domain updated');
      } else {
        await createDomain(form);
        toast.success('Domain added');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete domain "${name}"? Projects using it will lose their domain assignment.`)) return;
    try {
      await deleteDomain(id);
      toast.success('Domain deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Domains</h1>
          <Button size="sm" onClick={openCreate}>+ Add Domain</Button>
        </div>

        <div className="space-y-3">
          {domains.length === 0 && (
            <p className="text-muted-foreground text-sm">No domains yet. Add one to start routing projects.</p>
          )}
          {domains.map(d => (
            <div key={d.id} className="border rounded-lg p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground mt-1 space-x-3">
                  {d.cfZoneId && <span>Zone: {d.cfZoneId}</span>}
                  {d.cfTunnelId && <span>Tunnel: {d.cfTunnelId}</span>}
                  <span className={d.isActive ? 'text-green-500' : 'text-red-500'}>{d.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => openEdit(d)}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(d.id, d.name)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? `Edit ${editing.name}` : 'Add Domain'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Domain Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="digitor.id" required disabled={!!editing} />
            </div>
            <div className="space-y-1">
              <Label>Cloudflare Zone ID</Label>
              <Input value={form.cfZoneId} onChange={e => setForm(f => ({ ...f, cfZoneId: e.target.value }))} placeholder="abc123..." />
            </div>
            <div className="space-y-1">
              <Label>Cloudflare Tunnel ID</Label>
              <Input value={form.cfTunnelId} onChange={e => setForm(f => ({ ...f, cfTunnelId: e.target.value }))} placeholder="uuid..." />
            </div>
            <div className="space-y-1">
              <Label>Cloudflare API Token {editing && <span className="text-muted-foreground text-xs">(leave blank to keep existing)</span>}</Label>
              <Input type="password" value={form.cfApiToken} onChange={e => setForm(f => ({ ...f, cfApiToken: e.target.value }))} placeholder="CF API token (encrypted at rest)" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Saving...' : editing ? 'Update' : 'Add Domain'}</Button>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
