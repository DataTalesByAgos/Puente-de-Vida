import { db, getMeta, serverToLocal, setMeta } from './db';
import { api, type SyncItem } from './api';
import { classifyLocal } from './heuristic';
import type { LocalReport, ServerReport } from './types';

// Gestor de sincronización offline-first.
//  - createLocalReport: guarda primero localmente (siempre funciona).
//  - syncNow: sube pendientes y baja novedades cuando hay conexión.

const LAST_SYNC_KEY = 'lastSyncAt';

export interface NewReportInput {
  rawText: string;
  lat: number | null;
  lng: number | null;
  locationText: string | null;
  reporterName: string | null;
  photoDataUrl: string | null;
}

export async function createLocalReport(input: NewReportInput): Promise<LocalReport> {
  const clientId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  const { incidentType, priority } = classifyLocal(input.rawText);

  const record: LocalReport = {
    key: clientId,
    serverId: null,
    clientId,
    source: 'pwa',
    rawText: input.rawText,
    incidentType,
    priority,
    status: 'nuevo',
    lat: input.lat,
    lng: input.lng,
    locationText: input.locationText,
    peopleAffected: null,
    confidence: 0.4,
    recommendedTeam: null,
    reporterName: input.reporterName || 'Anónimo',
    reporterPhone: null,
    photoDataUrl: input.photoDataUrl,
    duplicateOf: null,
    groupRelationType: null,
    groupScore: null,
    createdAt: now,
    updatedAt: now,
    synced: 0,
  };

  await db.reports.put(record);
  // Intento de sincronización en segundo plano (si hay red).
  void syncNow().catch(() => {});
  return record;
}

export interface NewWhatsappInput {
  rawText: string;
  reporterPhone: string | null;
  reporterName: string | null;
  lat?: number | null;
  lng?: number | null;
  locationText?: string | null;
}

/**
 * Registra un mensaje "como si" llegara por WhatsApp (canal ciudadano).
 * Lo usa el simulador: guarda local (offline-first) con source 'whatsapp' y
 * sincroniza para que el servidor lo re-clasifique con su IA real.
 */
export async function createWhatsappReport(input: NewWhatsappInput): Promise<LocalReport> {
  const now = new Date().toISOString();
  // Clave estable por teléfono + instante: idempotente y ordenable.
  const clientId = `wa:${input.reporterPhone ?? 'anon'}:${Date.now()}`;
  const { incidentType, priority } = classifyLocal(input.rawText);

  const record: LocalReport = {
    key: clientId,
    serverId: null,
    clientId,
    source: 'whatsapp',
    rawText: input.rawText,
    incidentType,
    priority,
    status: 'nuevo',
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    locationText: input.locationText ?? null,
    peopleAffected: null,
    confidence: 0.4,
    recommendedTeam: null,
    reporterName: input.reporterName,
    reporterPhone: input.reporterPhone,
    photoDataUrl: null,
    duplicateOf: null,
    groupRelationType: null,
    groupScore: null,
    createdAt: now,
    updatedAt: now,
    synced: 0,
  };

  await db.reports.put(record);
  void syncNow().catch(() => {});
  return record;
}

function toSyncItem(r: LocalReport): SyncItem {
  return {
    clientId: r.clientId ?? r.key,
    // Conserva el canal de origen (whatsapp, pwa, …) al subir al servidor.
    source: r.source,
    rawText: r.rawText,
    lat: r.lat,
    lng: r.lng,
    locationText: r.locationText,
    reporterName: r.reporterName,
    reporterPhone: r.reporterPhone,
    // La foto queda solo en el dispositivo (no se sube el binario en la demo).
    photoUrl: null,
    incidentType: r.incidentType,
    priority: r.priority,
    createdAt: r.createdAt,
  };
}

async function upsertFromServer(reports: ServerReport[]): Promise<void> {
  for (const r of reports) {
    const local = serverToLocal(r);
    const existing = await db.reports.get(local.key);
    // Preservar la foto local si el servidor no la tiene.
    if (existing?.photoDataUrl && !local.photoDataUrl) {
      local.photoDataUrl = existing.photoDataUrl;
    }
    await db.reports.put(local);
  }
}

let syncing = false;

export async function syncNow(): Promise<{ pushed: number; pulled: number } | null> {
  if (syncing) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  syncing = true;
  try {
    // 1) PUSH de pendientes
    const pending = await db.reports.where('synced').equals(0).toArray();
    let pushed = 0;
    if (pending.length > 0) {
      const { results } = await api.pushReports(pending.map(toSyncItem));
      for (const { clientId, report } of results) {
        const local = serverToLocal(report);
        const existing = await db.reports.get(clientId);
        if (existing?.photoDataUrl) local.photoDataUrl = existing.photoDataUrl;
        // Mantener la clave original del cliente.
        local.key = clientId;
        await db.reports.put(local);
      }
      pushed = results.length;
    }

    // 2) PULL de novedades
    const since = (await getMeta(LAST_SYNC_KEY)) ?? undefined;
    const { now, reports } = await api.pullReports(since);

    // Actualizar locales con datos frescos del servidor
    const serverIds = new Set<string>();
    for (const r of reports) {
      if (r.client_id) serverIds.add(r.client_id);
    }
    await upsertFromServer(reports);

    // 3) RECONCILE: borrar locales que ya estaban sincronizados pero que
    //    el servidor ya no tiene (p. ej. después de un reset de la DB).
    //    Solo se hace si el `since` viene indefinido (primera sincronización
    //    o limpieza de meta), lo que garantiza que el PULL devolvió TODOS
    //    los reportes del servidor.
    if (!since) {
      const localSynced = await db.reports.where('synced').equals(1).toArray();
      for (const local of localSynced) {
        if (local.clientId && !serverIds.has(local.clientId)) {
          await db.reports.delete(local.key);
        }
      }
    }

    await setMeta(LAST_SYNC_KEY, now);

    return { pushed, pulled: reports.length };
  } finally {
    syncing = false;
  }
}

/** Registra listeners para sincronizar al recuperar conexión. */
export function startAutoSync(): () => void {
  const handler = () => void syncNow().catch(() => {});
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handler);
    const interval = window.setInterval(handler, 30_000);
    handler();
    return () => {
      window.removeEventListener('online', handler);
      window.clearInterval(interval);
    };
  }
  return () => {};
}
