import { useState, FormEvent } from 'react';
import { createProject } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { EnvVar, ProjectResources } from '../types';
import Modal from './Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NewProjectModalProps {
  onClose: () => void;
  onSuccess: (projectName: string) => void;
}

interface FormData {
  name: string;
  gitUrl: string;
  subdomain: string;
  port: number;
  gitToken: string;
}
export default function NewProjectModal({ onClose, onSuccess }: NewProjectModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    gitUrl: '',
    subdomain: '',
    port: 3000,
    gitToken: ''
  });
  const [envVars, setEnvVars] = useState<EnvVar[]>([{ key: '', value: '' }]);
  const [resources, setResources] = useState<ProjectResources>({ memoryLimit: '', cpuLimit: '', restartPolicy: 'unless-stopped' });
  const [loading, setLoading] = useState<boolean>(false);
  const toast = useToast();

  const addEnvVar = (): void => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number): void => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: keyof EnvVar, value: string): void => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      const env = {};
      envVars.forEach(({ key, value }) => {
        if (key) env[key] = value;
      });

      const data: any = {
        ...formData,
        env,
        port: parseInt(formData.port as any),
        resources,
      };
      if (!data.gitToken) delete data.gitToken;

      await createProject(data);
      onSuccess(data.name);
      
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  return (
    <Modal title="🚀 New Project" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Project Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            required
            placeholder="my-app"
          />
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, and dashes only
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gitUrl">Git URL</Label>
          <Input
            id="gitUrl"
            value={formData.gitUrl}
            onChange={(e) => setFormData({ ...formData, gitUrl: e.target.value })}
            required
            placeholder="https://github.com/user/repo.git"
          />
          <p className="text-xs text-muted-foreground">HTTPS or SSH format</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subdomain">Subdomain</Label>
          <Input
            id="subdomain"
            value={formData.subdomain}
            onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            required
            placeholder="my-app"
          />
          <p className="text-xs text-muted-foreground">
            Will be: {formData.subdomain || 'my-app'}.{(import.meta as any).env.VITE_DOMAIN || 'yourdomain.com'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            type="number"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gitToken">Git Token (Optional)</Label>
          <Input
            id="gitToken"
            type="password"
            value={formData.gitToken}
            onChange={(e) => setFormData({ ...formData, gitToken: e.target.value })}
            placeholder="For private repos"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Environment Variables</Label>
            <Button type="button" variant="outline" size="sm" onClick={addEnvVar}>
              + Add
            </Button>
          </div>
          {envVars.map((env, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="KEY"
                value={env.key}
                onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
              />
              <Input
                placeholder="value"
                value={env.value}
                onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
              />
              {envVars.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeEnvVar(i)}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3 border rounded-lg p-3">
          <Label className="text-sm font-medium">Resource Limits <span className="text-muted-foreground font-normal">(opsional, kosong = pakai default global)</span></Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="memoryLimit" className="text-xs">Memory</Label>
              <Input
                id="memoryLimit"
                value={resources.memoryLimit}
                onChange={e => setResources(r => ({ ...r, memoryLimit: e.target.value }))}
                placeholder="512m, 1g, 0=∞"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cpuLimit" className="text-xs">CPU</Label>
              <Input
                id="cpuLimit"
                value={resources.cpuLimit}
                onChange={e => setResources(r => ({ ...r, cpuLimit: e.target.value }))}
                placeholder="0.5, 1, 0=∞"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Restart Policy</Label>
            <Select value={resources.restartPolicy} onValueChange={v => setResources(r => ({ ...r, restartPolicy: v as ProjectResources['restartPolicy'] }))}>
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

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
