import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { PRIORITY_LABELS, CATEGORY_LABELS, CATEGORY_ICONS, type LocalNeed } from '@/lib/types';
import { PRIORITY_COLOR } from '@/lib/format';

const MapView = lazy(() => import('@/components/MapView'));

export default function MapaPage() {
  const [session, setSession] = useState(() => sessionStorage.getItem('admin_role'));
  useEffect(() => {
    const handler = () => setSession(sessionStorage.getItem('admin_role'));
    window.addEventListener('admin-auth-change', handler);
    return () => window.removeEventListener('admin-auth-change', handler);
  }, []);

  // Needs with location
  const needs = useLiveQuery(async () => {
    const arr = await db.needs.toArray();
    return arr.filter((n) => n.lat != null && n.lng != null);
  }, [] as LocalNeed[]);

  const needPoints = useMemo(() => needs ?? [], [needs]);

  // Legacy reports with location
  const [showLegacy, setShowLegacy] = useState(false);

  if (!session) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-10 text-center shadow-card">
        <h2 className="font-display text-lg font-bold">Acceso restringido</h2>
        <p className="max-w-md text-sm text-muted">
          Iniciá sesión para ver el mapa de necesidades.
        </p>
        <Link to="/admin" className="btn-primary text-sm">
          Entrar →
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-bold">Mapa de necesidades</h1>
          <p className="text-sm text-muted">Necesidades con ubicación, coloreadas por prioridad.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip border border-line bg-surface text-muted">
            {needPoints.length} necesidades ubicadas
          </span>
          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showLegacy}
              onChange={(e) => setShowLegacy(e.target.checked)}
              className="rounded border-gray-300"
            />
            Reportes legacy
          </label>
        </div>
      </div>

      <div className="h-[65vh] overflow-hidden rounded-xl border border-line shadow-card">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-muted">Cargando mapa…</div>
          }
        >
          <MapView needs={needPoints} />
        </Suspense>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span className="font-medium text-ink">Prioridades:</span>
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

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span className="font-medium text-ink">Categorías:</span>
        {(['profesionales', 'no_profesionales', 'logistica', 'otros'] as const).map((c) => (
          <span key={c} className="flex items-center gap-1">
            <span>{CATEGORY_ICONS[c]}</span>
            <span>{CATEGORY_LABELS[c]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
