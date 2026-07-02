import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { api, needApi } from '@/lib/api';
import { decryptReports } from '@/lib/crypto';
import { useApp } from '@/components/AppProvider';
import { ReportCard } from '@/components/ReportCard';
import { NeedCard } from '@/components/NeedCard';
import { FlowExplainer } from '@/components/FlowExplainer';
import {
  PRIORITY_LABELS,
  SOURCE_META,
  STATUS_LABELS,
  TYPE_ICONS,
  TYPE_LABELS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  NEED_STATUS_LABELS,
  NEED_SCOPE_LABELS,
  SUBCATEGORY_LABELS,
  type IncidentType,
  type LocalReport,
  type LocalNeed,
  type NeedCategory,
  type Status,
  type NeedStatus,
} from '@/lib/types';
import { PRIORITY_CHIP, PRIORITY_DOT, CATEGORY_CHIP, SCOPE_CHIP, timeAgo } from '@/lib/format';
import {
  completenessLevel,
  completenessScore,
  completenessBg,
  COMPLETENESS_LABELS,
  COMPLETENESS_SHORT,
  type CompletenessLevel,
} from '@/lib/completeness';
import { getAudit, logAudit } from '@/lib/audit';
import type { AuditEntry } from '@/lib/types';

type DashboardTab = 'necesidades' | 'reportes';

const STATUS_ORDER: Status[] = ['nuevo', 'triage', 'en_proceso', 'resuelto'];
const NEED_STATUS_ORDER: NeedStatus[] = ['abierta', 'en_proceso', 'resuelta', 'cerrada'];

function NeedModal({
  need,
  onClose,
  modalRef,
}: {
  need: LocalNeed;
  onClose: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
}) {
  const critical = need.priority === 'critica';
  const subLabel = need.subcategory
    ? (SUBCATEGORY_LABELS[need.subcategory] ?? need.subcategory)
    : null;
  const role = sessionStorage.getItem('admin_role');
  const canAdvance = role === 'operator' || role === 'admin';
  const [status, setStatus] = useState(need.status);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return;
    setStatus(newStatus as NeedStatus);
    await db.needs.update(need.key, {
      status: newStatus as NeedStatus,
      updatedAt: new Date().toISOString(),
    });
    if (need.serverId && navigator.onLine) {
      try {
        await needApi.updateNeed(need.serverId, { status: newStatus as NeedStatus });
      } catch {
        /* offline */
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl ${critical ? 'ring-2 ring-coral' : ''}`}
      >
        <button
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-paper text-sm text-muted hover:bg-line"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper text-2xl">
            {CATEGORY_ICONS[need.category]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{need.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className={`chip ${PRIORITY_CHIP[need.priority]}`}>
                {PRIORITY_LABELS[need.priority]}
              </span>
              <span className={`chip ${CATEGORY_CHIP[need.category]}`}>
                {CATEGORY_LABELS[need.category]}
              </span>
              {subLabel && <span className="chip border border-line bg-paper">{subLabel}</span>}
              <span className={`chip ${SCOPE_CHIP[need.scope]}`}>
                {NEED_SCOPE_LABELS[need.scope]}
              </span>
              <span>· {timeAgo(need.createdAt)}</span>
            </div>
          </div>
        </div>

        {need.photoDataUrl && (
          <div className="mt-3 overflow-hidden rounded-xl bg-paper">
            <img
              src={need.photoDataUrl}
              alt="Foto de la necesidad"
              className="max-h-56 w-full object-cover"
            />
          </div>
        )}

        <p className="mt-3 rounded-xl bg-paper p-3 text-sm leading-relaxed text-ink/90">
          {need.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
          {need.locationText && <span>📍 {need.locationText}</span>}
          {need.lat != null && need.lng != null && (
            <a
              href={`/mapa?lat=${need.lat}&lng=${need.lng}`}
              className="flex items-center gap-1 text-sky-600 hover:text-sky-800 underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              🗺️ Ver en el mapa
            </a>
          )}
          {need.peopleRequired != null && need.peopleRequired > 0 && (
            <span>👥 {need.peopleRequired} personas requeridas</span>
          )}
          {need.resourcesNeeded && <span>📦 Recursos: {need.resourcesNeeded}</span>}
          {need.orgName && <span>🏛️ {need.orgName}</span>}
          {need.comments && <span>💬 {need.comments}</span>}
        </div>

        {canAdvance && (
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-3">
            <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-600">
              Estado
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              >
                {NEED_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {NEED_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ReportModal({
  report,
  onClose,
  modalRef,
}: {
  report: LocalReport;
  onClose: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
}) {
  const channel = SOURCE_META[report.source] || {
    label: report.source || 'Desconocido',
    icon: '📌',
    chip: 'bg-paper text-muted border border-line',
  };
  const critical = report.priority === 'critica';
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [status, setStatus] = useState(report.status);
  const [assignOrg, setAssignOrg] = useState('');
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const token = sessionStorage.getItem('admin_token');
  const role = sessionStorage.getItem('admin_role');
  const canAssign = role === 'operator' || role === 'admin';
  const score = completenessScore(report);
  const level = completenessLevel(report);
  const levelBg = completenessBg(level);

  useEffect(() => {
    getAudit(report.key).then(setAudit);
    if (canAssign && token) {
      fetch('/api/admin/orgs', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => setOrgs(data))
        .catch(() => {});
    }
  }, [report.key, canAssign, token]);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return;
    setStatus(newStatus as Status);
    await db.reports.update(report.key, {
      status: newStatus as Status,
      updatedAt: new Date().toISOString(),
    });
    await logAudit(report.key, 'advance_status', report.status, newStatus as Status, '', {});
    if (report.serverId && navigator.onLine) {
      try {
        await api.updateReport(report.serverId, { status: newStatus as Status });
      } catch {
        /* offline */
      }
    }
  };

  const handleAssign = async () => {
    if (!assignOrg || !report.serverId || !token) return;
    try {
      await fetch(`/api/admin/reports/${report.serverId}/assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: assignOrg }),
      });
      await db.reports.update(report.key, {
        assignedOrgId: assignOrg,
        assignedOrgStatus: 'asignado',
      });
      await logAudit(report.key, 'assign_org', null, null, `Asignado a org ${assignOrg}`, {});
      setAssignOrg('');
    } catch {
      /* */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl ${critical ? 'ring-2 ring-coral' : ''}`}
      >
        <button
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-paper text-sm text-muted hover:bg-line"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div
          className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${levelBg}`}
        >
          <span>{score}% datos disponibles</span>
          <span>· {COMPLETENESS_SHORT[level]}</span>
        </div>

        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper text-2xl">
            {TYPE_ICONS[report.incidentType]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{TYPE_LABELS[report.incidentType]}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className={`chip ${PRIORITY_CHIP[report.priority]}`}>
                {PRIORITY_LABELS[report.priority]}
              </span>
              <span className={`chip ${channel.chip}`}>
                {channel.icon} {channel.label}
              </span>
              <span>· {timeAgo(report.createdAt)}</span>
            </div>
          </div>
        </div>

        {report.photoDataUrl && (
          <div className="mt-3 overflow-hidden rounded-xl bg-paper">
            <img
              src={report.photoDataUrl}
              alt="Foto del reporte"
              className="max-h-56 w-full object-cover"
            />
          </div>
        )}

        <p className="mt-3 rounded-xl bg-paper p-3 text-sm leading-relaxed text-ink/90">
          {report.rawText}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
          {report.locationText && <span>📍 {report.locationText}</span>}
          {report.lat != null && report.lng != null && (
            <a
              href={`/mapa?lat=${report.lat}&lng=${report.lng}`}
              className="flex items-center gap-1 text-sky-600 hover:text-sky-800 underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              🗺️ Ver en el mapa
            </a>
          )}
          {report.peopleAffected != null && <span>👥 {report.peopleAffected} afectados</span>}
          {report.recommendedTeam && <span>🚩 {report.recommendedTeam}</span>}
          {report.reporterPhone && <span>📞 {report.reporterPhone}</span>}
          {report.reporterName && <span>👤 {report.reporterName}</span>}
          {report.groupScore != null && report.groupScore > 0 && (
            <span className="font-semibold text-skyInk">🔥 Score de zona: {report.groupScore}</span>
          )}
          {report.assignedOrgId && (
            <span className="chip border border-wa/30 bg-wa/10 text-waInk">
              🏛️ Asignado a organización
            </span>
          )}
        </div>

        {canAssign && (
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-3">
            <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-600">
              Estado
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-600">
              Asignar a organización
              <div className="flex gap-1">
                <select
                  value={assignOrg}
                  onChange={(e) => setAssignOrg(e.target.value)}
                  className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">—</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={!assignOrg || !report.serverId}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                  Asignar
                </button>
              </div>
            </label>
          </div>
        )}

        {audit.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">📋 Historial</h3>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {audit.map((e) => (
                <div key={e.id} className="flex items-start gap-2 text-[11px] text-muted">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium shrink-0 whitespace-nowrap">
                    {e.action === 'assign_org'
                      ? '🏛️ Asignado'
                      : `${STATUS_LABELS[e.fromStatus as keyof typeof STATUS_LABELS] ?? '—'} → ${STATUS_LABELS[e.toStatus as keyof typeof STATUS_LABELS] ?? '—'}`}
                  </span>
                  <span className="font-medium text-gray-700 shrink-0">{e.operator}</span>
                  <span className="truncate">{e.notes || '—'}</span>
                  <span className="shrink-0 text-gray-400 ml-auto whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
          <span className="text-xs text-muted">
            IA · confianza {Math.round(report.confidence * 100)}%
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: 'ink' | 'coral' | 'amber' | 'sky';
}) {
  const toneClass = {
    ink: 'text-ink',
    coral: 'text-coralInk',
    amber: 'text-amberInk',
    sky: 'text-skyInk',
  }[tone];
  return (
    <div className="card flex flex-col gap-1">
      <p className="label-mono text-[0.65rem] text-muted">{label}</p>
      <p className={`font-display text-3xl font-black leading-none ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { online, triggerSync } = useApp();
  const [session, setSession] = useState<{ role: string } | null>(() => {
    const r = sessionStorage.getItem('admin_role');
    return r ? { role: r } : null;
  });
  const [tab, setTab] = useState<DashboardTab>('necesidades');

  // Needs
  const needs = useLiveQuery(async () => {
    const arr = await db.needs.toArray();
    return arr.filter((n) => n.status !== 'cerrada');
  }, [] as LocalNeed[]);

  // Reports (legacy)
  const reports = useLiveQuery(
    async () => decryptReports(await db.reports.toArray()),
    [],
    [] as LocalReport[],
  );

  useEffect(() => {
    const handler = () => {
      const r = sessionStorage.getItem('admin_role');
      setSession(r ? { role: r } : null);
    };
    window.addEventListener('admin-auth-change', handler);
    return () => window.removeEventListener('admin-auth-change', handler);
  }, []);

  const canAdvance = session && (session.role === 'operator' || session.role === 'admin');

  // Need stats
  const needStats = useMemo(() => {
    const all = needs ?? [];
    const critical = all.filter(
      (n) => n.priority === 'critica' && n.status !== 'resuelta' && n.status !== 'cerrada',
    );
    const people = all.reduce((s, n) => s + (n.peopleRequired ?? 0), 0);
    const byCategory = new Map<NeedCategory, number>();
    for (const n of all) byCategory.set(n.category, (byCategory.get(n.category) ?? 0) + 1);
    return {
      activeCount: all.filter((n) => n.status !== 'resuelta' && n.status !== 'cerrada').length,
      criticalCount: critical.length,
      people,
      byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [needs]);

  // Report stats (legacy)
  const active = useMemo(
    () => (reports ?? []).filter((r) => !r.duplicateOf && r.status !== 'resuelto'),
    [reports],
  );

  const stats = useMemo(() => {
    const all = (reports ?? []).filter((r) => !r.duplicateOf);
    const critical = all.filter((r) => r.priority === 'critica' && r.status !== 'resuelto');
    const people = all.reduce((s, r) => s + (r.peopleAffected ?? 0), 0);
    const fromWhatsapp = all.filter((r) => r.source === 'whatsapp').length;
    const byType = new Map<IncidentType, number>();
    for (const r of all) byType.set(r.incidentType, (byType.get(r.incidentType) ?? 0) + 1);
    return {
      activeCount: active.length,
      criticalCount: critical.length,
      people,
      fromWhatsapp,
      byType: [...byType.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [reports, active]);

  // ── Need feed ──
  const [selectedNeed, setSelectedNeed] = useState<LocalNeed | null>(null);
  const [selectedReport, setSelectedReport] = useState<LocalReport | null>(null);
  const [needCatFilter, setNeedCatFilter] = useState<NeedCategory | null>(null);

  const needFeed = useMemo(() => {
    const order = { critica: 0, alta: 1, media: 2, baja: 3 } as const;
    let f = [...(needs ?? [])].filter((n) => n.status !== 'cerrada');
    if (needCatFilter) f = f.filter((n) => n.category === needCatFilter);
    return f.sort((a, b) => {
      if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [needs, needCatFilter]);

  // ── Report feed (legacy) ──
  const feed = useMemo(() => {
    const order = { critica: 0, alta: 1, media: 2, baja: 3 } as const;
    return [...active].sort((a, b) => {
      const scoreA = a.groupScore ?? 0;
      const scoreB = b.groupScore ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [active]);

  const [compTab, setCompTab] = useState<CompletenessLevel | 'todos'>('todos');
  const [typeFilter, setTypeFilter] = useState<IncidentType | null>(null);

  const filteredFeed = useMemo(() => {
    let f = feed;
    if (compTab !== 'todos') f = f.filter((r) => completenessLevel(r) === compTab);
    if (typeFilter) f = f.filter((r) => r.incidentType === typeFilter);
    return f;
  }, [feed, compTab, typeFilter]);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedNeed && !selectedReport) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNeed(null);
        setSelectedReport(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNeed, selectedReport]);

  useEffect(() => {
    if (!online) return;
    void triggerSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return (
    <div className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <img src="/brand/v-mark.svg" alt="" className="h-12 w-12" />
            <div>
              <h1 className="font-display text-xl font-black tracking-tight sm:text-2xl">
                Centro de Coordinación
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Gestioná necesidades, coordiná voluntarios y seguí el estado de cada solicitud en
                terreno. <strong className="text-ink">Sin conexión también funciona.</strong>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link to="/whatsapp" className="btn-ghost text-sm">
              💬 Ver WhatsApp
            </Link>
            <Link to="/reportar" className="btn-primary text-sm">
              ➕ Solicitar
            </Link>
          </div>
        </div>
      </section>

      {!session && (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-10 text-center shadow-card">
          <img src="/brand/v-mark.svg" alt="" className="h-16 w-16 opacity-50" />
          <h2 className="font-display text-lg font-bold">Acceso restringido</h2>
          <p className="max-w-md text-sm text-muted">
            El centro de coordinación es solo para personal autorizado. Si sos voluntario o
            coordinador, iniciá sesión con tu cuenta.
          </p>
          <Link to="/admin" className="btn-primary text-sm">
            Entrar →
          </Link>
          <p className="text-xs text-muted">
            ¿No tenés cuenta? También podés{' '}
            <Link to="/reportar" className="font-semibold underline">
              publicar una necesidad
            </Link>{' '}
            como ciudadano.
          </p>
        </section>
      )}

      {session && (
        <>
          <FlowExplainer />

          {/* Tab selector */}
          <div className="flex gap-1 border-b border-line pb-1">
            <button
              onClick={() => setTab('necesidades')}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                tab === 'necesidades'
                  ? 'bg-surface text-ink border-b-2 border-coral'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Necesidades
            </button>
            <button
              onClick={() => setTab('reportes')}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                tab === 'reportes'
                  ? 'bg-surface text-ink border-b-2 border-coral'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Reportes (legacy)
            </button>
          </div>

          {tab === 'necesidades' && (
            <>
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi label="Necesidades activas" value={needStats.activeCount} tone="ink" />
                <Kpi label="Críticas" value={needStats.criticalCount} tone="coral" />
                <Kpi label="Personas requeridas" value={needStats.people} tone="amber" />
                <Kpi label="Categorías" value={needStats.byCategory.length} tone="sky" />
              </section>

              {/* Por categoría */}
              <section className="card">
                <h2 className="mb-3 font-display text-sm font-bold">Por categoría</h2>
                <div className="flex flex-wrap gap-2">
                  {needStats.byCategory.length === 0 && (
                    <p className="text-sm text-muted">Sin datos todavía.</p>
                  )}
                  {needStats.byCategory.map(([cat, n]) => (
                    <button
                      key={cat}
                      onClick={() => setNeedCatFilter(needCatFilter === cat ? null : cat)}
                      className={`chip border transition-all ${
                        needCatFilter === cat
                          ? 'border-ink bg-ink text-white shadow-sm'
                          : 'border-line bg-paper text-ink hover:border-ink/50 hover:bg-line'
                      }`}
                    >
                      {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]} · <strong>{n}</strong>
                    </button>
                  ))}
                  {needCatFilter && (
                    <button
                      onClick={() => setNeedCatFilter(null)}
                      className="chip border border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      ✕ Limpiar filtro
                    </button>
                  )}
                </div>
              </section>

              {/* Feed de necesidades */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold">
                    Necesidades activas <span className="text-muted">({needFeed.length})</span>
                  </h2>
                  <span className="text-xs text-muted">ordenadas por urgencia</span>
                </div>

                {needFeed.length === 0 && (
                  <p className="card text-sm text-muted">
                    No hay necesidades activas en este momento.
                  </p>
                )}
                <AnimatePresence mode="popLayout">
                  {needFeed.map((n) => (
                    <NeedCard key={n.key} need={n} onSelect={setSelectedNeed} />
                  ))}
                </AnimatePresence>
              </section>

              <div className="flex flex-wrap items-center gap-3 pb-2 text-xs text-muted">
                <span className="font-medium text-ink">Prioridades:</span>
                {(['critica', 'alta', 'media', 'baja'] as const).map((p) => (
                  <span key={p} className="flex items-center gap-1.5">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[p]}`} />
                    {PRIORITY_LABELS[p]}
                  </span>
                ))}
              </div>

              <AnimatePresence>
                {selectedNeed && (
                  <NeedModal
                    need={selectedNeed}
                    onClose={() => setSelectedNeed(null)}
                    modalRef={modalRef}
                  />
                )}
              </AnimatePresence>
            </>
          )}

          {tab === 'reportes' && (
            <>
              <FlowExplainer />

              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi label="Activos" value={stats.activeCount} tone="ink" />
                <Kpi label="Críticos" value={stats.criticalCount} tone="coral" />
                <Kpi label="Personas afectadas" value={stats.people} tone="amber" />
                <Kpi label="Desde WhatsApp" value={stats.fromWhatsapp} tone="sky" />
              </section>

              <section className="card">
                <h2 className="mb-3 font-display text-sm font-bold">Por tipo de incidente</h2>
                <div className="flex flex-wrap gap-2">
                  {stats.byType.length === 0 && (
                    <p className="text-sm text-muted">Sin datos todavía.</p>
                  )}
                  {stats.byType.map(([type, n]) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                      className={`chip border transition-all ${
                        typeFilter === type
                          ? 'border-ink bg-ink text-white shadow-sm'
                          : 'border-line bg-paper text-ink hover:border-ink/50 hover:bg-line'
                      }`}
                    >
                      {TYPE_ICONS[type]} {TYPE_LABELS[type]} · <strong>{n}</strong>
                    </button>
                  ))}
                  {typeFilter && (
                    <button
                      onClick={() => setTypeFilter(null)}
                      className="chip border border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      ✕ Limpiar filtro
                    </button>
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold">
                    Incidentes activos{' '}
                    <span className="text-muted">
                      (
                      {compTab === 'todos'
                        ? feed.length
                        : `${filteredFeed.length} / ${feed.length}`}
                      )
                    </span>
                  </h2>
                  <span className="text-xs text-muted">ordenados por urgencia</span>
                </div>

                <div className="flex gap-1.5">
                  {(['todos', 'completo', 'semi', 'incompleto'] as const).map((tab2) => {
                    const count =
                      tab2 === 'todos'
                        ? feed.length
                        : feed.filter((r) => completenessLevel(r) === tab2).length;
                    const active = compTab === tab2;
                    return (
                      <button
                        key={tab2}
                        onClick={() => setCompTab(tab2)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          active
                            ? 'bg-ink text-white shadow-sm'
                            : 'bg-paper text-muted hover:bg-line hover:text-ink'
                        }`}
                      >
                        {tab2 === 'todos' ? 'Todos' : COMPLETENESS_LABELS[tab2]} ({count})
                      </button>
                    );
                  })}
                </div>

                {filteredFeed.length === 0 && (
                  <p className="card text-sm text-muted">
                    No hay incidentes activos en este momento.
                  </p>
                )}
                <AnimatePresence mode="popLayout">
                  {filteredFeed.map((r) => (
                    <ReportCard
                      key={r.key}
                      report={r}
                      onAdvance={canAdvance ? () => {} : undefined}
                      onSelect={setSelectedReport}
                    />
                  ))}
                </AnimatePresence>
              </section>

              <AnimatePresence>
                {selectedReport && (
                  <ReportModal
                    report={selectedReport}
                    onClose={() => setSelectedReport(null)}
                    modalRef={modalRef}
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </>
      )}
    </div>
  );
}
