import type { LocalReport } from './types';

export type CompletenessLevel = 'completo' | 'semi' | 'incompleto';

export const COMPLETENESS_LABELS: Record<CompletenessLevel, string> = {
  completo: 'Completos',
  semi: 'Semi completos',
  incompleto: 'Incompletos',
};

export const COMPLETENESS_SHORT: Record<CompletenessLevel, string> = {
  completo: 'Completo',
  semi: 'Semi completo',
  incompleto: 'Incompleto',
};

export function completenessColor(level: CompletenessLevel): string {
  return (
    {
      completo: 'text-emerald-600',
      semi: 'text-amber-600',
      incompleto: 'text-red-500',
    }[level] ?? 'text-muted'
  );
}

export function completenessBg(level: CompletenessLevel): string {
  return (
    {
      completo: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      semi: 'bg-amber-100 text-amber-800 border-amber-300',
      incompleto: 'bg-red-100 text-red-800 border-red-300',
    }[level] ?? 'bg-paper text-muted border-line'
  );
}

/**
 * Calcula qué tan completo está un reporte en base a los datos disponibles.
 *
 * Puntaje de 0 a 100:
 *  - Ubicación (35 pts): lat+lng O locationText presentes
 *  - Contacto   (35 pts): reporterPhone O reporterName presentes
 *  - Afectados  (15 pts): peopleAffected != null
 *  - Confianza  (15 pts): confidence >= 0.7
 *
 * Luego clasifica en:
 *  - completo   (>= 70)
 *  - semi       (40 – 69)
 *  - incompleto (< 40)
 */
export function completenessLevel(r: LocalReport): CompletenessLevel {
  const score = completenessScore(r);
  if (score >= 70) return 'completo';
  if (score >= 40) return 'semi';
  return 'incompleto';
}

export function completenessScore(r: LocalReport): number {
  let score = 0;

  // Ubicación (35 pts)
  const hasCoords = r.lat != null && r.lng != null;
  const hasLocationText = r.locationText != null && r.locationText.trim().length > 0;
  if (hasCoords || hasLocationText) score += 35;

  // Contacto (35 pts)
  const hasPhone = r.reporterPhone != null && r.reporterPhone.trim().length > 0;
  const hasName = r.reporterName != null && r.reporterName.trim().length > 0;
  if (hasPhone || hasName) score += 35;

  // Personas afectadas (15 pts)
  if (r.peopleAffected != null && r.peopleAffected > 0) score += 15;

  // Confianza en clasificación (15 pts)
  if (r.confidence >= 0.7) score += 15;

  return score;
}
