import { pool, query, waitForDb } from './db';
import { runMigrations } from './migrate';
import { ingestReport } from './services/reports';

// Datos de ejemplo para la demo. Coordenadas alrededor de Caracas, Venezuela.

const SAMPLE_REPORTS: {
  text: string;
  source: 'whatsapp' | 'pwa' | 'telefono' | 'redes';
  lat?: number;
  lng?: number;
  phone?: string;
}[] = [
  {
    text: 'Se derrumbó un edificio en la calle Sucre, hay 3 personas atrapadas bajo los escombros, vengan rápido por favor',
    source: 'whatsapp',
    lat: 10.5061,
    lng: -66.9146,
    phone: '+584120000001',
  },
  {
    text: 'Mi papá está desaparecido desde ayer en el sector Petare, tiene 70 años y problemas de memoria',
    source: 'whatsapp',
    lat: 10.4806,
    lng: -66.8089,
    phone: '+584120000002',
  },
  {
    text: 'Necesitamos agua potable urgente, somos como 20 familias sin agua en la urbanización El Valle',
    source: 'pwa',
    lat: 10.4501,
    lng: -66.9201,
  },
  {
    text: 'Hay una señora embarazada con dolores fuertes, necesita ambulancia en avenida Bolívar',
    source: 'telefono',
    lat: 10.5021,
    lng: -66.9036,
  },
  {
    text: 'Incendio en una casa del barrio La Vega, sale mucho humo y fuego',
    source: 'whatsapp',
    lat: 10.4789,
    lng: -66.9412,
    phone: '+584120000003',
  },
  {
    text: 'Edificio derrumbado calle Sucre, varias personas atrapadas, urgente ayuda',
    source: 'redes',
    lat: 10.5063,
    lng: -66.9149,
  },
  {
    text: 'Buenas, quería ofrecer mi camioneta para ayudar a transportar insumos',
    source: 'whatsapp',
    phone: '+584120000004',
  },
  {
    text: 'Familia con niños necesita refugio, perdimos la casa por la inundación, estamos en la av principal de Antímano',
    source: 'pwa',
    lat: 10.461,
    lng: -66.972,
  },
];

async function seed() {
  const existing = await query<{ count: string }>('SELECT count(*)::text AS count FROM reports');
  if (Number(existing[0]?.count ?? '0') > 0) {
    console.log('[seed] Ya hay datos, omito la carga.');
    return;
  }

  for (const r of SAMPLE_REPORTS) {
    await ingestReport({
      source: r.source,
      rawText: r.text,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      reporterPhone: r.phone ?? null,
    });
  }

  await pool.query(
    `INSERT INTO shelters (name, lat, lng, capacity, occupancy, status, contact) VALUES
      ('Refugio Escuela Bolívar', 10.4925, -66.8790, 120, 64, 'abierto', '+584120000010'),
      ('Refugio Polideportivo El Valle', 10.4495, -66.9215, 200, 180, 'abierto', '+584120000011'),
      ('Refugio Iglesia La Vega', 10.4801, -66.9405, 80, 80, 'lleno', '+584120000012')`,
  );

  await pool.query(
    `INSERT INTO volunteers (name, phone, role, status, lat, lng) VALUES
      ('María Pérez', '+584120000020', 'medico', 'activo', 10.5010, -66.9040),
      ('José Rodríguez', '+584120000021', 'rescate', 'activo', 10.5062, -66.9147),
      ('Ana Gómez', '+584120000022', 'logistica', 'activo', 10.4500, -66.9200),
      ('Luis Martínez', '+584120000023', 'general', 'inactivo', NULL, NULL)`,
  );

  await pool.query(
    `INSERT INTO supplies (name, category, quantity, unit) VALUES
      ('Agua potable', 'agua', 1200, 'litros'),
      ('Kits médicos', 'medico', 45, 'kits'),
      ('Frazadas', 'refugio', 300, 'u'),
      ('Raciones de comida', 'alimento', 850, 'raciones')`,
  );

  console.log('[seed] Datos de ejemplo cargados.');
}

if (require.main === module) {
  (async () => {
    await waitForDb();
    await runMigrations();
    await seed();
    await pool.end();
  })().catch((err) => {
    console.error('[seed] Error:', err);
    process.exit(1);
  });
}
