import { config } from '../../config';
import {
  INCIDENT_TYPES,
  PRIORITIES,
  type Classification,
  type IncidentType,
  type Priority,
} from '../../types';

// ---------------------------------------------------------------------------
// Clasificador vía API compatible con OpenAI (Chat Completions).
// ---------------------------------------------------------------------------
// Sirve para cualquier modelo o proveedor que implemente el mismo endpoint:
//   - OpenAI (GPT-4o, GPT-4o-mini, etc.)
//   - Ollama (modelos locales como llama3, mistral, etc.)
//   - vLLM, Together AI, Azure OpenAI, etc.
//
// Configuración:
//   AI_PROVIDER=openai
//   AI_API_KEY=sk-...          (opcional para Ollama/local)
//   AI_API_URL=https://api.openai.com/v1  (o http://localhost:11434/v1)
//   AI_MODEL=gpt-4o-mini       (o llama3, mistral, etc.)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un clasificador de reportes de emergencia para una plataforma de coordinación humanitaria en desastres. Recibes el texto crudo de un reporte en español y debes devolver SOLO un objeto JSON válido, sin texto adicional ni markdown.

Esquema exacto:
{
  "incident_type": uno de ${JSON.stringify(INCIDENT_TYPES)},
  "priority": uno de ${JSON.stringify(PRIORITIES)},
  "people_affected": número entero o null (si no se menciona),
  "location_text": string corto con la ubicación mencionada, o null si no hay,
  "confidence": número entre 0 y 1 (qué tan seguro estás),
  "recommended_team": string corto en español con el equipo sugerido
}

Reglas:
- "critica": vida en riesgo inmediato (paro cardíaco, atrapados bajo escombros, no respira, hemorragia grave, infarto).
- "alta": heridos, derrumbes, incendios activos, desaparecidos, inundación con personas atrapadas.
- "media": necesidades importantes sin riesgo vital inmediato (falta de agua, alimentos, refugio).
- "baja": consultas, ofertas de ayuda voluntaria, donaciones, información general.
- No inventes ubicaciones ni coordenadas. Si no hay datos claros de ubicación usa null.
- Responde únicamente el JSON.`;

function coerceType(v: unknown): IncidentType {
  return (INCIDENT_TYPES as readonly string[]).includes(v as string) ? (v as IncidentType) : 'otro';
}
function coercePriority(v: unknown): Priority {
  return (PRIORITIES as readonly string[]).includes(v as string) ? (v as Priority) : 'media';
}

export async function classifyOpenai(rawText: string): Promise<Classification> {
  const baseUrl = config.aiApiUrl || 'https://api.openai.com/v1';
  const model = config.aiModel;

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.aiApiKey ? { Authorization: `Bearer ${config.aiApiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Reporte:\n"""${rawText}"""` },
      ],
      max_tokens: 400,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${detail}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? '{}';
  const jsonText = content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1);
  const parsed = JSON.parse(jsonText) as Record<string, unknown>;

  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.6) || 0.6));

  return {
    incidentType: coerceType(parsed.incident_type),
    priority: coercePriority(parsed.priority),
    peopleAffected: parsed.people_affected == null ? null : Number(parsed.people_affected),
    locationText: typeof parsed.location_text === 'string' ? parsed.location_text : null,
    lat: null,
    lng: null,
    confidence,
    recommendedTeam:
      typeof parsed.recommended_team === 'string'
        ? parsed.recommended_team
        : 'Coordinación General',
    engine: 'openai',
  };
}
