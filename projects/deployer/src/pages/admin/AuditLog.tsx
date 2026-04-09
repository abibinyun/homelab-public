import { useState, useEffect } from 'react';
import { apiCall } from '../../lib/api';
import Layout from '../../components/Layout';

interface AuditEntry {
  id: number;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  createdAt: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);

  useEffect(() => {
    apiCall('/api/audit-logs').then(r => r.json()).then(j => setLogs(j.data || []));
  }, []);

  return (
    <Layout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Resource</th>
                <th className="py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b hover:bg-accent/50">
                  <td className="py-2 pr-4 text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-4 font-mono">{l.action}</td>
                  <td className="py-2 pr-4">{l.resourceType} {l.resourceId && `#${l.resourceId}`}</td>
                  <td className="py-2 text-muted-foreground">{l.ipAddress || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No audit logs.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
