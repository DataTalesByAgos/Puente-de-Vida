/**
 * Ingesta unificada de APIs externas de personas desaparecidas/localizadas.
 *
 * Fuentes reales que funcionan:
 *  - Localizados Venezuela: https://localizadosvenezuela.com/api/v1/localizados (9.085 registros)
 *  - Aquí Estoy:            https://aquiestoy.xyz/api/personas/buscar?q= (búsqueda) + /personas/{id} (detalle)
 *  - Venezuela Te Busca:    https://venezuelatebusca.com/api/stats (solo stats)
 *
 * Normaliza todos los registros a external_persons con dedup por source_id+external_id.
 */

import { query } from '../db';

interface SourceRow {
  id: string;
  name: string;
  base_url: string;
  enabled: boolean;
}

// ── Localizados Venezuela ──────────────────────────────────────────────────

interface LocalizadoRecord {
  slug: string;
  nombreCompleto: string;
  direccion: string | null;
  observaciones: string | null;
  condicion: string;
  lugarNombre: string | null;
  publicadoEn: string;
}

interface LocalizadoResponse {
  data: LocalizadoRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ── Aquí Estoy ─────────────────────────────────────────────────────────────

interface AquiEstoySearchResult {
  id: number;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  notas: string | null;
  fuentes: { id: number; url: string }[];
  created_at: string;
}

interface AquiEstoySearchResponse {
  personas: AquiEstoySearchResult[];
  total: number;
}

// ── Normalizadores ──────────────────────────────────────────────────────────

function normalizeStatus(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (['fallecido', 'deceased', 'dead', 'falleció', 'fallecida'].some((k) => s.includes(k)))
    return 'fallecido';
  if (
    [
      'hospitalizado',
      'hospitalized',
      'hospital',
      'herido',
      'lesionado',
      'herida',
      'lesionada',
    ].some((k) => s.includes(k))
  )
    return 'hospitalizado';
  if (
    [
      'localizado',
      'found',
      'localizada',
      'encontrado',
      'encontrada',
      'sobreviviente',
      'sobrevivientes',
      'vivo',
      'sano',
    ].some((k) => s.includes(k))
  )
    return 'localizado';
  if (
    [
      'desaparecido',
      'missing',
      'desconocido',
      'unknown',
      'no localizado',
      'sin informacion',
      'pendiente',
    ].some((k) => s.includes(k))
  )
    return 'desaparecido';
  return 'desconocido';
}

function parseEdad(texto: string): number | null {
  const m = texto.match(/(\d+)\s*años?/i);
  return m ? parseInt(m[1], 10) : null;
}

function parseDocId(texto: string): string | null {
  const m = texto.match(/C[.I]*[:\s]*(\d{5,})/i);
  return m ? m[1] : null;
}

function toUnifiedLocalizado(r: LocalizadoRecord, sourceId: string) {
  const obs = r.observaciones ?? '';
  return {
    full_name: r.nombreCompleto,
    document_id: parseDocId(obs),
    age: parseEdad(obs),
    status: normalizeStatus(r.condicion),
    location: r.direccion,
    facility: r.lugarNombre,
    notes: obs,
    source_id: sourceId,
    source_url: `https://localizadosvenezuela.com/localizados/${r.slug}`,
    external_id: r.slug,
    updated_at: r.publicadoEn,
  };
}

function toUnifiedAquiEstoy(r: AquiEstoySearchResult, sourceId: string) {
  const notas = r.notas ?? '';
  return {
    full_name: r.nombre_completo,
    document_id: parseDocId(notas),
    age: parseEdad(notas),
    status: 'desconocido',
    location: null,
    facility: null,
    notes: notas,
    source_id: sourceId,
    source_url: null,
    external_id: String(r.id),
    updated_at: r.created_at,
  };
}

// ── Batch helper ────────────────────────────────────────────────────────────

/** Hace un INSERT múltiple con ON CONFLICT DO UPDATE usando UNNEST.
 *  Cada `rows` es un array de registros normalizados (mismos campos).
 *  Postgres recibe arrays paralelos y los expande en una sola transacción. */
async function batchInsert(rows: Record<string, unknown>[], sourceId: string): Promise<number> {
  if (!rows.length) return 0;

  const keys = [
    'full_name',
    'document_id',
    'age',
    'status',
    'location',
    'facility',
    'notes',
    'source_id',
    'source_url',
    'external_id',
    'updated_at',
  ];
  const n = rows.length;
  const totalParams = keys.length * n;

  // Construir VALUES con índices posicionales: ($1..$11), ($12..$22), ...
  const valueClauses: string[] = [];
  for (let i = 0; i < n; i++) {
    const offset = i * keys.length + 1;
    const placeholders = keys.map((_, j) => `$${offset + j}`);
    valueClauses.push(`(${placeholders.join(',')})`);
  }

  // Aplanar todos los valores en un solo array
  const params: unknown[] = [];
  for (const row of rows) {
    for (const k of keys) {
      params.push(row[k] ?? null);
    }
  }

  const sql = `
    INSERT INTO external_persons (${keys.join(',')})
    VALUES ${valueClauses.join(',')}
    ON CONFLICT (source_id, external_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      document_id = EXCLUDED.document_id,
      age = EXCLUDED.age,
      status = EXCLUDED.status,
      location = EXCLUDED.location,
      facility = EXCLUDED.facility,
      notes = EXCLUDED.notes,
      updated_at = EXCLUDED.updated_at
  `;

  await query(sql, params);
  return n;
}

// ── Ingesta por fuente ──────────────────────────────────────────────────────

async function ingestLocalizados(source: SourceRow): Promise<number> {
  const base = source.base_url.replace(/\/+$/, '');
  let page = 1;
  let inserted = 0;

  for (;;) {
    let body: LocalizadoResponse;
    try {
      const url = `${base}/api/v1/localizados?page=${page}&limit=200`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) break;
      body = (await res.json()) as LocalizadoResponse;
    } catch {
      break;
    }

    const records = body.data ?? [];
    if (!records.length) break;

    const batch = records.map((r) => ({
      ...toUnifiedLocalizado(r, source.id),
      source_id: source.id,
    }));
    inserted += await batchInsert(batch, source.id);

    page++;
    if (body.meta && page > body.meta.totalPages) break;
  }

  return inserted;
}

async function ingestAquiEstoy(source: SourceRow): Promise<number> {
  const base = source.base_url.replace(/\/+$/, '');

  // 1) Try bulk export
  try {
    const url = `${base}/api/personas/export?formato=json`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const body = (await res.json()) as { total: number; personas: AquiEstoySearchResult[] };
      if (body.personas?.length) {
        return await bulkInsertAquiEstoy(body.personas, source.id);
      }
    }
  } catch {
    // fallback to search-based approach
  }

  // 2) Fallback: buscar letras comunes del abecedario
  let inserted = 0;
  const seen = new Set<string>();

  const queries = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
  ];

  for (const q of queries) {
    let offset = 0;
    const limit = 100;

    for (;;) {
      try {
        const url = `${base}/api/personas/buscar?q=${q}&limit=${limit}&offset=${offset}`;
        const res = await fetch(url, {
          signal: AbortSignal.timeout(10_000),
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) break;
        const body = (await res.json()) as AquiEstoySearchResponse;
        const personas = body.personas ?? [];

        if (!personas.length) break;

        const nuevos = personas.filter((p) => !seen.has(String(p.id)));
        if (nuevos.length) {
          inserted += await bulkInsertAquiEstoy(nuevos, source.id);
          nuevos.forEach((p) => seen.add(String(p.id)));
        }

        // If we got fewer than limit or no new results, stop this letter
        if (personas.length < limit || nuevos.length === 0) break;
        offset += limit;
      } catch {
        break;
      }
    }
  }

  return inserted;
}

async function bulkInsertAquiEstoy(
  personas: AquiEstoySearchResult[],
  sourceId: string,
): Promise<number> {
  let inserted = 0;
  for (const p of personas) {
    const norm = toUnifiedAquiEstoy(p, sourceId);
    try {
      await query(
        `INSERT INTO external_persons (full_name, document_id, age, status, location, facility, notes, source_id, source_url, external_id, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (source_id, external_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           document_id = EXCLUDED.document_id,
           age = EXCLUDED.age,
           status = EXCLUDED.status,
           notes = EXCLUDED.notes,
           updated_at = EXCLUDED.updated_at`,
        [
          norm.full_name,
          norm.document_id,
          norm.age,
          norm.status,
          norm.location,
          norm.facility,
          norm.notes,
          norm.source_id,
          norm.source_url,
          norm.external_id,
          norm.updated_at,
        ],
      );
      inserted++;
    } catch {
      // skip
    }
  }
  return inserted;
}

// ── Orquestador ─────────────────────────────────────────────────────────────

export async function runIngestion(): Promise<{
  sources: { name: string; inserted: number }[];
  total: number;
}> {
  const sources = await query<SourceRow>(
    'SELECT id, name, base_url, enabled FROM external_sources WHERE enabled = true',
  );

  const results: { name: string; inserted: number }[] = [];

  for (const source of sources) {
    let inserted = 0;
    try {
      if (source.name === 'localizados-ve') {
        inserted = await ingestLocalizados(source);
      } else if (source.name === 'aquiestoy') {
        inserted = await ingestAquiEstoy(source);
      }

      await query(
        `UPDATE external_sources SET last_sync_at = now(), record_count = (
           SELECT COUNT(*) FROM external_persons WHERE source_id = $1
         ) WHERE id = $1`,
        [source.id],
      );
    } catch (err) {
      console.error(`[ingestion] Error en fuente ${source.name}:`, err);
    }

    results.push({ name: source.name, inserted });
  }

  const [{ count }] = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM external_persons',
  );

  return { sources: results, total: parseInt(count, 10) };
}

export async function searchExternalPersons(q: string, status?: string, limit = 50, offset = 0) {
  const params: unknown[] = [];
  const clauses: string[] = [];

  if (q) {
    const trimmed = q.trim();
    // Si el query tiene suficiente longitud, usar full-text search
    if (trimmed.length >= 3) {
      clauses.push(`ep.search_vector @@ plainto_tsquery('spanish', $${params.length + 1})`);
      params.push(trimmed);
      // También rankear por relevancia
      clauses.push(
        `(ep.full_name ILIKE $${params.length + 1} OR ep.document_id ILIKE $${params.length + 1})`,
      );
      // Re-uses same param
    } else {
      clauses.push(
        `(ep.full_name ILIKE $${params.length + 1} OR ep.document_id ILIKE $${params.length + 1})`,
      );
      params.push(`%${trimmed}%`);
    }
  }

  if (status) {
    clauses.push(`ep.status = $${params.length + 1}`);
    params.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  // Si hay full-text search, ordenar por relevancia; si no, por fecha
  const orderBy =
    q && q.trim().length >= 3
      ? `ORDER BY ts_rank(ep.search_vector, plainto_tsquery('spanish', $${params.length + 1})) DESC, ep.updated_at DESC`
      : 'ORDER BY ep.updated_at DESC';
  if (q && q.trim().length >= 3) params.push(q.trim());

  const sql = `
    SELECT ep.*, es.name AS source_name
    FROM external_persons ep
    JOIN external_sources es ON es.id = ep.source_id
    ${where}
    ${orderBy}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  params.push(limit, offset);

  const rows = await query(sql, params);

  const countParams = params.slice(0, -(q && q.trim().length >= 3 ? 3 : 1));
  const countSql = `
    SELECT COUNT(*)::text AS count
    FROM external_persons ep
    ${where}
  `;
  const [{ count }] = await query<{ count: string }>(countSql, countParams);

  return { rows, total: parseInt(count, 10) };
}

export async function getExternalStats() {
  const stats = await query<{ status: string; count: string }>(
    'SELECT status, COUNT(*)::text AS count FROM external_persons GROUP BY status ORDER BY count DESC',
  );

  const sources = await query<{
    name: string;
    record_count: number;
    last_sync_at: string | null;
  }>('SELECT name, record_count, last_sync_at FROM external_sources ORDER BY name');

  const [{ total }] = await query<{ total: string }>(
    'SELECT COUNT(*)::text AS total FROM external_persons',
  );

  return { total: parseInt(total, 10), byStatus: stats, sources };
}

/** Seed inicial de fuentes externas */
export async function seedExternalSources() {
  const sources = [
    {
      name: 'localizados-ve',
      base_url: process.env.LOCALIZADOS_API_URL ?? 'https://localizadosvenezuela.com',
      enabled: true,
    },
    {
      name: 'aquiestoy',
      base_url: process.env.AQUIESTOY_API_URL ?? 'https://aquiestoy.xyz',
      enabled: true,
    },
  ];

  for (const s of sources) {
    await query(
      `INSERT INTO external_sources (name, base_url, enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET base_url = EXCLUDED.base_url`,
      [s.name, s.base_url, s.enabled],
    );
  }
}
