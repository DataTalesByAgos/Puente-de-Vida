import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db';
import { parseAuth } from '../auth';

const NEED_CATEGORIES = ['profesionales', 'no_profesionales', 'logistica', 'otros'] as const;
const AVAILABILITY_TYPES = ['inmediata', 'programada', 'limitada'] as const;

const profileSchema = z.object({
  categoriesOfInterest: z.array(z.enum(NEED_CATEGORIES)).default([]),
  skills: z.array(z.string().max(60)).max(20).default([]),
  availability: z.enum(AVAILABILITY_TYPES).default('programada'),
  geoZone: z.string().max(200).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  maxDistanceKm: z.number().int().min(0).max(1000).nullable().optional(),
});

export async function volunteerRoutes(app: FastifyInstance): Promise<void> {
  // ── Get my profile ─────────────────────────────────────────────
  app.get('/api/volunteer/profile', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'Autenticación requerida' });

    let profile = await queryOne('SELECT * FROM volunteer_profiles WHERE user_id = $1', [
      session.username,
    ]);
    if (!profile) {
      profile = {
        user_id: session.username,
        categories_of_interest: [],
        skills: [],
        availability: 'programada',
        geo_zone: null,
        lat: null,
        lng: null,
        max_distance_km: 50,
      };
    }
    return profile;
  });

  // ── Update my profile ──────────────────────────────────────────
  app.put('/api/volunteer/profile', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'Autenticación requerida' });

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const data = parsed.data;
    const profile = await queryOne(
      `
      INSERT INTO volunteer_profiles (user_id, categories_of_interest, skills, availability, geo_zone, lat, lng, max_distance_km)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id) DO UPDATE SET
        categories_of_interest = $2, skills = $3, availability = $4,
        geo_zone = $5, lat = $6, lng = $7, max_distance_km = $8,
        updated_at = now()
      RETURNING *
    `,
      [
        session.username,
        data.categoriesOfInterest,
        data.skills,
        data.availability,
        data.geoZone ?? null,
        data.lat ?? null,
        data.lng ?? null,
        data.maxDistanceKm ?? 50,
      ],
    );
    return profile;
  });

  // ── Get matched needs (based on profile interests) ─────────────
  app.get('/api/volunteer/matches', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'Autenticación requerida' });

    const profile = await queryOne('SELECT * FROM volunteer_profiles WHERE user_id = $1', [
      session.username,
    ]);
    const categories = profile?.categories_of_interest ?? [];

    if (!categories.length) {
      return [];
    }

    const needs = await query(
      `
      SELECT n.*, o.name as org_name FROM needs n
      LEFT JOIN organizations o ON n.organization_id = o.id
      WHERE n.status = 'abierta'
        AND n.category = ANY($1)
      ORDER BY
        CASE n.priority WHEN 'critica' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 WHEN 'baja' THEN 3 END,
        n.created_at ASC
      LIMIT 100
    `,
      [categories],
    );
    return needs;
  });

  // ── Get my assignments ─────────────────────────────────────────
  app.get('/api/volunteer/assignments', async (req, reply) => {
    const session = parseAuth(req);
    if (!session) return reply.status(401).send({ error: 'Autenticación requerida' });

    const needs = await query(
      `
      SELECT n.*, o.name as org_name FROM needs n
      LEFT JOIN organizations o ON n.organization_id = o.id
      WHERE n.assigned_to = $1
      ORDER BY
        CASE n.status WHEN 'abierta' THEN 0 WHEN 'en_proceso' THEN 1 WHEN 'resuelta' THEN 2 WHEN 'cerrada' THEN 3 END,
        n.updated_at DESC
    `,
      [session.username],
    );
    return needs;
  });
}
