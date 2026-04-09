import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../../lib/api';
import type { Project } from '../../types';
import Layout from '../../components/Layout';

export default function ClientDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiCall('/api/projects').then(r => r.json()).then(j => setProjects(j.data || []));
  }, []);

  return (
    <Layout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <div className="space-y-2">
          {projects.map(p => (
            <div
              key={p.name}
              className="border rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-accent"
              onClick={() => navigate(`/client/projects/${p.name}`)}
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.subdomain}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {p.status || 'unknown'}
              </span>
            </div>
          ))}
          {projects.length === 0 && <p className="text-muted-foreground">No projects assigned.</p>}
        </div>
      </div>
    </Layout>
  );
}
