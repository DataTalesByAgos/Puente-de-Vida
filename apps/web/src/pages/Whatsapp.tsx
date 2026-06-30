import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { api, type WhatsappStatus } from '@/lib/api';
import { buildCitizenReply } from '@/lib/whatsapp';
import { PRIORITY_LABELS, TYPE_ICONS, TYPE_LABELS, type LocalReport } from '@/lib/types';
import { PRIORITY_CHIP, timeShort } from '@/lib/format';

function maskPhone(phone: string | null): string {
  if (!phone) return 'Ciudadano anónimo';
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length < 6) return digits;
  return `${digits.slice(0, 6)} ··· ${digits.slice(-4)}`;
}

function waText(text: string) {
  return text.split('\n').map((line, i) => (
    <span key={i} className="block">
      {line.split('*').map((part, j) =>
        j % 2 === 1 ? (
          <strong key={j} className="font-semibold">
            {part}
          </strong>
        ) : (
          <span key={j}>{part}</span>
        ),
      )}
    </span>
  ));
}

export default function WhatsappPage() {
  const reports = useLiveQuery(() => db.reports.toArray(), [], [] as LocalReport[]);

  const messages = useMemo(
    () =>
      (reports ?? [])
        .filter((r) => r.source === 'whatsapp')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [reports],
  );

  const [status, setStatus] = useState<WhatsappStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    api
      .whatsappStatus()
      .then((s) => alive && setStatus(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const connected = status?.connected ?? false;

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-wa/15 text-2xl">
              💬
            </span>
            <div>
              <h1 className="font-display text-lg font-bold">Canales de entrada</h1>
              <p className="mt-0.5 max-w-2xl text-sm text-muted">
                Mensajes de ciudadanos entrando por WhatsApp, SMS y llamadas. Los reportes se
                procesan y clasifican automáticamente al llegar.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="chip border border-line bg-paper text-muted">
              {messages.length} mensajes
            </span>
            <span
              className={`chip ${
                connected
                  ? 'border border-wa/40 bg-wa/15 text-waInk'
                  : 'border border-amber/50 bg-amber/20 text-amberInk'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-wa' : 'bg-amber'}`} />
              {status?.label ?? 'Modo demo'}
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Chat en vivo */}
        <section className="w-full shrink-0 lg:w-[420px]">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {/* Header del chat */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-coral/90 to-coral px-4 py-3 text-white">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-lg">
                🛟
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Puente de Vida</p>
                <p className="text-[0.65rem] text-white/70">
                  bot de coordinación ·{' '}
                  {messages.length > 0 ? 'conversación activa' : 'esperando mensajes'}
                </p>
              </div>
            </div>

            {/* Conversación */}
            <div
              ref={scrollRef}
              className="flex h-[480px] flex-col gap-2 overflow-y-auto bg-paper p-3"
            >
              {messages.length === 0 && (
                <div className="m-auto max-w-[260px] rounded-xl bg-surface px-3 py-2 text-center text-xs text-muted shadow-card">
                  No hay mensajes todavía. Los mensajes aparecen acá automáticamente a medida que
                  llegan.
                </div>
              )}

              {messages.map((r) => (
                <div key={r.key} className="flex flex-col gap-1.5">
                  {/* Mensaje del ciudadano */}
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-wa/15 px-3 py-2 text-sm text-ink shadow-sm">
                    <p className="leading-snug">{r.rawText}</p>
                    <span className="mt-0.5 flex items-center justify-end gap-2 text-[0.6rem] text-muted">
                      <span>{maskPhone(r.reporterPhone)}</span>
                      <span>·</span>
                      <span>{timeShort(r.createdAt)}</span>
                    </span>
                  </div>

                  {/* Respuesta del bot */}
                  <div className="mr-auto max-w-[88%] rounded-2xl rounded-bl-sm bg-surface px-3 py-2 text-sm text-ink shadow-sm">
                    {waText(buildCitizenReply(r))}
                    <span className="mt-1 block text-right text-[0.6rem] text-muted">
                      asistente · {timeShort(r.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer del chat - solo informativo */}
            <div className="border-t border-line bg-paper px-4 py-2.5 text-center text-[0.6rem] text-muted">
              Conversación simulada con datos reales · los mensajes se sincronizan automáticamente
            </div>
          </div>
        </section>

        {/* Bandeja del coordinador */}
        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="card-flat flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <div>
                <h2 className="font-display text-sm font-bold">Bandeja de coordinación</h2>
                <p className="text-xs text-muted">Reportes clasificados entrando en vivo.</p>
              </div>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-medium text-ink">Esperando reportes…</p>
              <p className="max-w-md text-xs text-muted">
                Los mensajes de ciudadanos aparecen acá clasificados automáticamente.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto">
              {[...messages].reverse().map((r) => (
                <CoordinatorRow key={r.key} r={r} />
              ))}
            </div>
          )}

          <p className="card-flat text-xs text-muted">
            En el{' '}
            <Link to="/" className="text-coralInk underline">
              Panel del coordinador
            </Link>{' '}
            los reportes se ordenan por urgencia (críticos primero).
          </p>
        </section>
      </div>
    </div>
  );
}

function CoordinatorRow({ r }: { r: LocalReport }) {
  const critical = r.priority === 'critica';
  return (
    <article
      className={`card flex items-start gap-3 ${critical ? 'border-l-4 border-l-coral' : ''}`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper text-xl">
        {TYPE_ICONS[r.incidentType]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-display text-sm font-bold">{TYPE_LABELS[r.incidentType]}</span>
          <span className={`chip ${PRIORITY_CHIP[r.priority]}`}>{PRIORITY_LABELS[r.priority]}</span>
          {r.duplicateOf && (
            <span className="chip border border-amber/50 bg-amber/20 text-amberInk">
              {r.groupRelationType === 'mismo_suceso' ? 'mismo suceso' : 'en cadena'}
            </span>
          )}
          <span className="ml-auto text-xs text-muted">{timeShort(r.createdAt)}</span>
        </div>
        <p className="mt-1 truncate text-xs text-muted">"{r.rawText}"</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="chip border border-wa/40 bg-wa/15 text-waInk">💬 WhatsApp</span>
          {r.peopleAffected != null && <span>👥 {r.peopleAffected}</span>}
          {r.recommendedTeam && <span>🚩 {r.recommendedTeam}</span>}
          {r.locationText && <span>📍 {r.locationText}</span>}
          {r.reporterName && <span>👤 {r.reporterName}</span>}
          <span className="chip border border-line bg-paper">
            🤖 {Math.round(r.confidence * 100)}%
          </span>
          {r.synced === 0 && (
            <span className="chip border border-amber/50 bg-amber/20 text-amberInk">sin subir</span>
          )}
        </div>
      </div>
    </article>
  );
}
