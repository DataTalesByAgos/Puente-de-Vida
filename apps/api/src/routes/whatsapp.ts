import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config';
import { parseAuth, minRole } from '../auth';
import { ingestReport } from '../services/reports';
import { buildAutoReply, getWhatsappStatus, sendWhatsappMessage } from '../services/whatsapp';

// Webhook de WhatsApp. Tolerante a dos formatos:
//  1. Eventos estructurados: { event, data: {...} }
//  2. Webhooks de Meta reenviados: { entry: [{ changes: [{ value }] }] }
//
// Configurar WHATSAPP_WEBHOOK_SECRET en el .env para validar los webhooks
// entrantes via header x-webhook-secret.

interface InboundMessage {
  phone: string | null;
  text: string | null;
  name: string | null;
}

function pick(obj: unknown, ...keys: string[]): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/** Extrae teléfono + texto de cualquiera de los formatos soportados. */
export function extractInbound(body: unknown): InboundMessage[] {
  if (!body || typeof body !== 'object') return [];
  const root = body as Record<string, unknown>;

  // Formato Meta reenviado.
  if (Array.isArray(root.entry)) {
    const out: InboundMessage[] = [];
    for (const entry of root.entry as Record<string, unknown>[]) {
      const changes = (entry.changes as Record<string, unknown>[]) ?? [];
      for (const change of changes) {
        const value = (change.value as Record<string, unknown>) ?? {};
        const contacts = (value.contacts as Record<string, unknown>[]) ?? [];
        const name = pick((contacts[0]?.profile as unknown) ?? null, 'name') ?? null;
        const messages = (value.messages as Record<string, unknown>[]) ?? [];
        for (const m of messages) {
          const textObj = m.text as Record<string, unknown> | undefined;
          out.push({
            phone: pick(m, 'from'),
            text: pick(textObj ?? null, 'body') ?? pick(m, 'body'),
            name,
          });
        }
      }
    }
    return out;
  }

  // Formato estructurado de Kapso.
  const data = (root.data as Record<string, unknown>) ?? root;
  const messageObj = (data.message as Record<string, unknown>) ?? data;
  const textObj = messageObj.text as Record<string, unknown> | undefined;
  const text = pick(messageObj, 'body', 'text', 'content') ?? pick(textObj ?? null, 'body');
  const phone =
    pick(data, 'phone_number', 'from', 'sender', 'wa_id') ??
    pick((data.contact as unknown) ?? null, 'wa_id', 'phone');
  const name = pick((data.contact as unknown) ?? null, 'name', 'profile_name');

  if (!text && !phone) return [];
  return [{ phone, text, name }];
}

export async function whatsappRoutes(app: FastifyInstance): Promise<void> {
  // Verificación estilo Meta (GET hub.challenge).
  app.get('/api/whatsapp/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    const q = req.query as Record<string, string>;
    if (q['hub.mode'] === 'subscribe') {
      if (!config.whatsappWebhookSecret || q['hub.verify_token'] === config.whatsappWebhookSecret) {
        return reply.status(200).send(q['hub.challenge'] ?? 'ok');
      }
      return reply.status(403).send('forbidden');
    }
    return reply.send({ status: 'ok' });
  });

  app.post('/api/whatsapp/webhook', async (req, reply) => {
    // Validación opcional de secreto compartido.
    if (config.whatsappWebhookSecret) {
      const provided = (req.headers['x-webhook-secret'] as string) ?? '';
      if (provided !== config.whatsappWebhookSecret) {
        return reply.status(401).send({ error: 'unauthorized' });
      }
    }

    const inbound = extractInbound(req.body);
    const created: string[] = [];

    for (const msg of inbound) {
      if (!msg.text) continue;
      const report = await ingestReport({
        clientId: msg.phone ? `wa:${msg.phone}:${Date.now()}` : null,
        source: 'whatsapp',
        rawText: msg.text,
        reporterName: msg.name,
        reporterPhone: msg.phone,
      });
      created.push(report.id);

      // Acuse de recibo automático al ciudadano (best-effort, no bloquea).
      if (config.whatsappAutoReply && msg.phone) {
        void sendWhatsappMessage(msg.phone, buildAutoReply(report)).catch((err) =>
          req.log.warn({ err }, 'no se pudo enviar la auto-respuesta de WhatsApp'),
        );
      }
    }

    return reply.send({ received: inbound.length, created });
  });

  // Estado del canal: "demo emulado" o "conectado a un proveedor real".
  // Lo usa la UI del simulador para mostrar el contexto al usuario.
  app.get('/api/whatsapp/status', async (req, reply) => {
    const s = parseAuth(req);
    if (!s) return reply.status(401).send({ error: 'Se requiere autenticación' });
    return getWhatsappStatus();
  });

  // Simulador: ingresa un mensaje "como si" llegara por WhatsApp y devuelve la
  // respuesta automática del bot. Permite probar todo el flujo (incluida la IA
  // real del servidor) sin contratar ningún proveedor. No envía nada externo.
  app.post('/api/whatsapp/simulate', async (req, reply) => {
    const s = parseAuth(req);
    if (!s || !minRole(s.role, 'operator'))
      return reply.status(403).send({ error: 'No autorizado' });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : null;
    const name = typeof body.name === 'string' ? body.name.trim() : null;
    const lat = typeof body.lat === 'number' ? body.lat : null;
    const lng = typeof body.lng === 'number' ? body.lng : null;

    if (text.length < 2) {
      return reply.status(400).send({ error: 'El mensaje es demasiado corto.' });
    }

    const report = await ingestReport({
      clientId: phone ? `wa:${phone}:${Date.now()}` : null,
      source: 'whatsapp',
      rawText: text,
      reporterName: name,
      reporterPhone: phone,
      lat,
      lng,
    });

    return reply.send({
      report,
      reply: buildAutoReply(report),
      status: getWhatsappStatus(),
    });
  });
}
