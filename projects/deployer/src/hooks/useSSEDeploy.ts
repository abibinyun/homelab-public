import { useState } from 'react';

interface DeployCallbacks {
  onComplete?: (data: { message: string }) => void;
  onError?: (data: { message: string }) => void;
}

interface ProgressState {
  [projectName: string]: string;
}

export function useSSEDeploy() {
  const [deploying, setDeploying] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>({});

  const deploy = async (
    projectName: string,
    { onComplete, onError }: DeployCallbacks = {}
  ): Promise<void> => {
    setDeploying(projectName);
    setProgress({ [projectName]: 'Starting...' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectName}/deploy`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          const parts = line.split('\n');
          let event = '';
          let data: any = null;

          for (const part of parts) {
            if (part.startsWith('event: ')) {
              event = part.replace('event: ', '').trim();
            } else if (part.startsWith('data: ')) {
              try {
                data = JSON.parse(part.replace('data: ', ''));
              } catch {}
            }
          }

          if (event && data) {
            console.log('SSE Event:', event, data);
            if (event === 'progress') {
              const message = data.message || `${data.step}: Processing...`;
              setProgress({ [projectName]: message });
            } else if (event === 'complete') {
              setProgress({ [projectName]: data.message });
              setTimeout(() => {
                setProgress({});
                setDeploying(null);
                onComplete?.(data);
              }, 1000);
            } else if (event === 'error') {
              setProgress({});
              setDeploying(null);
              onError?.(data);
            }
          }
        }
      }
    } catch (err: any) {
      setProgress({});
      setDeploying(null);
      onError?.({ message: err.message });
    }
  };

  return { deploy, deploying, progress };
}
