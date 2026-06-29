import type { IncidentType, Priority } from './types';

// Clasificador ligero en el cliente: da feedback inmediato al voluntario
// incluso sin conexión. El servidor re-clasifica de forma autoritativa al
// sincronizar (puede usar IA).

function norm(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const KW: [IncidentType, string[]][] = [
  ['incendio', ['incendio', 'fuego', 'humo', 'llamas', 'quem']],
  ['rescate', ['atrapad', 'rescat', 'inund', 'corriente', 'aislad']],
  [
    'medico',
    ['herido', 'sangr', 'medic', 'ambulancia', 'infarto', 'embaraz', 'dolor', 'inconsciente'],
  ],
  ['desaparecido', ['desaparec', 'no aparece', 'perdid', 'extravi', 'busco a']],
  ['estructural', ['derrumb', 'colaps', 'grieta', 'edificio', 'escombro']],
  ['agua', ['agua', 'sed', 'deshidrat']],
  ['alimento', ['comida', 'aliment', 'hambre', 'racion']],
  ['refugio', ['refugio', 'albergue', 'evacua', 'sin techo']],
];

const CRIT = [
  'atrapad',
  'no respira',
  'inconsciente',
  'sangr',
  'infarto',
  'grave',
  'urgente',
  'muri',
];
const HIGH = ['herido', 'derrumb', 'incendio', 'desaparec', 'inund', 'embaraz', 'bebe', 'nino'];

export function classifyLocal(text: string): {
  incidentType: IncidentType;
  priority: Priority;
} {
  const t = norm(text);
  let incidentType: IncidentType = 'otro';
  for (const [type, words] of KW) {
    if (words.some((w) => t.includes(w))) {
      incidentType = type;
      break;
    }
  }
  let priority: Priority = 'media';
  if (CRIT.some((w) => t.includes(w))) priority = 'critica';
  else if (HIGH.some((w) => t.includes(w))) priority = 'alta';
  else if (['medico', 'rescate', 'desaparecido', 'estructural'].includes(incidentType))
    priority = 'alta';
  return { incidentType, priority };
}
