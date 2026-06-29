import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db';

const shelterSchema = z.object({
  name: z.string().min(1).max(160),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  capacity: z.number().int().min(0).default(0),
  occupancy: z.number().int().min(0).default(0),
  status: z.enum(['abierto', 'lleno', 'cerrado']).default('abierto'),
  contact: z.string().max(120).nullish(),
});

const volunteerSchema = z.object({
  name: z.string().min(1).max(160),
  phone: z.string().max(40).nullish(),
  role: z.string().max(60).default('general'),
  status: z.enum(['activo', 'inactivo']).default('activo'),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
});

const supplySchema = z.object({
  name: z.string().min(1).max(160),
  category: z.string().max(60).default('general'),
  quantity: z.number().int().min(0).default(0),
  unit: z.string().max(20).default('u'),
  shelterId: z.string().uuid().nullish(),
});

export async function resourcesRoutes(app: FastifyInstance): Promise<void> {
  // ── Refugios ───────────────────────────────────────────────
  app.get('/api/shelters', async (_req, reply) => {
    return reply.send(await query('SELECT * FROM shelters ORDER BY created_at DESC'));
  });

  app.post('/api/shelters', async (req, reply) => {
    const parsed = shelterSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const s = parsed.data;
    const row = await queryOne(
      `INSERT INTO shelters (name, lat, lng, capacity, occupancy, status, contact)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [s.name, s.lat ?? null, s.lng ?? null, s.capacity, s.occupancy, s.status, s.contact ?? null],
    );
    return reply.status(201).send(row);
  });

  // ── Voluntarios ────────────────────────────────────────────
  app.get('/api/volunteers', async (_req, reply) => {
    return reply.send(await query('SELECT * FROM volunteers ORDER BY last_seen DESC'));
  });

  app.post('/api/volunteers', async (req, reply) => {
    const parsed = volunteerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const v = parsed.data;
    const row = await queryOne(
      `INSERT INTO volunteers (name, phone, role, status, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [v.name, v.phone ?? null, v.role, v.status, v.lat ?? null, v.lng ?? null],
    );
    return reply.status(201).send(row);
  });

  // ── Insumos ────────────────────────────────────────────────
  app.get('/api/supplies', async (_req, reply) => {
    return reply.send(await query('SELECT * FROM supplies ORDER BY category, name'));
  });

  app.post('/api/supplies', async (req, reply) => {
    const parsed = supplySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const s = parsed.data;
    const row = await queryOne(
      `INSERT INTO supplies (name, category, quantity, unit, shelter_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [s.name, s.category, s.quantity, s.unit, s.shelterId ?? null],
    );
    return reply.status(201).send(row);
  });
}
