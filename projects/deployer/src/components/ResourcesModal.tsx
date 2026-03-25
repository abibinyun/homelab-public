import { useState, FormEvent } from 'react';
import { updateProjectResources } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { Project, ProjectResources } from '../types';
import Modal from './Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResourcesModal({ project, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<ProjectResources>({
    memoryLimit: project.resources?.memoryLimit ?? '512m',
    cpuLimit: project.resources?.cpuLimit ?? '1',
    restartPolicy: project.resources?.restartPolicy ?? 'unless-stopped',
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProjectResources(project.name, form);
      toast.success('Resources updated. Redeploy to apply changes.');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`⚙️ Resources — ${project.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="memoryLimit">Memory Limit</Label>
          <Input
            id="memoryLimit"
            value={form.memoryLimit}
            onChange={e => setForm(f => ({ ...f, memoryLimit: e.target.value }))}
            placeholder="512m, 1g, 0 = unlimited"
          />
          <p className="text-xs text-muted-foreground">Contoh: 256m, 512m, 1g, 2g. Kosongkan atau isi 0 untuk unlimited.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpuLimit">CPU Limit</Label>
          <Input
            id="cpuLimit"
            value={form.cpuLimit}
            onChange={e => setForm(f => ({ ...f, cpuLimit: e.target.value }))}
            placeholder="0.5, 1, 2, 0 = unlimited"
          />
          <p className="text-xs text-muted-foreground">Contoh: 0.5 = setengah core, 1 = 1 core. Isi 0 untuk unlimited.</p>
        </div>

        <div className="space-y-2">
          <Label>Restart Policy</Label>
          <Select
            value={form.restartPolicy}
            onValueChange={v => setForm(f => ({ ...f, restartPolicy: v as ProjectResources['restartPolicy'] }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unless-stopped">unless-stopped (recommended)</SelectItem>
              <SelectItem value="always">always</SelectItem>
              <SelectItem value="on-failure">on-failure</SelectItem>
              <SelectItem value="no">no</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Saving...' : 'Save Resources'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
