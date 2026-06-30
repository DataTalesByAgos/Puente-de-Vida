import type { IncidentType, LocalReport, Priority } from './types';

// Lógica del "bot" del lado del cliente (offline-first). El simulador la usa
// para responderle al ciudadano sin depender del servidor. Cuando hay un
// proveedor real configurado, esta misma respuesta la envía el backend.

const TYPE_REPLY: Record<IncidentType, string> = {
  medico: 'emergencia médica',
  desaparecido: 'persona desaparecida',
  estructural: 'daño estructural',
  agua: 'necesidad de agua',
  alimento: 'necesidad de alimento',
  incendio: 'incendio',
  rescate: 'rescate',
  refugio: 'necesidad de refugio',
  otro: 'reporte',
};

const PRIORITY_REPLY: Record<Priority, string> = {
  critica: 'CRÍTICA',
  alta: 'alta',
  media: 'media',
  baja: 'baja',
};

/** Acuse de recibo automático que ve el ciudadano en el chat. */
export function buildCitizenReply(report: LocalReport): string {
  const tipo = TYPE_REPLY[report.incidentType] ?? 'reporte';
  const prioridad = PRIORITY_REPLY[report.priority] ?? 'media';
  const critico =
    report.priority === 'critica'
      ? '\n\n⚠️ Es URGENTE: si hay vidas en peligro inmediato, llamá también a emergencias (171).'
      : '';
  const ubicacion = report.locationText ? `\n\n📍 Recibimos tu ubicación.` : '';
  return (
    `✅ Recibimos tu mensaje. Lo registramos como *${tipo}* con prioridad *${prioridad}* ` +
    `y ya está en el panel de los coordinadores.${ubicacion}${critico}\n\n` +
    `Si podés, compartí tu *ubicación* 📍 y decinos cuántas *personas* están afectadas. ¡Gracias por ayudar! 🙌`
  );
}

// Mensajes de ejemplo para acelerar la demo (un toque y se envía).
export const CITIZEN_SUGGESTIONS: { icon: string; text: string }[] = [
  { icon: '🏚️', text: 'Se derrumbó un edificio en la calle Sucre, hay personas atrapadas.' },
  { icon: '💧', text: 'Necesitamos agua potable, somos varias familias sin agua.' },
  { icon: '🚑', text: 'Hay una persona herida que sangra mucho, manden ambulancia.' },
  { icon: '🔍', text: 'Mi papá está desaparecido desde ayer, tiene 70 años.' },
  { icon: '🔥', text: 'Hay un incendio en una casa, sale mucho humo.' },
  { icon: '⛺', text: 'Perdimos la casa por la inundación, necesitamos refugio.' },
];

// Número de teléfono simulado para el "ciudadano" de la demo.
export function randomDemoPhone(): string {
  const n = Math.floor(1000 + Math.random() * 8999);
  return `+58412555${n}`;
}
