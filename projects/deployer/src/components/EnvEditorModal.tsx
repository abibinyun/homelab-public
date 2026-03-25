import { useState } from 'react';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';

export default function EnvEditorModal({ project, onClose, onSave }) {
  const [envVars, setEnvVars] = useState(
    Object.entries(project.env || {}).map(([key, value]) => ({ key, value }))
  );
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const removeEnvVar = (index) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index, field, value) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const env: any = {};
      envVars.forEach(({ key, value }) => {
        if (key) env[key] = value;
      });
      await onSave(env);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`⚙️ Environment Variables - ${project.name}`} onClose={onClose}>
        
        <div style={{ marginBottom: '1rem' }}>
          {envVars.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
              No environment variables
            </p>
          ) : (
            envVars.map((env, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  value={env.key}
                  onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                  placeholder="KEY"
                  style={{ flex: 1 }}
                />
                <input
                  value={env.value as string}
                  onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                  placeholder="value"
                  style={{ flex: 2 }}
                />
                <button
                  type="button"
                  onClick={() => removeEnvVar(index)}
                  className="btn btn-danger btn-sm"
                >
                  ✕
                </button>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={addEnvVar}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '0.5rem' }}
          >
            + Add Variable
          </button>
        </div>

        <small style={{ color: '#f59e0b', fontSize: '0.75rem', display: 'block', marginBottom: '1rem' }}>
          ⚠️ Changes require redeploy to take effect
        </small>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleSave} className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Saving...' : '💾 Save'}
          </button>
          <button onClick={onClose} className="btn btn-secondary" disabled={loading}>
            Cancel
          </button>
        </div>
    </Modal>
  );
}
