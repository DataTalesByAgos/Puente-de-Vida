import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { NeedCard } from '@/components/NeedCard';
import {
  NEED_CATEGORIES,
  CATEGORY_LABELS,
  NEED_STATUS_LABELS,
  PRIORITY_LABELS,
  NEED_SCOPE_LABELS,
  type NeedCategory,
  type LocalNeed,
  type NeedStatus,
  type Priority,
  type NeedScope,
} from '@/lib/types';

const PRIORITIES: Priority[] = ['critica', 'alta', 'media', 'baja'];
const STATUSES: NeedStatus[] = ['abierta', 'en_proceso', 'resuelta', 'cerrada'];
const SCOPES: NeedScope[] = ['micro', 'macro'];

export default function ReportesPage() {
  const [session, setSession] = useState(() => sessionStorage.getItem('admin_role'));
  useEffect(() => {
    const handler = () => setSession(sessionStorage.getItem('admin_role'));
    window.addEventListener('admin-auth-change', handler);
    return () => window.removeEventListener('admin-auth-change', handler);
  }, []);
  const needs = useLiveQuery(async () => db.needs.toArray(), [], [] as LocalNeed[]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<NeedCategory | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [status, setStatus] = useState<NeedStatus | ''>('');
  const [scope, setScope] = useState<NeedScope | ''>('');

  const filtered = useMemo(() => {
    const order = { critica: 0, alta: 1, media: 2, baja: 3 } as const;
    return (needs ?? [])
      .filter((n) => (category ? n.category === category : true))
      .filter((n) => (priority ? n.priority === priority : true))
      .filter((n) => (status ? n.status === status : true))
      .filter((n) => (scope ? n.scope === scope : true))
      .filter((n) =>
        q
          ? n.title.toLowerCase().includes(q.toLowerCase()) ||
            n.description.toLowerCase().includes(q.toLowerCase())
          : true,
      )
      .sort((a, b) => {
        if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [needs, q, category, priority, status, scope]);

  if (!session) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-10 text-center shadow-card">
        <h2 className="font-display text-lg font-bold">Acceso restringido</h2>
        <p className="max-w-md text-sm text-muted">
          Iniciá sesión para ver el listado completo de necesidades.
        </p>
        <Link to="/admin" className="btn-primary text-sm">
          Entrar →
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-lg font-bold">Necesidades ({filtered.length})</h1>
        <p className="text-sm text-muted">
          Todas las necesidades publicadas por ciudadanos, voluntarios y coordinadores. Filtralas
          por categoría, prioridad, estado o alcance.
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <input
          className="input"
          placeholder="Buscar por título o descripción…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as NeedCategory | '')}
          >
            <option value="">Todas las categorías</option>
            {NEED_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
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
            onChange={(e) => setStatus(e.target.value as NeedStatus | '')}
          >
            <option value="">Todo estado</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {NEED_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={scope}
            onChange={(e) => setScope(e.target.value as NeedScope | '')}
          >
            <option value="">Todo alcance</option>
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {NEED_SCOPE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="card text-sm text-muted">No hay necesidades que coincidan.</p>
      )}
      {filtered.map((n) => (
        <NeedCard key={n.key} need={n} />
      ))}
    </div>
  );
}
