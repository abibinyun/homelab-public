import Modal from './Modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface LogsModalProps {
  logs: string;
  projectName: string;
  onClose: () => void;
}

export default function LogsModal({ logs, projectName, onClose }: LogsModalProps) {
  return (
    <Modal title={`📋 Logs: ${projectName}`} onClose={onClose}>
      <div className="space-y-4">
        <Textarea
          value={logs || 'No logs available'}
          readOnly
          rows={20}
          className="font-mono text-xs"
        />
        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    </Modal>
  );
}
