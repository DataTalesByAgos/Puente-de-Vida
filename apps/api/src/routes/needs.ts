import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db';
import { parseAuth } from '../auth';

const NEED_CATEGORIES = ['profesionales', 'no_profesionales', 'logistica', 'otros'] as const;
const NEED_STATUSES = ['abierta', 'en_proceso', 'resuelta', 'cerrada'] as const;
const NEED_SCOPES = ['micro', 'macro'] as const;
const PRIORITIES = ['critica', 'alta', 'media', 'baja'] as const;
const SOURCES = ['pwa', 'whatsapp', 'telegram', 'telefono', 'sms'] as const;
const NEED_UPDATE_STATUSES = ['en_proceso', 'requiere_recursos', 'completado_parcial'] as const;
const CREATED_BY_ROLES = ['citizen', 'volunteer', 'coordinator'] as const;

const createNeedSchema = z.object({
  clientId: z.string().max(120).optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(4000),
  category: z.enum(NEED_CATEGORIES),
  subcategory: z.string().max(30).nullable().optional(),
  priority: z.enum(PRIORITIES).default('media'),
  scope: z.enum(NEED_SCOPES).default('micro'),
  parentId: z.string().uuid().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  locationText: z.string().max(200).nullable().optional(),
  peopleRequired: z.number().int().min(0).nullable().optional(),
  resourcesNeeded: z.string().max(1000).nullable().optional(),
  photoUrl: z.string().max(50000).nullable().optional(),
  source: z.enum(SOURCES).default('pwa'),
  age: z.number().int().min(0).max(150).nullable().optional(),
});

const updateNeedSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(4000).optional(),
  category: z.enum(NEED_CATEGORIES).optional(),
  subcategory: z.string().max(30).nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(NEED_STATUSES).optional(),
  parentId: z.string().uuid().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  locationText: z.string().max(200).nullable().optional(),
  peopleRequired: z.number().int().min(0).nullable().optional(),
  resourcesNeeded: z.string().max(1000).nullable().optional(),
  assignedTo: z.string().max(120).nullable().optional(),
  assignedBy: z.string().max(120).nullable().optional(),
  closedBy: z.string().max(120).nullable().optional(),
  comments: z.string().max(2000).nullable().optional(),
});

const needQuerySchema = z.object({
  status: z.enum(NEED_STATUSES).optional(),
  category: z.enum(NEED_CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  scope: z.enum(NEED_SCOPES).optional(),
  parentId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().optional(),
  createdByRole: z.enum(CREATED_BY_ROLES).optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const createNeedUpdateSchema = z.object({
  status: z.enum(NEED_UPDATE_STATUSES),
  photos: z.array(z.string().max(50000)).max(5).default([]),
  observations: z.string().max(2000).nullable().optional(),
});

function roleLevel(role: string): number {
  const levels: Record<string, number> = {
    citizen: 0,
    viewer: 0,
    volunteer: 1,
    coordinator: 2,
    operator: 2,
    organization: 2,
    admin: 3,
  };
  return levels[role] ?? -1;
}

function filterNeed(need: Record<string, unknown>, level: number): Record<string, unknown> {
  if (level < 0) {
    return {
      id: need.id,
      title: need.title,
      description: need.description?.toString().slice(0, 200),
      category: need.category,
      subcategory: need.subcategory,
      priority: need.priority,
      status: need.status,
      scope: need.scope,
      people_required: need.people_required,
      location_text: need.location_text?.toString().split(',').slice(0, 1).join(','),
      created_at: need.created_at,
      org_name: need.org_name,
    };
  }
  if (level < 1) {
    const filtered = { ...need };
    if (need.location_text) {
      const parts = (need.location_text as string).split(',').map((p) => p.trim());
      filtered.location_text = parts.slice(0, Math.min(2, parts.length)).join(', ');
    }
    delete filtered.photo_url;
    delete filtered.comments;
    delete filtered.resources_needed;
    return filtered;
  }
  if (level < 2) {
    return need;
  }
  return need;
}

export async function needsRoutes(app: FastifyInstance): Promise<void> {
  // ── Create need ─────────────────────────────────────────────────
  app.post('/api/needs', async (req, reply) => {
    const parsed = createNeedSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const session = parseAuth(req);
    const data = parsed.data;
    const need = await queryOne(
      `
      INSERT INTO needs (client_id, title, description, category, subcategory, priority, scope,
        parent_id, lat, lng, location_text, people_required, resources_needed, photo_url, source,
        age, is_minor, created_by, created_by_role)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `,
      [
        data.clientId ?? null,
        data.title,
        data.description,
        data.category,
        data.subcategory ?? null,
        data.priority,
        data.scope,
        data.parentId ?? null,
        data.lat ?? null,
        data.lng ?? null,
        data.locationText ?? null,
        data.peopleRequired ?? null,
        data.resourcesNeeded ?? null,
        data.photoUrl ?? null,
        data.source,
        data.age ?? null,
        data.age != null && data.age < 18 ? true : null,
        session?.username ?? null,
        session?.role ?? 'citizen',
      ],
    );
    return reply.status(201).send(need);
  });

  // ── List needs ─────────────────────────────────────────────────
  app.get('/api/needs', async (req, reply) => {
    const parsed = needQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const session = parseAuth(req);
    const level = session ? roleLevel(session.role) : -1;
    const f = parsed.data;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (f.status) {
      conditions.push(`n.status = $${idx++}`);
      params.push(f.status);
    }
    if (f.category) {
      conditions.push(`n.category = $${idx++}`);
      params.push(f.category);
    }
    if (f.priority) {
      conditions.push(`n.priority = $${idx++}`);
      params.push(f.priority);
    }
    if (f.scope) {
      conditions.push(`n.scope = $${idx++}`);
      params.push(f.scope);
    }
    if (f.parentId !== undefined) {
      conditions.push(`n.parent_id = $${idx++}`);
      params.push(f.parentId);
    }
    if (f.organizationId) {
      conditions.push(`n.organization_id = $${idx++}`);
      params.push(f.organizationId);
    }
    if (f.createdByRole) {
      conditions.push(`n.created_by_role = $${idx++}`);
      params.push(f.createdByRole);
    }
    if (f.q) {
      conditions.push(`(n.title ILIKE $${idx} OR n.description ILIKE $${idx})`);
      params.push(`%${f.q}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const limit = f.limit ?? 100;
    const offset = f.offset ?? 0;

    const rows = await query(
      `
      SELECT n.*, o.name as org_name
      FROM needs n
      LEFT JOIN organizations o ON n.organization_id = o.id
      ${where}
      ORDER BY
        CASE n.priority WHEN 'critica' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 WHEN 'baja' THEN 3 END,
        n.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `,
      [...params, limit, offset],
    );

    return rows.map((r) => filterNeed(r as Record<string, unknown>, level));
  });

  // ── Get need by ID ──────────────────────────────────────────────
  app.get('/api/needs/:id', async (req, reply) => {
    const { id } = req.params as Record<string, string>;
    const session = parseAuth(req);
    const level = session ? roleLevel(session.role) : -1;
    const need = await queryOne(
      `
      SELECT n.*, o.name as org_name
      FROM needs n
      LEFT JOIN organizations o ON n.organization_id = o.id
      WHERE n.id = $1
    `,
      [id],
    );
    if (!need) return reply.status(404).send({ error: 'Necesidad no encontrada' });

    if (session && level >= 1) {
      await query(
        'INSERT INTO audit_log (username, action, entity, entity_id, detail) VALUES ($1,$2,$3,$4,$5)',
        [
          session.username,
          'view_need',
          'need',
          id,
          JSON.stringify({ category: need.category, priority: need.priority }),
        ],
      ).catch(() => {});
    }

    return filterNeed(need as Record<string, unknown>, level);
  });

  // ── Update need ────────────────────────────────────────────────
  app.patch('/api/needs/:id', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'Autenticación requerida' });
    const level = roleLevel(session.role);
    if (level < 1)
      return reply.status(403).send({ error: 'No tienes permiso para actualizar necesidades' });

    const { id } = req.params as Record<string, string>;
    const parsed = updateNeedSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const fields = parsed.data;
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (fields.title !== undefined) {
      sets.push(`title = $${idx++}`);
      params.push(fields.title);
    }
    if (fields.description !== undefined) {
      sets.push(`description = $${idx++}`);
      params.push(fields.description);
    }
    if (fields.category !== undefined) {
      sets.push(`category = $${idx++}`);
      params.push(fields.category);
    }
    if (fields.subcategory !== undefined) {
      sets.push(`subcategory = $${idx++}`);
      params.push(fields.subcategory);
    }
    if (fields.priority !== undefined) {
      sets.push(`priority = $${idx++}`);
      params.push(fields.priority);
    }
    if (fields.status !== undefined) {
      sets.push(`status = $${idx++}`);
      params.push(fields.status);
    }
    if (fields.parentId !== undefined) {
      sets.push(`parent_id = $${idx++}`);
      params.push(fields.parentId);
    }
    if (fields.lat !== undefined) {
      sets.push(`lat = $${idx++}`);
      params.push(fields.lat);
    }
    if (fields.lng !== undefined) {
      sets.push(`lng = $${idx++}`);
      params.push(fields.lng);
    }
    if (fields.locationText !== undefined) {
      sets.push(`location_text = $${idx++}`);
      params.push(fields.locationText);
    }
    if (fields.peopleRequired !== undefined) {
      sets.push(`people_required = $${idx++}`);
      params.push(fields.peopleRequired);
    }
    if (fields.resourcesNeeded !== undefined) {
      sets.push(`resources_needed = $${idx++}`);
      params.push(fields.resourcesNeeded);
    }
    if (fields.assignedTo !== undefined) {
      sets.push(`assigned_to = $${idx++}, assigned_at = now()`);
      params.push(fields.assignedTo);
    }
    if (fields.assignedBy !== undefined) {
      sets.push(`assigned_by = $${idx++}`);
      params.push(fields.assignedBy);
    }
    if (fields.closedBy !== undefined) {
      sets.push(`closed_by = $${idx++}, closed_at = now()`);
      params.push(fields.closedBy);
    }
    if (fields.comments !== undefined) {
      sets.push(`comments = $${idx++}`);
      params.push(fields.comments);
    }

    if (sets.length === 0) return reply.status(400).send({ error: 'Sin campos para actualizar' });

    sets.push(`updated_at = now()`);
    params.push(id);

    const updated = await queryOne(
      `
      UPDATE needs SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *
    `,
      params,
    );

    if (!updated) return reply.status(404).send({ error: 'Necesidad no encontrada' });

    await query(
      'INSERT INTO audit_log (username, action, entity, entity_id, detail) VALUES ($1,$2,$3,$4,$5)',
      [
        session.username,
        'update_need',
        'need',
        id,
        JSON.stringify({ changes: Object.keys(fields) }),
      ],
    ).catch(() => {});

    return updated;
  });

  // ── Create need update (volunteer progress) ────────────────────
  app.post('/api/needs/:id/updates', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'Autenticación requerida' });
    if (roleLevel(session.role) < 1) return reply.status(403).send({ error: 'No tienes permiso' });

    const { id } = req.params as Record<string, string>;
    const parsed = createNeedUpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const data = parsed.data;
    const update = await queryOne(
      `
      INSERT INTO need_updates (need_id, volunteer_id, status, photos, observations)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `,
      [id, session.username, data.status, data.photos, data.observations ?? null],
    );

    return reply.status(201).send(update);
  });

  // ── Get need updates ───────────────────────────────────────────
  app.get('/api/needs/:id/updates', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'Autenticación requerida' });
    const { id } = req.params as Record<string, string>;
    const updates = await query(
      'SELECT * FROM need_updates WHERE need_id = $1 ORDER BY created_at DESC',
      [id],
    );
    return updates;
  });

  // ── Get children (micros under a macro) ────────────────────────
  app.get('/api/needs/:id/children', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'Autenticación requerida' });
    const level = session ? roleLevel(session.role) : -1;
    const { id } = req.params as Record<string, string>;
    const children = await query(
      `
      SELECT n.*, o.name as org_name FROM needs n
      LEFT JOIN organizations o ON n.organization_id = o.id
      WHERE n.parent_id = $1 ORDER BY n.created_at DESC
    `,
      [id],
    );
    return children.map((r) => filterNeed(r as Record<string, unknown>, level));
  });

  // ── Push (offline sync) ────────────────────────────────────────
  app.post('/api/needs/sync', async (req, reply) => {
    const parsed = z
      .object({
        needs: z.array(createNeedSchema).max(200),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const results: { clientId?: string; id: string; status: 'created' | 'duplicate' }[] = [];
    for (const data of parsed.data.needs) {
      const existing = data.clientId
        ? await queryOne('SELECT id FROM needs WHERE client_id = $1', [data.clientId])
        : null;
      if (existing) {
        results.push({ clientId: data.clientId, id: existing.id, status: 'duplicate' });
        continue;
      }
      const need = await queryOne<{ id: string }>(
        `
        INSERT INTO needs (client_id, title, description, category, subcategory, priority, scope,
          lat, lng, location_text, people_required, resources_needed, photo_url, source, age, is_minor)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING id
      `,
        [
          data.clientId ?? null,
          data.title,
          data.description,
          data.category,
          data.subcategory ?? null,
          data.priority,
          data.scope,
          data.lat ?? null,
          data.lng ?? null,
          data.locationText ?? null,
          data.peopleRequired ?? null,
          data.resourcesNeeded ?? null,
          data.photoUrl ?? null,
          data.source,
          data.age ?? null,
          data.age != null && data.age < 18 ? true : null,
        ],
      );
      results.push({ clientId: data.clientId, id: need!.id, status: 'created' });
    }
    return { synced: results.length, results };
  });

  // ── Pull (offline sync) ────────────────────────────────────────
  app.get('/api/needs/sync', async (req, reply) => {
    const parsed = z
      .object({
        since: z.string().datetime().optional(),
      })
      .safeParse(req.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const session = parseAuth(req);
    const level = session ? roleLevel(session.role) : -1;
    const since = parsed.data.since;

    const rows = since
      ? await query(
          `SELECT n.*, o.name as org_name FROM needs n LEFT JOIN organizations o ON n.organization_id = o.id WHERE n.updated_at > $1 ORDER BY n.updated_at DESC LIMIT 500`,
          [since],
        )
      : await query(
          `SELECT n.*, o.name as org_name FROM needs n LEFT JOIN organizations o ON n.organization_id = o.id ORDER BY n.updated_at DESC LIMIT 500`,
        );

    return {
      now: new Date().toISOString(),
      reports: rows.map((r) => filterNeed(r as Record<string, unknown>, level)),
    };
  });

  // ── Pending review (7+ days without update) ────────────────────
  app.get('/api/needs/pending-review', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'Autenticación requerida' });
    if (roleLevel(session.role) < 2) return reply.status(403).send({ error: 'No tienes permiso' });

    const rows = await query(`
      SELECT n.*, o.name as org_name,
        EXTRACT(DAY FROM now() - n.updated_at)::int as days_without_update
      FROM needs n
      LEFT JOIN organizations o ON n.organization_id = o.id
      WHERE n.status IN ('abierta', 'en_proceso')
        AND n.updated_at < now() - INTERVAL '7 days'
      ORDER BY n.updated_at ASC
    `);
    return rows.map((r) => ({
      need: filterNeed(r as Record<string, unknown>, 2),
      days_without_update: r.days_without_update,
      last_update_at: r.updated_at,
    }));
  });
}
