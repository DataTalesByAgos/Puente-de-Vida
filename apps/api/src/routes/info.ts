import type { FastifyInstance } from 'fastify';
import { query } from '../db';

export async function infoRoutes(app: FastifyInstance): Promise<void> {
  // ── List organizations (public) ────────────────────────────────
  app.get('/api/info/organizations', async () => {
    const orgs = await query(`
      SELECT id, name, description, location, contact_name, contact_phone
      FROM organizations ORDER BY name ASC
    `);
    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      description: o.description,
      location: o.location,
      contact: o.contact_name ? { name: o.contact_name, phone: o.contact_phone } : null,
    }));
  });

  // ── List community centers / shelters (public) ────────────────
  app.get('/api/info/centers', async () => {
    const shelters = await query(`
      SELECT id, name, lat, lng, capacity, occupancy, status, contact
      FROM shelters WHERE status != 'cerrado' ORDER BY name ASC
    `);
    return shelters.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      capacity: s.capacity,
      occupancy: s.occupancy,
      status: s.status,
      contact: s.contact,
    }));
  });

  // ── Get guides / recommendations (public) ──────────────────────
  app.get('/api/info/guides', async () => {
    return [
      {
        id: '1',
        title: '¿Qué hacer ante una emergencia?',
        content:
          'Mantén la calma. Evalúa la situación. Llama a los números de emergencia. Si es seguro, ayuda a otros. Sigue las instrucciones de las autoridades.',
        category: 'general',
      },
      {
        id: '2',
        title: 'Cómo reportar una necesidad',
        content:
          'Describe claramente qué se necesita, cuántas personas están involucradas, la ubicación exacta y si hay menores o personas vulnerables.',
        category: 'general',
      },
      {
        id: '3',
        title: 'Teléfonos de emergencia',
        content:
          'Protección Civil: 911. Bomberos: 911. Cruz Roja: 0212-571-1111. Emergencias médicas: 171.',
        category: 'contactos',
      },
      {
        id: '4',
        title: 'Recomendaciones para voluntarios',
        content:
          'Identifícate claramente. Coordina con el responsable de la zona. No improvises. Reporta siempre tus avances. Respeta la privacidad de las personas.',
        category: 'voluntarios',
      },
      {
        id: '5',
        title: 'Convenios y alianzas',
        content:
          'Puente de Vida colabora con organizaciones humanitarias, cuerpos de rescate y redes comunitarias para maximizar el alcance de la ayuda.',
        category: 'convenios',
      },
    ];
  });
}
