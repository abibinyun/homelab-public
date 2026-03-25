import path from 'path';
import fs from 'fs/promises';
import db from '../db/index.js';
import config from '../config/index.js';
import { ProjectResources } from '../types/index.js';

const SETTINGS_FILE = path.join(config.dataDir, 'settings.json');

export interface GlobalSettings {
  defaultResources: ProjectResources;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  defaultResources: {
    memoryLimit: '512m',
    cpuLimit: '1',
    restartPolicy: 'unless-stopped',
  },
};

class SettingsRepository {
  async get(): Promise<GlobalSettings> {
    try {
      if (db.isConnected()) {
        const result = await db.query(`SELECT value FROM settings WHERE key = 'global'`);
        if (result.rows.length > 0) return result.rows[0].value as GlobalSettings;
        return DEFAULT_SETTINGS;
      }
    } catch {}

    try {
      const raw = await fs.readFile(SETTINGS_FILE, 'utf8');
      return JSON.parse(raw) as GlobalSettings;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async save(settings: GlobalSettings): Promise<void> {
    try {
      if (db.isConnected()) {
        await db.query(
          `INSERT INTO settings (key, value, updated_at) VALUES ('global', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
          [JSON.stringify(settings)]
        );
        return;
      }
    } catch {}

    await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  }
}

export default new SettingsRepository();
