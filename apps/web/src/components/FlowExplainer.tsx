const STEPS = [
  {
    n: 1,
    icon: '💬',
    actor: 'Ciudadano',
    title: 'Reporta por WhatsApp',
    desc: 'Escribe un mensaje normal: "edificio derrumbado, hay gente atrapada". Sin apps ni cuentas.',
  },
  {
    n: 2,
    icon: '🤖',
    actor: 'Bot de IA',
    title: 'Clasifica y estructura',
    desc: 'El bot responde al instante y la IA clasifica el tipo, la prioridad y extrae ubicación.',
  },
  {
    n: 3,
    icon: '🧭',
    actor: 'Coordinador',
    title: 'Prioriza y asigna',
    desc: 'Los reportes se ordenan por urgencia en el panel del coordinador. Un vistazo ve todo.',
  },
  {
    n: 4,
    icon: '🚑',
    actor: 'Voluntario',
    title: 'Responde en terreno',
    desc: 'Los equipos reciben la asignación y actualizan el estado desde su dispositivo, incluso sin Internet.',
  },
];

export function FlowExplainer() {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            className={`relative flex flex-col gap-2 p-4 ${
              i < STEPS.length - 1 ? 'border-b border-line sm:border-b-0 sm:border-r' : ''
            }`}
          >
            <span className="label-mono text-[0.6rem] text-muted">
              {s.n}. {s.actor}
            </span>
            <span className="text-2xl">{s.icon}</span>
            <h3 className="font-display text-sm font-bold">{s.title}</h3>
            <p className="text-xs leading-relaxed text-muted">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
