import Dexie, { type Table } from 'dexie';
import type { AuditEntry, LocalNeed, LocalReport, ServerReport } from './types';
import { encrypt, isCryptoReady } from './crypto';

const ENCRYPTED_FIELDS = [
  'reporterName',
  'reporterPhone',
  'rawText',
  'locationText',
  'photoDataUrl',
];

const NEED_ENCRYPTED_FIELDS = [
  'title',
  'description',
  'locationText',
  'resourcesNeeded',
  'comments',
  'photoDataUrl',
];

async function encryptObj(obj: Record<string, unknown>): Promise<void> {
  for (const field of ENCRYPTED_FIELDS) {
    const val = obj[field];
    if (typeof val === 'string' && val && !val.startsWith('~')) {
      obj[field] = await encrypt(val);
    }
  }
}

async function encryptNeedObj(obj: Record<string, unknown>): Promise<void> {
  for (const field of NEED_ENCRYPTED_FIELDS) {
    const val = obj[field];
    if (typeof val === 'string' && val && !val.startsWith('~')) {
      obj[field] = await encrypt(val);
    }
  }
}

class PdvDatabase extends Dexie {
  reports!: Table<LocalReport, string>;
  needs!: Table<LocalNeed, string>;
  meta!: Table<{ id: string; value: string }, string>;
  audit!: Table<AuditEntry, number>;

  constructor() {
    super('puente_de_vida');
    this.version(3).stores({
      reports: 'key, synced, status, incidentType, priority, updatedAt',
      needs: 'key, synced, status, category, priority, scope, updatedAt, createdAt',
      meta: 'id',
      audit: '++id, reportKey, synced, createdAt',
    });
  }
}

export const db = new PdvDatabase();

// Encryption hooks — reports
(db.reports.hook as unknown as (name: string, fn: (...args: unknown[]) => unknown) => void)(
  'creating',
  (...args: unknown[]) => {
    if (!isCryptoReady()) return;
    return encryptObj(args[1] as Record<string, unknown>);
  },
);
(db.reports.hook as unknown as (name: string, fn: (...args: unknown[]) => unknown) => void)(
  'updating',
  (...args: unknown[]) => {
    if (!isCryptoReady()) return;
    return encryptObj(args[0] as Record<string, unknown>);
  },
);

// Encryption hooks — needs
(db.needs.hook as unknown as (name: string, fn: (...args: unknown[]) => unknown) => void)(
  'creating',
  (...args: unknown[]) => {
    if (!isCryptoReady()) return;
    return encryptNeedObj(args[1] as Record<string, unknown>);
  },
);
(db.needs.hook as unknown as (name: string, fn: (...args: unknown[]) => unknown) => void)(
  'updating',
  (...args: unknown[]) => {
    if (!isCryptoReady()) return;
    return encryptNeedObj(args[0] as Record<string, unknown>);
  },
);

export interface ServerAssignment {
  id: string;
  report_id: string;
  organization_id: string;
  org_name?: string;
  status: string;
  feedback: string | null;
  area_status: string | null;
  created_at: string;
}

export function serverToLocal(r: ServerReport): LocalReport {
  return {
    key: r.client_id ?? `srv:${r.id}`,
    serverId: r.id,
    clientId: r.client_id,
    source: r.source,
    rawText: r.raw_text,
    incidentType: r.incident_type,
    priority: r.priority,
    status: r.status,
    lat: r.lat,
    lng: r.lng,
    locationText: r.location_text,
    peopleAffected: r.people_affected,
    confidence: r.confidence,
    recommendedTeam: r.recommended_team,
    reporterName: r.reporter_name,
    reporterPhone: r.reporter_phone,
    photoDataUrl: null,
    age: r.age,
    isMinor: r.is_minor,
    duplicateOf: r.duplicate_of,
    groupRelationType: r.group_relation_type,
    groupScore: r.group_score,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    synced: 1,
  };
}

export async function getMeta(id: string): Promise<string | null> {
  const row = await db.meta.get(id);
  return row?.value ?? null;
}

export async function setMeta(id: string, value: string): Promise<void> {
  await db.meta.put({ id, value });
}
