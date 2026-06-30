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
    const { name, category, description, contact_name, contact_phone, location, parent_id } =
      (req.body ?? {}) as Record<string, string>;
    if (!name) return reply.status(400).send({ error: 'name requerido' });
    const [row] = await query<{ id: string }>(
      'INSERT INTO organizations (name, category, description, contact_name, contact_phone, location, parent_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [
        name,
        category ?? 'comunitario',
        description ?? null,
        contact_name ?? null,
        contact_phone ?? null,
        location ?? null,
        parent_id ?? null,
      ],
    );
    return reply.status(201).send(row);
  });

  app.put('/api/admin/orgs/:id', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Record<string, string>;
    const fields = [
      'name',
      'category',
      'description',
      'contact_name',
      'contact_phone',
      'location',
      'parent_id',
    ];
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
      [
        b.name,
        b.phone ?? null,
        b.role ?? 'general',
        b.status ?? 'activo',
        b.profession ?? null,
        b.skills ?? [],
        b.zone ?? null,
        b.availability ?? 'disponible',
        b.organization_id ?? null,
        b.lat ?? null,
        b.lng ?? null,
      ],
    );
    return reply.status(201).send(row);
  });

  app.put('/api/admin/volunteers/:id', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const b = (req.body ?? {}) as Record<string, unknown>;
    const allowed = [
      'name',
      'phone',
      'role',
      'status',
      'profession',
      'skills',
      'zone',
      'availability',
      'organization_id',
      'lat',
      'lng',
    ];
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

  // ── Inventario por organización (operator+) ───────────────────────────────
  app.get('/api/admin/orgs/:id/inventory', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM org_inventory WHERE organization_id = $1 ORDER BY item_name',
      [id],
    );
    return reply.send(rows);
  });

  app.post('/api/admin/orgs/:id/inventory', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const { item_name, category, quantity, unit, notes } = (req.body ?? {}) as Record<
      string,
      unknown
    >;
    if (!item_name) return reply.status(400).send({ error: 'item_name requerido' });
    const [row] = await query<{ id: string }>(
      `INSERT INTO org_inventory (organization_id, item_name, category, quantity, unit, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [id, item_name, category ?? 'general', quantity ?? 0, unit ?? 'u', notes ?? null],
    );
    return reply.status(201).send(row);
  });

  app.put('/api/admin/inventory/:itemId', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { itemId } = req.params as { itemId: string };
    const { quantity, item_name, category, unit, notes } = (req.body ?? {}) as Record<
      string,
      unknown
    >;
    const sets: string[] = [];
    const vals: unknown[] = [itemId];
    if (quantity !== undefined) {
      sets.push(`quantity = $${vals.length + 1}`);
      vals.push(quantity);
    }
    if (item_name !== undefined) {
      sets.push(`item_name = $${vals.length + 1}`);
      vals.push(item_name);
    }
    if (category !== undefined) {
      sets.push(`category = $${vals.length + 1}`);
      vals.push(category);
    }
    if (unit !== undefined) {
      sets.push(`unit = $${vals.length + 1}`);
      vals.push(unit);
    }
    if (notes !== undefined) {
      sets.push(`notes = $${vals.length + 1}`);
      vals.push(notes);
    }
    sets.push('updated_at = now()');
    if (sets.length === 0) return reply.status(400).send({ error: 'Sin campos' });
    await query(`UPDATE org_inventory SET ${sets.join(', ')} WHERE id = $1`, vals);
    return reply.send({ ok: true });
  });

  app.delete('/api/admin/inventory/:itemId', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { itemId } = req.params as { itemId: string };
    await query('DELETE FROM org_inventory WHERE id = $1', [itemId]);
    return reply.send({ ok: true });
  });
}
