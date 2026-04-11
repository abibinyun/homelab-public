import { useState, useEffect, FormEvent } from 'react';
import { createProject, getDomains, getTemplates, getDomainsForClient } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { EnvVar, ProjectResources } from '../types';
import Modal from './Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DeployType = 'DOCKERFILE' | 'IMAGE' | 'COMPOSE';
type DbMode = 'NONE' | 'SHARED' | 'DEDICATED';

interface NewProjectModalProps {
  onClose: () => void;
  onSuccess: (projectName: string) => void;
}

export default function NewProjectModal({ onClose, onSuccess }: NewProjectModalProps) {
  const [deployType, setDeployType] = useState<DeployType>('DOCKERFILE');
  const [domains, setDomains] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const [name, setName] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [gitToken, setGitToken] = useState('');
  const [registryImage, setRegistryImage] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [domainId, setDomainId] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [port, setPort] = useState(3000);
  const [dbMode, setDbMode] = useState<DbMode>('NONE');
  const [redisMode, setRedisMode] = useState<DbMode>('NONE');
  const [composeVars, setComposeVars] = useState<EnvVar[]>([]);
  const [envVars, setEnvVars] = useState<EnvVar[]>([{ key: '', value: '' }]);
  const [resources, setResources] = useState<ProjectResources>({ memoryLimit: '', cpuLimit: '', restartPolicy: 'unless-stopped' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Detect role + clientId from JWT
    let clientId: number | null = null;
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'client' && payload.clientId) clientId = payload.clientId;
      }
    } catch {}

    if (clientId) {
      // Client: only show domains assigned to them
      getDomainsForClient(clientId).then(setDomains).catch(() => {});
    } else {
      getDomains().then(setDomains).catch(() => {});
    }
    getTemplates().then(setTemplates).catch(() => {});
  }, []);

  // When template changes, populate composeVars from template.variables
  useEffect(() => {
    if (!templateId) { setSelectedTemplate(null); setComposeVars([]); return; }
    const t = templates.find(x => String(x.id) === templateId);
    setSelectedTemplate(t || null);
    if (t?.variables) {
      setComposeVars(t.variables.map((v: any) => ({ key: v.key, value: v.default || '' })));
    }
  }, [templateId, templates]);

  const selectedDomain = domains.find(d => String(d.id) === domainId);
  const fullDomain = selectedDomain && subdomain
    ? `${subdomain}.${selectedDomain.name}`
    : subdomain ? `${subdomain}.yourdomain.com` : '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const env: Record<string, string> = {};
      envVars.forEach(({ key, value }) => { if (key) env[key] = value; });

      const vars: Record<string, string> = {};
      composeVars.forEach(({ key, value }) => { if (key) vars[key] = value; });

      const data: any = {
        name,
        subdomain,
        port,
        deployType,
        dbMode,
        redisMode,
        env,
        resources,
        ...(domainId && { domainId: Number(domainId) }),
        ...(deployType !== 'IMAGE' && gitUrl && { gitUrl, gitBranch }),
        ...(gitToken && { gitToken }),
        ...(deployType === 'IMAGE' && { registryImage }),
        ...(deployType === 'COMPOSE' && templateId && { templateId: Number(templateId), composeVars: vars }),
      };

      await createProject(data);
      onSuccess(data.name);
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  return (
    <Modal title="🚀 New Project" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

        {/* Deploy Type */}
        <div className="space-y-2">
          <Label>Deploy Type</Label>
          <Tabs value={deployType} onValueChange={v => setDeployType(v as DeployType)}>
            <TabsList className="w-full">
              <TabsTrigger value="DOCKERFILE" className="flex-1">Dockerfile</TabsTrigger>
              <TabsTrigger value="IMAGE" className="flex-1">Image</TabsTrigger>
              <TabsTrigger value="COMPOSE" className="flex-1">Compose</TabsTrigger>
            </TabsList>

            {/* DOCKERFILE */}
            <TabsContent value="DOCKERFILE" className="space-y-3 mt-3">
              <div className="space-y-1">
                <Label>Git URL</Label>
                <Input value={gitUrl} onChange={e => setGitUrl(e.target.value)} placeholder="https://github.com/user/repo.git" required={deployType === 'DOCKERFILE'} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Branch</Label>
                  <Input value={gitBranch} onChange={e => setGitBranch(e.target.value)} placeholder="main" />
                </div>
                <div className="space-y-1">
                  <Label>Git Token <span className="text-muted-foreground text-xs">(private repo)</span></Label>
                  <Input type="password" value={gitToken} onChange={e => setGitToken(e.target.value)} placeholder="ghp_..." />
                </div>
              </div>
            </TabsContent>

            {/* IMAGE */}
            <TabsContent value="IMAGE" className="space-y-3 mt-3">
              <div className="space-y-1">
                <Label>Registry Image</Label>
                <Input value={registryImage} onChange={e => setRegistryImage(e.target.value)} placeholder="ghcr.io/user/app:latest" required={deployType === 'IMAGE'} />
              </div>
            </TabsContent>

            {/* COMPOSE */}
            <TabsContent value="COMPOSE" className="space-y-3 mt-3">
              <div className="space-y-1">
                <Label>Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name} — {t.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Git URL <span className="text-muted-foreground text-xs">(repo to clone)</span></Label>
                <Input value={gitUrl} onChange={e => setGitUrl(e.target.value)} placeholder="https://github.com/user/repo.git" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Branch</Label>
                  <Input value={gitBranch} onChange={e => setGitBranch(e.target.value)} placeholder="main" />
                </div>
                <div className="space-y-1">
                  <Label>Git Token</Label>
                  <Input type="password" value={gitToken} onChange={e => setGitToken(e.target.value)} placeholder="ghp_..." />
                </div>
              </div>
              {/* Template variables */}
              {composeVars.length > 0 && (
                <div className="space-y-2 border rounded-lg p-3">
                  <Label className="text-sm font-medium">Template Variables</Label>
                  {composeVars.map((v, i) => {
                    const meta = selectedTemplate?.variables?.find((x: any) => x.key === v.key);
                    return (
                      <div key={v.key} className="space-y-1">
                        <Label className="text-xs">
                          {v.key} {meta?.required && <span className="text-red-500">*</span>}
                          {meta?.description && <span className="text-muted-foreground ml-1">— {meta.description}</span>}
                        </Label>
                        <Input
                          value={v.value}
                          onChange={e => {
                            const updated = [...composeVars];
                            updated[i].value = e.target.value;
                            setComposeVars(updated);
                          }}
                          placeholder={meta?.default || v.key}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Project Name */}
        <div className="space-y-1">
          <Label>Project Name</Label>
          <Input value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required placeholder="my-app" />
          <p className="text-xs text-muted-foreground">Lowercase, letters, numbers, dashes only</p>
        </div>

        {/* Domain + Subdomain */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Domain</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger><SelectValue placeholder="Select domain..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default (env DOMAIN)</SelectItem>
                {domains.filter(d => d.isActive).map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Subdomain</Label>
            <Input value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required placeholder="app" />
          </div>
        </div>
        {fullDomain && <p className="text-xs text-muted-foreground -mt-2">→ {fullDomain}</p>}

        {/* Port (hidden for COMPOSE) */}
        {deployType !== 'COMPOSE' && (
          <div className="space-y-1">
            <Label>Port</Label>
            <Input type="number" value={port} onChange={e => setPort(Number(e.target.value))} required />
          </div>
        )}

        {/* DB / Redis mode */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Database</Label>
            <Select value={dbMode} onValueChange={v => setDbMode(v as DbMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="SHARED">Shared (homelab)</SelectItem>
                <SelectItem value="DEDICATED">Dedicated (in stack)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Redis</Label>
            <Select value={redisMode} onValueChange={v => setRedisMode(v as DbMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="SHARED">Shared (homelab)</SelectItem>
                <SelectItem value="DEDICATED">Dedicated (in stack)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Env vars */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Environment Variables</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => setEnvVars([...envVars, { key: '', value: '' }])}>+ Add</Button>
          </div>
          {envVars.map((env, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="KEY" value={env.key} onChange={e => { const u = [...envVars]; u[i].key = e.target.value; setEnvVars(u); }} />
              <Input placeholder="value" value={env.value} onChange={e => { const u = [...envVars]; u[i].value = e.target.value; setEnvVars(u); }} />
              {envVars.length > 1 && <Button type="button" variant="destructive" size="sm" onClick={() => setEnvVars(envVars.filter((_, j) => j !== i))}>✕</Button>}
            </div>
          ))}
        </div>

        {/* Resources */}
        <div className="space-y-2 border rounded-lg p-3">
          <Label className="text-sm font-medium">Resource Limits <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Memory</Label>
              <Input value={resources.memoryLimit} onChange={e => setResources(r => ({ ...r, memoryLimit: e.target.value }))} placeholder="512m, 1g" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CPU</Label>
              <Input value={resources.cpuLimit} onChange={e => setResources(r => ({ ...r, cpuLimit: e.target.value }))} placeholder="0.5, 1" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Restart Policy</Label>
            <Select value={resources.restartPolicy} onValueChange={v => setResources(r => ({ ...r, restartPolicy: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unless-stopped">unless-stopped</SelectItem>
                <SelectItem value="always">always</SelectItem>
                <SelectItem value="on-failure">on-failure</SelectItem>
                <SelectItem value="no">no</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Creating...' : 'Create & Deploy'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
