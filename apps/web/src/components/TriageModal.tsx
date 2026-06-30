import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  INCIDENT_TYPES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  TYPE_ICONS,
  type IncidentType,
  type LocalReport,
  type Priority,
  type Status,
} from '@/lib/types';
import { advanceStatus } from '@/lib/actions';

interface Props {
  report: LocalReport;
  next: Status;
  onClose: () => void;
}

const STATUS_EXPLANATION: Record<string, string> = {
  triage:
    'Evaluar el reporte: verificar tipo de incidente, prioridad, ubicación y asignar equipo responsable.',
  en_proceso:
    'El equipo ya está trabajando en la emergencia. Confirmar que se ha asignado personal y recursos.',
  resuelto: 'Marcar como resuelto solo si la emergencia fue atendida completamente.',
};

export function TriageModal({ report, next, onClose }: Props) {
  const [incidentType, setIncidentType] = useState<IncidentType>(report.incidentType);
  const [priority, setPriority] = useState<Priority>(report.priority);
  const [team, setTeam] = useState(report.recommendedTeam ?? '');
  const [notes, setNotes] = useState('');

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
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber/20 text-lg">
            🏥
          </span>
          <div>
            <h2 className="font-display text-base font-bold">
              Clasificar como: {STATUS_LABELS[next]}
            </h2>
            <p className="text-xs text-muted mt-0.5">{STATUS_EXPLANATION[next]}</p>
          </div>
        </div>

        <div className="rounded-xl bg-paper p-3 mb-4 text-sm text-ink/80">
          <span className="font-medium">{TYPE_LABELS[report.incidentType]}:</span>{' '}
          {report.rawText.slice(0, 200)}
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Tipo de incidente
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value as IncidentType)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Prioridad
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([p, l]) => (
                <option key={p} value={p}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Equipo responsable
            <input
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="Ej: Brigada Centro, Rescate Sur…"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Notas del operador
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Evaluación, recursos necesarios, observaciones…"
              rows={3}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={async () => {
              const detail: Record<string, unknown> = {
                incident_type: incidentType,
                priority,
                team,
              };
              if (incidentType !== report.incidentType) {
                await db.reports.update(report.key, { incidentType });
              }
              if (priority !== report.priority) {
                await db.reports.update(report.key, { priority });
              }
              if (team) {
                await db.reports.update(report.key, { recommendedTeam: team });
              }
              await advanceStatus(report, next, notes, detail);
              onClose();
            }}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Confirmar: {STATUS_LABELS[next]} →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Import needed for inline update in TriageModal
import { db } from '@/lib/db';
