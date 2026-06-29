import { config, type WhatsappMode } from '../config';
import type { IncidentType, Priority, Report } from '../types';

// Capa de "proveedor" de WhatsApp. El resto de la app no sabe ni le importa
// si los mensajes salen por un proveedor real o por el emulador.
//
//  - mock    → no envía nada real (modo demo, gratis).
//  - generic → POST a WHATSAPP_API_URL con Authorization: Bearer.
//
// Compatible con cualquier WhatsApp Business API que acepte el formato
// estándar { messaging_product: 'whatsapp', to, type: 'text', text: { body } }.
// Ejemplos: Kapso, Meta Cloud API, 360dialog, WATI, Twilio, etc.

const TYPE_LABEL: Record<IncidentType, string> = {
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

const PRIORITY_LABEL: Record<Priority, string> = {
  critica: 'CRÍTICA',
  alta: 'alta',
  media: 'media',
  baja: 'baja',
};

/**
 * Respuesta automática que recibe el ciudadano por WhatsApp tras reportar.
 * Confirma la recepción y le devuelve, en lenguaje simple, lo que la IA
 * entendió. Es el "acuse de recibo" que da confianza de que su mensaje llegó.
 */
export function buildAutoReply(report: Report): string {
  const tipo = TYPE_LABEL[report.incident_type] ?? 'reporte';
  const prioridad = PRIORITY_LABEL[report.priority] ?? 'media';
  const equipo = report.recommended_team ? `\n👥 Equipo asignado: ${report.recommended_team}.` : '';
  const critico =
    report.priority === 'critica'
      ? '\n\n⚠️ Detectamos que es URGENTE: si hay vidas en peligro inmediato, llamá también a emergencias (171).'
      : '';

  const ubicacion = report.location_text
    ? `\n📍 Ubicación recibida: ${report.location_text}.`
    : '';

  return (
    `✅ *Puente de Vida* recibió tu mensaje.\n\n` +
    `Lo registramos como *${tipo}* con prioridad *${prioridad}* y ya está en el panel de los coordinadores.${equipo}${ubicacion}${critico}\n\n` +
    `Si podés, compartí tu *ubicación* 📍 y decinos cuántas *personas* están afectadas. ¡Gracias por ayudar! 🙌`
  );
}

export interface SendResult {
  provider: WhatsappMode;
  delivered: boolean; // true solo si un proveedor real confirmó el envío
  simulated: boolean; // true en modo mock (no salió nada real)
  error?: string;
}

/** Envía un texto al ciudadano usando el proveedor configurado. */
export async function sendWhatsappMessage(to: string | null, text: string): Promise<SendResult> {
  const mode = config.whatsappMode;
  if (!to)
    return {
      provider: mode,
      delivered: false,
      simulated: mode === 'mock',
      error: 'sin destinatario',
    };

  if (mode === 'generic') return sendViaGeneric(to, text);

  // Modo emulado: dejamos rastro en el log y seguimos. Nada sale a la red.
  console.log(`[whatsapp:mock] (emulado) → ${to}: ${text.replace(/\n/g, ' ⏎ ')}`);
  return { provider: 'mock', delivered: false, simulated: true };
}

/**
 * Envía vía un proveedor WhatsApp Business API genérico.
 * WHATSAPP_API_URL puede contener {phone_id} que se reemplaza por
 * WHATSAPP_PHONE_NUMBER_ID (útil para Meta Cloud API).
 */
async function sendViaGeneric(to: string, text: string): Promise<SendResult> {
  const url = config.whatsappApiUrl.replace('{phone_id}', config.whatsappPhoneId);
  if (!url) {
    console.warn('[whatsapp:generic] WHATSAPP_API_URL no está configurada');
    return { provider: 'generic', delivered: false, simulated: false, error: 'WHATSAPP_API_URL no configurada' };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whatsappApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/[^\d]/g, ''),
        type: 'text',
        text: { body: text },
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.warn(`[whatsapp:generic] envío falló (${res.status}): ${detail}`);
      return { provider: 'generic', delivered: false, simulated: false, error: `HTTP ${res.status}` };
    }
    return { provider: 'generic', delivered: true, simulated: false };
  } catch (err) {
    console.warn('[whatsapp:generic] error de red:', (err as Error).message);
    return { provider: 'generic', delivered: false, simulated: false, error: (err as Error).message };
  }
}

export interface WhatsappStatus {
  mode: WhatsappMode;
  connected: boolean; // true si hay un proveedor real activo
  autoReply: boolean;
  label: string; // texto amigable para la UI
  description: string;
}

/** Estado del canal, para que la UI muestre "Demo emulado" o "Conectado". */
export function getWhatsappStatus(): WhatsappStatus {
  const mode = config.whatsappMode;
  const autoReply = config.whatsappAutoReply;
  if (mode === 'generic') {
    return {
      mode,
      connected: true,
      autoReply,
      label: 'Conectado a proveedor WhatsApp (API Business)',
      description: 'Los mensajes reales de WhatsApp entran por el webhook y el bot responde solo.',
    };
  }
  return {
    mode: 'mock',
    connected: false,
    autoReply,
    label: 'Modo demo (WhatsApp emulado)',
    description:
      'Sin costo: el simulador imita el flujo real. Para activar WhatsApp real, configurá WHATSAPP_API_URL y WHATSAPP_API_KEY en las variables de entorno.',
  };
}
