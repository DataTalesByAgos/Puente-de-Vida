import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { query } from '../db';
import { parseAuth, minRole, hashPass } from '../auth';
import { verifyIdentity } from '../verify-identity';

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
    const code = randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
    const [row] = await query<{ id: string; invite_code: string }>(
      'INSERT INTO organizations (name, category, description, contact_name, contact_phone, location, parent_id, invite_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, invite_code',
      [
        name,
        category ?? 'comunitario',
        description ?? null,
        contact_name ?? null,
        contact_phone ?? null,
        location ?? null,
        parent_id ?? null,
        code,
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

  // ── Códigos de invitación (operator+) ──────────────────────────────────
  app.get('/api/admin/orgs/:id/invite-code', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const [row] = await query<{ invite_code: string | null }>(
      'SELECT invite_code FROM organizations WHERE id = $1',
      [id],
    );
    if (!row) return reply.status(404).send({ error: 'No encontrada' });
    return reply.send({ invite_code: row.invite_code });
  });

  app.post('/api/admin/orgs/:id/invite-code', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const code = randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
    const [row] = await query<{ invite_code: string }>(
      'UPDATE organizations SET invite_code = $1 WHERE id = $2 RETURNING invite_code',
      [code, id],
    );
    if (!row) return reply.status(404).send({ error: 'No encontrada' });
    return reply.send({ invite_code: row.invite_code });
  });

  // ── Registro de operadores (público, requiere código de invitación) ──
  app.post('/api/admin/register', async (req, reply) => {
    const { username, password, name, cedula, invite_code } = (req.body ?? {}) as Record<
      string,
      string
    >;
    if (!username || !password || !cedula || !invite_code) {
      return reply
        .status(400)
        .send({ error: 'username, password, cedula e invite_code requeridos' });
    }
    if (username.length < 3) return reply.status(400).send({ error: 'Username muy corto (mín 3)' });
    if (password.length < 6) return reply.status(400).send({ error: 'Password muy corta (mín 6)' });
    if (!cedula.match(/^[VE]\-?\d{5,10}$/i)) {
      return reply.status(400).send({ error: 'Formato de cédula inválido (ej: V-12345678)' });
    }

    // Validar código de invitación
    const [org] = await query<{ id: string; name: string }>(
      'SELECT id, name FROM organizations WHERE invite_code = $1',
      [invite_code],
    );
    if (!org) return reply.status(400).send({ error: 'Código de invitación inválido' });

    // Verificar identidad contra CNE (best-effort, no bloquea)
    const identity = await verifyIdentity(cedula).catch(() => ({
      verified: false,
      fullName: null,
      source: 'none' as const,
    }));
    const verified = identity.verified;

    // Crear usuario con rol operator por defecto
    const salt = randomBytes(16).toString('hex');
    const stored = `${salt}:${hashPass(password, salt)}`;
    try {
      const [user] = await query<{ id: string }>(
        'INSERT INTO users (username, password, role, name, document_id, verified, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [
          username,
          stored,
          'operator',
          name ?? identity.fullName ?? username,
          cedula,
          verified,
          org.id,
        ],
      );
      query(
        'INSERT INTO audit_log (username, action, entity, entity_id, detail) VALUES ($1, $2, $3, $4, $5)',
        [
          username,
          'user.register',
          'user',
          user.id,
          JSON.stringify({ organization: org.name, verified }),
        ],
      ).catch(() => {});
      return reply.status(201).send({
        id: user.id,
        username,
        role: 'operator',
        organization: org.name,
        verified,
        identity_name: identity.fullName,
        identity_source: identity.source,
      });
    } catch (err) {
      if (String(err).includes('unique') || String(err).includes('duplicate')) {
        return reply.status(409).send({ error: 'El usuario ya existe' });
      }
      throw err;
    }
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

  // ── Inventario global (operator+) ────────────────────────────────────────
  app.get('/api/admin/inventory', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const rows = await query<Record<string, unknown>>(
      `SELECT i.*, o.name AS org_name
       FROM org_inventory i
       JOIN organizations o ON o.id = i.organization_id
       ORDER BY o.name, i.item_name`,
    );
    return reply.send(rows);
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

  // ── Asignación de reportes a organizaciones (operator+) ─────────────────
  app.post('/api/admin/reports/:id/assign', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const { organization_id } = (req.body ?? {}) as { organization_id?: string };
    if (!organization_id) return reply.status(400).send({ error: 'organization_id requerido' });
    const [row] = await query<{ id: string }>(
      `INSERT INTO report_assignments (report_id, organization_id, assigned_by)
       VALUES ($1, $2, $3) RETURNING id`,
      [id, organization_id, s.username],
    );
    return reply.status(201).send(row);
  });

  app.get('/api/admin/orgs/:id/reports', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const rows = await query<Record<string, unknown>>(
      `SELECT ra.id AS assignment_id, ra.status AS assignment_status, ra.feedback, ra.area_status, ra.created_at AS assigned_at,
              r.id, r.raw_text, r.incident_type, r.priority, r.status, r.location_text, r.lat, r.lng, r.created_at
       FROM report_assignments ra
       JOIN reports r ON r.id = ra.report_id
       WHERE ra.organization_id = $1
       ORDER BY ra.created_at DESC`,
      [id],
    );
    return reply.send(rows);
  });

  app.patch('/api/admin/assignments/:assignmentId', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(s.role, 'operator')) return reply.status(403).send({ error: 'No autorizado' });
    const { assignmentId } = req.params as { assignmentId: string };
    const { status, feedback, area_status } = (req.body ?? {}) as Record<string, string>;
    const sets: string[] = ['updated_at = now()'];
    const vals: unknown[] = [assignmentId];
    if (status) {
      sets.push(`status = $${vals.length + 1}`);
      vals.push(status);
    }
    if (feedback !== undefined) {
      sets.push(`feedback = $${vals.length + 1}`);
      vals.push(feedback);
    }
    if (area_status !== undefined) {
      sets.push(`area_status = $${vals.length + 1}`);
      vals.push(area_status);
    }
    if (sets.length === 1) return reply.status(400).send({ error: 'Sin campos' });
    await query(`UPDATE report_assignments SET ${sets.join(', ')} WHERE id = $1`, vals);
    return reply.send({ ok: true });
  });
}
