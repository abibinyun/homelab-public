import clientPermissionRepository from '../repositories/clientPermission.repository.js';
import type { ClientPermission } from '../types/index.js';

class PermissionService {
  async get(clientId: number) {
    return clientPermissionRepository.get(clientId);
  }

  async update(clientId: number, data: Partial<Omit<ClientPermission, 'id' | 'clientId' | 'updatedAt'>>) {
    return clientPermissionRepository.upsert(clientId, data);
  }
}

export default new PermissionService();
