import { config } from '../config';
import type { IncidentType, Priority } from '../types';

export interface SummaryInput {
  incident_type: IncidentType;
  priority: Priority;
  status: string;
  people_affected: number | null;
  location_text: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  medico: 'emergencias médicas',
  desaparecido: 'personas desaparecidas',
  estructural: 'daños estructurales',
  agua: 'solicitudes de agua',
  alimento: 'solicitudes de alimento',
  incendio: 'incendios',
  rescate: 'rescates',
  refugio: 'necesidades de refugio',
  otro: 'otros reportes',
};

export function buildHeuristicSummary(reports: SummaryInput[]): string {
  if (reports.length === 0) return 'Sin reportes activos en este momento.';

  const byType = new Map<string, number>();
  const byPriority = new Map<string, number>();
  const byLocation = new Map<string, number>();
  let people = 0;
  let unresolved = 0;

  for (const r of reports) {
    byType.set(r.incident_type, (byType.get(r.incident_type) ?? 0) + 1);
    byPriority.set(r.priority, (byPriority.get(r.priority) ?? 0) + 1);
    if (r.people_affected) people += r.people_affected;
    if (r.status !== 'resuelto') unresolved++;
    if (r.location_text) {
      const k = r.location_text.trim();
      byLocation.set(k, (byLocation.get(k) ?? 0) + 1);
    }
  }

  const topTypes = [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, n]) => `${n} ${TYPE_LABEL[t] ?? t}`)
    .join(', ');

  const topZones = [...byLocation.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([z]) => z)
    .join(', ');

  const critical = byPriority.get('critica') ?? 0;
  const high = byPriority.get('alta') ?? 0;

  const parts: string[] = [];
  parts.push(`Hay ${reports.length} reportes registrados (${unresolved} sin resolver).`);
  if (critical || high) {
    parts.push(
      `${critical} de prioridad crítica y ${high} de prioridad alta requieren atención inmediata.`,
    );
  }
  if (topTypes) parts.push(`Predominan: ${topTypes}.`);
  if (people > 0) parts.push(`Personas afectadas estimadas: ${people}.`);
  if (topZones) parts.push(`Zonas más mencionadas: ${topZones}.`);

  return parts.join(' ');
}

export async function generateSummary(
  reports: SummaryInput[],
): Promise<{ text: string; engine: string }> {
  const base = buildHeuristicSummary(reports);
  if (config.resolvedAiProvider === 'none' || reports.length === 0) {
    return { text: base, engine: 'heuristic' };
  }

  try {
    const url = config.aiApiUrl
      ? `${config.aiApiUrl.replace(/\/+$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.aiApiKey ? { Authorization: `Bearer ${config.aiApiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.aiModel,
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content:
              'Eres un analista de coordinación de emergencias. A partir de datos agregados redacta un resumen breve (máx. 5 frases), claro y accionable, en español, para el equipo de coordinación. No inventes datos.',
          },
          {
            role: 'user',
            content: `Resumen base (datos verificados): ${base}\n\nRedacta el parte de situación.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? base;
    return { text: text || base, engine: 'openai' };
  } catch (err) {
    console.warn('[ai] resumen con IA falló:', (err as Error).message);
    return { text: base, engine: 'heuristic' };
  }
}
