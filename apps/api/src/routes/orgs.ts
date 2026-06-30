import type { FastifyInstance } from 'fastify';
import { query } from '../db';
import { parseAuth, minRole } from '../auth';

export async function orgRoutes(app: FastifyInstance): Promise<void> {
  // ── Organizaciones (admin+) ────────────────────────────────────────────
  app.get('/api/admin/orgs', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const rows = await query<Record<string, unknown>>('SELECT * FROM organizations ORDER BY name');
    return reply.send(rows);
  });

  app.post('/api/admin/orgs', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { name, category, description, contact_name, contact_phone, location, parent_id } = (req.body ?? {}) as Record<string, string>;
    if (!name) return reply.status(400).send({ error: 'name requerido' });
    const [row] = await query<{ id: string }>(
      'INSERT INTO organizations (name, category, description, contact_name, contact_phone, location, parent_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [name, category ?? 'comunitario', description ?? null, contact_name ?? null, contact_phone ?? null, location ?? null, parent_id ?? null],
    );
    return reply.status(201).send(row);
  });

  app.put('/api/admin/orgs/:id', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Record<string, string>;
    const fields = ['name', 'category', 'description', 'contact_name', 'contact_phone', 'location', 'parent_id'];
    const sets = fields.filter((f) => body[f] !== undefined).map((f, i) => `"${f}" = $${i + 2}`);
    if (sets.length === 0) return reply.status(400).send({ error: 'Sin campos' });
    const vals = fields.filter((f) => body[f] !== undefined).map((f) => body[f]);
    await query(`UPDATE organizations SET ${sets.join(', ')} WHERE id = $1`, [id, ...vals]);
    return reply.send({ ok: true });
  });

  app.delete('/api/admin/orgs/:id', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    await query('DELETE FROM organizations WHERE id = $1', [id]);
    return reply.send({ ok: true });
  });

  // ── Voluntarios mejorados (admin+) ─────────────────────────────────────
  app.get('/api/admin/volunteers', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const rows = await query<Record<string, unknown>>(`
      SELECT v.*, o.name AS org_name
      FROM volunteers v LEFT JOIN organizations o ON o.id = v.organization_id
      ORDER BY v.created_at DESC
    `);
    return reply.send(rows);
  });

  app.post('/api/admin/volunteers', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const b = (req.body ?? {}) as Record<string, unknown>;
    const [row] = await query<{ id: string }>(
      `INSERT INTO volunteers (name, phone, role, status, profession, skills, zone, availability, organization_id, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [b.name, b.phone ?? null, b.role ?? 'general', b.status ?? 'activo',
       b.profession ?? null, b.skills ?? [], b.zone ?? null,
       b.availability ?? 'disponible', b.organization_id ?? null,
       b.lat ?? null, b.lng ?? null],
    );
    return reply.status(201).send(row);
  });

  app.put('/api/admin/volunteers/:id', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const b = (req.body ?? {}) as Record<string, unknown>;
    const allowed = ['name', 'phone', 'role', 'status', 'profession', 'skills', 'zone', 'availability', 'organization_id', 'lat', 'lng'];
    const sets = allowed.filter((f) => b[f] !== undefined).map((f, i) => `"${f}" = $${i + 2}`);
    if (sets.length === 0) return reply.status(400).send({ error: 'Sin campos' });
    const vals = allowed.filter((f) => b[f] !== undefined).map((f) => b[f]);
    await query(`UPDATE volunteers SET ${sets.join(', ')} WHERE id = $1`, [id, ...vals]);
    return reply.send({ ok: true });
  });

  app.delete('/api/admin/volunteers/:id', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    await query('DELETE FROM volunteers WHERE id = $1', [id]);
    return reply.send({ ok: true });
  });
}
