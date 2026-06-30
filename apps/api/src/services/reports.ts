import { query, queryOne } from '../db';
import { classify } from '../ai/classifier';
import { detectDuplicate, findGroupForReport, type DedupeCandidate } from '../ai/dedupe';
import type { IncidentType, Priority, Report, Source, Status } from '../types';

// Diccionario local de ubicaciones conocidas → coordenadas (Venezuela).
// Debe mantenerse sincronizado con el de ai/heuristic.ts.
const GEO_LOOKUP: { patterns: RegExp[]; lat: number; lng: number }[] = [
  // --- Distrito Capital / Miranda ---
  { patterns: [/petare/i], lat: 10.4768, lng: -66.8089 },
  { patterns: [/el valle/i], lat: 10.4634, lng: -66.9171 },
  { patterns: [/la vega/i], lat: 10.4881, lng: -66.9418 },
  { patterns: [/antimano|antímano/i], lat: 10.4657, lng: -66.9791 },
  { patterns: [/calle sucre/i], lat: 10.5061, lng: -66.9146 },
  { patterns: [/catia/i], lat: 10.5099, lng: -66.9411 },
  { patterns: [/caricuao/i], lat: 10.4347, lng: -66.9778 },
  { patterns: [/coche/i], lat: 10.4547, lng: -66.9028 },
  { patterns: [/san agustin|san agustín/i], lat: 10.4912, lng: -66.8951 },
  { patterns: [/sabana grande/i], lat: 10.4953, lng: -66.8373 },
  { patterns: [/av(?:enida)? bol[ií]var/i], lat: 10.4972, lng: -66.8411 },
  { patterns: [/macarao/i], lat: 10.4462, lng: -67.0139 },
  { patterns: [/junquito/i], lat: 10.4627, lng: -67.0803 },
  { patterns: [/baruta/i], lat: 10.4335, lng: -66.8683 },
  { patterns: [/chacao/i], lat: 10.4965, lng: -66.8507 },
  { patterns: [/altamira/i], lat: 10.5000, lng: -66.8408 },
  { patterns: [/los chorros/i], lat: 10.5006, lng: -66.8331 },
  { patterns: [/la candelaria/i], lat: 10.5064, lng: -66.9017 },
  { patterns: [/el paraiso|el paraíso/i], lat: 10.4886, lng: -66.9225 },
  { patterns: [/propatria/i], lat: 10.4692, lng: -66.9617 },
  { patterns: [/23 de enero/i], lat: 10.4953, lng: -66.9122 },
  { patterns: [/el silencio/i], lat: 10.5036, lng: -66.9192 },
  { patterns: [/bellas artes/i], lat: 10.5011, lng: -66.8997 },
  { patterns: [/plaza venezuela/i], lat: 10.4964, lng: -66.8717 },
  { patterns: [/los dos caminos/i], lat: 10.5019, lng: -66.8283 },
  { patterns: [/santa monica|santa mónica/i], lat: 10.4947, lng: -66.8469 },
  { patterns: [/san bernardino/i], lat: 10.5011, lng: -66.8753 },
  { patterns: [/montalban|montalbán/i], lat: 10.4536, lng: -66.9125 },
  { patterns: [/las mercedes/i], lat: 10.4819, lng: -66.8558 },
  { patterns: [/el cafetal/i], lat: 10.4192, lng: -66.8406 },
  { patterns: [/la trinidad/i], lat: 10.4192, lng: -66.8569 },
  // --- Miranda (interior) ---
  { patterns: [/los teques/i], lat: 10.3422, lng: -67.0392 },
  { patterns: [/guarenas/i], lat: 10.4681, lng: -66.6186 },
  { patterns: [/guatire/i], lat: 10.4719, lng: -66.5408 },
  { patterns: [/santa teresa del tuy/i], lat: 10.2311, lng: -66.6647 },
  { patterns: [/charallave/i], lat: 10.3186, lng: -66.8567 },
  { patterns: [/higuerote/i], lat: 10.4819, lng: -66.1008 },
  // --- La Guaira ---
  { patterns: [/la guaira/i], lat: 10.6006, lng: -66.9331 },
  { patterns: [/macuto/i], lat: 10.6119, lng: -66.8769 },
  { patterns: [/catia la mar/i], lat: 10.6053, lng: -66.9758 },
  { patterns: [/caraballeda/i], lat: 10.6111, lng: -66.8492 },
  { patterns: [/naiguata|naiguatá/i], lat: 10.6189, lng: -66.7633 },
  // --- Aragua ---
  { patterns: [/maracay/i], lat: 10.2469, lng: -67.5958 },
  { patterns: [/turmero/i], lat: 10.2286, lng: -67.4722 },
  { patterns: [/la victoria/i], lat: 10.2325, lng: -67.3325 },
  { patterns: [/cagua/i], lat: 10.1858, lng: -67.4586 },
  { patterns: [/villa de cura/i], lat: 10.0369, lng: -67.4808 },
  { patterns: [/colonia tovar/i], lat: 10.4061, lng: -67.2908 },
  // --- Carabobo ---
  { patterns: [/valencia/i], lat: 10.1806, lng: -68.0039 },
  { patterns: [/puerto cabello/i], lat: 10.4731, lng: -68.0125 },
  { patterns: [/naguanagua/i], lat: 10.2675, lng: -68.0186 },
  { patterns: [/guacara/i], lat: 10.2269, lng: -67.8789 },
  { patterns: [/mariara/i], lat: 10.3006, lng: -67.8308 },
  // --- Lara ---
  { patterns: [/barquisimeto/i], lat: 10.0736, lng: -69.3228 },
  { patterns: [/cabudare/i], lat: 10.0233, lng: -69.2708 },
  { patterns: [/carora/i], lat: 10.1753, lng: -70.0778 },
  // --- Falcón ---
  { patterns: [/coro/i], lat: 11.4039, lng: -69.6806 },
  { patterns: [/punto fijo/i], lat: 11.6997, lng: -70.1869 },
  { patterns: [/tucacas/i], lat: 10.7936, lng: -68.3256 },
  { patterns: [/morrocoy/i], lat: 10.8903, lng: -68.2808 },
  // --- Yaracuy ---
  { patterns: [/san felipe/i], lat: 10.3381, lng: -68.7425 },
  { patterns: [/yaritagua/i], lat: 10.0819, lng: -69.1308 },
  // --- Mérida ---
  { patterns: [/merida|mérida/i], lat: 8.5842, lng: -71.1417 },
  { patterns: [/el vigia|el vigía/i], lat: 8.6181, lng: -71.6531 },
  { patterns: [/tovar/i], lat: 8.3333, lng: -71.7500 },
  { patterns: [/ejido/i], lat: 8.5467, lng: -71.2406 },
  // --- Táchira ---
  { patterns: [/san cristobal|san cristóbal/i], lat: 7.7683, lng: -72.2297 },
  { patterns: [/tariba|táriba/i], lat: 7.8189, lng: -72.2167 },
  { patterns: [/rubio/i], lat: 7.7000, lng: -72.3500 },
  { patterns: [/la grita/i], lat: 8.1372, lng: -71.9831 },
  // --- Zulia ---
  { patterns: [/maracaibo/i], lat: 10.6317, lng: -71.6406 },
  { patterns: [/cabimas/i], lat: 10.3986, lng: -71.4517 },
  { patterns: [/ciudad ojeda/i], lat: 10.2003, lng: -71.3075 },
  { patterns: [/machiques/i], lat: 10.0667, lng: -72.5500 },
  // --- Sucre ---
  { patterns: [/cumana|cumaná/i], lat: 10.4564, lng: -64.1725 },
  { patterns: [/carupano|carúpano/i], lat: 10.6692, lng: -63.2400 },
  // --- Anzoátegui ---
  { patterns: [/barcelona/i], lat: 10.1333, lng: -64.6833 },
  { patterns: [/puerto la cruz/i], lat: 10.2167, lng: -64.6167 },
  { patterns: [/lecheria|lechería/i], lat: 10.2000, lng: -64.6833 },
  // --- Monagas ---
  { patterns: [/maturin|maturín/i], lat: 9.7500, lng: -63.1833 },
  // --- Bolívar ---
  { patterns: [/ciudad bolivar|ciudad bolívar/i], lat: 8.1167, lng: -63.5500 },
  { patterns: [/puerto ordaz/i], lat: 8.3167, lng: -62.7000 },
  // --- Nueva Esparta ---
  { patterns: [/porlamar/i], lat: 10.9589, lng: -63.8694 },
  { patterns: [/la asuncion|la asunción/i], lat: 11.0292, lng: -63.8678 },
  { patterns: [/pampatar/i], lat: 10.9944, lng: -63.7897 },
  { patterns: [/juan griego/i], lat: 11.0825, lng: -63.9650 },
];

function geoLookup(text: string): { lat: number | null; lng: number | null } {
  for (const entry of GEO_LOOKUP) {
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) return { lat: entry.lat, lng: entry.lng };
    }
  }
  return { lat: null, lng: null };
}

export interface IngestInput {
  clientId?: string | null;
  source: Source;
  rawText: string;
  lat?: number | null;
  lng?: number | null;
  locationText?: string | null;
  reporterName?: string | null;
  reporterPhone?: string | null;
  photoUrl?: string | null;
  // Overrides manuales (p.ej. el voluntario eligió el tipo en la PWA).
  incidentType?: IncidentType;
  priority?: Priority;
  status?: Status;
  createdAt?: string | null;
}

/** Recalcula la prioridad grupal basada en los reportes de una misma zona y su diversidad */
async function recalculateGroupScores(leaderId: string): Promise<void> {
  const groupReports = await query<{ id: string; incident_type: IncidentType; priority: Priority }>(
    `SELECT id, incident_type, priority FROM reports WHERE id = $1 OR duplicate_of = $1`,
    [leaderId],
  );

  if (groupReports.length === 0) return;

  const priorityPoints: Record<Priority, number> = {
    critica: 10,
    alta: 7,
    media: 4,
    baja: 1,
  };

  let sumPoints = 0;
  const uniqueTypes = new Set<string>();

  for (const r of groupReports) {
    sumPoints += priorityPoints[r.priority] ?? 4;
    uniqueTypes.add(r.incident_type);
  }

  const N = uniqueTypes.size;
  const diversityMultiplier = 1.0 + (N - 1) * 0.5;
  const groupScore = sumPoints * diversityMultiplier;

  await query(
    `UPDATE reports SET group_score = $1 WHERE id = $2 OR duplicate_of = $2`,
    [groupScore, leaderId],
  );
}

/**
 * Ingresa un reporte: clasifica con IA, busca duplicados y hace upsert
 * idempotente por client_id (clave para la sincronización offline).
 */
export async function ingestReport(input: IngestInput): Promise<Report> {
  const cls = await classify(input.rawText);

  const incidentType = input.incidentType ?? cls.incidentType;
  const priority = input.priority ?? cls.priority;
  const locationText = input.locationText ?? cls.locationText;

  // Geocodificación: primero usa la que vino en el input (simulador/voluntario),
  // luego la que detectó la IA, y por último intenta resolver por diccionario local.
  const geoInput = { lat: input.lat ?? null, lng: input.lng ?? null };
  const geoCls = { lat: cls.lat ?? null, lng: cls.lng ?? null };
  const geoLookedUp = locationText ? geoLookup(locationText) : { lat: null, lng: null };
  const lat = geoInput.lat ?? geoCls.lat ?? geoLookedUp.lat;
  const lng = geoInput.lng ?? geoCls.lng ?? geoLookedUp.lng;

  // Candidatos para deduplicar/agrupar: mismas 24h.
  const candidates = await query<DedupeCandidate>(
    `SELECT id, incident_type, raw_text, lat, lng, location_text, duplicate_of
       FROM reports
      WHERE created_at > now() - interval '24 hours'
      ORDER BY created_at DESC
      LIMIT 200`,
  );

  const groupResult = findGroupForReport(
    { incident_type: incidentType, raw_text: input.rawText, lat, lng, location_text: locationText },
    candidates,
  );

  const duplicateOf = groupResult.parentGroupId;
  const groupRelationType = groupResult.relationType;

  const row = await queryOne<Report>(
    `INSERT INTO reports (
        client_id, source, raw_text, incident_type, priority, status,
        lat, lng, location_text, people_affected, confidence,
        recommended_team, reporter_name, reporter_phone, photo_url,
        ai_engine, duplicate_of, group_relation_type, created_at
     ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, COALESCE($19::timestamptz, now())
     )
     ON CONFLICT (client_id) DO UPDATE SET
        raw_text         = EXCLUDED.raw_text,
        incident_type    = EXCLUDED.incident_type,
        priority         = EXCLUDED.priority,
        status           = EXCLUDED.status,
        lat              = EXCLUDED.lat,
        lng              = EXCLUDED.lng,
        location_text    = EXCLUDED.location_text,
        people_affected  = EXCLUDED.people_affected,
        confidence       = EXCLUDED.confidence,
        recommended_team = EXCLUDED.recommended_team,
        reporter_name    = EXCLUDED.reporter_name,
        reporter_phone   = EXCLUDED.reporter_phone,
        photo_url        = EXCLUDED.photo_url,
        ai_engine        = EXCLUDED.ai_engine,
        duplicate_of     = EXCLUDED.duplicate_of,
        group_relation_type = EXCLUDED.group_relation_type,
        updated_at       = now()
     RETURNING *`,
    [
      input.clientId ?? null,
      input.source,
      input.rawText,
      incidentType,
      priority,
      input.status ?? 'nuevo',
      lat,
      lng,
      locationText,
      cls.peopleAffected,
      cls.confidence,
      cls.recommendedTeam,
      (input.reporterName ?? input.source === 'pwa') ? (input.reporterName || 'Anónimo') : null,
      input.reporterPhone ?? null,
      input.photoUrl ?? null,
      cls.engine,
      duplicateOf,
      groupRelationType,
      input.createdAt ?? null,
    ],
  );

  if (row) {
    const leaderId = row.duplicate_of || row.id;
    await recalculateGroupScores(leaderId);
    const refreshed = await queryOne<Report>('SELECT * FROM reports WHERE id = $1', [row.id]);
    return (refreshed || row) as Report;
  }

  throw new Error('Failed to ingest report');
}

export interface ListFilters {
  status?: Status;
  incidentType?: IncidentType;
  priority?: Priority;
  includeDuplicates?: boolean;
  limit?: number;
}

export async function listReports(filters: ListFilters = {}): Promise<Report[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (!filters.includeDuplicates) where.push('duplicate_of IS NULL');
  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }
  if (filters.incidentType) {
    params.push(filters.incidentType);
    where.push(`incident_type = $${params.length}`);
  }
  if (filters.priority) {
    params.push(filters.priority);
    where.push(`priority = $${params.length}`);
  }

  const limit = Math.min(filters.limit ?? 200, 500);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  return query<Report>(
    `SELECT * FROM reports
       ${whereSql}
       ORDER BY
         COALESCE(group_score, 0) DESC,
         CASE priority
           WHEN 'critica' THEN 0 WHEN 'alta' THEN 1
           WHEN 'media' THEN 2 ELSE 3 END,
         created_at DESC
       LIMIT ${limit}`,
    params,
  );
}

export async function getReport(id: string): Promise<Report | null> {
  return queryOne<Report>('SELECT * FROM reports WHERE id = $1', [id]);
}

export async function updateReport(
  id: string,
  fields: Partial<Pick<Report, 'status' | 'priority' | 'incident_type' | 'recommended_team'>>,
): Promise<Report | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${key} = $${params.length}`);
  }
  if (sets.length === 0) return getReport(id);
  params.push(id);
  const row = await queryOne<Report>(
    `UPDATE reports SET ${sets.join(', ')}, updated_at = now()
      WHERE id = $${params.length} RETURNING *`,
    params,
  );

  if (row && (fields.priority || fields.incident_type)) {
    const leaderId = row.duplicate_of || row.id;
    await recalculateGroupScores(leaderId);
    return getReport(row.id);
  }

  return row;
}
