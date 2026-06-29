// Configuración leída desde variables de entorno (sin dependencias extra).

function env(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

export type WhatsappMode = 'mock' | 'generic';

/**
 * Proveedor de IA para clasificación de reportes.
 * - "none": solo heurística local (gratis, sin red, baseline por defecto)
 * - "openai": cualquier API compatible con OpenAI (Chat Completions).
 *             Service con AI_API_URL, AI_API_KEY y AI_MODEL.
 *             Sirve para OpenAI, Ollama, vLLM, Together, Azure, etc.
 *
 * Para agregar un nuevo proveedor:
 *   1. Creá apps/api/src/ai/providers/<nombre>.ts exportando una función
 *      async (rawText: string) => Classification.
 *   2. Agregalo al mapa providerFns en classifier.ts.
 */
export type AiProvider = 'none' | 'openai';

export const config = {
  port: Number(env('API_PORT', '4000')),
  host: env('API_HOST', '0.0.0.0'),
  databaseUrl: env('DATABASE_URL', 'postgres://pdv:pdv_dev_password@localhost:5432/puente_de_vida'),
  corsOrigin: env('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // --- IA / Clasificador (proveedor conmutable) -----------------------------
  // Por defecto "none": solo heurística local, cero costo, cero red.
  // Si se configura AI_PROVIDER=openai, la API llama al modelo externo
  // y cae a heurística si falla la red o el proveedor.
  aiProvider: env('AI_PROVIDER', 'none').toLowerCase() as AiProvider,
  aiApiKey: env('AI_API_KEY', ''),
  aiApiUrl: env('AI_API_URL', ''), // útil para OpenAI-compatible (Ollama, vLLM, etc.)
  aiModel: env('AI_MODEL', 'gpt-4o-mini'), // nombre del modelo (según el proveedor)

  // --- WhatsApp (proveedor conmutable) ---------------------------------
  // Por defecto "mock": plataforma funciona gratis y emulada, sin contratar
  // ningún proveedor externo.
  // Para activar un proveedor real, configurá:
  //   WHATSAPP_API_URL=https://api.tuproveedor.com/v1/messages
  //   WHATSAPP_API_KEY=sk-...
  //   WHATSAPP_PHONE_NUMBER_ID=123456  (opcional, para {phone_id} en la URL)
  //   WHATSAPP_WEBHOOK_SECRET=...      (opcional, para validar webhooks entrantes)
  //   WHATSAPP_AUTO_REPLY=true
  //
  // Compatible con cualquier WhatsApp Business API que acepte POST con
  // Authorization: Bearer. Ejemplos: Kapso, Meta Cloud API, 360dialog, WATI.
  whatsappAutoReply: bool('WHATSAPP_AUTO_REPLY', true),
  whatsappApiUrl: env('WHATSAPP_API_URL', ''),
  whatsappApiKey: env('WHATSAPP_API_KEY', ''),
  whatsappPhoneId: env('WHATSAPP_PHONE_NUMBER_ID', ''),
  whatsappWebhookSecret: env('WHATSAPP_WEBHOOK_SECRET', ''),

  /**
   * Resuelve el proveedor de IA efectivo:
   * - "none" si AI_PROVIDER=none o no hay credenciales
   * - "openai" si AI_PROVIDER=openai y hay AI_API_KEY o AI_API_URL
   */
  get resolvedAiProvider(): AiProvider {
    if (this.aiProvider === 'none') return 'none';
    if (this.aiProvider === 'openai' && (this.aiApiKey || this.aiApiUrl)) return 'openai';
    return 'none';
  },

  /**
   * Modo efectivo de WhatsApp. "generic" si hay WHATSAPP_API_KEY configurada,
   * de lo contrario "mock".
   */
  get whatsappMode(): WhatsappMode {
    if (this.whatsappApiKey) return 'generic';
    return 'mock';
  },
};
