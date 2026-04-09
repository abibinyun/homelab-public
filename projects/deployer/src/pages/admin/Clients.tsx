import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../../lib/api';
import type { Client } from '../../types';
import ClientCard from '../../components/ClientCard';
import Layout from '../../components/Layout';
import { Button } from '@/components/ui/button';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', contactEmail: '', contactPhone: '', notes: '' });
  const navigate = useNavigate();

  const load = () => apiCall('/api/clients').then(r => r.json()).then(j => setClients(j.data || []));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await apiCall('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ name: '', slug: '', contactEmail: '', contactPhone: '', notes: '' });
    load();
  };

  return (
    <Layout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Clients</h1>
          <Button onClick={() => setShowForm(v => !v)}>+ New Client</Button>
        </div>

        {showForm && (
          <div className="border rounded-lg p-4 space-y-3">
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Slug (e.g. acme-corp)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Contact Email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Contact Phone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
            <textarea className="w-full border rounded px-3 py-2 text-sm" placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Create</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <ClientCard key={c.id} client={c} onClick={() => navigate(`/admin/clients/${c.slug}`)} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
