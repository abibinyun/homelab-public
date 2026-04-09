import React from 'react';
import type { ClientPermission } from '../types';
import { useRole } from '../hooks/useRole';

interface Props {
  permission: keyof Omit<ClientPermission, 'id' | 'clientId' | 'updatedAt'>;
  permissions?: ClientPermission | null;
  children: React.ReactNode;
}

export default function PermissionGate({ permission, permissions, children }: Props) {
  const role = useRole();
  if (role === 'superadmin' || role === 'admin') return <>{children}</>;
  if (!permissions || !permissions[permission]) return null;
  return <>{children}</>;
}
