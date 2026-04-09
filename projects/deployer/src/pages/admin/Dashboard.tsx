import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../../lib/api';
import type { Client, Project } from '../../types';
import ClientCard from '../../components/ClientCard';
import Layout from '../../components/Layout';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiCall('/api/clients').then(r => r.json()).then(j => setClients(j.data || []));
    apiCall('/api/projects').then(r => r.json()).then(j => setProjects(j.data || []));
  }, []);

  const running = projects.filter(p => p.status === 'running').length;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Clients', value: clients.length },
            { label: 'Active Clients', value: clients.filter(c => c.isActive).length },
            { label: 'Total Projects', value: projects.length },
            { label: 'Running', value: running },
          ].map(s => (
            <div key={s.label} className="border rounded-lg p-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Clients */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Clients</h2>
            <Button size="sm" onClick={() => navigate('/admin/clients')}>Manage Clients</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(c => (
              <ClientCard key={c.id} client={c} onClick={() => navigate(`/admin/clients/${c.slug}`)} />
            ))}
            {clients.length === 0 && (
              <div className="col-span-3 text-center py-8 text-muted-foreground text-sm">
                <p>Belum ada client.</p>
                <Button size="sm" className="mt-2" onClick={() => navigate('/admin/clients')}>+ Tambah Client</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
