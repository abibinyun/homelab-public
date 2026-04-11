import { useState, useEffect } from 'react';
import { getDeployHistory } from '../lib/api';
import Modal from './Modal';
import { Badge } from '@/components/ui/badge';

interface Props {
  projectName: string;
  onClose: () => void;
}

const STATUS_VARIANT: Record<string, any> = {
  success: 'default',
  running: 'secondary',
  failed: 'destructive',
};

export default function DeployHistoryModal({ projectName, onClose }: Props) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeployHistory(projectName)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [projectName]);

  const fmt = (iso: string) => new Date(iso).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  const dur = (sec: number) => sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;

  return (
    <Modal title={`📋 Deploy History — ${projectName}`} onClose={onClose}>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!loading && history.length === 0 && <p className="text-sm text-muted-foreground">No deploy history yet.</p>}
        {history.map(h => (
          <div key={h.id} className="border rounded-lg px-3 py-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[h.status] || 'outline'} className="text-xs">{h.status}</Badge>
                <span className="text-xs text-muted-foreground">{h.triggerType}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fmt(h.startedAt)}
                {h.durationSec != null && ` · ${dur(h.durationSec)}`}
              </p>
            </div>
            {h.imageTagBefore && (
              <span className="text-xs text-muted-foreground shrink-0">prev: {h.imageTagBefore.slice(0, 12)}</span>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
