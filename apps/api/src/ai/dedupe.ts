import type { IncidentType } from '../types';

// Detección de duplicados: dos reportes pueden referirse al mismo evento.
// Combina similitud de texto (Jaccard) y cercanía geográfica.

const STOPWORDS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'de',
  'del',
  'a',
  'en',
  'y',
  'o',
  'que',
  'se',
  'con',
  'por',
  'para',
  'mi',
  'su',
  'al',
  'es',
  'hay',
  'una',
  'esta',
  'este',
  'muy',
  'no',
  'lo',
  'me',
  'te',
  'nos',
]);

export interface DedupeCandidate {
  id: string;
  incident_type: IncidentType;
  raw_text: string;
  lat: number | null;
  lng: number | null;
  location_text?: string | null;
  duplicate_of?: string | null;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ñ ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Distancia aproximada en metros (haversine). */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface NewReportForDedupe {
  incident_type: IncidentType;
  raw_text: string;
  lat: number | null;
  lng: number | null;
  location_text?: string | null;
}

export interface GroupResult {
  parentGroupId: string | null;
  relationType: 'mismo_suceso' | 'en_cadena' | null;
}

export function findGroupForReport(
  report: NewReportForDedupe,
  candidates: DedupeCandidate[],
): GroupResult {
  const tokens = tokenize(report.raw_text);
  let bestId: string | null = null;
  let bestCandidate: DedupeCandidate | null = null;
  let maxScore = 0;

  for (const c of candidates) {
    const leaderId = c.duplicate_of || c.id;

    let isSameZone = false;
    let distance = Infinity;

    if (report.lat != null && report.lng != null && c.lat != null && c.lng != null) {
      distance = distanceMeters(report.lat, report.lng, c.lat, c.lng);
      if (distance < 500) {
        isSameZone = true;
      }
    }

    if (report.location_text && c.location_text) {
      const loc1 = report.location_text.toLowerCase().trim();
      const loc2 = c.location_text.toLowerCase().trim();
      if (loc1.length > 2 && loc2.length > 2) {
        if (loc1 === loc2 || loc1.includes(loc2) || loc2.includes(loc1)) {
          isSameZone = true;
        }
      }
    }

    const textSim = jaccard(tokens, tokenize(c.raw_text));
    if (textSim > 0.4) {
      isSameZone = true;
    }

    if (isSameZone) {
      const geoBoost = distance < 150 ? 0.5 : distance < 400 ? 0.3 : 0.1;
      const score = textSim + geoBoost;
      if (score > maxScore) {
        maxScore = score;
        bestId = leaderId;
        bestCandidate = c;
      }
    }
  }

  if (bestId && bestCandidate) {
    const textSim = jaccard(tokens, tokenize(bestCandidate.raw_text));
    const isSameType = report.incident_type === bestCandidate.incident_type;
    const relationType = isSameType && textSim >= 0.15 ? 'mismo_suceso' : 'en_cadena';

    return {
      parentGroupId: bestId,
      relationType,
    };
  }

  return {
    parentGroupId: null,
    relationType: null,
  };
}

/**
 * Devuelve el id del reporte considerado original, o null si es nuevo.
 * Mantiene la compatibilidad pero delegando en findGroupForReport.
 */
export function detectDuplicate(
  report: NewReportForDedupe,
  candidates: DedupeCandidate[],
): string | null {
  const res = findGroupForReport(report, candidates);
  return res.parentGroupId;
}
