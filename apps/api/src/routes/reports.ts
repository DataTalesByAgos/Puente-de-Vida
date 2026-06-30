import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { INCIDENT_TYPES, PRIORITIES, SOURCES, STATUSES } from '../types';
import { getReport, ingestReport, listReports, updateReport } from '../services/reports';
import { photoUrlSchema } from '../photo';
import { query } from '../db';
import { parseAuth, minRole } from '../auth';
import { filterReport } from '../privacy';

const createSchema = z.object({
  clientId: z.string().min(1).max(120).optional(),
  source: z.enum(SOURCES).default('pwa'),
  rawText: z.string().min(1).max(4000),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  locationText: z.string().max(200).nullish(),
  reporterName: z.string().max(120).nullish(),
  reporterPhone: z.string().max(40).nullish(),
  photoUrl: photoUrlSchema,
  incidentType: z.enum(INCIDENT_TYPES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(STATUSES).optional(),
  age: z.number().int().min(0).max(150).nullish(),
  createdAt: z.string().datetime().optional(),
});

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  incidentType: z.enum(INCIDENT_TYPES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  includeDuplicates: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  incident_type: z.enum(INCIDENT_TYPES).optional(),
  recommended_team: z.string().max(120).optional(),
});

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/reports', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const report = await ingestReport({
      ...parsed.data,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
    });
    return reply.status(201).send(report);
  });

  app.get('/api/reports', async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'Se requiere autenticación' });
    const reports = await listReports(parsed.data);
    return reply.send(reports.map((r) => filterReport(r as unknown as Record<string, unknown>, s)));
  });

  app.get('/api/reports/:id', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'Se requiere autenticación' });
    const { id } = req.params as { id: string };
    const report = await getReport(id);
    if (!report) return reply.status(404).send({ error: 'No encontrado' });
    query(
      'INSERT INTO audit_log (user_id, username, action, entity, entity_id, detail) VALUES ($1, $2, $3, $4, $5, $6)',
      [s.userId !== 'env' ? s.userId : null, s.username, 'view_report', 'report', id, null],
    ).catch(() => {});
    return reply.send(filterReport(report as unknown as Record<string, unknown>, s));
  });

  app.patch('/api/reports/:id', async (req, reply) => {
    const s = parseAuth(req);
    if (!s || !minRole(s.role, 'operator'))
      return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const report = await updateReport(id, parsed.data);
    if (!report) return reply.status(404).send({ error: 'No encontrado' });
    return reply.send(report);
  });

  app.post('/api/reports/:id/audit', async (req, reply) => {
    const s = parseAuth(req);
    if (!s || !minRole(s.role, 'operator'))
      return reply.status(403).send({ error: 'No autorizado' });
    const { id } = req.params as { id: string };
    const { entries } = (req.body ?? {}) as {
      entries?: {
        action: string;
        from_status: string | null;
        to_status: string | null;
        operator: string;
        notes: string;
        detail: Record<string, unknown>;
        created_at: string;
      }[];
    };
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return reply.status(400).send({ error: 'entries requerido' });
    }
    for (const e of entries) {
      await query(
        `INSERT INTO audit_log (username, action, entity, entity_id, detail)
         VALUES ($1, $2, 'report', $3, $4)`,
        [e.operator ?? 'anonimo', e.action, id, JSON.stringify(e)],
      );
    }
    return reply.send({ ok: true });
  });
}
