import db from '../db/index.js';
import type { Client } from '../types/index.js';

class ClientRepository {
  async getAll(): Promise<Client[]> {
    const r = await db.query(
      `SELECT id, name, slug, contact_email as "contactEmail", contact_phone as "contactPhone",
              notes, is_active as "isActive", created_at as "createdAt"
       FROM clients ORDER BY created_at DESC`
    );
    return r.rows;
  }

  async getById(id: number): Promise<Client | null> {
    const r = await db.query(
      `SELECT id, name, slug, contact_email as "contactEmail", contact_phone as "contactPhone",
              notes, is_active as "isActive", created_at as "createdAt"
       FROM clients WHERE id = $1`,
      [id]
    );
    return r.rows[0] || null;
  }

  async create(data: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const r = await db.query(
      `INSERT INTO clients (name, slug, contact_email, contact_phone, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, slug, contact_email as "contactEmail", contact_phone as "contactPhone",
                 notes, is_active as "isActive", created_at as "createdAt"`,
      [data.name, data.slug, data.contactEmail || null, data.contactPhone || null, data.notes || null, data.isActive ?? true]
    );
    return r.rows[0];
  }

  async update(id: number, data: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (data.name !== undefined) { fields.push(`name = $${i++}`); values.push(data.name); }
    if (data.slug !== undefined) { fields.push(`slug = $${i++}`); values.push(data.slug); }
    if (data.contactEmail !== undefined) { fields.push(`contact_email = $${i++}`); values.push(data.contactEmail); }
    if (data.contactPhone !== undefined) { fields.push(`contact_phone = $${i++}`); values.push(data.contactPhone); }
    if (data.notes !== undefined) { fields.push(`notes = $${i++}`); values.push(data.notes); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${i++}`); values.push(data.isActive); }
    if (!fields.length) return this.getById(id);
    values.push(id);
    const r = await db.query(
      `UPDATE clients SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, name, slug, contact_email as "contactEmail", contact_phone as "contactPhone",
                 notes, is_active as "isActive", created_at as "createdAt"`,
      values
    );
    return r.rows[0] || null;
  }

  async delete(id: number): Promise<void> {
    await db.query(`DELETE FROM clients WHERE id = $1`, [id]);
  }

  async getSummary(id: number): Promise<{ totalProjects: number; totalDomains: number }> {
    const [p, d] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM projects WHERE client_id = $1`, [id]),
      db.query(`SELECT COUNT(*) FROM client_domains WHERE client_id = $1`, [id]),
    ]);
    return {
      totalProjects: parseInt(p.rows[0].count),
      totalDomains: parseInt(d.rows[0].count),
    };
  }
}

export default new ClientRepository();
