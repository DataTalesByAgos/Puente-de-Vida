import { lazy, Suspense, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { PRIORITY_LABELS, type LocalReport } from '@/lib/types';
import { PRIORITY_COLOR } from '@/lib/format';

const MapView = lazy(() => import('@/components/MapView'));

export default function MapaPage() {
  const reports = useLiveQuery(() => db.reports.toArray(), [], [] as LocalReport[]);

  const points = useMemo(
    () => (reports ?? []).filter((r) => !r.duplicateOf && r.lat != null && r.lng != null),
    [reports],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-bold">Mapa de incidentes</h1>
          <p className="text-sm text-muted">Incidentes con ubicación, coloreados por prioridad.</p>
        </div>
        <span className="chip border border-line bg-surface text-muted">
          {points.length} ubicados
        </span>
      </div>

      <div className="h-[65vh] overflow-hidden rounded-xl border border-line shadow-card">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-muted">Cargando mapa…</div>
          }
        >
          <MapView reports={points} />
        </Suspense>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {(['critica', 'alta', 'media', 'baja'] as const).map((p) => (
          <span key={p} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: PRIORITY_COLOR[p] }}
            />
            {PRIORITY_LABELS[p]}
          </span>
        ))}
      </div>
    </div>
  );
}
