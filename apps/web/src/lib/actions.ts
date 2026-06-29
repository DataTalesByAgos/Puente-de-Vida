import { db } from './db';
import { api } from './api';
import type { LocalReport, Status } from './types';

// Acciones sobre reportes que combinan estado local + servidor.

export async function advanceStatus(report: LocalReport, next: Status): Promise<void> {
  await db.reports.update(report.key, {
    status: next,
    updatedAt: new Date().toISOString(),
  });
  if (report.serverId && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      await api.updateReport(report.serverId, { status: next });
    } catch {
      // Quedará reflejado localmente; el coordinador puede reintentar.
    }
  }
}
