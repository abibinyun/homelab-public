import { useState, useEffect } from 'react';
import type { ClientPermission } from '../types';
import { apiCall } from '../lib/api';

export function usePermissions(clientId?: number) {
  const [permissions, setPermissions] = useState<ClientPermission | null>(null);

  useEffect(() => {
    if (!clientId) return;
    apiCall(`/api/clients/${clientId}/permissions`)
      .then(r => r.json())
      .then(j => setPermissions(j.data))
      .catch(() => {});
  }, [clientId]);

  return permissions;
}
