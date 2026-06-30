'use client';

import { motion } from 'framer-motion';
import {
  PRIORITY_LABELS,
  SOURCE_META,
  STATUS_LABELS,
  TYPE_ICONS,
  TYPE_LABELS,
  type LocalReport,
  type Status,
} from '@/lib/types';
import { PRIORITY_CHIP, timeAgo } from '@/lib/format';
import { completenessLevel, completenessBg, COMPLETENESS_SHORT } from '@/lib/completeness';

const NEXT_STATUS: Record<Status, Status | null> = {
  nuevo: 'triage',
  triage: 'en_proceso',
  en_proceso: 'resuelto',
  resuelto: null,
};

const STATUS_CHIP: Record<Status, string> = {
  nuevo: 'bg-coral/10 text-coralInk border border-coral/30',
  triage: 'bg-amber/20 text-amberInk border border-amber/50',
  en_proceso: 'bg-sky/15 text-skyInk border border-sky/40',
  resuelto: 'bg-wa/15 text-waInk border border-wa/40',
};

export function ReportCard({
  report,
  onAdvance,
  onSelect,
}: {
  report: LocalReport;
  onAdvance?: (r: LocalReport, next: Status) => void;
  onSelect?: (r: LocalReport) => void;
}) {
  const next = NEXT_STATUS[report.status];
  const channel = SOURCE_META[report.source];
  const critical = report.priority === 'critica';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
      transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.5 }}
      className={`card flex flex-col gap-2.5 cursor-pointer transition-shadow hover:shadow-md ${critical ? 'border-l-4 border-l-coral' : ''}`}
      onClick={() => onSelect?.(report)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper text-xl"
            aria-hidden
          >
            {TYPE_ICONS[report.incidentType]}
          </span>
          <div>
            <p className="font-display text-sm font-bold">
              {TYPE_LABELS[report.incidentType]}
              <span
                className={`ml-1.5 inline-block rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase leading-none ${completenessBg(completenessLevel(report))}`}
              >
                {COMPLETENESS_SHORT[completenessLevel(report)]}
              </span>
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <span className={`chip ${channel.chip}`}>
                {channel.icon} {channel.label}
              </span>
              <span>· {timeAgo(report.createdAt)}</span>
            </div>
          </div>
        </div>
        <span className={`chip ${PRIORITY_CHIP[report.priority]}`}>
          {PRIORITY_LABELS[report.priority]}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-ink/90">{report.rawText}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {report.locationText && <span>📍 {report.locationText}</span>}
        {report.peopleAffected != null && <span>👥 {report.peopleAffected} afectados</span>}
        {report.recommendedTeam && <span>🚩 {report.recommendedTeam}</span>}
        {report.groupRelationType === 'mismo_suceso' && (
          <span className="chip border border-amber/30 bg-amber/10 text-amberInk font-semibold">
            🤝 Mismo suceso
          </span>
        )}
        {report.groupRelationType === 'en_cadena' && (
          <span className="chip border border-coral/30 bg-coral/10 text-coralInk font-semibold animate-pulse">
            ⛓️ En cadena / Consecuencia
          </span>
        )}
        {report.groupScore != null && report.groupScore > 0 && (
          <span className="chip border border-sky/30 bg-sky/10 text-skyInk font-bold">
            🔥 Score de zona: {report.groupScore}
          </span>
        )}
        <span className="chip border border-line bg-paper text-muted">
          🤖 IA · {Math.round(report.confidence * 100)}%
        </span>
        {report.synced === 0 && (
          <span className="chip border border-amber/50 bg-amber/20 text-amberInk">sin subir</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className={`chip ${STATUS_CHIP[report.status]}`}>{STATUS_LABELS[report.status]}</span>
        {onAdvance && next && (
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => onAdvance(report, next)}>
            Marcar: {STATUS_LABELS[next]} →
          </button>
        )}
      </div>
    </motion.article>
  );
}
