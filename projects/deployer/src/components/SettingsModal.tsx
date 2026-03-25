import { useState, useEffect, FormEvent } from 'react';
import { getSettings, updateSettings } from '../lib/api';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [defaults, setDefaults] = useState({ memoryLimit: '512m', cpuLimit: '1', restartPolicy: 'unless-stopped' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    getSettings()
      .then(s => { if (s?.defaultResources) setDefaults(s.defaultResources); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({ defaultResources: defaults });
      toast.success('Default settings saved. New projects will use these values.');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="⚙️ Global Settings" onClose={onClose}>
      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Default resource limits untuk semua project baru. Project individual bisa override nilai ini.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Default Memory Limit</Label>
            <Input
              value={defaults.memoryLimit}
              onChange={e => setDefaults(d => ({ ...d, memoryLimit: e.target.value }))}
              placeholder="512m"
            />
            <p className="text-xs text-muted-foreground">256m, 512m, 1g, 2g. Isi 0 untuk unlimited.</p>
          </div>

          <div className="space-y-2">
            <Label>Default CPU Limit</Label>
            <Input
              value={defaults.cpuLimit}
              onChange={e => setDefaults(d => ({ ...d, cpuLimit: e.target.value }))}
              placeholder="1"
            />
            <p className="text-xs text-muted-foreground">0.5, 1, 2. Isi 0 untuk unlimited.</p>
          </div>

          <div className="space-y-2">
            <Label>Default Restart Policy</Label>
            <Select
              value={defaults.restartPolicy}
              onValueChange={v => setDefaults(d => ({ ...d, restartPolicy: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unless-stopped">unless-stopped (recommended)</SelectItem>
                <SelectItem value="always">always</SelectItem>
                <SelectItem value="on-failure">on-failure</SelectItem>
                <SelectItem value="no">no</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Defaults'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
