import db from '../db/index.js';

interface DeploymentRecord {
  id?: number;
  projectId: number;
  userId: number;
  status: 'success' | 'failed' | 'in_progress';
  commitHash?: string;
  commitMessage?: string;
  errorMessage?: string;
  durationMs?: number;
  deployedAt?: string;
}

class DeploymentHistoryService {
  async recordDeployment(record: DeploymentRecord): Promise<number> {
    const result = await db.query(`
      INSERT INTO deployment_history (project_id, user_id, status, commit_hash, commit_message, error_message, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      record.projectId,
      record.userId,
      record.status,
      record.commitHash || null,
      record.commitMessage || null,
      record.errorMessage || null,
      record.durationMs || null,
    ]);
    
    return result.rows[0].id;
  }

  async getProjectHistory(projectId: number, limit = 10): Promise<DeploymentRecord[]> {
    const result = await db.query(`
      SELECT 
        id,
        project_id as "projectId",
        user_id as "userId",
        status,
        commit_hash as "commitHash",
        commit_message as "commitMessage",
        error_message as "errorMessage",
        duration_ms as "durationMs",
        deployed_at as "deployedAt",
        created_at as "createdAt"
      FROM deployment_history
      WHERE project_id = $1
      ORDER BY deployed_at DESC
      LIMIT $2
    `, [projectId, limit]);
    
    return result.rows;
  }

  async getUserHistory(userId: number, limit = 20): Promise<DeploymentRecord[]> {
    const result = await db.query(`
      SELECT 
        dh.id,
        dh.project_id as "projectId",
        dh.user_id as "userId",
        dh.status,
        dh.commit_hash as "commitHash",
        dh.commit_message as "commitMessage",
        dh.error_message as "errorMessage",
        dh.duration_ms as "durationMs",
        dh.deployed_at as "deployedAt",
        p.name as "projectName"
      FROM deployment_history dh
      LEFT JOIN projects p ON dh.project_id = p.id
      WHERE dh.user_id = $1
      ORDER BY dh.deployed_at DESC
      LIMIT $2
    `, [userId, limit]);
    
    return result.rows;
  }
}

export default new DeploymentHistoryService();
