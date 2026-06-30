import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { advanceStatus } from '@/lib/actions';
import { useApp } from '@/components/AppProvider';
import { ReportCard } from '@/components/ReportCard';
import { FlowExplainer } from '@/components/FlowExplainer';
import {
  PRIORITY_LABELS,
  SOURCE_META,
  TYPE_ICONS,
  TYPE_LABELS,
  type IncidentType,
  type LocalReport,
} from '@/lib/types';
import { PRIORITY_CHIP, PRIORITY_DOT, timeAgo } from '@/lib/format';
import { completenessLevel, COMPLETENESS_LABELS, type CompletenessLevel } from '@/lib/completeness';

function ReportModal({
  report,
  onClose,
  modalRef,
}: {
  report: LocalReport;
  onClose: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
}) {
  const channel = SOURCE_META[report.source];
  const critical = report.priority === 'critica';

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

        <p className="mt-4 rounded-xl bg-paper p-3 text-sm leading-relaxed text-ink/90">
          {report.rawText}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
          {report.locationText && <span>📍 {report.locationText}</span>}
          {report.peopleAffected != null && <span>👥 {report.peopleAffected} afectados</span>}
          {report.recommendedTeam && <span>🚩 {report.recommendedTeam}</span>}
          {report.reporterPhone && <span>📞 {report.reporterPhone}</span>}
          {report.reporterName && <span>👤 {report.reporterName}</span>}
          {report.groupScore != null && report.groupScore > 0 && (
            <span className="font-semibold text-skyInk">🔥 Score de zona: {report.groupScore}</span>
          )}
        </div>

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
  const reports = useLiveQuery(() => db.reports.toArray(), [], [] as LocalReport[]);

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

  const [selectedReport, setSelectedReport] = useState<LocalReport | null>(null);
  const [compTab, setCompTab] = useState<CompletenessLevel | 'todos'>('todos');
  const [typeFilter, setTypeFilter] = useState<IncidentType | null>(null);

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

  const filteredFeed = useMemo(() => {
    let f = feed;
    if (compTab !== 'todos') f = f.filter((r) => completenessLevel(r) === compTab);
    if (typeFilter) f = f.filter((r) => r.incidentType === typeFilter);
    return f;
  }, [feed, compTab, typeFilter]);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedReport) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReport(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedReport]);

  useEffect(() => {
    if (!online) return;
    void triggerSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return (
    <div className="flex flex-col gap-5">
      {/* Hero / portada */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <img src="/brand/v-mark.svg" alt="" className="h-12 w-12" />
            <div>
              <h1 className="font-display text-xl font-black tracking-tight sm:text-2xl">
                Centro de Coordinación
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Reúne reportes de WhatsApp, llamadas y voluntarios en un solo lugar, ordenados por
                urgencia.{' '}
                <strong className="text-ink">
                  Ningún reporte se pierde aunque se caiga Internet.
                </strong>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link to="/whatsapp" className="btn-ghost text-sm">
              💬 Ver WhatsApp
            </Link>
            <Link to="/reportar" className="btn-primary text-sm">
              ➕ Reportar
            </Link>
          </div>
        </div>
      </section>

      <FlowExplainer />

      {/* KPIs del coordinador */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Activos" value={stats.activeCount} tone="ink" />
        <Kpi label="Críticos" value={stats.criticalCount} tone="coral" />
        <Kpi label="Personas afectadas" value={stats.people} tone="amber" />
        <Kpi label="Desde WhatsApp" value={stats.fromWhatsapp} tone="sky" />
      </section>

      {/* Por tipo */}
      <section className="card">
        <h2 className="mb-3 font-display text-sm font-bold">Por tipo de incidente</h2>
        <div className="flex flex-wrap gap-2">
          {stats.byType.length === 0 && <p className="text-sm text-muted">Sin datos todavía.</p>}
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

      {/* Feed de incidentes activos */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">
            Incidentes activos{' '}
            <span className="text-muted">
              ({compTab === 'todos' ? feed.length : `${filteredFeed.length} / ${feed.length}`})
            </span>
          </h2>
          <span className="text-xs text-muted">ordenados por urgencia</span>
        </div>

        {/* Mini-tabs por completitud */}
        <div className="flex gap-1.5">
          {(['todos', 'completo', 'semi', 'incompleto'] as const).map((tab) => {
            const count =
              tab === 'todos'
                ? feed.length
                : feed.filter((r) => completenessLevel(r) === tab).length;
            const active = compTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setCompTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'bg-ink text-white shadow-sm'
                    : 'bg-paper text-muted hover:bg-line hover:text-ink'
                }`}
              >
                {tab === 'todos' ? 'Todos' : COMPLETENESS_LABELS[tab]} ({count})
              </button>
            );
          })}
        </div>

        {filteredFeed.length === 0 && (
          <p className="card text-sm text-muted">No hay incidentes activos en este momento.</p>
        )}
        <AnimatePresence mode="popLayout">
          {filteredFeed.map((r) => (
            <ReportCard
              key={r.key}
              report={r}
              onAdvance={advanceStatus}
              onSelect={setSelectedReport}
            />
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

      {/* Modal de detalle */}
      <AnimatePresence>
        {selectedReport && (
          <ReportModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            modalRef={modalRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
