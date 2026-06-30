import type { FastifyInstance } from 'fastify';
import { parseAuth, minRole } from '../auth';
import {
  runIngestion,
  searchExternalPersons,
  getExternalStats,
  seedExternalSources,
} from '../services/ingestion';

export async function externalRoutes(app: FastifyInstance): Promise<void> {
  // ── Buscar registros unificados ─────────────────────────────────────────
  app.get('/api/external/search', async (req, reply) => {
    const { q, status, limit, offset } = (req.query ?? {}) as Record<string, string | undefined>;
    const result = await searchExternalPersons(
      q ?? '',
      status,
      Math.min(parseInt(limit ?? '50', 10), 200),
      parseInt(offset ?? '0', 10),
    );
    return result;
  });

  // ── Estadísticas unificadas ─────────────────────────────────────────────
  app.get('/api/external/stats', async () => {
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
