'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { createWhatsappReport } from '@/lib/sync';
import { api, type WhatsappStatus } from '@/lib/api';
import { buildCitizenReply, CITIZEN_SUGGESTIONS, randomDemoPhone } from '@/lib/whatsapp';
import { PRIORITY_LABELS, TYPE_ICONS, TYPE_LABELS, type LocalReport } from '@/lib/types';
import { PRIORITY_CHIP, timeShort } from '@/lib/format';

// Oculta parte del número por privacidad: +58 412 000 0001 -> +58 412 ··· 0001
function maskPhone(phone: string | null): string {
  if (!phone) return 'Ciudadano anónimo';
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length < 6) return digits;
  return `${digits.slice(0, 6)} ··· ${digits.slice(-4)}`;
}

// Render mínimo del formato de WhatsApp: *negrita* y saltos de línea.
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

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typingKey, setTypingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<WhatsappStatus | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  // Identidad del "ciudadano" de la demo (estable durante la sesión).
  const [phone] = useState(randomDemoPhone);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Estado del proveedor (best-effort: si no hay API, queda como demo).
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

  // Autoscroll al final del chat cuando llega un mensaje.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typingKey]);

  async function send(raw: string) {
    const value = raw.trim();
    if (value.length < 2 || sending) return;
    setSending(true);
    try {
      const loc = location;
      const rec = await createWhatsappReport({
        rawText: value,
        reporterPhone: phone,
        reporterName: null,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        locationText: loc ? `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}` : null,
      });
      setText('');
      // Pequeño "escribiendo…" del bot antes de revelar la respuesta.
      setTypingKey(rec.key);
      window.setTimeout(() => setTypingKey((k) => (k === rec.key ? null : k)), 1100);
    } finally {
      setSending(false);
    }
  }

  function shareLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const connected = status?.connected ?? false;

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado: qué es esto y estado del canal */}
      <section className="card flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-wa/15 text-2xl">
              💬
            </span>
            <div>
              <h1 className="font-display text-lg font-bold">Canal e Integración de WhatsApp</h1>
              <p className="mt-0.5 max-w-2xl text-sm text-muted">
                Reportá una emergencia o necesidad y recibí la respuesta automática del bot de coordinación.
              </p>
            </div>
          </div>
          <span
            className={`chip ${
              connected
                ? 'border border-wa/40 bg-wa/15 text-waInk'
                : 'border border-amber/50 bg-amber/20 text-amberInk'
            }`}
            title={status?.description ?? ''}
          >
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-wa' : 'bg-amber'}`} />
            {status?.label ?? 'Modo demo (WhatsApp emulado)'}
          </span>
        </div>
        {!connected && (
          <p className="rounded-xl border border-line bg-paper px-3 py-2 text-xs text-muted">
            <strong className="text-ink">🧪 Modo simulación</strong> — Los mensajes que enviés acá se procesan con el flujo real de producción (clasificación por IA, deduplicación y base de datos), pero no se envían a WhatsApp.
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* ====== Teléfono del ciudadano ====== */}
        <section className="lg:sticky lg:top-20">
          <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[2rem] border-4 border-ink/80 bg-ink/80 shadow-pop">
            {/* Barra de WhatsApp */}
            <div className="flex items-center gap-3 bg-[#075e54] px-3 py-2.5 text-white">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-lg">
                🛟
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Puente de Vida</p>
                <p className="text-[0.65rem] text-white/70">bot de emergencias · en línea</p>
              </div>
              <span className="text-white/70">⋮</span>
            </div>

            {/* Conversación (wallpaper clásico de WhatsApp) */}
            <div
              ref={scrollRef}
              className="flex h-[420px] flex-col gap-2 overflow-y-auto px-3 py-3"
              style={{
                backgroundColor: '#ece5dd',
                backgroundImage:
                  'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)',
                backgroundSize: '18px 18px',
                backgroundPosition: '0 0, 9px 9px',
              }}
            >
              {messages.length === 0 && (
                <div className="m-auto max-w-[240px] rounded-xl bg-white/80 px-3 py-2 text-center text-xs text-ink/60 shadow-sm">
                  💬 <strong>Consola de Simulación Ciudadana</strong><br/>
                  Ingresá un reporte de emergencia abajo o utilizá las plantillas de prueba para simular la interacción.
                </div>
              )}

              {messages.map((r) => (
                <div key={r.key} className="flex flex-col gap-1.5">
                  {/* Mensaje del ciudadano (saliente, verde claro) */}
                  <div className="ml-auto max-w-[82%] rounded-lg rounded-tr-sm bg-[#dcf8c6] px-2.5 py-1.5 text-sm text-ink shadow-sm">
                    <p className="leading-snug">{r.rawText}</p>
                    <span className="mt-0.5 block text-right text-[0.6rem] text-ink/40">
                      {timeShort(r.createdAt)} ✓✓
                    </span>
                  </div>

                  {/* Respuesta del bot (entrante, blanco) o "escribiendo…" */}
                  {typingKey === r.key ? (
                    <div className="mr-auto flex max-w-[60%] items-center gap-1 rounded-lg rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                      <Dot /> <Dot /> <Dot />
                    </div>
                  ) : (
                    <div className="mr-auto max-w-[85%] rounded-lg rounded-tl-sm bg-white px-2.5 py-1.5 text-sm text-ink shadow-sm">
                      {waText(buildCitizenReply(r))}
                      <span className="mt-0.5 block text-right text-[0.6rem] text-ink/40">
                        {timeShort(r.createdAt)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="bg-[#f0f0f0] p-2">
              {/* Sugerencias rápidas */}
              <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                {CITIZEN_SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    type="button"
                    onClick={() => send(s.text)}
                    disabled={sending}
                    title={s.text}
                    className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink shadow-sm transition hover:bg-paper disabled:opacity-50"
                  >
                    {s.icon} {s.text.split(',')[0].slice(0, 22)}…
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={shareLocation}
                  disabled={locating}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs transition ${
                    location
                      ? 'bg-wa/20 text-waInk'
                      : 'border border-line bg-white text-muted hover:bg-paper'
                  }`}
                  title={location ? 'Ubicación compartida' : 'Compartir ubicación'}
                >
                  {locating ? '⏳' : location ? '📍 ✓' : '📍'}
                </button>
                <form
                  className="flex flex-1 items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(text);
                  }}
                >
                  <textarea
                    className="max-h-24 min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none"
                    rows={1}
                    placeholder="Escribí un mensaje…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void send(text);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sending || text.trim().length < 2}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#075e54] text-lg text-white transition active:scale-95 disabled:opacity-50"
                    aria-label="Enviar"
                  >
                    ➤
                  </button>
                </form>
              </div>
              <p className="mt-1 text-center text-[0.6rem] text-muted">
                Sos {maskPhone(phone)} · este chat es una simulación
              </p>
            </div>
          </div>
        </section>

        {/* ====== Vista del coordinador ====== */}
        <section className="flex flex-col gap-3">
          <div className="card-flat flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-coral/10 text-lg">
                🧭
              </span>
              <div>
                <h2 className="font-display text-sm font-bold">Consola de Recepción en Tiempo Real</h2>
                <p className="text-xs text-muted">
                  Mensajería procesada y estructurada por los modelos de IA para el coordinador de emergencias.
                </p>
              </div>
            </div>
            <span className="chip border border-line bg-paper text-muted">
              {messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'}
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-medium text-ink">Bandeja de entrada vacía.</p>
              <p className="max-w-md text-xs text-muted">
                Simulá un mensaje desde el emulador para ver la estructuración y clasificación automática por IA.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {[...messages].reverse().map((r) => (
                <CoordinatorRow key={r.key} r={r} />
              ))}
            </div>
          )}

          <p className="card-flat text-xs text-muted">
            Estos mismos reportes se <strong className="text-ink">reordenan por urgencia</strong>{' '}
            (los críticos primero) en el{' '}
            <Link href="/" className="text-coralInk underline">
              Panel del coordinador
            </Link>
            , no por hora.
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
        <p className="mt-1 truncate text-xs text-muted">“{r.rawText}”</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="chip border border-wa/40 bg-wa/15 text-waInk">💬 WhatsApp</span>
          {r.peopleAffected != null && <span>👥 {r.peopleAffected}</span>}
          {r.recommendedTeam && <span>🚩 {r.recommendedTeam}</span>}
          {r.locationText && <span>📍 {r.locationText}</span>}
          {r.reporterName && <span>👤 {r.reporterName}</span>}
          <span className="chip border border-line bg-paper">
            🤖 IA · {Math.round(r.confidence * 100)}%
          </span>
          {r.synced === 0 && (
            <span className="chip border border-amber/50 bg-amber/20 text-amberInk">sin subir</span>
          )}
        </div>
      </div>
    </article>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40" />;
}
