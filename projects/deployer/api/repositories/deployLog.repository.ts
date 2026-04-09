import db from '../db/index.js';
import type { DeployLog } from '../types/index.js';

class DeployLogRepository {
  async create(data: Omit<DeployLog, 'id' | 'startedAt'>): Promise<DeployLog> {
    const r = await db.query(
      `INSERT INTO deploy_logs (project_name, triggered_by, trigger_type, status, log_output)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.projectName, data.triggeredBy || null, data.triggerType, data.status, data.logOutput || null]
    );
    return this.mapRow(r.rows[0]);
  }

  async update(id: number, status: DeployLog['status'], logOutput?: string): Promise<void> {
    await db.query(
      `UPDATE deploy_logs SET status = $1, log_output = COALESCE($2, log_output), finished_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [status, logOutput || null, id]
    );
  }

  async getByProject(projectName: string, limit = 20): Promise<DeployLog[]> {
    const r = await db.query(
      `SELECT * FROM deploy_logs WHERE project_name = $1 ORDER BY started_at DESC LIMIT $2`,
      [projectName, limit]
    );
    return r.rows.map(this.mapRow);
  }

  async getById(id: number): Promise<DeployLog | null> {
    const r = await db.query(`SELECT * FROM deploy_logs WHERE id = $1`, [id]);
    return r.rows[0] ? this.mapRow(r.rows[0]) : null;
  }

  private mapRow(row: any): DeployLog {
    return {
      id: row.id,
      projectName: row.project_name,
      triggeredBy: row.triggered_by,
      triggerType: row.trigger_type,
      status: row.status,
      logOutput: row.log_output,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    };
  }
}

export default new DeployLogRepository();
