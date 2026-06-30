import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { INCIDENT_TYPES, PRIORITIES, SOURCES, STATUSES } from '../types';
import { ingestReport } from '../services/reports';
import { query } from '../db';
import { photoUrlSchema } from '../photo';
import { parseAuth } from '../auth';
import { filterReport } from '../privacy';
import type { Report } from '../types';

const itemSchema = z.object({
  clientId: z.string().min(1).max(120),
  source: z.enum(SOURCES).default('pwa'),
  rawText: z.string().min(1).max(4000),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  locationText: z.string().max(200).nullish(),
  reporterName: z.string().max(120).nullish(),
  reporterPhone: z.string().max(40).nullish(),
  photoUrl: photoUrlSchema,
  age: z.number().int().min(0).max(150).nullish(),
  incidentType: z.enum(INCIDENT_TYPES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(STATUSES).optional(),
  createdAt: z.string().datetime().optional(),
});

const pushSchema = z.object({
  reports: z.array(itemSchema).max(200),
});

const pullSchema = z.object({
  since: z.string().datetime().optional(),
});

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  // PUSH: el cliente sube los reportes creados offline (idempotente).
  app.post('/api/sync', async (req, reply) => {
    const parsed = pushSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const results: { clientId: string; report: Report }[] = [];
    for (const item of parsed.data.reports) {
      const report = await ingestReport({
        ...item,
        lat: item.lat ?? null,
        lng: item.lng ?? null,
      });
      results.push({ clientId: item.clientId, report });
    }

    return reply.send({ synced: results.length, results });
  });

  // PULL: el cliente baja los cambios desde la última sincronización.
  app.get('/api/sync', async (req, reply) => {
    const s = parseAuth(req);
    const parsed = pullSchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const since = parsed.data.since ?? '1970-01-01T00:00:00.000Z';
    const reports = await query<Report>(
      `SELECT * FROM reports
        WHERE updated_at > $1
        ORDER BY updated_at ASC
        LIMIT 500`,
      [since],
    );
    const filtered = s
      ? reports
      : (reports.map((r) =>
          filterReport(r as unknown as Record<string, unknown>, null),
        ) as unknown as Report[]);
    return reply.send({ now: new Date().toISOString(), reports: filtered });
  });
}
