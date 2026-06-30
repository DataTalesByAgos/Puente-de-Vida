import type { FastifyInstance } from 'fastify';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { query } from '../db';
import { config } from '../config';
import { sessions, hashPass, parseAuth, createSession, minRole, PERM, parseCookie } from '../auth';

// ---------------------------------------------------------------------------
// Panel de administración: login, usuarios, stats, export, config, auditoría.
//
// Roles: viewer (solo lectura), operator, admin (todo)
// ---------------------------------------------------------------------------

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // ── Login ──────────────────────────────────────────────────────────────
  app.post(
    '/api/admin/login',
    {
      config: {
        rateLimit: {
          max: config.rateLimitLoginMax,
          timeWindow: config.rateLimitLoginWindow,
        },
      },
    },
    async (req, reply) => {
      const { user, pass } = (req.body ?? {}) as Record<string, unknown>;
      const envUser = process.env.ADMIN_USER ?? 'admin';
      const envPass = process.env.ADMIN_PASS;
      const envRole = process.env.ADMIN_ROLE ?? 'admin';
      const ip = req.ip;

      const logFailed = (reason: string) => {
        query('INSERT INTO audit_log (username, action, entity, detail) VALUES ($1, $2, $3, $4)', [
          String(user ?? '?'),
          'login.failed',
          'auth',
          JSON.stringify({ reason, ip }),
        ]).catch(() => {});
      };

      // Intentar contra DB primero
      if (user) {
        const dbUsers = await query<{
          id: string;
          username: string;
          password: string;
          role: string;
        }>('SELECT id, username, password, role FROM users WHERE username = $1', [user]);
        const dbUser = dbUsers[0];

        if (dbUser) {
          const [salt, storedHash] = dbUser.password.split(':');
          const inputHash = hashPass(String(pass ?? ''), salt);
          if (
            storedHash &&
            inputHash.length === storedHash.length &&
            timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedHash))
          ) {
            const token = createSession(dbUser.id, dbUser.username, dbUser.role);
            reply.header(
              'set-cookie',
              `pdv_token=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`,
            );
            return reply.send({ token, username: dbUser.username, role: dbUser.role });
          }
          logFailed('bad_password');
          return reply.status(401).send({ error: 'Credenciales inválidas' });
        }
      }

      // Fallback env (comparación en tiempo constante)
      if (
        user === envUser &&
        envPass != null &&
        timingSafeEqual(Buffer.from(String(pass ?? '')), Buffer.from(envPass))
      ) {
        const token = createSession('env', envUser, envRole);
        reply.header(
          'set-cookie',
          `pdv_token=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`,
        );
        return reply.send({ token, username: envUser, role: envRole });
      }

      logFailed(user ? 'not_found' : 'missing_username');
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    },
  );

  app.post('/api/admin/logout', async (req, reply) => {
    const authHeader = req.headers?.['authorization'] ?? '';
    const token = (Array.isArray(authHeader) ? authHeader[0] : authHeader).replace(
      /^bearer\s+/i,
      '',
    );
    if (token) sessions.delete(token);
    const cookieToken = parseCookie(req.headers?.['cookie']);
    if (cookieToken) sessions.delete(cookieToken);
    reply.header('set-cookie', 'pdv_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return reply.send({ ok: true });
  });

  async function audit(
    session: { userId: string; username: string },
    action: string,
    entity: string,
    entityId?: string,
    detail?: Record<string, unknown>,
  ) {
    await query(
      'INSERT INTO audit_log (user_id, username, action, entity, entity_id, detail) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        session.userId !== 'env' ? session.userId : null,
        session.username,
        action,
        entity,
        entityId ?? null,
        detail ? JSON.stringify(detail) : null,
      ],
    ).catch(() => {});
  }

  // ── Stats (viewer+) ────────────────────────────────────────────────────
  app.get('/api/admin/stats', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'No autorizado' });

    const [totalRow] = await query<{
      total: number;
      duplicates: number;
      active: number;
      people: number;
    }>(`
      SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE duplicate_of IS NOT NULL)::int AS duplicates,
             COUNT(*) FILTER (WHERE duplicate_of IS NULL AND status != 'resuelto')::int AS active,
             COALESCE(SUM(people_affected) FILTER (WHERE duplicate_of IS NULL), 0)::int AS people FROM reports
    `);
    const bySource = await query<{ source: string; count: number }>(
      'SELECT source, COUNT(*)::int AS count FROM reports WHERE duplicate_of IS NULL GROUP BY source ORDER BY count DESC',
    );
    const byType = await query<{ incident_type: string; count: number }>(
      'SELECT incident_type, COUNT(*)::int AS count FROM reports WHERE duplicate_of IS NULL GROUP BY incident_type ORDER BY count DESC',
    );
    const byPriority = await query<{ priority: string; count: number }>(
      'SELECT priority, COUNT(*)::int AS count FROM reports WHERE duplicate_of IS NULL GROUP BY priority ORDER BY count DESC',
    );
    const byStatus = await query<{ status: string; count: number }>(
      'SELECT status, COUNT(*)::int AS count FROM reports WHERE duplicate_of IS NULL GROUP BY status ORDER BY count DESC',
    );
    const byEngine = await query<{ engine: string; count: number }>(
      "SELECT COALESCE(ai_engine, 'heuristic') AS engine, COUNT(*)::int AS count FROM reports WHERE duplicate_of IS NULL GROUP BY engine ORDER BY count DESC",
    );
    const hourly = await query<{ hour: string; count: number }>(
      "SELECT to_char(created_at, 'YYYY-MM-DD HH24:00') AS hour, COUNT(*)::int AS count FROM reports WHERE created_at > now() - interval '24 hours' GROUP BY hour ORDER BY hour",
    );
    const [shelterRow] = await query<{ count: number; capacity: number; occupancy: number }>(
      'SELECT COUNT(*)::int AS count, COALESCE(SUM(capacity),0)::int AS capacity, COALESCE(SUM(occupancy),0)::int AS occupancy FROM shelters',
    );
    const [volRow] = await query<{ active: number }>(
      "SELECT COUNT(*)::int AS active FROM volunteers WHERE status = 'activo'",
    );
    const [supplyRow] = await query<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM supplies',
    );

    return reply.send({
      totals: totalRow ?? { total: 0, duplicates: 0, active: 0, people: 0 },
      bySource,
      byType,
      byPriority,
      byStatus,
      byEngine,
      hourly,
      shelters: shelterRow ?? { count: 0, capacity: 0, occupancy: 0 },
      volunteers: volRow ?? { active: 0 },
      supplies: supplyRow?.total ?? 0,
    });
  });

  // ── Export (viewer+) ────────────────────────────────────────────────────
  app.get('/api/admin/reports/export', async (req, reply) => {
    if (!parseAuth(req)) return reply.status(401).send({ error: 'No autorizado' });
    const format = ((req.query as Record<string, string>)?.format ?? 'json').toLowerCase();
    const rows = await query<Record<string, unknown>>(
      'SELECT id, source, raw_text, incident_type, priority, status, lat, lng, location_text, people_affected, confidence, recommended_team, reporter_name, reporter_phone, ai_engine, duplicate_of, group_relation_type, group_score, created_at FROM reports WHERE duplicate_of IS NULL ORDER BY created_at DESC',
    );

    if (format === 'csv') {
      if (rows.length === 0)
        return reply
          .type('text/csv')
          .send(
            'id,source,incident_type,priority,status,location_text,people_affected,confidence,reporter_name,reporter_phone,ai_engine,created_at\n',
          );
      const keys = [
        'id',
        'source',
        'incident_type',
        'priority',
        'status',
        'location_text',
        'people_affected',
        'confidence',
        'reporter_name',
        'reporter_phone',
        'ai_engine',
        'created_at',
      ];
      const header = keys.join(',');
      const lines = rows.map((r) =>
        keys
          .map((k) => {
            const v = r[k];
            if (v == null) return '';
            const s = String(v);
            return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(','),
      );
      reply.header(
        'Content-Disposition',
        `attachment; filename="reportes-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      return reply.type('text/csv; charset=utf-8').send([header, ...lines].join('\n'));
    }
    reply.header(
      'Content-Disposition',
      `attachment; filename="reportes-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    return reply.send(rows);
  });

  // ── Config (admin+) ────────────────────────────────────────────────────
  app.get('/api/admin/config', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(session.role, 'admin'))
      return reply.status(403).send({ error: 'Se necesita rol admin' });

    const dbRows = await query<{ key: string; value: string }>(
      'SELECT key, value FROM admin_config ORDER BY key',
    );
    const mask = (s: string) =>
      s.length <= 8 ? s.slice(0, 2) + '••••' : s.slice(0, 4) + '••••' + s.slice(-4);
    return reply.send({
      env: {
        aiProvider: config.aiProvider,
        aiApiUrl: config.aiApiUrl,
        aiModel: config.aiModel,
        aiApiKey: config.aiApiKey ? mask(config.aiApiKey) : '',
        whatsappMode: config.whatsappMode,
        whatsappApiUrl: config.whatsappApiUrl,
        whatsappPhoneId: config.whatsappPhoneId,
        whatsappApiKey: config.whatsappApiKey ? mask(config.whatsappApiKey) : '',
        whatsappAutoReply: config.whatsappAutoReply,
      },
      db: Object.fromEntries(dbRows.map((r) => [r.key, r.value])),
    });
  });

  app.put('/api/admin/config', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(session.role, 'admin'))
      return reply.status(403).send({ error: 'Se necesita rol admin' });

    const body = (req.body ?? {}) as Record<string, string>;
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string') continue;
      await query(
        'INSERT INTO admin_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()',
        [key, value],
      );
    }
    await audit(session, 'config.update', 'config', undefined, body);
    return reply.send({ ok: true });
  });

  // ── Usuarios (admin+) ─────────────────────────────────────────────────
  app.get('/api/admin/users', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(session.role, 'admin'))
      return reply.status(403).send({ error: 'Se necesita rol admin' });
    const users = await query<{
      id: string;
      username: string;
      role: string;
      name: string | null;
      created_at: string;
    }>('SELECT id, username, role, name, created_at FROM users ORDER BY created_at');
    return reply.send(users);
  });

  app.post('/api/admin/users', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(session.role, 'admin'))
      return reply.status(403).send({ error: 'Se necesita rol admin' });

    const { username, password, role, name } = (req.body ?? {}) as Record<string, string>;
    if (!username || !password)
      return reply.status(400).send({ error: 'username y password requeridos' });
    const salt = randomBytes(16).toString('hex');
    const stored = `${salt}:${hashPass(password, salt)}`;

    try {
      const [user] = await query<{ id: string }>(
        'INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) RETURNING id',
        [username, stored, role ?? 'viewer', name ?? null],
      );
      await audit(session, 'user.create', 'user', user.id, { username, role });
      return reply.status(201).send({ id: user.id });
    } catch (err) {
      if (String(err).includes('unique') || String(err).includes('duplicate'))
        return reply.status(409).send({ error: 'El usuario ya existe' });
      throw err;
    }
  });

  app.delete('/api/admin/users/:id', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(session.role, 'admin'))
      return reply.status(403).send({ error: 'Se necesita rol admin' });
    const { id } = req.params as { id: string };
    if (id === session.userId)
      return reply.status(400).send({ error: 'No puedes eliminarte a ti mismo' });
    const [deleted] = await query<{ username: string }>(
      'DELETE FROM users WHERE id = $1 RETURNING username',
      [id],
    );
    if (!deleted) return reply.status(404).send({ error: 'No encontrado' });
    await audit(session, 'user.delete', 'user', id, { username: deleted.username });
    return reply.send({ ok: true });
  });

  // ── Auditoría (admin+) ────────────────────────────────────────────────
  app.get('/api/admin/audit', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'No autorizado' });
    if (!minRole(session.role, 'admin'))
      return reply.status(403).send({ error: 'Se necesita rol admin' });
    const limit = Math.min(Number((req.query as Record<string, string>)?.limit ?? 100), 500);
    const logs = await query<{
      id: string;
      username: string | null;
      action: string;
      entity: string;
      entity_id: string | null;
      detail: unknown;
      created_at: string;
    }>(
      'SELECT id, username, action, entity, entity_id, detail, created_at FROM audit_log ORDER BY created_at DESC LIMIT $1',
      [limit],
    );
    return reply.send(logs);
  });
}
