import { db } from './db';
import { api } from './api';
import { logAudit } from './audit';
import type { LocalReport, Status } from './types';

// Acciones sobre reportes que combinan estado local + servidor.

export async function advanceStatus(
  report: LocalReport,
  next: Status,
  notes = '',
  detail: Record<string, unknown> = {},
): Promise<void> {
  const prev = report.status;
  await db.reports.update(report.key, {
    status: next,
    updatedAt: new Date().toISOString(),
  });
  await logAudit(report.key, 'advance_status', prev, next, notes, detail);
  if (report.serverId && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      await api.updateReport(report.serverId, { status: next });
    } catch {
      // Quedará reflejado localmente; el coordinador puede reintentar.
    }
  }
}
