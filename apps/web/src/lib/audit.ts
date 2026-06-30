import { db } from './db';
import { api } from './api';
import type { AuditEntry, Status } from './types';

export async function logAudit(
  reportKey: string,
  action: string,
  fromStatus: Status | null,
  toStatus: Status | null,
  notes: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const operator = sessionStorage.getItem('admin_user') ?? 'anonimo';
  await db.audit.add({
    reportKey,
    action,
    fromStatus,
    toStatus,
    operator,
    notes,
    detail,
    createdAt: new Date().toISOString(),
    synced: 0,
  });
}

export async function getAudit(reportKey: string): Promise<AuditEntry[]> {
  return db.audit.where('reportKey').equals(reportKey).sortBy('createdAt');
}

export async function syncAudit(): Promise<void> {
  const pending = await db.audit.where('synced').equals(0).toArray();
  if (pending.length === 0) return;
  const groups = new Map<string, typeof pending>();
  for (const e of pending) {
    const serverKey = e.reportKey.startsWith('srv:') ? e.reportKey.slice(4) : e.reportKey;
    const list = groups.get(serverKey) ?? [];
    list.push(e);
    groups.set(serverKey, list);
  }
  let ok = 0;
  for (const [serverKey, entries] of groups) {
    try {
      await api.postAudit(
        serverKey,
        entries.map((e) => ({
          action: e.action,
          from_status: e.fromStatus,
          to_status: e.toStatus,
          operator: e.operator,
          notes: e.notes,
          detail: e.detail,
          created_at: e.createdAt,
        })),
      );
      for (const e of entries) {
        if (e.id) await db.audit.update(e.id, { synced: 1 });
      }
      ok++;
    } catch {
      // will retry next sync
    }
  }
}
