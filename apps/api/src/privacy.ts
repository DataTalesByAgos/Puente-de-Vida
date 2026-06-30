import type { Session } from './auth';

const PERM_LEVELS = { viewer: 0, operator: 1, admin: 2 } as const;

function roleLevel(role: string): number {
  return PERM_LEVELS[role as keyof typeof PERM_LEVELS] ?? -1;
}

function mask(value: string, keepStart = 2, keepEnd = 2): string {
  if (value.length <= keepStart + keepEnd) return value;
  return (
    value.slice(0, keepStart) +
    '*'.repeat(value.length - keepStart - keepEnd) +
    value.slice(-keepEnd)
  );
}

function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

function maskAddress(addr: string): string {
  // Keep only city/neighborhood level, strip street/apt details
  const parts = addr.split(',').map((p) => p.trim());
  return parts.slice(0, Math.min(2, parts.length)).join(', ');
}

export function filterReport(
  report: Record<string, unknown>,
  session: Session | null,
): Record<string, unknown> {
  const level = session ? roleLevel(session.role) : -1;

  const isMinor =
    report.is_minor === true ||
    isMinorFromReport({
      age: report.age as number | null | undefined,
      raw_text: report.raw_text as string | null | undefined,
    });

  // Unauthenticated: minimal data only
  if (level < 0) {
    const base: Record<string, unknown> = {
      id: report.id,
      incident_type: report.incident_type,
      priority: report.priority,
      status: report.status,
      created_at: report.created_at,
      confidence: report.confidence,
    };
    if (isMinor) base._minor_protected = true;
    return base;
  }

  // viewer: no phones, masked names, general location, minor protection
  if (level === 0) {
    const filtered = { ...report };
    if (filtered.reporter_phone)
      filtered.reporter_phone = maskPhone(filtered.reporter_phone as string);
    if (filtered.reporter_name)
      filtered.reporter_name = mask(filtered.reporter_name as string, 1, 1);
    if (filtered.location_text)
      filtered.location_text = maskAddress(filtered.location_text as string);
    delete filtered.photo_url;
    if (isMinor) {
      delete filtered.location_text;
      filtered._minor_protected = true;
    }
    return filtered;
  }

  // operator+ : full data, but mark minor
  if (isMinor) {
    return { ...report, _minor_protected: true };
  }
  return report;
}

export function filterPerson(
  person: Record<string, unknown>,
  session: Session | null,
): Record<string, unknown> {
  const level = session ? roleLevel(session.role) : -1;

  if (level < 0) {
    return {
      id: person.id,
      full_name: person.full_name,
      source_name: person.source_name,
      created_at: person.created_at,
    };
  }

  const filtered = { ...person };

  // Mask cedula for everyone (like Localizados VE does)
  if (filtered.document_id) {
    filtered.document_id = mask(filtered.document_id as string, 2, 3);
  }

  // Minors protection
  const age = filtered.age != null ? Number(filtered.age) : null;
  const isMinor = age != null && age < 18;
  if (isMinor) {
    if (level < 1) {
      // viewer or less: strip location, facility, notes
      delete filtered.location;
      delete filtered.facility;
      delete filtered.notes;
      delete filtered.source_url;
    }
    // Always add protection label
    filtered._minor_protected = true;
  }

  if (level < 1) {
    // viewer: no exact location
    if (filtered.location) filtered.location = maskAddress(filtered.location as string);
    delete filtered.notes;
  }

  return filtered;
}

export function isMinorFromReport(report: {
  age?: number | null;
  raw_text?: string | null;
}): boolean {
  if (report.age != null && report.age < 18) return true;
  // Heuristic: keywords in raw text suggesting minor
  const text = (report.raw_text ?? '').toLowerCase();
  const keywords = [
    'niño',
    'niña',
    'menor',
    'bebé',
    'infante',
    'adolescente',
    'pequeño',
    'pequeña',
    'lactante',
  ];
  return keywords.some((k) => text.includes(k));
}
