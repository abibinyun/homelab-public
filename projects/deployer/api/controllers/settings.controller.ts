import { Request, Response } from 'express';
import settingsService from '../services/settings.service.js';
import { ResponseSerializer } from '../utils/response.js';

export class SettingsController {
  async get(_req: Request, res: Response): Promise<void> {
    const settings = await settingsService.getSettings();
    ResponseSerializer.success(res, settings);
  }

  async update(req: Request, res: Response): Promise<void> {
    const settings = await settingsService.updateSettings(req.body);
    ResponseSerializer.success(res, settings, { message: 'Settings updated' });
  }
}

export default new SettingsController();
