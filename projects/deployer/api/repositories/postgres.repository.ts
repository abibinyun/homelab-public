import db from '../db/index.js';
import { Project, User } from '../types/index.js';

class PostgresRepository {
  // Projects
  async getProjects(userId?: number): Promise<Project[]> {
    const base = 'SELECT name, git_url as "gitUrl", subdomain, env, port, user_id as "userId", git_token as "gitToken", webhook_secret as "webhookSecret", resources, created_at as "createdAt", updated_at as "updatedAt" FROM projects';
    const query = userId ? `${base} WHERE user_id = $1 ORDER BY created_at DESC` : `${base} ORDER BY created_at DESC`;
    const result = await db.query(query, userId ? [userId] : []);
    return result.rows;
  }

  async getProjectByName(name: string, userId?: number): Promise<Project | null> {
    const base = 'SELECT name, git_url as "gitUrl", subdomain, env, port, user_id as "userId", git_token as "gitToken", webhook_secret as "webhookSecret", resources, created_at as "createdAt", updated_at as "updatedAt" FROM projects';
    const query = userId ? `${base} WHERE name = $1 AND user_id = $2` : `${base} WHERE name = $1`;
    const result = await db.query(query, userId ? [name, userId] : [name]);
    return result.rows[0] || null;
  }

  async createProject(project: Project): Promise<void> {
    await db.query(`
      INSERT INTO projects (name, git_url, subdomain, env, port, user_id, git_token, webhook_secret, resources, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      project.name,
      project.gitUrl,
      project.subdomain,
      JSON.stringify(project.env),
      project.port,
      project.userId || null,
      project.gitToken || null,
      project.webhookSecret || null,
      JSON.stringify(project.resources || {}),
      project.createdAt,
    ]);
  }

  async updateProject(name: string, updates: Partial<Project>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.env !== undefined) {
      fields.push(`env = $${paramIndex++}`);
      values.push(JSON.stringify(updates.env));
    }
    if (updates.port !== undefined) {
      fields.push(`port = $${paramIndex++}`);
      values.push(updates.port);
    }
    if (updates.gitToken !== undefined) {
      fields.push(`git_token = $${paramIndex++}`);
      values.push(updates.gitToken);
    }
    if (updates.webhookSecret !== undefined) {
      fields.push(`webhook_secret = $${paramIndex++}`);
      values.push(updates.webhookSecret);
    }
    if (updates.resources !== undefined) {
      fields.push(`resources = $${paramIndex++}`);
      values.push(JSON.stringify(updates.resources));
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(name);

    await db.query(`
      UPDATE projects
      SET ${fields.join(', ')}
      WHERE name = $${paramIndex}
    `, values);
  }

  async deleteProject(name: string, userId?: number): Promise<void> {
    const query = userId
      ? 'DELETE FROM projects WHERE name = $1 AND user_id = $2'
      : 'DELETE FROM projects WHERE name = $1';
    
    const params = userId ? [name, userId] : [name];
    await db.query(query, params);
  }

  // Users
  async getUsers(): Promise<User[]> {
    const result = await db.query(`
      SELECT 
        id, username, email, email_verified,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      ORDER BY created_at DESC
    `);
    return result.rows;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await db.query(`
      SELECT 
        id, username, email, password, email_verified,
        verification_token, verification_token_expires,
        reset_token, reset_token_expires,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE username = $1
    `, [username]);
    return result.rows[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.query(`
      SELECT 
        id, username, email, password, email_verified,
        verification_token, verification_token_expires,
        reset_token, reset_token_expires,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE email = $1
    `, [email]);
    return result.rows[0] || null;
  }

  async getUserByVerificationToken(token: string): Promise<User | null> {
    const result = await db.query(`
      SELECT 
        id, username, email, password, email_verified,
        verification_token, verification_token_expires,
        reset_token, reset_token_expires,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE verification_token = $1
        AND verification_token_expires > NOW()
    `, [token]);
    return result.rows[0] || null;
  }

  async getUserByResetToken(token: string): Promise<User | null> {
    const result = await db.query(`
      SELECT 
        id, username, email, password, email_verified,
        verification_token, verification_token_expires,
        reset_token, reset_token_expires,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE reset_token = $1
        AND reset_token_expires > NOW()
    `, [token]);
    return result.rows[0] || null;
  }

  async createUser(user: User): Promise<void> {
    await db.query(`
      INSERT INTO users (
        username, email, password, email_verified,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      user.username,
      user.email,
      user.password,
      user.email_verified,
      user.createdAt,
      user.updatedAt || user.createdAt,
    ]);
  }

  async updateUser(username: string, updates: Partial<User>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.password !== undefined) {
      fields.push(`password = $${paramIndex++}`);
      values.push(updates.password);
    }
    if (updates.email_verified !== undefined) {
      fields.push(`email_verified = $${paramIndex++}`);
      values.push(updates.email_verified);
    }
    if (updates.verification_token !== undefined) {
      fields.push(`verification_token = $${paramIndex++}`);
      values.push(updates.verification_token);
    }
    if (updates.verification_token_expires !== undefined) {
      fields.push(`verification_token_expires = $${paramIndex++}`);
      values.push(updates.verification_token_expires);
    }
    if (updates.reset_token !== undefined) {
      fields.push(`reset_token = $${paramIndex++}`);
      values.push(updates.reset_token);
    }
    if (updates.reset_token_expires !== undefined) {
      fields.push(`reset_token_expires = $${paramIndex++}`);
      values.push(updates.reset_token_expires);
    }

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    values.push(username);

    if (fields.length === 0) return;

    await db.query(`
      UPDATE users
      SET ${fields.join(', ')}
      WHERE username = $${paramIndex}
    `, values);
  }
}

export default new PostgresRepository();
