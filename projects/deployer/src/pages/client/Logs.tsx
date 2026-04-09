import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiCall } from '../../lib/api';
import type { DeployLog } from '../../types';
import Layout from '../../components/Layout';

export default function ClientLogs() {
  const { name } = useParams<{ name: string }>();
  const [logs, setLogs] = useState<DeployLog[]>([]);

  useEffect(() => {
    if (!name) return;
    apiCall(`/api/projects/${name}/deploys`).then(r => r.json()).then(j => setLogs(j.data || []));
  }, [name]);

  return (
    <Layout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Deploy Logs — {name}</h1>
        <div className="space-y-2">
          {logs.map(l => (
            <div key={l.id} className="border rounded-lg px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  l.status === 'success' ? 'bg-green-100 text-green-700' :
                  l.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>{l.status}</span>
                <span className="text-xs text-muted-foreground">{new Date(l.startedAt).toLocaleString()}</span>
              </div>
              {l.logOutput && (
                <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40">{l.logOutput}</pre>
              )}
            </div>
          ))}
          {logs.length === 0 && <p className="text-muted-foreground">No deploy history.</p>}
        </div>
      </div>
    </Layout>
  );
}
