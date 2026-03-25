import settingsRepository, { GlobalSettings } from '../repositories/settings.repository.js';
import { ProjectResources } from '../types/index.js';

class SettingsService {
  async getSettings(): Promise<GlobalSettings> {
    return settingsRepository.get();
  }

  async updateSettings(updates: Partial<GlobalSettings>): Promise<GlobalSettings> {
    const current = await settingsRepository.get();
    const merged: GlobalSettings = {
      ...current,
      ...updates,
      defaultResources: { ...current.defaultResources, ...updates.defaultResources },
    };
    await settingsRepository.save(merged);
    return merged;
  }

  async getDefaultResources(): Promise<ProjectResources> {
    const settings = await settingsRepository.get();
    return settings.defaultResources;
  }
}

export default new SettingsService();
