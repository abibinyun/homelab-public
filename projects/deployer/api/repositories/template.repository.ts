import db from '../db/index.js';
import type { Template } from '../types/index.js';

const SELECT = `
  id, name, description,
  compose_content as "composeContent",
  variables,
  is_active as "isActive",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

class TemplateRepository {
  async getAll(activeOnly = false): Promise<Template[]> {
    const where = activeOnly ? 'WHERE is_active = true' : '';
    const r = await db.query(`SELECT ${SELECT} FROM templates ${where} ORDER BY name ASC`);
    return r.rows;
  }

  async getById(id: number): Promise<Template | null> {
    const r = await db.query(`SELECT ${SELECT} FROM templates WHERE id = $1`, [id]);
    return r.rows[0] || null;
  }

  async getByName(name: string): Promise<Template | null> {
    const r = await db.query(`SELECT ${SELECT} FROM templates WHERE name = $1`, [name]);
    return r.rows[0] || null;
  }

  async create(data: {
    name: string;
    description?: string;
    composeContent: string;
    variables?: any[];
  }): Promise<Template> {
    const r = await db.query(
      `INSERT INTO templates (name, description, compose_content, variables)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT}`,
      [data.name, data.description || null, data.composeContent, JSON.stringify(data.variables || [])]
    );
    return r.rows[0];
  }

  async update(id: number, data: {
    name?: string;
    description?: string;
    composeContent?: string;
    variables?: any[];
    isActive?: boolean;
  }): Promise<Template | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (data.name !== undefined) { fields.push(`name = $${i++}`); values.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${i++}`); values.push(data.description); }
    if (data.composeContent !== undefined) { fields.push(`compose_content = $${i++}`); values.push(data.composeContent); }
    if (data.variables !== undefined) { fields.push(`variables = $${i++}`); values.push(JSON.stringify(data.variables)); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${i++}`); values.push(data.isActive); }
    if (!fields.length) return this.getById(id);
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const r = await db.query(
      `UPDATE templates SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${SELECT}`,
      values
    );
    return r.rows[0] || null;
  }

  async delete(id: number): Promise<void> {
    await db.query(`DELETE FROM templates WHERE id = $1`, [id]);
  }

  async isUsedByProject(id: number): Promise<boolean> {
    const r = await db.query(`SELECT 1 FROM projects WHERE template_id = $1 LIMIT 1`, [id]);
    return r.rows.length > 0;
  }
}

export default new TemplateRepository();
