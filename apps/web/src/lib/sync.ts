import { db, getMeta, serverToLocal, setMeta } from './db';
import { api, needApi, type SyncItem } from './api';
import { classifyLocal } from './heuristic';
import { syncAudit } from './audit';
import type { LocalNeed, LocalReport, ServerReport, NeedCategory, Priority } from './types';
import { serverNeedToLocal } from './types';

// ── Gestor de sincronización offline-first ──────────────────────────────
// Conviven el modelo legacy (reportes) y el nuevo (necesidades).

const LAST_SYNC_KEY = 'lastSyncAt';

// ── Reportes (legacy) ───────────────────────────────────────────────────

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
  const { incidentType, priority, age } = classifyLocal(input.rawText);

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
    age,
    isMinor: age != null && age < 18,
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

export interface NewWhatsappInput {
  rawText: string;
  reporterPhone: string | null;
  reporterName: string | null;
  lat?: number | null;
  lng?: number | null;
  locationText?: string | null;
}

export async function createWhatsappReport(input: NewWhatsappInput): Promise<LocalReport> {
  const now = new Date().toISOString();
  const clientId = `wa:${input.reporterPhone ?? 'anon'}:${Date.now()}`;
  const { incidentType, priority, age } = classifyLocal(input.rawText);

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
    age,
    isMinor: age != null && age < 18,
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
    source: r.source,
    rawText: r.rawText,
    lat: r.lat,
    lng: r.lng,
    locationText: r.locationText,
    reporterName: r.reporterName,
    reporterPhone: r.reporterPhone,
    photoUrl: null,
    incidentType: r.incidentType,
    priority: r.priority,
    age: r.age,
    createdAt: r.createdAt,
  };
}

async function upsertFromServer(reports: ServerReport[]): Promise<void> {
  for (const r of reports) {
    const local = serverToLocal(r);
    const existing = await db.reports.get(local.key);
    if (existing?.photoDataUrl && !local.photoDataUrl) {
      local.photoDataUrl = existing.photoDataUrl;
    }
    await db.reports.put(local);
  }
}

// ── Necesidades (nuevo modelo) ──────────────────────────────────────────

export interface NewNeedInput {
  title: string;
  description: string;
  category: NeedCategory;
  subcategory?: string | null;
  priority?: Priority;
  scope?: 'micro' | 'macro';
  lat?: number | null;
  lng?: number | null;
  locationText?: string | null;
  peopleRequired?: number | null;
  resourcesNeeded?: string | null;
  photoDataUrl?: string | null;
  source?: string;
}

export async function createLocalNeed(input: NewNeedInput): Promise<LocalNeed> {
  const clientId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `n-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();

  const record: LocalNeed = {
    key: clientId,
    serverId: null,
    clientId,
    title: input.title,
    description: input.description,
    category: input.category,
    subcategory: input.subcategory ?? null,
    priority: input.priority ?? 'media',
    status: 'abierta',
    scope: input.scope ?? 'micro',
    parentId: null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    locationText: input.locationText ?? null,
    organizationId: null,
    orgName: null,
    peopleRequired: input.peopleRequired ?? null,
    resourcesNeeded: input.resourcesNeeded ?? null,
    comments: null,
    createdBy: null,
    createdByRole: null,
    assignedTo: null,
    assignedBy: null,
    assignedAt: null,
    closedBy: null,
    closedAt: null,
    source: (input.source as LocalNeed['source']) ?? 'pwa',
    photoDataUrl: input.photoDataUrl ?? null,
    age: null,
    isMinor: null,
    createdAt: now,
    updatedAt: now,
    synced: 0,
  };

  await db.needs.put(record);
  void syncNow().catch(() => {});
  return record;
}

async function upsertNeedsFromServer(needs: import('@pdv/shared').Need[]): Promise<void> {
  for (const n of needs) {
    const local = serverNeedToLocal(n);
    await db.needs.put(local);
  }
}

// ── Sync combinado ──────────────────────────────────────────────────────

let syncing = false;

export async function syncNow(): Promise<{ pushed: number; pulled: number } | null> {
  if (syncing) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  syncing = true;
  try {
    let pushed = 0;

    // 1) PUSH de reportes pendientes
    const pending = await db.reports.where('synced').equals(0).toArray();
    if (pending.length > 0) {
      const { results } = await api.pushReports(pending.map(toSyncItem));
      for (const { clientId, report } of results) {
        const local = serverToLocal(report);
        const existing = await db.reports.get(clientId);
        if (existing?.photoDataUrl) local.photoDataUrl = existing.photoDataUrl;
        local.key = clientId;
        await db.reports.put(local);
      }
      pushed += results.length;
    }

    // 2) PUSH de necesidades pendientes
    const pendingNeeds = await db.needs.where('synced').equals(0).toArray();
    if (pendingNeeds.length > 0) {
      const pushData = pendingNeeds.map((n) => ({
        clientId: n.clientId ?? n.key,
        title: n.title,
        description: n.description,
        category: n.category,
        subcategory: n.subcategory,
        priority: n.priority,
        scope: n.scope,
        lat: n.lat,
        lng: n.lng,
        locationText: n.locationText,
        peopleRequired: n.peopleRequired,
        resourcesNeeded: n.resourcesNeeded,
        photoUrl: n.photoDataUrl,
        source: n.source,
      }));
      const result = await needApi.pushNeeds(pushData);
      // Mark synced
      for (const n of pendingNeeds) {
        await db.needs.update(n.key, { synced: 1 });
      }
      pushed += result.synced;
    }

    // 3) PULL de novedades (reportes)
    const since = (await getMeta(LAST_SYNC_KEY)) ?? undefined;
    const { now, reports } = await api.pullReports(since);

    const serverIds = new Set<string>();
    for (const r of reports) {
      if (r.client_id) serverIds.add(r.client_id);
    }
    await upsertFromServer(reports);

    if (!since) {
      const localSynced = await db.reports.where('synced').equals(1).toArray();
      for (const local of localSynced) {
        if (local.clientId && !serverIds.has(local.clientId)) {
          await db.reports.delete(local.key);
        }
      }
    }

    // 4) PULL de necesidades
    const needsSince = (await getMeta('lastNeedSyncAt')) ?? undefined;
    const needsResult = await needApi.pullNeeds(needsSince);
    await upsertNeedsFromServer(needsResult.needs);
    await setMeta('lastNeedSyncAt', needsResult.now);

    // 5) Marcar como sincronizados los needs que llegaron del servidor
    if (needsSince) {
      const localNeeds = await db.needs.where('synced').equals(0).toArray();
      for (const ln of localNeeds) {
        const match = needsResult.needs.find(
          (sn: import('@pdv/shared').Need) => sn.client_id === ln.clientId,
        );
        if (match) {
          await db.needs.update(ln.key, { synced: 1 });
        }
      }
    }

    await setMeta(LAST_SYNC_KEY, now);

    // 6) Sync de auditoría
    await syncAudit();

    return { pushed, pulled: reports.length + needsResult.needs.length };
  } finally {
    syncing = false;
  }
}

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
