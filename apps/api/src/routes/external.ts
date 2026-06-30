import type { FastifyInstance } from 'fastify';
import { parseAuth, minRole } from '../auth';
import { filterPerson } from '../privacy';
import {
  runIngestion,
  searchExternalPersons,
  getExternalStats,
  seedExternalSources,
} from '../services/ingestion';

export async function externalRoutes(app: FastifyInstance): Promise<void> {
  // ── Buscar registros unificados ─────────────────────────────────────────
  app.get('/api/external/search', async (req, reply) => {
    const s = parseAuth(req);
    if (!s || !minRole(s.role, 'operator'))
      return reply.status(403).send({ error: 'No autorizado' });
    const { q, status, limit, offset } = (req.query ?? {}) as Record<string, string | undefined>;
    const result = await searchExternalPersons(
      q ?? '',
      status,
      Math.min(parseInt(limit ?? '50', 10), 200),
      parseInt(offset ?? '0', 10),
    );
    if (Array.isArray(result)) {
      return result.map((p: unknown) => filterPerson(p as Record<string, unknown>, s));
    }
    if (
      result &&
      typeof result === 'object' &&
      'rows' in result &&
      Array.isArray((result as { rows: unknown[] }).rows)
    ) {
      const r = result as { rows: unknown[] };
      r.rows = r.rows.map((p: unknown) => filterPerson(p as Record<string, unknown>, s));
      return r;
    }
    return result;
  });

  // ── Estadísticas unificadas ─────────────────────────────────────────────
  app.get('/api/external/stats', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'Se requiere autenticación' });
    return getExternalStats();
  });

  // ── Gatillar ingesta manual (solo admin) ────────────────────────────────
  app.post('/api/external/ingest', async (req, reply) => {
    const session = parseAuth(req);
    if (!session || !minRole(session.role, 'admin')) {
      return reply.status(403).send({ error: 'Se requiere rol admin' });
    }

    const result = await runIngestion();
    return result;
  });

  // ── Seed de fuentes externas (solo admin) ───────────────────────────────
  app.post('/api/external/seed', async (req, reply) => {
    const session = parseAuth(req);
    if (!session || !minRole(session.role, 'admin')) {
      return reply.status(403).send({ error: 'Se requiere rol admin' });
    }

    await seedExternalSources();
    return { ok: true };
  });
}
