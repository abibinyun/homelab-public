import { useState, useEffect } from 'react';

export interface FeatureFlags {
  demo: boolean;
  cloudflare: boolean;
  customDomain: boolean;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);

  useEffect(() => {
    fetch('/health/config')
      .then(r => r.json())
      .then(setFlags)
      .catch(() => setFlags({ demo: false, cloudflare: false, customDomain: false }));
  }, []);

  return flags;
}
