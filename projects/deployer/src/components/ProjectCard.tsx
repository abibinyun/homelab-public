import { useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { getProjectServices, getComposeLogs, getProjectStats, apiCall } from '../lib/api';
import { useSSEDeploy } from '../hooks/useSSEDeploy';
import { useToast } from '../hooks/useToast';
import DeployHistoryModal from './DeployHistoryModal';

interface ProjectCardProps {
  project: Project;
  onDeploy: (name: string) => void;
  onAction: (name: string, action: string) => void;
  onViewLogs: (name: string) => void;
  onDelete: (name: string) => void;
  onEditEnv: (project: Project) => void;
  onEditResources: (project: Project) => void;
  onShowWebhook: (project: Project) => void;
  onShowDomain?: (project: Project) => void;
  deploying: string | null;
  deployProgress?: string;
  actionLoading: string | null;
  isDemo?: boolean;
}

const DEPLOY_TYPE_LABEL: Record<string, string> = {
  DOCKERFILE: '🐳',
  IMAGE: '📦',
  COMPOSE: '🗂',
};

export default function ProjectCard({
  project, onDeploy, onAction, onViewLogs, onDelete,
  onEditEnv, onEditResources, onShowWebhook, onShowDomain,
  deploying, deployProgress, actionLoading, isDemo = false,
}: ProjectCardProps) {
  const isDeploying = deploying === project.name;
  const isActionLoading = actionLoading?.startsWith(project.name);
  const isRunning = project.status === 'running';
  const isStopped = project.status === 'exited' || project.status === 'created';
  const disabled = isDemo || isDeploying || !!isActionLoading;
  const statusVariant = isDeploying ? 'secondary' : isRunning ? 'default' : isStopped ? 'destructive' : 'outline';
  const deployType = (project as any).deployType || 'DOCKERFILE';
  const isCompose = deployType === 'COMPOSE';

  const [menuOpen, setMenuOpen] = useState(false);
  const [services, setServices] = useState<any[] | null>(null);
  const [showServices, setShowServices] = useState(false);
  const [composeLogs, setComposeLogs] = useState<string | null>(null);
  const [showComposeLogs, setShowComposeLogs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { deploy: sseRollback, deploying: rollingBack } = useSSEDeploy();
  const toast = useToast();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleToggleServices = async () => {
    if (!showServices && !services) {
      const data = await getProjectServices(project.name).catch(() => []);
      setServices(data);
    }
    setShowServices(v => !v);
  };

  const handleToggleComposeLogs = async () => {
    if (!showComposeLogs) {
      const data = await getComposeLogs(project.name).catch(() => ({ logs: 'Failed to load logs' }));
      setComposeLogs(data.logs);
    }
    setShowComposeLogs(v => !v);
  };

  const handleRollback = async () => {
    if (!confirm(`Rollback ${project.name} to previous version?`)) return;
    try {
      const res = await apiCall(`/api/projects/${project.name}/rollback`, { method: 'POST' });
      const j = await res.json();
      if (j.success) toast.success('Rolled back successfully');
      else toast.error(j.error || 'Rollback failed');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleStats = async () => {
    if (!showStats) {
      const data = await getProjectStats(project.name).catch(() => null);
      setStats(data);
    }
    setShowStats(v => !v);
  };

  const menuItems = [
    { label: '📋 Logs', onClick: () => onViewLogs(project.name), disabled: isDemo },
    ...(isCompose ? [{ label: '📋 Compose Logs', onClick: handleToggleComposeLogs, disabled: isDemo }] : []),
    { label: '🕐 History', onClick: () => setShowHistory(true), disabled: false },
    { label: '📊 Stats', onClick: handleToggleStats, disabled: isDemo },
    { label: '⚙️ Env', onClick: () => onEditEnv(project), disabled: isDemo },
    { label: '📊 Resources', onClick: () => onEditResources(project), disabled: isDemo },
    { label: '🔗 Webhook', onClick: () => onShowWebhook(project), disabled: isDemo },
    ...(onShowDomain ? [{ label: '🌐 Domain', onClick: () => onShowDomain(project), disabled: isDemo }] : []),
    { label: '↩ Rollback', onClick: handleRollback, disabled: isDemo || !isRunning },
    { label: '🗑️ Delete', onClick: () => onDelete(project.name), disabled, danger: true },
  ];

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold truncate">{project.name}</h3>
              <span className="text-xs text-muted-foreground" title={deployType}>{DEPLOY_TYPE_LABEL[deployType] || '🐳'}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {project.subdomain}.{(import.meta as any).env.VITE_DOMAIN || 'yourdomain.com'}
            </p>
            {project.resources && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[
                  project.resources.memoryLimit && project.resources.memoryLimit !== '0' && `RAM: ${project.resources.memoryLimit}`,
                  project.resources.cpuLimit && project.resources.cpuLimit !== '0' && `CPU: ${project.resources.cpuLimit}`,
                ].filter(Boolean).join(' · ')}
              </p>
            )}
            {deployProgress && <p className="text-xs text-orange-500 mt-1">{deployProgress}</p>}
          </div>
          <Badge variant={statusVariant} className="flex-shrink-0 text-xs">
            {isDeploying ? 'deploying...' : (project.status || 'unknown')}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => onDeploy(project.name)} disabled={disabled} className="text-xs">
            🚀 Deploy
          </Button>
          {isRunning && (
            <Button size="sm" variant="outline" onClick={() => onAction(project.name, 'stop')} disabled={disabled} className="text-xs">
              ⏸ Stop
            </Button>
          )}
          {isStopped && (
            <Button size="sm" variant="outline" onClick={() => onAction(project.name, 'start')} disabled={disabled} className="text-xs">
              ▶ Start
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onAction(project.name, 'restart')} disabled={disabled} className="text-xs">
            🔄 Restart
          </Button>
          {isCompose && (
            <Button size="sm" variant="outline" onClick={handleToggleServices} className="text-xs">
              {showServices ? '▲ Services' : '▼ Services'}
            </Button>
          )}

          {/* More menu */}
          <div ref={menuRef} className="relative ml-auto">
            <Button size="sm" variant="outline" onClick={() => setMenuOpen(o => !o)} className="px-2">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 overflow-hidden">
                {menuItems.map((item, i) => (
                  <button
                    key={i}
                    disabled={item.disabled}
                    onClick={() => { item.onClick(); setMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${(item as any).danger ? 'text-destructive hover:bg-destructive/10' : ''}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Services list (COMPOSE only) */}
        {isCompose && showServices && (
          <div className="mt-3 border rounded-lg divide-y text-xs">
            {services === null && <p className="p-2 text-muted-foreground">Loading...</p>}
            {services?.length === 0 && <p className="p-2 text-muted-foreground">No services registered yet.</p>}
            {services?.map(s => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 gap-2">
                <span className="font-medium">{s.name}</span>
                {s.isPublic && s.subdomain && (
                  <a href={`https://${s.subdomain}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate max-w-[160px]">
                    {s.subdomain}
                  </a>
                )}
                <Badge variant={s.status === 'running' ? 'default' : 'destructive'} className="text-xs shrink-0">
                  {s.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Compose logs */}
        {isCompose && showComposeLogs && (
          <div className="mt-3">
            <pre className="bg-muted rounded-lg p-3 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
              {composeLogs || 'No logs'}
            </pre>
          </div>
        )}
      </CardContent>

      {/* Deploy History Modal */}
      {showHistory && (
        <DeployHistoryModal projectName={project.name} onClose={() => setShowHistory(false)} />
      )}

      {/* Resource Stats */}
      {showStats && stats && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2 text-xs border rounded-lg p-3 bg-muted/40">
            <div><span className="text-muted-foreground">CPU:</span> {stats.cpu}</div>
            <div><span className="text-muted-foreground">Memory:</span> {stats.mem} ({stats.memPerc})</div>
            <div><span className="text-muted-foreground">Network:</span> {stats.net}</div>
            <div><span className="text-muted-foreground">Block I/O:</span> {stats.block}</div>
          </div>
        </div>
      )}
    </Card>
  );
}
