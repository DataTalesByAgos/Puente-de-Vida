import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { decryptReports } from '@/lib/crypto';
import { ReportCard } from '@/components/ReportCard';
import { advanceStatus } from '@/lib/actions';
import {
  INCIDENT_TYPES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  type IncidentType,
  type LocalReport,
  type Priority,
  type Status,
} from '@/lib/types';

const PRIORITIES: Priority[] = ['critica', 'alta', 'media', 'baja'];
const STATUSES: Status[] = ['nuevo', 'triage', 'en_proceso', 'resuelto'];

export default function ReportesPage() {
  const [session, setSession] = useState(() => sessionStorage.getItem('admin_role'));
  useEffect(() => {
    const handler = () => setSession(sessionStorage.getItem('admin_role'));
    window.addEventListener('admin-auth-change', handler);
    return () => window.removeEventListener('admin-auth-change', handler);
  }, []);
  const reports = useLiveQuery(
    async () => decryptReports(await db.reports.toArray()),
    [],
    [] as LocalReport[],
  );
  const [q, setQ] = useState('');
  const [type, setType] = useState<IncidentType | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [status, setStatus] = useState<Status | ''>('');
  const [showDup, setShowDup] = useState(false);

  const filtered = useMemo(() => {
    const order = { critica: 0, alta: 1, media: 2, baja: 3 } as const;
    return (reports ?? [])
      .filter((r) => (showDup ? true : !r.duplicateOf))
      .filter((r) => (type ? r.incidentType === type : true))
      .filter((r) => (priority ? r.priority === priority : true))
      .filter((r) => (status ? r.status === status : true))
      .filter((r) => (q ? r.rawText.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => {
        if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [reports, q, type, priority, status, showDup]);

  const dupCount = (reports ?? []).filter((r) => r.duplicateOf).length;

  if (!session) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-10 text-center shadow-card">
        <h2 className="font-display text-lg font-bold">Acceso restringido</h2>
        <p className="max-w-md text-sm text-muted">
          Iniciá sesión para ver el listado completo de reportes.
        </p>
        <Link to="/admin" className="btn-primary text-sm">
          Entrar →
        </Link>
      </section>
    );
  }

  const role = sessionStorage.getItem('admin_role');
  const canAdvance = role === 'operator' || role === 'admin';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-lg font-bold">Reportes ({filtered.length})</h1>
        <p className="text-sm text-muted">
          Todos los reportes de todos los canales (WhatsApp, app, teléfono y redes). Filtralos y
          actualizá su estado.
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <input
          className="input"
          placeholder="Buscar en el texto…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as IncidentType | '')}
          >
            <option value="">Todos los tipos</option>
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority | '')}
          >
            <option value="">Toda prioridad</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | '')}
          >
            <option value="">Todo estado</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={showDup} onChange={(e) => setShowDup(e.target.checked)} />
          Mostrar reportes agrupados por zona ({dupCount})
        </label>
      </div>

      {filtered.length === 0 && (
        <p className="card text-sm text-muted">No hay reportes que coincidan.</p>
      )}
      {filtered.map((r) => (
        <ReportCard key={r.key} report={r} onAdvance={canAdvance ? advanceStatus : undefined} />
      ))}
    </div>
  );
}
