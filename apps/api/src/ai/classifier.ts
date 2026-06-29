import { config, type AiProvider } from '../config';
import type { Classification } from '../types';
import { classifyHeuristic } from './heuristic';
import { classifyOpenai } from './providers/openai';

// ---------------------------------------------------------------------------
// Orquestador de clasificación — agnóstico del proveedor de IA.
// ---------------------------------------------------------------------------
// El orden es:
//   1. Intentar con el proveedor configurado (openai).
//   2. Si falla (red, timeout, auth), loguear y caer a heurística local.
//   3. Si no hay proveedor configurado, usar heurística directamente.
//
// Para agregar un proveedor nuevo:
//   1. Creá apps/api/src/ai/providers/<nombre>.ts exportando una función
//      async (rawText: string) => Classification.
//   2. Agregalo al mapa providerFns abajo.
// ---------------------------------------------------------------------------

/** Mapa proveedor → función clasificadora. Se resuelve una vez al inicio. */
const providerFns: Record<string, (rawText: string) => Promise<Classification>> = {
  openai: classifyOpenai,
};

export async function classify(rawText: string): Promise<Classification> {
  const provider: AiProvider = config.resolvedAiProvider;

  if (provider === 'none') {
    return classifyHeuristic(rawText);
  }

  const fn = providerFns[provider];
  if (!fn) {
    console.warn(`[ai] Proveedor "${provider}" no implementado, usando heurística`);
    return classifyHeuristic(rawText);
  }

  try {
    const result = await fn(rawText);
    return result;
  } catch (err) {
    console.warn(
      `[ai] Proveedor "${provider}" falló (${(err as Error).message}), cayendo a heurística local`,
    );
    return classifyHeuristic(rawText);
  }
}
