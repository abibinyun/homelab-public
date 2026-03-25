import { useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';

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

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const menuItems = [
    { label: '📋 Logs', onClick: () => onViewLogs(project.name), disabled: isDemo },
    { label: '⚙️ Env', onClick: () => onEditEnv(project), disabled: isDemo },
    { label: '📊 Resources', onClick: () => onEditResources(project), disabled: isDemo },
    { label: '🔗 Webhook', onClick: () => onShowWebhook(project), disabled: isDemo },
    ...(onShowDomain ? [{ label: '🌐 Domain', onClick: () => onShowDomain(project), disabled: isDemo }] : []),
    { label: '🗑️ Delete', onClick: () => onDelete(project.name), disabled, danger: true },
  ];

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate">{project.name}</h3>
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
          {/* Primary */}
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

          {/* More menu */}
          <div ref={menuRef} className="relative ml-auto">
            <Button size="sm" variant="outline" onClick={() => setMenuOpen(o => !o)} className="px-2">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 overflow-hidden">
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
      </CardContent>
    </Card>
  );
}
