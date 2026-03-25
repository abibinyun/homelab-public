import Modal from './Modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SSHKeyModalProps {
  sshKey: string;
  onClose: () => void;
}

export default function SSHKeyModal({ sshKey, onClose }: SSHKeyModalProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(sshKey);
    alert('SSH key copied to clipboard!');
  };

  return (
    <Modal title="🔑 SSH Public Key" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Public Key</Label>
          <Textarea
            value={sshKey}
            readOnly
            rows={8}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Add this key to your Git provider (GitHub, GitLab, etc.) to deploy private repositories
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={copyToClipboard} className="flex-1">
            📋 Copy to Clipboard
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
