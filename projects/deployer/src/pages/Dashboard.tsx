import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getProjects, projectAction, deleteProject, getProjectLogs, getSSHKey, updateProjectEnv } from '../lib/api';
import { useSSEDeploy } from '../hooks/useSSEDeploy';
import { useToast } from '../hooks/useToast';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { Project } from '../types';
import { Button } from '@/components/ui/button';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import NewProjectModal from '../components/NewProjectModal';
import LogsModal from '../components/LogsModal';
import SSHKeyModal from '../components/SSHKeyModal';
import EnvEditorModal from '../components/EnvEditorModal';
import WebhookModal from '../components/WebhookModal';
import CustomDomainModal from '../components/CustomDomainModal';
import ResourcesModal from '../components/ResourcesModal';
import SettingsModal from '../components/SettingsModal';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [showNewProject, setShowNewProject] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [showSSHKey, setShowSSHKey] = useState<boolean>(false);
  const [showEnvEditor, setShowEnvEditor] = useState<boolean>(false);
  const [showWebhook, setShowWebhook] = useState<boolean>(false);
  const [showDomain, setShowDomain] = useState<boolean>(false);
  const [showResources, setShowResources] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');
  const [logs, setLogs] = useState<string>('');
  const [sshKey, setSSHKey] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const { deploy, deploying, progress: deployProgress } = useSSEDeploy();
  const toast = useToast();
  const navigate = useNavigate();
  const featureFlags = useFeatureFlags();

  useEffect(() => {
    loadProjects();
    loadSSHKey();
    const interval = setInterval(() => {
      if (!deploying && !actionLoading) loadProjects();
    }, 5000);
    return () => clearInterval(interval);
  }, [deploying, actionLoading]);

  const loadProjects = async (): Promise<void> => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      if ((err as Error).message.includes('401')) {
        localStorage.clear();
        navigate('/login');
      }
    }
  };

  const loadSSHKey = async (): Promise<void> => {
    try {
      const data = await getSSHKey();
      setSSHKey(data.publicKey);
    } catch (err) {
      console.error('Load SSH key error:', err);
    }
  };

  const handleDeploy = async (name: string): Promise<void> => {
    if (deploying === name) return;
    
    const shouldConfirm = !name.startsWith('temp-');
    if (shouldConfirm && !confirm(`Deploy ${name}?`)) return;
    
    await deploy(name, {
      onComplete: (data) => {
        toast.success(data.message);
        loadProjects();
      },
      onError: (data) => {
        toast.error(data.message);
      }
    });
  };

  const handleAction = async (name: string, action: string): Promise<void> => {
    setActionLoading(`${name}-${action}`);
    try {
      await projectAction(name, action);
      await loadProjects();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewLogs = async (name: string): Promise<void> => {
    setActionLoading(`${name}-logs`);
    try {
      const data = await getProjectLogs(name);
      setLogs(data.logs);
      setSelectedProjectName(name);
      setShowLogs(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (name: string): Promise<void> => {
    if (!confirm(`Delete ${name}?`)) return;
    setActionLoading(`${name}-delete`);
    try {
      await deleteProject(name);
      await loadProjects();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditEnv = (project: Project): void => {
    setSelectedProject(project);
    setShowEnvEditor(true);
  };

  const handleEditResources = (project: Project): void => {
    setSelectedProject(project);
    setShowResources(true);
  };

  const handleSaveEnv = async (env: Record<string, string>): Promise<void> => {
    if (!selectedProject) return;
    try {
      await updateProjectEnv(selectedProject.name, env);
      await loadProjects();
    } catch (err) {
      throw err;
    }
  };

  const handleShowWebhook = (project: Project): void => {
    setSelectedProject(project);
    setShowWebhook(true);
  };

  const handleShowDomain = (project: Project): void => {
    setSelectedProject(project);
    setShowDomain(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Projects</h1>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              ⚙️ Settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSSHKey(true)}>
              🔑 SSH Key
            </Button>
            <Button size="sm" onClick={() => setShowNewProject(true)} disabled={!!featureFlags?.demo}>
              + New Project
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {featureFlags?.demo && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-600 dark:text-blue-400">
              <p className="font-semibold mb-1">🎭 Mode Demo</p>
              <p>Kamu sedang melihat preview UI. Semua action di-disable.</p>
              <p className="mt-1">Untuk penggunaan nyata, jalankan <code className="rounded bg-blue-500/20 px-1">./scripts/setup.sh</code> di server kamu.</p>
            </div>
          )}
          {featureFlags && !featureFlags.demo && !featureFlags.cloudflare && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
              <span>⚠️</span>
              <div>
                <span className="font-medium">Cloudflare belum dikonfigurasi.</span>
                {' '}Fitur auto-routing subdomain dan custom domain tidak tersedia.
                Set <code className="rounded bg-yellow-500/20 px-1">CLOUDFLARE_API_TOKEN</code>,{' '}
                <code className="rounded bg-yellow-500/20 px-1">CLOUDFLARE_ZONE_ID</code>, dan{' '}
                <code className="rounded bg-yellow-500/20 px-1">CLOUDFLARE_TUNNEL_ID</code> di <code className="rounded bg-yellow-500/20 px-1">.env</code> untuk mengaktifkan.
              </div>
            </div>
          )}
          {projects.map(project => (
            <ProjectCard
              key={project.name}
              project={project}
              onDeploy={handleDeploy}
              onAction={handleAction}
              onViewLogs={handleViewLogs}
              onDelete={handleDelete}
              onEditEnv={handleEditEnv}
              onEditResources={handleEditResources}
              onShowWebhook={handleShowWebhook}
              onShowDomain={handleShowDomain}
              deploying={deploying}
              deployProgress={deployProgress[project.name]}
              actionLoading={actionLoading}
              isDemo={!!featureFlags?.demo}
            />
        ))}
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onSuccess={(projectName) => {
            setShowNewProject(false);
            loadProjects();
            // Trigger deploy with progress
            if (projectName) {
              handleDeploy(projectName);
            }
          }}
        />
      )}

      {showLogs && (
        <LogsModal
          logs={logs}
          projectName={selectedProjectName}
          onClose={() => setShowLogs(false)}
        />
      )}

      {showSSHKey && (
        <SSHKeyModal
          sshKey={sshKey}
          onClose={() => setShowSSHKey(false)}
        />
      )}

      {showEnvEditor && selectedProject && (
        <EnvEditorModal
          project={selectedProject}
          onClose={() => {
            setShowEnvEditor(false);
            setSelectedProject(null);
          }}
          onSave={handleSaveEnv}
        />
      )}

      {showWebhook && selectedProject && (
        <WebhookModal
          project={selectedProject}
          onClose={() => {
            setShowWebhook(false);
            setSelectedProject(null);
          }}
        />
      )}

      {showDomain && selectedProject && (
        <CustomDomainModal
          projectName={selectedProject.name}
          onClose={() => {
            setShowDomain(false);
            setSelectedProject(null);
          }}
        />
      )}

      {showResources && selectedProject && (
        <ResourcesModal
          project={selectedProject}
          onClose={() => { setShowResources(false); setSelectedProject(null); }}
          onSuccess={() => { setShowResources(false); setSelectedProject(null); loadProjects(); }}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
      </div>
    </Layout>
  );
}
