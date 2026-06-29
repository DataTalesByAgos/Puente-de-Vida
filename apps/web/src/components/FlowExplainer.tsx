// Explicación visual del flujo y los roles. Server component (sin estado):
// no agrega JavaScript al cliente, en línea con el enfoque liviano.

const STEPS = [
  {
    n: 1,
    icon: '💬',
    actor: 'Ciudadano',
    title: 'Reporta por WhatsApp',
    desc: 'Escribe un mensaje normal: "edificio derrumbado, hay gente atrapada". Sin apps ni cuentas.',
    accent: 'bg-wa/12 text-waInk border-wa/30',
  },
  {
    n: 2,
    icon: '🤖',
    actor: 'Inteligencia Artificial',
    title: 'Estructura y prioriza',
    desc: 'La IA detecta el tipo de incidente, la prioridad, la ubicación y agrupa reportes por zona en eventos en cadena.',
    accent: 'bg-amber/15 text-amberInk border-amber/40',
  },
  {
    n: 3,
    icon: '🧭',
    actor: 'Coordinador',
    title: 'Decide y guía',
    desc: 'Ve todo ordenado por urgencia en el Panel y coordina eventos con el equipo correcto.',
    accent: 'bg-coral/10 text-coralInk border-coral/30',
  },
  {
    n: 4,
    icon: '📱',
    actor: 'Voluntario',
    title: 'Atiende en terreno',
    desc: 'Usa la app aunque no haya señal: todo se guarda y se sincroniza solo al volver Internet.',
    accent: 'bg-sky/12 text-skyInk border-sky/30',
  },
];

export function FlowExplainer() {
  return (
    <section className="card-flat">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-sm font-bold">¿Cómo funciona?</h2>
        <span className="text-xs text-muted">De un mensaje suelto a una decisión rápida</span>
      </div>

      <ol className="grid gap-3 md:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.n} className="relative">
            <div className={`flex h-full flex-col gap-1.5 rounded-xl border p-3 ${s.accent}`}>
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden>
                  {s.icon}
                </span>
                <span className="font-display text-xs font-bold opacity-70">PASO {s.n}</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{s.actor}</p>
              <p className="font-display text-sm font-bold leading-tight text-ink">{s.title}</p>
              <p className="text-xs leading-relaxed text-muted">{s.desc}</p>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 text-lg text-muted md:block"
                aria-hidden
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        <strong className="text-ink">¿Por dónde entran los reportes?</strong> Por los dos lados a la
        vez: el ciudadano escribe por <span className="text-waInk">WhatsApp</span> y el voluntario
        carga desde la <span className="text-skyInk">app</span>. Todo cae en el mismo lugar, se
        ordena por hora de llegada y la IA lo reclasifica por urgencia.
      </p>
    </section>
  );
}
