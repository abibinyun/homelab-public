import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiCall, projectAction, getDeployLogs } from '../../lib/api';
import type { Project, DeployLog } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import PermissionGate from '../../components/PermissionGate';
import Layout from '../../components/Layout';
import { Button } from '@/components/ui/button';
import { useToast } from '../../hooks/useToast';

function getClientId(): number | undefined {
  try {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    return JSON.parse(atob(token.split('.')[1])).clientId;
  } catch { return undefined; }
}

export default function ClientProjectDetail() {
  const { name } = useParams<{ name: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<DeployLog[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const permissions = usePermissions(getClientId());
  const toast = useToast();

  useEffect(() => {
    if (!name) return;
    apiCall(`/api/projects/${name}`).then(r => r.json()).then(j => setProject(j.data));
  }, [name]);

  const doAction = async (action: string) => {
    if (!name) return;
    setLoading(action);
    try {
      await projectAction(name, action as any);
      toast.success(`${action} triggered`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(null);
    }
  };

  const loadLogs = async () => {
    if (!name) return;
    const data = await getDeployLogs(name);
    setLogs(data);
    setShowLogs(true);
  };

  if (!project) return <Layout><div className="p-6 text-muted-foreground">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground text-sm">{project.subdomain} · {project.gitUrl}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <PermissionGate permission="canTriggerDeploy" permissions={permissions}>
            <Button onClick={() => doAction('deploy')} disabled={!!loading}>
              {loading === 'deploy' ? 'Deploying...' : '🚀 Deploy'}
            </Button>
          </PermissionGate>
          <PermissionGate permission="canRestart" permissions={permissions}>
            <Button variant="outline" onClick={() => doAction('restart')} disabled={!!loading}>Restart</Button>
          </PermissionGate>
          <PermissionGate permission="canStartStop" permissions={permissions}>
            <Button variant="outline" onClick={() => doAction('start')} disabled={!!loading}>Start</Button>
            <Button variant="outline" onClick={() => doAction('stop')} disabled={!!loading}>Stop</Button>
          </PermissionGate>
          <PermissionGate permission="canViewLogs" permissions={permissions}>
            <Button variant="outline" onClick={loadLogs}>Deploy History</Button>
          </PermissionGate>
        </div>

        {showLogs && (
          <div className="space-y-2">
            <h2 className="font-semibold">Deploy History</h2>
            {logs.length === 0 && <p className="text-muted-foreground text-sm">No deploy history.</p>}
            {logs.map(l => (
              <div key={l.id} className="border rounded-lg px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    l.status === 'success' ? 'bg-green-100 text-green-700' :
                    l.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{l.status}</span>
                  <span className="text-xs text-muted-foreground">{new Date(l.startedAt).toLocaleString()}</span>
                </div>
                {l.logOutput && (
                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-32">{l.logOutput}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
