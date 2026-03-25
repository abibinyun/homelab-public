import Modal from './Modal';

export default function WebhookModal({ project, onClose }) {
  const baseUrl = window.location.origin;
  const webhookUrls = {
    github: `${baseUrl}/api/webhook/github/${project.name}`,
    gitlab: `${baseUrl}/api/webhook/gitlab/${project.name}`,
    generic: `${baseUrl}/api/webhook/deploy/${project.name}`
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <Modal title={`🔗 Webhook URLs - ${project.name}`} onClose={onClose}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>GitHub</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            value={webhookUrls.github}
              readOnly
              style={{ flex: 1, fontSize: '0.75rem' }}
            />
            <button onClick={() => copyToClipboard(webhookUrls.github)} className="btn btn-secondary btn-sm">
              📋 Copy
            </button>
          </div>
          <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            Settings → Webhooks → Add webhook<br/>
            Content type: application/json<br/>
            Events: Just the push event
          </small>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>GitLab</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              value={webhookUrls.gitlab}
              readOnly
              style={{ flex: 1, fontSize: '0.75rem' }}
            />
            <button onClick={() => copyToClipboard(webhookUrls.gitlab)} className="btn btn-secondary btn-sm">
              📋 Copy
            </button>
          </div>
          <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            Settings → Webhooks → Add webhook<br/>
            Trigger: Push events
          </small>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>Generic (No Auth)</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              value={webhookUrls.generic}
              readOnly
              style={{ flex: 1, fontSize: '0.75rem' }}
            />
            <button onClick={() => copyToClipboard(webhookUrls.generic)} className="btn btn-secondary btn-sm">
              📋 Copy
            </button>
          </div>
          <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            Simple POST request to trigger deploy
          </small>
        </div>

        <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#f59e0b' }}>⚠️ Security Note</h3>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Webhook secret not implemented yet. Anyone with the URL can trigger deploy.
            Use Cloudflare Access or firewall rules to restrict access.
          </p>
        </div>

        <button onClick={onClose} className="btn btn-primary">
          Close
        </button>
    </Modal>
  );
}
