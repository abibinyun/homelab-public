import { useState, useEffect } from 'react';
import { Globe, CheckCircle, XCircle, Loader2, Copy, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import * as api from '../lib/api';
import { CustomDomain, DomainVerificationInstructions } from '../types';

interface CustomDomainModalProps {
  projectName: string;
  onClose: () => void;
}

export default function CustomDomainModal({ projectName, onClose }: CustomDomainModalProps) {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<number | null>(null);
  const [instructions, setInstructions] = useState<DomainVerificationInstructions | null>(null);

  useEffect(() => {
    loadDomains();
  }, [projectName]);

  const loadDomains = async () => {
    try {
      const response: any = await api.getProjectDomains(projectName);
      setDomains(response || []);
    } catch (error) {
      console.error('Failed to load domains:', error);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    setLoading(true);
    try {
      const response: any = await api.addCustomDomain(projectName, newDomain.trim());
      
      setInstructions(response.verificationInstructions);
      setNewDomain('');
      await loadDomains();
      
      toast.success('Domain added! Please verify ownership.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add domain');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (domainId: number) => {
    setVerifying(domainId);
    try {
      await api.verifyCustomDomain(domainId);
      toast.success('Domain verified successfully!');
      await loadDomains();
      setInstructions(null);
    } catch (error: any) {
      toast.error(error.message || 'Verification failed. Please check your DNS records.');
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (domainId: number) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;

    try {
      await api.deleteCustomDomain(domainId);
      toast.success('Domain removed');
      await loadDomains();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove domain');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Custom Domains - {projectName}
          </DialogTitle>
          <DialogDescription>
            Use your own domain instead of the default subdomain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain">Add Custom Domain</Label>
            <div className="flex gap-2">
              <Input
                id="domain"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com or app.example.com"
                disabled={loading}
              />
              <Button onClick={handleAddDomain} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </div>

          {/* Verification Instructions */}
          {instructions && (
            <div className="rounded-lg border bg-muted p-4 space-y-3">
              <h4 className="font-semibold">📋 Verification Instructions</h4>
              <p className="text-sm text-muted-foreground">
                Add this DNS record to verify domain ownership:
              </p>
              
              <div className="space-y-2 font-mono text-sm">
                <div className="flex items-center justify-between bg-background p-2 rounded">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{instructions.recordType}</span>
                </div>
                <div className="flex items-center justify-between bg-background p-2 rounded">
                  <span className="text-muted-foreground">Name:</span>
                  <div className="flex items-center gap-2">
                    <span className="break-all">{instructions.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(instructions.name)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-background p-2 rounded">
                  <span className="text-muted-foreground">Value:</span>
                  <div className="flex items-center gap-2">
                    <span className="break-all text-xs">{instructions.value}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(instructions.value)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                ⏱️ DNS propagation may take up to 48 hours. Click "Verify" once the record is added.
              </p>
            </div>
          )}

          {/* Existing Domains */}
          <div className="space-y-2">
            <Label>Your Domains</Label>
            {domains.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No custom domains yet. Add one above!
              </p>
            ) : (
              <div className="space-y-2">
                {domains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{domain.domain}</span>
                        {domain.verified ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                        {domain.sslStatus === 'active' && (
                          <Badge variant="outline">SSL Active</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Added {new Date(domain.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!domain.verified && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setInstructions({
                              recordType: 'TXT',
                              name: `_deployer-verify.${domain.domain}`,
                              value: domain.verificationToken
                            })}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Show DNS
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleVerify(domain.id)}
                            disabled={verifying === domain.id}
                          >
                            {verifying === domain.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Verify'
                            )}
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(domain.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
