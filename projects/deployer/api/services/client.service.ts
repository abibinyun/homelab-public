import clientRepository from '../repositories/client.repository.js';
import clientPermissionRepository from '../repositories/clientPermission.repository.js';
import type { Client } from '../types/index.js';

class ClientService {
  async list() {
    return clientRepository.getAll();
  }

  async get(id: number) {
    return clientRepository.getById(id);
  }

  async create(data: Omit<Client, 'id' | 'createdAt'>) {
    const client = await clientRepository.create(data);
    // auto-create default permissions
    await clientPermissionRepository.upsert(client.id, {});
    return client;
  }

  async update(id: number, data: Partial<Omit<Client, 'id' | 'createdAt'>>) {
    return clientRepository.update(id, data);
  }

  async delete(id: number) {
    return clientRepository.delete(id);
  }

  async summary(id: number) {
    return clientRepository.getSummary(id);
  }
}

export default new ClientService();
