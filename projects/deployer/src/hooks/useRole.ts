import { useMemo } from 'react';

export function useRole(): string {
  return useMemo(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return 'client';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || 'admin';
    } catch {
      return 'admin';
    }
  }, []);
}
