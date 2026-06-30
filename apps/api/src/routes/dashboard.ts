import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../db';
import { parseAuth, minRole } from '../auth';
import { generateSummary, type SummaryInput } from '../ai/summary';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  // Métricas agregadas para el panel de coordinación.
  app.get('/api/dashboard/stats', async (_req, reply) => {
    const [byType, byPriority, byStatus, totals, shelters, volunteers] = await Promise.all([
      query(
        `SELECT incident_type, count(*)::int AS count
             FROM reports WHERE duplicate_of IS NULL
             GROUP BY incident_type ORDER BY count DESC`,
      ),
      query(
        `SELECT priority, count(*)::int AS count
             FROM reports WHERE duplicate_of IS NULL
             GROUP BY priority`,
      ),
      query(
        `SELECT status, count(*)::int AS count
             FROM reports WHERE duplicate_of IS NULL
             GROUP BY status`,
      ),
      queryOne(
        `SELECT
              count(*) FILTER (WHERE duplicate_of IS NULL)::int AS total,
              count(*) FILTER (WHERE duplicate_of IS NOT NULL)::int AS duplicates,
              count(*) FILTER (WHERE duplicate_of IS NULL AND status <> 'resuelto')::int AS active,
              coalesce(sum(people_affected) FILTER (WHERE duplicate_of IS NULL), 0)::int AS people_affected
            FROM reports`,
      ),
      queryOne(
        `SELECT count(*)::int AS count,
                  coalesce(sum(capacity),0)::int AS capacity,
                  coalesce(sum(occupancy),0)::int AS occupancy
             FROM shelters WHERE status = 'abierto'`,
      ),
      queryOne(
        `SELECT count(*)::int AS active
             FROM volunteers WHERE status = 'activo'`,
      ),
    ]);

    return reply.send({
      totals,
      byType,
      byPriority,
      byStatus,
      shelters,
      volunteers,
    });
  });

  // Resumen de situación generado por IA (con respaldo heurístico).
  app.post('/api/dashboard/summary', async (req, reply) => {
    const s = parseAuth(req);
    if (!s || !minRole(s.role, 'operator'))
      return reply.status(403).send({ error: 'No autorizado' });
    const reports = await query<SummaryInput>(
      `SELECT incident_type, priority, status, people_affected, location_text
         FROM reports
        WHERE duplicate_of IS NULL
        ORDER BY created_at DESC
        LIMIT 300`,
    );
    const { text, engine } = await generateSummary(reports);
    const saved = await queryOne(
      `INSERT INTO ai_summaries (summary, report_count, engine)
       VALUES ($1, $2, $3) RETURNING *`,
      [text, reports.length, engine],
    );
    return reply.send(saved);
  });

  app.get('/api/dashboard/summary', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'Se requiere autenticación' });
    const latest = await queryOne(`SELECT * FROM ai_summaries ORDER BY created_at DESC LIMIT 1`);
    return reply.send(latest ?? null);
  });
}
