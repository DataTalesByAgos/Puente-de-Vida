import Dexie, { type Table } from 'dexie';
import type { LocalReport, ServerReport } from './types';

// Base de datos local (IndexedDB) vía Dexie. Es el corazón del modo offline:
// todo se guarda primero acá y luego se sincroniza con el servidor.

class PdvDatabase extends Dexie {
  reports!: Table<LocalReport, string>;
  meta!: Table<{ id: string; value: string }, string>;

  constructor() {
    super('puente_de_vida');
    this.version(1).stores({
      // Índices secundarios para consultar offline.
      reports: 'key, synced, status, incidentType, priority, updatedAt',
      meta: 'id',
    });
  }
}

export const db = new PdvDatabase();

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
