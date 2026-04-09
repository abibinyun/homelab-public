import db from '../db/index.js';
import type { ClientPermission } from '../types/index.js';

class ClientPermissionRepository {
  async get(clientId: number): Promise<ClientPermission | null> {
    const r = await db.query(
      `SELECT id, client_id as "clientId",
              can_view_projects as "canViewProjects",
              can_view_logs as "canViewLogs",
              can_restart as "canRestart",
              can_start_stop as "canStartStop",
              can_update_env as "canUpdateEnv",
              can_trigger_deploy as "canTriggerDeploy",
              can_manage_domains as "canManageDomains",
              can_view_metrics as "canViewMetrics",
              updated_at as "updatedAt"
       FROM client_permissions WHERE client_id = $1`,
      [clientId]
    );
    return r.rows[0] || null;
  }

  async upsert(clientId: number, data: Partial<Omit<ClientPermission, 'id' | 'clientId' | 'updatedAt'>>): Promise<ClientPermission> {
    const r = await db.query(
      `INSERT INTO client_permissions (client_id, can_view_projects, can_view_logs, can_restart,
        can_start_stop, can_update_env, can_trigger_deploy, can_manage_domains, can_view_metrics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (client_id) DO UPDATE SET
         can_view_projects = EXCLUDED.can_view_projects,
         can_view_logs = EXCLUDED.can_view_logs,
         can_restart = EXCLUDED.can_restart,
         can_start_stop = EXCLUDED.can_start_stop,
         can_update_env = EXCLUDED.can_update_env,
         can_trigger_deploy = EXCLUDED.can_trigger_deploy,
         can_manage_domains = EXCLUDED.can_manage_domains,
         can_view_metrics = EXCLUDED.can_view_metrics,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, client_id as "clientId",
         can_view_projects as "canViewProjects", can_view_logs as "canViewLogs",
         can_restart as "canRestart", can_start_stop as "canStartStop",
         can_update_env as "canUpdateEnv", can_trigger_deploy as "canTriggerDeploy",
         can_manage_domains as "canManageDomains", can_view_metrics as "canViewMetrics",
         updated_at as "updatedAt"`,
      [
        clientId,
        data.canViewProjects ?? true,
        data.canViewLogs ?? false,
        data.canRestart ?? false,
        data.canStartStop ?? false,
        data.canUpdateEnv ?? false,
        data.canTriggerDeploy ?? false,
        data.canManageDomains ?? false,
        data.canViewMetrics ?? false,
      ]
    );
    return r.rows[0];
  }
}

export default new ClientPermissionRepository();
