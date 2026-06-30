/* eslint-disable no-console */
import { config } from './config';

// ---------------------------------------------------------------------------
// Simulador de carga masiva de WhatsApp (comando ejecutable, ideal para grabar)
// ---------------------------------------------------------------------------
//
// Dispara una "avalancha" de mensajes ciudadanos contra el endpoint REAL
//   POST /api/whatsapp/simulate
// que ejecuta TODO el flujo de producción: clasificación con IA (Claude o la
// heurística local), detección de duplicados e inserción en PostgreSQL.
//
// Sirve para dos cosas a la vez:
//   1. DEMO grabable: se ve en vivo cómo van llegando los reportes y cómo la
//      IA los clasifica (tipo, prioridad, equipo, confianza) en tiempo real.
//   2. PRUEBA DE RENDIMIENTO: mide latencia (p50/p95/p99), throughput y errores
//      bajo carga concurrente, para detectar dónde el código deja de ser fluido.
//
// Uso (con la API levantada en :4000):
//   npm run sim -w @pdv/api                 # 200 mensajes, 8 en paralelo
//   npm run sim -w @pdv/api -- -n 500 -c 16 # 500 mensajes, 16 en paralelo
//   npm run sim -w @pdv/api -- --rate 30    # limitar a 30 msg/s (ráfaga realista)
//   API_URL=http://localhost:4000 npm run sim -w @pdv/api
//
// No envía nada a WhatsApp real: usa el simulador del backend (modo demo).

// ----- Colores ANSI (sin dependencias) -------------------------------------

interface Args {
  total: number;
  concurrency: number;
  rate: number; // msg/s, 0 = sin límite
  url: string;
  seed: number;
  dupRate: number; // 0..1, proporción de reportes duplicados del mismo evento
  quiet: boolean;
  color: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (long: string, short?: string): string | undefined => {
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === `--${long}` || (short && a === `-${short}`)) return argv[i + 1];
      if (a.startsWith(`--${long}=`)) return a.slice(long.length + 3);
    }
    return undefined;
  };
  const has = (long: string, short?: string): boolean =>
    argv.includes(`--${long}`) || (short ? argv.includes(`-${short}`) : false);

  const num = (v: string | undefined, fallback: number): number => {
    const n = v == null ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const noColor = has('no-color') || process.env.NO_COLOR != null;

  return {
    total: Math.max(1, num(get('total', 'n') ?? process.env.SIM_TOTAL, 200)),
    concurrency: Math.max(1, num(get('concurrency', 'c') ?? process.env.SIM_CONCURRENCY, 8)),
    rate: Math.max(0, num(get('rate', 'r') ?? process.env.SIM_RATE, 0)),
    url: (get('url', 'u') ?? process.env.API_URL ?? `http://127.0.0.1:${config.port}`).replace(
      /\/$/,
      '',
    ),
    seed: Math.trunc(num(get('seed', 's') ?? process.env.SIM_SEED, Date.now() % 2147483647)),
    dupRate: Math.min(1, Math.max(0, num(get('dup') ?? process.env.SIM_DUP, 0.18))),
    quiet: has('quiet', 'q'),
    color:
      !noColor &&
      (process.stdout.isTTY === true || has('color') || process.env.FORCE_COLOR != null),
    help: has('help', 'h'),
  };
}

function makePaint(enabled: boolean) {
  return (code: string, s: string): string => (enabled ? `\x1b[${code}m${s}\x1b[0m` : s);
}

// ----- PRNG reproducible (mulberry32) --------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----- Generador de mensajes realistas (Venezuela, multi-región) ------------

interface Location {
  text: string;
  lat: number;
  lng: number;
  region: string; // estado / región para agrupar
}

const REGIONS = [
  'Distrito Capital',
  'Miranda',
  'La Guaira',
  'Aragua',
  'Carabobo',
  'Lara',
  'Falcón',
  'Yaracuy',
  'Mérida',
  'Táchira',
  'Zulia',
  'Sucre',
  'Anzoátegui',
  'Monagas',
  'Bolívar',
  'Nva. Esparta',
];

const LOCATIONS: Location[] = [
  // --- Distrito Capital (+ más sectores de Caracas) ---
  { text: 'el sector Petare', lat: 10.4768, lng: -66.8089, region: 'Miranda' },
  { text: 'la urbanización El Valle', lat: 10.4634, lng: -66.9171, region: 'Distrito Capital' },
  { text: 'el barrio La Vega', lat: 10.4881, lng: -66.9418, region: 'Distrito Capital' },
  {
    text: 'la avenida principal de Antímano',
    lat: 10.4657,
    lng: -66.9791,
    region: 'Distrito Capital',
  },
  { text: 'la calle Sucre', lat: 10.5061, lng: -66.9146, region: 'Distrito Capital' },
  { text: 'el sector Catia', lat: 10.5099, lng: -66.9411, region: 'Distrito Capital' },
  { text: 'Caricuao', lat: 10.4347, lng: -66.9778, region: 'Distrito Capital' },
  { text: 'Coche', lat: 10.4547, lng: -66.9028, region: 'Distrito Capital' },
  { text: 'San Agustín del Sur', lat: 10.4912, lng: -66.8951, region: 'Distrito Capital' },
  { text: 'Sabana Grande', lat: 10.4953, lng: -66.8373, region: 'Distrito Capital' },
  { text: 'la avenida Bolívar', lat: 10.4972, lng: -66.8411, region: 'Distrito Capital' },
  { text: 'Macarao', lat: 10.4462, lng: -67.0139, region: 'Distrito Capital' },
  { text: 'El Junquito', lat: 10.4627, lng: -67.0803, region: 'Distrito Capital' },
  { text: 'Baruta', lat: 10.4335, lng: -66.8683, region: 'Miranda' },
  { text: 'la zona de Chacao', lat: 10.4965, lng: -66.8507, region: 'Miranda' },
  { text: 'El Silencio', lat: 10.5036, lng: -66.9192, region: 'Distrito Capital' },
  { text: '23 de Enero', lat: 10.4953, lng: -66.9122, region: 'Distrito Capital' },
  { text: 'La Candelaria', lat: 10.5064, lng: -66.9017, region: 'Distrito Capital' },
  { text: 'San Bernardino', lat: 10.5011, lng: -66.8753, region: 'Distrito Capital' },
  { text: 'Los Chaguaramos', lat: 10.4903, lng: -66.8847, region: 'Distrito Capital' },
  // --- Miranda ---
  { text: 'Los Teques', lat: 10.3422, lng: -67.0392, region: 'Miranda' },
  { text: 'Guarenas', lat: 10.4681, lng: -66.6186, region: 'Miranda' },
  { text: 'Guatire', lat: 10.4719, lng: -66.5408, region: 'Miranda' },
  { text: 'Santa Teresa del Tuy', lat: 10.2311, lng: -66.6647, region: 'Miranda' },
  { text: 'Charallave', lat: 10.3186, lng: -66.8567, region: 'Miranda' },
  { text: 'Ocumare del Tuy', lat: 10.1175, lng: -66.7811, region: 'Miranda' },
  { text: 'Higuerote', lat: 10.4819, lng: -66.1008, region: 'Miranda' },
  { text: 'Río Chico', lat: 10.3053, lng: -65.9811, region: 'Miranda' },
  { text: 'Caucagua', lat: 10.2853, lng: -66.3281, region: 'Miranda' },
  // --- La Guaira (Vargas) ---
  { text: 'La Guaira', lat: 10.6006, lng: -66.9331, region: 'La Guaira' },
  { text: 'Macuto', lat: 10.6119, lng: -66.8769, region: 'La Guaira' },
  { text: 'Catia La Mar', lat: 10.6053, lng: -66.9758, region: 'La Guaira' },
  { text: 'Caraballeda', lat: 10.6111, lng: -66.8492, region: 'La Guaira' },
  { text: 'Naiguatá', lat: 10.6189, lng: -66.7633, region: 'La Guaira' },
  // --- Aragua ---
  { text: 'Maracay', lat: 10.2469, lng: -67.5958, region: 'Aragua' },
  { text: 'Turmero', lat: 10.2286, lng: -67.4722, region: 'Aragua' },
  { text: 'La Victoria', lat: 10.2325, lng: -67.3325, region: 'Aragua' },
  { text: 'Cagua', lat: 10.1858, lng: -67.4586, region: 'Aragua' },
  { text: 'Villa de Cura', lat: 10.0369, lng: -67.4808, region: 'Aragua' },
  { text: 'El Limón', lat: 10.3061, lng: -67.6331, region: 'Aragua' },
  { text: 'Colonia Tovar', lat: 10.4061, lng: -67.2908, region: 'Aragua' },
  { text: 'Ocumare de la Costa', lat: 10.4572, lng: -67.7708, region: 'Aragua' },
  // --- Carabobo ---
  { text: 'Valencia', lat: 10.1806, lng: -68.0039, region: 'Carabobo' },
  { text: 'Puerto Cabello', lat: 10.4731, lng: -68.0125, region: 'Carabobo' },
  { text: 'Naguanagua', lat: 10.2675, lng: -68.0186, region: 'Carabobo' },
  { text: 'Guacara', lat: 10.2269, lng: -67.8789, region: 'Carabobo' },
  { text: 'San Diego', lat: 10.2583, lng: -67.9442, region: 'Carabobo' },
  { text: 'Mariara', lat: 10.3006, lng: -67.8308, region: 'Carabobo' },
  { text: 'Los Guayos', lat: 10.1856, lng: -67.9308, region: 'Carabobo' },
  { text: 'Morón', lat: 10.4861, lng: -68.1994, region: 'Carabobo' },
  // --- Lara ---
  { text: 'Barquisimeto', lat: 10.0736, lng: -69.3228, region: 'Lara' },
  { text: 'Cabudare', lat: 10.0233, lng: -69.2708, region: 'Lara' },
  { text: 'Carora', lat: 10.1753, lng: -70.0778, region: 'Lara' },
  { text: 'El Tocuyo', lat: 9.7869, lng: -69.7919, region: 'Lara' },
  { text: 'Quíbor', lat: 9.9289, lng: -69.6158, region: 'Lara' },
  { text: 'Duaca', lat: 10.2892, lng: -69.1681, region: 'Lara' },
  // --- Falcón ---
  { text: 'Coro', lat: 11.4039, lng: -69.6806, region: 'Falcón' },
  { text: 'Punto Fijo', lat: 11.6997, lng: -70.1869, region: 'Falcón' },
  { text: 'Tucacas', lat: 10.7936, lng: -68.3256, region: 'Falcón' },
  { text: 'Chichiriviche', lat: 10.9331, lng: -68.2756, region: 'Falcón' },
  { text: 'Morrocoy', lat: 10.8903, lng: -68.2808, region: 'Falcón' },
  { text: 'Puerto Cumarebo', lat: 11.4869, lng: -69.3456, region: 'Falcón' },
  // --- Yaracuy ---
  { text: 'San Felipe', lat: 10.3381, lng: -68.7425, region: 'Yaracuy' },
  { text: 'Yaritagua', lat: 10.0819, lng: -69.1308, region: 'Yaracuy' },
  { text: 'Chivacoa', lat: 10.1581, lng: -68.8983, region: 'Yaracuy' },
  { text: 'Aroa', lat: 10.4397, lng: -68.8892, region: 'Yaracuy' },
  // --- Mérida (Andes) ---
  { text: 'Mérida', lat: 8.5842, lng: -71.1417, region: 'Mérida' },
  { text: 'El Vigía', lat: 8.6181, lng: -71.6531, region: 'Mérida' },
  { text: 'Tovar', lat: 8.3333, lng: -71.75, region: 'Mérida' },
  { text: 'Ejido', lat: 8.5467, lng: -71.2406, region: 'Mérida' },
  { text: 'Mucuchíes', lat: 8.75, lng: -70.9167, region: 'Mérida' },
  { text: 'Santa Elena de Arenales', lat: 8.8189, lng: -71.4417, region: 'Mérida' },
  { text: 'Bailadores', lat: 8.25, lng: -71.8167, region: 'Mérida' },
  // --- Táchira (Andes, zona sísmica activa) ---
  { text: 'San Cristóbal', lat: 7.7683, lng: -72.2297, region: 'Táchira' },
  { text: 'Táriba', lat: 7.8189, lng: -72.2167, region: 'Táchira' },
  { text: 'Rubio', lat: 7.7, lng: -72.35, region: 'Táchira' },
  { text: 'La Grita', lat: 8.1372, lng: -71.9831, region: 'Táchira' },
  { text: 'Capacho', lat: 7.8167, lng: -72.3167, region: 'Táchira' },
  // --- Zulia (zona sísmica + lago) ---
  { text: 'Maracaibo', lat: 10.6317, lng: -71.6406, region: 'Zulia' },
  { text: 'Cabimas', lat: 10.3986, lng: -71.4517, region: 'Zulia' },
  { text: 'Ciudad Ojeda', lat: 10.2003, lng: -71.3075, region: 'Zulia' },
  { text: 'Machiques', lat: 10.0667, lng: -72.55, region: 'Zulia' },
  { text: 'Santa Bárbara del Zulia', lat: 8.9889, lng: -71.9558, region: 'Zulia' },
  // --- Sucre (zona sísmica, costa) ---
  { text: 'Cumaná', lat: 10.4564, lng: -64.1725, region: 'Sucre' },
  { text: 'Carúpano', lat: 10.6692, lng: -63.24, region: 'Sucre' },
  { text: 'Güiria', lat: 10.575, lng: -62.2981, region: 'Sucre' },
  { text: 'Río Caribe', lat: 10.6967, lng: -63.1075, region: 'Sucre' },
  // --- Anzoátegui ---
  { text: 'Barcelona', lat: 10.1333, lng: -64.6833, region: 'Anzoátegui' },
  { text: 'Puerto La Cruz', lat: 10.2167, lng: -64.6167, region: 'Anzoátegui' },
  { text: 'Lechería', lat: 10.2, lng: -64.6833, region: 'Anzoátegui' },
  { text: 'Anaco', lat: 9.4333, lng: -64.4667, region: 'Anzoátegui' },
  { text: 'El Tigre', lat: 8.8833, lng: -64.25, region: 'Anzoátegui' },
  { text: 'Pariaguán', lat: 8.85, lng: -64.7, region: 'Anzoátegui' },
  // --- Monagas ---
  { text: 'Maturín', lat: 9.75, lng: -63.1833, region: 'Monagas' },
  { text: 'Punta de Mata', lat: 9.6833, lng: -63.6167, region: 'Monagas' },
  { text: 'Temblador', lat: 9.0167, lng: -62.6333, region: 'Monagas' },
  // --- Bolívar (sur) ---
  { text: 'Ciudad Bolívar', lat: 8.1167, lng: -63.55, region: 'Bolívar' },
  { text: 'Puerto Ordaz', lat: 8.3167, lng: -62.7, region: 'Bolívar' },
  { text: 'Upata', lat: 8.0167, lng: -62.4, region: 'Bolívar' },
  { text: 'Caicara del Orinoco', lat: 7.6333, lng: -66.1667, region: 'Bolívar' },
  // --- Nueva Esparta (isla) ---
  { text: 'Porlamar', lat: 10.9589, lng: -63.8694, region: 'Nva. Esparta' },
  { text: 'La Asunción', lat: 11.0292, lng: -63.8678, region: 'Nva. Esparta' },
  { text: 'Pampatar', lat: 10.9944, lng: -63.7897, region: 'Nva. Esparta' },
  { text: 'Juan Griego', lat: 11.0825, lng: -63.965, region: 'Nva. Esparta' },
  { text: 'El Yaque', lat: 10.9025, lng: -63.9344, region: 'Nva. Esparta' },
];

const NAMES = [
  'María Pérez',
  'José Rodríguez',
  'Ana Gómez',
  'Luis Martínez',
  'Carla Díaz',
  'Pedro Sánchez',
  'Rosa Herrera',
  'Miguel Torres',
  'Yolanda Ríos',
  'Carlos Mendoza',
  null,
  null,
];

interface Template {
  type: string;
  weight: number;
  texts: string[];
}

const TEMPLATES: Template[] = [
  {
    type: 'estructural',
    weight: 5,
    texts: [
      'Se derrumbó un edificio en {loc}, hay {n} personas atrapadas bajo los escombros',
      'Colapsó un muro en {loc}, hay gente debajo de los escombros, vengan rápido',
      'Grietas enormes en un edificio de {loc}, los vecinos están evacuando',
    ],
  },
  {
    type: 'medico',
    weight: 5,
    texts: [
      'Hay {n} personas heridas en {loc}, necesitamos una ambulancia urgente',
      'Una señora sufrió un infarto en {loc}, no responde, manden médico ya',
      'Mi vecino se cayó y sangra mucho en {loc}, necesita ayuda médica',
      'Embarazada con contracciones fuertes en {loc}, hace falta una ambulancia',
    ],
  },
  {
    type: 'rescate',
    weight: 4,
    texts: [
      'Hay {n} personas atrapadas por la inundación en {loc}, no pueden salir',
      'El río se desbordó en {loc} y la corriente arrastró varias casas',
      'Una familia quedó aislada en el techo de su casa en {loc}',
    ],
  },
  {
    type: 'desaparecido',
    weight: 3,
    texts: [
      'Mi papá está desaparecido desde ayer en {loc}, tiene 70 años',
      'No encuentro a mi hijo de 8 años, se perdió en {loc}',
      'Buscamos a una mujer mayor extraviada en {loc}, no tiene sus medicinas',
    ],
  },
  {
    type: 'incendio',
    weight: 3,
    texts: [
      'Incendio en una casa de {loc}, sale mucho humo y fuego',
      'Se está quemando un local en {loc}, el fuego se expande rápido',
    ],
  },
  {
    type: 'agua',
    weight: 3,
    texts: [
      'Necesitamos agua potable en {loc}, somos {n} familias sin agua',
      'Llevamos 3 días sin agua en {loc}, hay niños deshidratados',
    ],
  },
  {
    type: 'alimento',
    weight: 2,
    texts: [
      'No tenemos comida en {loc}, hay {n} familias con hambre',
      'Necesitamos alimentos y leche para los bebés en {loc}',
    ],
  },
  {
    type: 'refugio',
    weight: 2,
    texts: [
      'Perdimos la casa por la inundación en {loc}, necesitamos refugio',
      'Somos {n} personas sin techo en {loc}, ¿dónde podemos dormir?',
    ],
  },
  {
    type: 'otro',
    weight: 1,
    texts: [
      'Buenas, quiero ofrecer mi camioneta para ayudar a transportar insumos',
      'Consulta: ¿dónde puedo donar agua y alimentos para los afectados?',
    ],
  },
];

// --- Modos de generación de mensajes ----------------------------------------
// Para que la simulación sea más realista, cada mensaje se genera en uno de
// estos modos:
//
//   NUEVO (70%):  tipo + ubicación aleatoria. Es un incidente que arranca.
//   CASCADA (20%): mismo tipo que un evento reciente, DISTINTA ubicación
//                  (misma región o cercana). Simula cómo un desastre se
//                  propaga: un derrumbe en Petare → otro derrumbe en Palo Verde.
//   TESTIGO (10%): mismo tipo + MISMA ubicación que un evento reciente, pero
//                  distinto texto y persona. Simula múltiples reportando lo
//                  mismo desde el mismo sitio.
//
// Esto evita el problema anterior donde el ~18% eran copias textuales del
// mismo mensaje con un prefijo, y produce una distribución mucho más realista.

const MODE_NUEVO = 0.7;
const MODE_CASCADA = 0.9; // 0.70 + 0.20

const CASCADA_PREFIXES = [
  'También en la zona, ',
  'Acá cerca pasó igual: ',
  'En el sector de al lado, ',
  'Se repite la situación en ',
  'Por acá igual: ',
  'Misma emergencia en ',
];

const TESTIGO_PREFIXES = [
  'Yo también vi: ',
  'Confirmo, ',
  'Otra persona avisa: ',
  'Mi vecino reporta lo mismo: ',
  'Estuve allí, ',
];

interface SimEvent {
  type: string;
  loc: Location;
  tplIdx: number; // índice del template original
  textIdx: number; // índice del texto usado dentro del template
  n: number; // número de personas afectadas
}

const WEIGHT_TOTAL = TEMPLATES.reduce((s, t) => s + t.weight, 0);

interface SimMessage {
  text: string;
  phone: string;
  name: string | null;
  lat: number | null;
  lng: number | null;
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pickTemplate(rng: () => number): Template {
  let r = rng() * WEIGHT_TOTAL;
  for (const t of TEMPLATES) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return TEMPLATES[0];
}

function randomPhone(rng: () => number): string {
  const prefix = pick(['412', '414', '424', '416', '426'], rng);
  let n = '';
  for (let i = 0; i < 7; i++) n += String(randInt(0, 9, rng));
  return `+58${prefix}${n}`;
}

/** Encuentra otra ubicación en la misma región (o cercana) para eventos en cascada. */
function nearbyLocation(original: Location, all: Location[], rng: () => number): Location {
  // Misma región primero
  const sameRegion = all.filter((l) => l.region === original.region && l !== original);
  if (sameRegion.length > 0 && rng() < 0.7) return pick(sameRegion, rng);
  // Cualquier otra (región distinta) — desastre de gran escala
  const others = all.filter((l) => l !== original);
  return others.length > 0 ? pick(others, rng) : original;
}

/**
 * Genera mensajes con dinámica de desastre real:
 * - Eventos nuevos aparecen constantemente
 * - Los desastres se propagan a zonas cercanas (cascada)
 * - Múltiples testigos reportan el mismo incidente (testigo)
 */
function generateMessages(
  total: number,
  _dupRate: number, // ya no se usa: reemplazado por los 3 modos
  rng: () => number,
): SimMessage[] {
  const out: SimMessage[] = [];
  const active: SimEvent[] = []; // eventos "vivos" para cascada/testigo

  for (let i = 0; i < total; i++) {
    const roll = rng();
    const canCascade = active.length > 0;
    const canWitness = active.length > 0;

    if (canCascade && roll >= MODE_NUEVO && roll < MODE_CASCADA) {
      // --- CASCADA: mismo tipo, distinta ubicación cercana ---
      const base = pick(active, rng);
      const newLoc = nearbyLocation(base.loc, LOCATIONS, rng);
      const tpl = TEMPLATES[base.tplIdx];
      // Intentar un texto distinto del mismo template
      const altTexts = tpl.texts.filter((_, idx) => idx !== base.textIdx);
      const t = altTexts.length > 0 ? pick(altTexts, rng) : pick(tpl.texts, rng);
      const text = `${pick(CASCADA_PREFIXES, rng)}${t
        .replace('{loc}', newLoc.text)
        .replace('{n}', String(randInt(2, 30, rng)))
        .charAt(0)
        .toLowerCase()}${t.slice(1)}`;

      active.push({
        type: base.type,
        loc: newLoc,
        tplIdx: base.tplIdx,
        textIdx: tpl.texts.indexOf(t),
        n: base.n,
      });

      out.push({
        text,
        phone: randomPhone(rng),
        name: pick(NAMES, rng),
        lat: newLoc.lat,
        lng: newLoc.lng,
      });
    } else if (canWitness && roll >= MODE_CASCADA) {
      // --- TESTIGO: mismo tipo + misma ubicación, distinta persona ---
      const base = pick(active, rng);
      const tpl = TEMPLATES[base.tplIdx];
      const text = `${pick(TESTIGO_PREFIXES, rng)}${pick(tpl.texts, rng)
        .replace('{loc}', base.loc.text)
        .replace('{n}', String(randInt(2, 30, rng)))
        .charAt(0)
        .toLowerCase()}${pick(tpl.texts, rng).slice(1)}`;

      out.push({
        text,
        phone: randomPhone(rng),
        name: pick(NAMES, rng),
        lat: base.loc.lat,
        lng: base.loc.lng,
      });
    } else {
      // --- NUEVO EVENTO ---
      const tpl = pickTemplate(rng);
      const tplIdx = TEMPLATES.indexOf(tpl);
      const textIdx = randInt(0, tpl.texts.length - 1, rng);
      const loc = pick(LOCATIONS, rng);
      const n = randInt(2, 30, rng);
      const t = tpl.texts[textIdx];
      const text = t.replace('{loc}', loc.text).replace('{n}', String(n));

      active.push({ type: tpl.type, loc, tplIdx, textIdx, n });
      if (active.length > 20) active.shift(); // ventana de eventos vivos

      out.push({
        text,
        phone: randomPhone(rng),
        name: pick(NAMES, rng),
        lat: loc.lat,
        lng: loc.lng,
      });
    }
  }
  return out;
}

// ----- Respuesta del endpoint ----------------------------------------------

interface SimReport {
  incident_type: string;
  priority: string;
  recommended_team: string | null;
  confidence: number;
  duplicate_of: string | null;
  ai_engine: string | null;
  people_affected: number | null;
}

interface SimResponse {
  report: SimReport;
  reply: string;
}

// ----- Presentación ---------------------------------------------------------

const TYPE_ICON: Record<string, string> = {
  medico: '🚑',
  desaparecido: '🔍',
  estructural: '🏚️',
  agua: '💧',
  alimento: '🍞',
  incendio: '🔥',
  rescate: '🛟',
  refugio: '⛺',
  otro: '📩',
};

const PRIORITY_RANK: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 };

function maskPhone(phone: string): string {
  return phone.length > 5 ? `${phone.slice(0, 5)}···${phone.slice(-3)}` : phone;
}

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length > n ? `${clean.slice(0, n - 1)}…` : clean;
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

// ----- Métricas -------------------------------------------------------------

interface Metrics {
  sent: number;
  ok: number;
  failed: number;
  duplicates: number;
  latencies: number[];
  byType: Map<string, number>;
  byPriority: Map<string, number>;
  byEngine: Map<string, number>;
  startedAt: number;
}

function newMetrics(): Metrics {
  return {
    sent: 0,
    ok: 0,
    failed: 0,
    duplicates: 0,
    latencies: [],
    byType: new Map(),
    byPriority: new Map(),
    byEngine: new Map(),
    startedAt: Date.now(),
  };
}

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

// ----- Ejecución ------------------------------------------------------------

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function checkHealth(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

function printHelp(): void {
  console.log(`
Simulador de carga masiva de WhatsApp — Puente de Vida

Uso:
  npm run sim -w @pdv/api -- [opciones]

Opciones:
  -n, --total <n>         Cantidad total de mensajes a enviar     (def. 200)
  -c, --concurrency <n>   Mensajes en paralelo                    (def. 8)
  -r, --rate <n>          Límite de mensajes por segundo, 0=sin límite (def. 0)
  -u, --url <url>         URL de la API                           (def. http://127.0.0.1:${config.port})
      --dup <0..1>        Proporción de reportes duplicados       (def. 0.18)
  -s, --seed <n>          Semilla para reproducir la corrida      (def. aleatoria)
  -q, --quiet             No imprime cada mensaje, solo métricas
      --no-color          Desactiva colores
  -h, --help              Muestra esta ayuda

Ejemplos:
  npm run sim -w @pdv/api -- -n 500 -c 16
  npm run sim -w @pdv/api -- --rate 30 --total 300
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const paint = makePaint(args.color);

  if (args.help) {
    printHelp();
    return;
  }

  const dim = (s: string) => paint('2', s);
  const bold = (s: string) => paint('1', s);

  console.log('');
  console.log(
    bold(paint('36', '╔══════════════════════════════════════════════════════════════╗')),
  );
  console.log(
    bold(paint('36', '║   Puente de Vida · Simulación de carga masiva de WhatsApp     ║')),
  );
  console.log(
    bold(paint('36', '╚══════════════════════════════════════════════════════════════╝')),
  );
  console.log(
    dim(
      `  destino=${args.url}  total=${args.total}  concurrencia=${args.concurrency}  ` +
        `rate=${args.rate || '∞'} msg/s  seed=${args.seed}`,
    ),
  );

  const healthy = await checkHealth(args.url);
  if (!healthy) {
    console.log('');
    console.log(paint('31', `✗ No se pudo contactar la API en ${args.url}`));
    console.log(dim('  Levantá la plataforma primero, por ejemplo:'));
    console.log(dim('    npm run db:up      # base de datos (Docker)'));
    console.log(dim('    npm run dev        # API + Web'));
    console.log(dim('  o todo junto con:  npm run up'));
    process.exitCode = 1;
    return;
  }

  const rng = mulberry32(args.seed);
  const messages = generateMessages(args.total, args.dupRate, rng);
  const m = newMetrics();

  console.log('');
  console.log(dim('  El panel del coordinador se irá llenando en vivo → http://localhost:3000'));
  console.log(dim('  ──────────────────────────────────────────────────────────────'));
  console.log('');

  // Pulso de métricas periódico (cada 1s) para que la grabación muestre avance.
  const ticker = setInterval(() => {
    const sorted = [...m.latencies].sort((a, b) => a - b);
    const elapsed = (Date.now() - m.startedAt) / 1000;
    const tput = elapsed > 0 ? m.ok / elapsed : 0;
    console.log(
      paint(
        '90',
        `   ⏱  ${m.sent}/${args.total}  ·  ${tput.toFixed(1)} msg/s  ·  ` +
          `p50 ${percentile(sorted, 50)}ms  ·  p95 ${percentile(sorted, 95)}ms  ·  ` +
          `✓${m.ok} ✗${m.failed}  ·  duplicados ${m.duplicates}`,
      ),
    );
  }, 1000);

  // Limitador de ratio simple (token por slot temporal).
  let nextSlot = Date.now();
  const gate = async (): Promise<void> => {
    if (!args.rate) return;
    const now = Date.now();
    const wait = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + 1000 / args.rate;
    if (wait > 0) await sleep(wait);
  };

  const sendOne = async (msg: SimMessage, idx: number): Promise<void> => {
    const t0 = Date.now();
    try {
      const res = await fetch(`${args.url}/api/whatsapp/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: msg.text,
          phone: msg.phone,
          name: msg.name,
          lat: msg.lat,
          lng: msg.lng,
        }),
      });
      const ms = Date.now() - t0;
      m.latencies.push(ms);

      if (!res.ok) {
        m.failed++;
        if (!args.quiet) {
          console.log(paint('31', `  #${String(idx + 1).padStart(4, '0')}  ✗ HTTP ${res.status}`));
        }
        return;
      }

      const data = (await res.json()) as SimResponse;
      const r = data.report;
      m.ok++;
      bump(m.byType, r.incident_type);
      bump(m.byPriority, r.priority);
      bump(m.byEngine, r.ai_engine ?? 'desconocido');
      const isDup = r.duplicate_of != null;
      if (isDup) m.duplicates++;

      if (!args.quiet) {
        const icon = TYPE_ICON[r.incident_type] ?? '📩';
        const prioColor =
          r.priority === 'critica'
            ? '41;1'
            : r.priority === 'alta'
              ? '33;1'
              : r.priority === 'media'
                ? '36'
                : '90';
        const prio = paint(prioColor, ` ${r.priority.toUpperCase()} `);
        const dupTag = isDup ? paint('35;1', ' ↺ DUPLICADO') : '';
        const latColor = ms < 200 ? '32' : ms < 600 ? '33' : '31';
        console.log(
          `  ${dim(`#${String(idx + 1).padStart(4, '0')}`)} 💬 ${dim(maskPhone(msg.phone))}  ` +
            `${icon} ${r.incident_type.padEnd(12)} ${prio} ` +
            `${dim(`conf ${r.confidence.toFixed(2)}`)} ${paint(latColor, `${ms}ms`)}  ` +
            `${dim(`"${truncate(msg.text, 42)}"`)}${dupTag}`,
        );
      }
    } catch (err) {
      m.latencies.push(Date.now() - t0);
      m.failed++;
      if (!args.quiet) {
        console.log(
          paint('31', `  #${String(idx + 1).padStart(4, '0')}  ✗ ${(err as Error).message}`),
        );
      }
    } finally {
      m.sent++;
    }
  };

  // Pool de workers con concurrencia acotada.
  let cursor = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = cursor++;
      if (i >= messages.length) return;
      await gate();
      await sendOne(messages[i], i);
    }
  };
  await Promise.all(Array.from({ length: args.concurrency }, () => worker()));

  clearInterval(ticker);

  // ----- Reporte final ------------------------------------------------------

  const elapsed = (Date.now() - m.startedAt) / 1000;
  const sorted = [...m.latencies].sort((a, b) => a - b);
  const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
  const tput = elapsed > 0 ? m.ok / elapsed : 0;
  const p95 = percentile(sorted, 95);

  const verdict =
    p95 < 300
      ? paint('32;1', '🟢 FLUIDO — responde bien bajo carga')
      : p95 < 800
        ? paint('33;1', '🟡 ACEPTABLE — hay margen para optimizar')
        : paint('31;1', '🔴 CUELLO DE BOTELLA — conviene revisar el código');

  const line = '────────────────────────────────────────────────────────────────';
  console.log('');
  console.log(bold(paint('36', `╔${line}╗`)));
  console.log(bold(paint('36', '   RESULTADO DE LA SIMULACIÓN')));
  console.log(paint('36', `╚${line}╝`));
  console.log(`  Mensajes enviados   : ${bold(String(m.sent))}`);
  console.log(
    `  Exitosos / fallidos : ${paint('32', String(m.ok))} / ${paint('31', String(m.failed))}`,
  );
  console.log(`  Duplicados (IA)     : ${m.duplicates}`);
  console.log(`  Tiempo total        : ${elapsed.toFixed(1)} s`);
  console.log(`  Throughput          : ${bold(tput.toFixed(1))} msg/s`);
  console.log('');
  console.log(
    `  Latencia (ms)       : avg ${avg.toFixed(0)}  ·  min ${sorted[0] ?? 0}  ·  ` +
      `p50 ${percentile(sorted, 50)}  ·  p95 ${p95}  ·  p99 ${percentile(sorted, 99)}  ·  max ${sorted[sorted.length - 1] ?? 0}`,
  );
  console.log('');

  const typeRows = [...m.byType.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`  ${bold('Por tipo de incidente')}`);
  for (const [type, count] of typeRows) {
    const icon = TYPE_ICON[type] ?? '📩';
    const bar = '█'.repeat(Math.max(1, Math.round((count / Math.max(1, m.ok)) * 30)));
    console.log(`    ${icon} ${type.padEnd(13)} ${String(count).padStart(4)}  ${paint('36', bar)}`);
  }
  console.log('');

  const prioRows = [...m.byPriority.entries()].sort(
    (a, b) => (PRIORITY_RANK[a[0]] ?? 9) - (PRIORITY_RANK[b[0]] ?? 9),
  );
  console.log(`  ${bold('Por prioridad')}`);
  for (const [prio, count] of prioRows) {
    const color =
      prio === 'critica' ? '31;1' : prio === 'alta' ? '33;1' : prio === 'media' ? '36' : '90';
    const bar = '█'.repeat(Math.max(1, Math.round((count / Math.max(1, m.ok)) * 30)));
    console.log(
      `    ${paint(color, prio.padEnd(13))} ${String(count).padStart(4)}  ${paint(color, bar)}`,
    );
  }
  console.log('');

  const engineRows = [...m.byEngine.entries()].sort((a, b) => b[1] - a[1]);
  console.log(
    `  ${bold('Motor de clasificación')}: ${engineRows.map(([e, n]) => `${e} (${n})`).join('  ·  ')}`,
  );
  console.log('');
  console.log(`  Veredicto de fluidez: ${verdict}`);
  console.log('');
}

main().catch((err) => {
  console.error('[simulate] Error fatal:', err);
  process.exit(1);
});
