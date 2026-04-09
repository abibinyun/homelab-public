import { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser, getClients } from '../../lib/api';
import type { Client } from '../../types';
import Layout from '../../components/Layout';
import { Button } from '@/components/ui/button';
import { useToast } from '../../hooks/useToast';

interface UserRow {
  id: number;
  username: string;
  email: string;
  role: string;
  client_id?: number;
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'client', clientId: '' });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = async () => {
    setUsers(await getUsers());
    setClients(await getClients());
  };

  useEffect(() => { load(); }, []);

  const clientName = (id?: number) => clients.find(c => c.id === id)?.name || '-';

  const handleCreate = async () => {
    if (!form.username || !form.password) { toast.error('Username dan password wajib'); return; }
    if (form.role === 'client' && !form.clientId) { toast.error('Pilih client untuk role client'); return; }
    setSaving(true);
    try {
      await createUser({ ...form, clientId: form.clientId ? Number(form.clientId) : undefined });
      toast.success('User created');
      setShowForm(false);
      setForm({ username: '', email: '', password: '', role: 'client', clientId: '' });
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (username: string) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    try {
      await deleteUser(username);
      toast.success('Deleted');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const ROLE_COLOR: Record<string, string> = {
    superadmin: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    client: 'bg-gray-100 text-gray-700',
  };

  return (
    <Layout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Users</h1>
          <Button onClick={() => setShowForm(v => !v)}>+ New User</Button>
        </div>

        {showForm && (
          <div className="border rounded-lg p-4 space-y-3 bg-card">
            <h2 className="font-semibold text-sm">Create User</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2 text-sm" placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              <input className="border rounded px-3 py-2 text-sm" placeholder="Email (opsional)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <input className="border rounded px-3 py-2 text-sm" type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <select className="border rounded px-3 py-2 text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, clientId: '' }))}>
                <option value="client">Client</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              {form.role === 'client' && (
                <select className="border rounded px-3 py-2 text-sm col-span-2" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                  <option value="">— Assign ke Client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="border rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{u.username}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLOR[u.role] || 'bg-gray-100'}`}>{u.role}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {u.email} {u.client_id && `· ${clientName(u.client_id)}`}
                </p>
              </div>
              {u.username !== 'admin' && (
                <Button variant="destructive" size="sm" onClick={() => handleDelete(u.username)}>Delete</Button>
              )}
            </div>
          ))}
          {users.length === 0 && <p className="text-muted-foreground text-sm">No users.</p>}
        </div>
      </div>
    </Layout>
  );
}
