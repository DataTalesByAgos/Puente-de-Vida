import type { Classification, IncidentType, Priority } from '../types';

// ---------------------------------------------------------------------------
// Clasificador heurístico local — cero costo, cero red.
// ---------------------------------------------------------------------------
// Usa una combinación de:
//   - Levenshtein distance para fuzzy matching de keywords (tolera typos)
//   - TF-IDF-like scoring con pesos por término
//   - Bigram detection para frases clave
//   - Diccionario geográfico local
//
// Es el baseline más barato posible y el respaldo cuando no hay proveedor
// externo configurado o cuando falla la red.
// ---------------------------------------------------------------------------

// ----- Utilidades -----------------------------------------------------------

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[] = [];
  for (let i = 0; i <= bn; i++) matrix[i] = i;
  for (let i = 1; i <= an; i++) {
    let prev = i;
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(matrix[j] + 1, prev + 1, matrix[j - 1] + cost);
      matrix[j - 1] = prev;
      prev = val;
    }
    matrix[bn] = prev;
  }
  return matrix[bn];
}

/** Busca fuzzy: true si la palabra está a distancia ≤ maxDist del keyword. */
function fuzzyMatch(word: string, keyword: string, maxDist: number): boolean {
  if (word === keyword) return true;
  if (Math.abs(word.length - keyword.length) > maxDist) return false;
  return levenshtein(word, keyword) <= maxDist;
}

/** Tokeniza el texto en palabras limpias. */
function tokens(text: string): string[] {
  return text.split(/[^\wáéíóúñ]+/).filter(Boolean);
}

/** Genera bigramas (pares consecutivos) de palabras. */
function bigrams(text: string): string[] {
  const t = tokens(text);
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(`${t[i]} ${t[i + 1]}`);
  return out;
}

// ----- Keyword weights (TF-IDF-like) ----------------------------------------
// Cada entry: [keyword, weight]
// Pesos más altos = señal más fuerte para ese tipo de incidente.
// Se usa fuzzy matching con distancia ≤ 1 para tolerar typos comunes.

interface TypedKeywords {
  type: IncidentType;
  keywords: [string, number][]; // [keyword, weight]
}

const TYPE_KEYWORDS: TypedKeywords[] = [
  {
    type: 'medico',
    keywords: [
      ['infarto', 10],
      ['paro', 9],
      ['inconsciente', 9],
      ['no respira', 10],
      ['sangra', 8],
      ['herido', 6],
      ['herida', 6],
      ['ambulancia', 8],
      ['medico', 7],
      ['medica', 7],
      ['doctor', 5],
      ['hospital', 6],
      ['fractura', 6],
      ['enfermo', 5],
      ['embarazada', 7],
      ['contracciones', 6],
      ['dolor', 4],
      ['se cayo', 5],
      ['se cayó', 5],
      ['urgencia', 6],
      ['grave', 8],
      ['muriendo', 9],
      ['agoniza', 9],
    ],
  },
  {
    type: 'desaparecido',
    keywords: [
      ['desaparecido', 10],
      ['desaparecida', 10],
      ['no aparece', 7],
      ['no encuentro', 8],
      ['perdido', 7],
      ['perdida', 7],
      ['extraviado', 7],
      ['extraviada', 7],
      ['busco a', 8],
      ['busco a mi', 9],
      ['no se donde', 6],
      ['sin noticias', 7],
      ['se perdio', 7],
      ['se perdió', 7],
      ['localizar', 5],
      ['paradero', 6],
    ],
  },
  {
    type: 'estructural',
    keywords: [
      ['derrumbado', 10],
      ['derrumbó', 10],
      ['derrumbo', 10],
      ['colapso', 9],
      ['colapsó', 9],
      ['colapso', 9],
      ['grieta', 6],
      ['grietas', 6],
      ['edificio', 7],
      ['muro', 6],
      ['techo', 5],
      ['escombro', 8],
      ['escombros', 8],
      ['se cayo', 6],
      ['se cayó', 6],
      ['casa cayo', 7],
      ['casa cayó', 7],
      ['pared', 5],
      ['puente', 6],
      ['desprendimiento', 7],
      ['hundimiento', 7],
      ['fisura', 5],
      ['evacuando', 5],
      ['evacuar', 5],
    ],
  },
  {
    type: 'agua',
    keywords: [
      ['agua potable', 9],
      ['sin agua', 9],
      ['sed', 6],
      ['deshidratado', 8],
      ['deshidratada', 8],
      ['pozo', 5],
      ['tanque', 4],
      ['rio', 5],
      ['rio se desbordo', 8],
      ['río se desbordó', 8],
      ['inundacion', 6],
      ['inundación', 6],
      ['lluvia', 4],
    ],
  },
  {
    type: 'alimento',
    keywords: [
      ['comida', 7],
      ['alimento', 7],
      ['alimentos', 7],
      ['hambre', 8],
      ['sin comer', 8],
      ['viveres', 7],
      ['víveres', 7],
      ['leche', 6],
      ['racion', 6],
      ['ración', 6],
      ['desnutricion', 8],
      ['desnutrición', 8],
      ['olla', 4],
      ['cocina', 4],
    ],
  },
  {
    type: 'incendio',
    keywords: [
      ['incendio', 10],
      ['fuego', 8],
      ['quemando', 8],
      ['quema', 7],
      ['humo', 7],
      ['llamas', 8],
      ['explosion', 9],
      ['explosión', 9],
      ['exploto', 9],
      ['explotó', 9],
      ['quemadura', 7],
      ['arder', 6],
    ],
  },
  {
    type: 'rescate',
    keywords: [
      ['atrapado', 10],
      ['atrapada', 10],
      ['atrapados', 10],
      ['rescat', 8],
      ['inundacion', 7],
      ['inundación', 7],
      ['arrastro', 7],
      ['arrastró', 7],
      ['corriente', 6],
      ['aislado', 7],
      ['aislada', 7],
      ['no puede salir', 9],
      ['bajo el agua', 8],
      ['atrapadas', 10],
      ['desbordo', 8],
      ['desbordó', 8],
      ['crecida', 6],
      ['derrumbe', 7],
    ],
  },
  {
    type: 'refugio',
    keywords: [
      ['refugio', 8],
      ['albergue', 7],
      ['donde dormir', 7],
      ['sin techo', 8],
      ['evacuar', 6],
      ['evacuado', 6],
      ['evacuada', 6],
      ['donde quedar', 6],
      ['cobijo', 6],
      ['casa perdimos', 7],
      ['perdimos la casa', 7],
    ],
  },
];

// ----- Prioridad: términos críticos, altos y bajos con pesos -----------------

interface WeightedTerm {
  term: string;
  weight: number;
}

const CRITICAL: WeightedTerm[] = [
  { term: 'muriendo', weight: 10 },
  { term: 'muerto', weight: 9 },
  { term: 'grave', weight: 9 },
  { term: 'paro', weight: 10 },
  { term: 'infarto', weight: 10 },
  { term: 'sangra', weight: 8 },
  { term: 'atrapado', weight: 9 },
  { term: 'inconsciente', weight: 9 },
  { term: 'no respira', weight: 10 },
  { term: 'urgente', weight: 8 },
  { term: 'critico', weight: 9 },
  { term: 'critica', weight: 9 },
  { term: 'agoniza', weight: 10 },
  { term: 'vida', weight: 3 },
];

const HIGH: WeightedTerm[] = [
  { term: 'herido', weight: 5 },
  { term: 'derrumb', weight: 7 },
  { term: 'incendio', weight: 7 },
  { term: 'fuego', weight: 6 },
  { term: 'desaparec', weight: 7 },
  { term: 'inund', weight: 6 },
  { term: 'fractura', weight: 6 },
  { term: 'embaraz', weight: 6 },
  { term: 'nino', weight: 4 },
  { term: 'bebe', weight: 5 },
  { term: 'ancian', weight: 5 },
  { term: 'ambulancia', weight: 7 },
  { term: 'explot', weight: 7 },
  { term: 'escombro', weight: 6 },
  { term: 'colaps', weight: 6 },
  { term: 'llamas', weight: 6 },
];

const LOW: WeightedTerm[] = [
  { term: 'consulta', weight: 5 },
  { term: 'informacion', weight: 3 },
  { term: 'duda', weight: 4 },
  { term: 'pregunta', weight: 4 },
  { term: 'donar', weight: 5 },
  { term: 'ofrezco', weight: 5 },
  { term: 'ofrecer', weight: 5 },
  { term: 'quiero ayudar', weight: 3 },
  { term: 'voluntario', weight: 4 },
];

// ----- Equipos por tipo -----------------------------------------------------

const TEAM_BY_TYPE: Record<IncidentType, string> = {
  medico: 'Equipo Médico / SAMU',
  desaparecido: 'Búsqueda y Rescate',
  estructural: 'Bomberos / USAR',
  agua: 'Logística de Insumos',
  alimento: 'Logística de Insumos',
  incendio: 'Bomberos',
  rescate: 'Búsqueda y Rescate',
  refugio: 'Coordinación de Refugios',
  otro: 'Coordinación General',
};

// ----- Detectores -----------------------------------------------------------

/** Busca coincidencias fuzzy de keywords con pesos, devuelve score por tipo. */
function scoreTypes(text: string): { type: IncidentType; score: number }[] {
  const norm = normalize(text);
  const words = tokens(norm);
  const bigramList = bigrams(norm);
  const allPhrases = [...words, ...bigramList];
  const results: { type: IncidentType; score: number }[] = [];

  for (const group of TYPE_KEYWORDS) {
    let score = 0;
    for (const [keyword, weight] of group.keywords) {
      const kwNorm = normalize(keyword);
      const isBigram = kwNorm.includes(' ');

      if (isBigram) {
        // Los bigramas se matchean exactos contra la lista de bigramas
        if (bigramList.includes(kwNorm)) {
          score += weight;
        }
      } else {
        // Palabras sueltas: fuzzy match con distancia ≤ 1
        for (const word of words) {
          if (fuzzyMatch(word, kwNorm, 1)) {
            score += weight;
            break; // una coincidencia por keyword basta
          }
        }
      }
    }
    results.push({ type: group.type, score });
  }
  return results;
}

function detectType(text: string): { type: IncidentType; score: number } {
  const scores = scoreTypes(text);
  let best: IncidentType = 'otro';
  let bestScore = 0;
  for (const s of scores) {
    if (s.score > bestScore) {
      best = s.type;
      bestScore = s.score;
    }
  }
  return { type: best, score: bestScore };
}

function fuzzyScoreTerms(text: string, terms: WeightedTerm[]): number {
  const norm = normalize(text);
  const words = tokens(norm);
  const bigramList = bigrams(norm);
  let score = 0;
  for (const t of terms) {
    const tn = normalize(t.term);
    const isBigram = tn.includes(' ');
    if (isBigram) {
      if (bigramList.includes(tn)) score += t.weight;
    } else {
      for (const word of words) {
        if (fuzzyMatch(word, tn, 1)) {
          score += t.weight;
          break;
        }
      }
    }
  }
  return score;
}

function detectPriority(text: string, type: IncidentType): Priority {
  const criticalScore = fuzzyScoreTerms(text, CRITICAL);
  if (criticalScore >= 10) return 'critica';

  const highScore = fuzzyScoreTerms(text, HIGH);

  if (highScore >= 7) return 'alta';

  const lowScore = fuzzyScoreTerms(text, LOW);
  if (lowScore >= 5) return 'baja';

  // Tipos inherentemente sensibles arrancan en alta aunque no matcheen términos fuertes.
  if (['medico', 'rescate', 'desaparecido', 'estructural'].includes(type)) {
    return 'alta';
  }

  return 'media';
}

function detectPeople(text: string): number | null {
  const norm = normalize(text);
  // Patrones numéricos: "3 personas", "5 heridos", "10 familias"
  const numeric = norm.match(/(\d{1,4})\s*(person|herid|nin|adult|famil|vecin|gente|afect|atrap)/i);
  if (numeric) return Number(numeric[1]);

  // Palabras numéricas
  const wordsMap: Record<string, number> = {
    una: 1,
    uno: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    varias: 3,
    muchas: 5,
  };
  const w = norm.match(
    /(una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|varias|muchas)\s*(person|herid|nin|adult|famil|vecin|gente|afect|atrap)/,
  );
  if (w) return wordsMap[w[1]] ?? null;

  if (/familia/.test(norm)) return 4;
  if (/vecinos/.test(norm)) return 3;
  if (/gente/.test(norm)) return 5;
  if (/personas/.test(norm)) return 2;

  return null;
}

function detectLocation(raw: string): string | null {
  // Frases tipo "en el barrio X", "calle Y", "sector Z"
  const m = raw.match(/\b(en (?:el |la |los |las )?[A-Za-zÁÉÍÓÚÑáéíóúñ0-9 .,#-]{3,50})/i);
  if (m) return m[1].replace(/\s+/g, ' ').trim();

  // Direcciones específicas
  const street = raw.match(
    /\b((?:calle|av(?:enida)?|sector|barrio|urb(?:anizacion)?|zona|plaza)\.?\s+[A-Za-zÁÉÍÓÚÑáéíóúñ0-9 .,#-]{2,40})/i,
  );
  if (street) return street[1].trim();

  return null;
}

// ----- Diccionario geográfico local -----------------------------------------

const GEO_LOOKUP: { patterns: RegExp[]; lat: number; lng: number }[] = [
  // --- Distrito Capital / Miranda ---
  { patterns: [/petare/i], lat: 10.4768, lng: -66.8089 },
  { patterns: [/el valle/i], lat: 10.4634, lng: -66.9171 },
  { patterns: [/la vega/i], lat: 10.4881, lng: -66.9418 },
  { patterns: [/antimano|antímano/i], lat: 10.4657, lng: -66.9791 },
  { patterns: [/calle sucre/i], lat: 10.5061, lng: -66.9146 },
  { patterns: [/catia/i], lat: 10.5099, lng: -66.9411 },
  { patterns: [/caricuao/i], lat: 10.4347, lng: -66.9778 },
  { patterns: [/coche/i], lat: 10.4547, lng: -66.9028 },
  { patterns: [/san agustin|san agustín/i], lat: 10.4912, lng: -66.8951 },
  { patterns: [/sabana grande/i], lat: 10.4953, lng: -66.8373 },
  { patterns: [/av(?:enida)? bol[ií]var/i], lat: 10.4972, lng: -66.8411 },
  { patterns: [/macarao/i], lat: 10.4462, lng: -67.0139 },
  { patterns: [/junquito/i], lat: 10.4627, lng: -67.0803 },
  { patterns: [/baruta/i], lat: 10.4335, lng: -66.8683 },
  { patterns: [/chacao/i], lat: 10.4965, lng: -66.8507 },
  { patterns: [/altamira/i], lat: 10.5, lng: -66.8408 },
  { patterns: [/los chorros/i], lat: 10.5006, lng: -66.8331 },
  { patterns: [/la candelaria/i], lat: 10.5064, lng: -66.9017 },
  { patterns: [/el paraiso|el paraíso/i], lat: 10.4886, lng: -66.9225 },
  { patterns: [/propatria/i], lat: 10.4692, lng: -66.9617 },
  { patterns: [/23 de enero/i], lat: 10.4953, lng: -66.9122 },
  { patterns: [/el silencio/i], lat: 10.5036, lng: -66.9192 },
  { patterns: [/bellas artes/i], lat: 10.5011, lng: -66.8997 },
  { patterns: [/plaza venezuela/i], lat: 10.4964, lng: -66.8717 },
  { patterns: [/los dos caminos/i], lat: 10.5019, lng: -66.8283 },
  { patterns: [/santa monica|santa mónica/i], lat: 10.4947, lng: -66.8469 },
  { patterns: [/la florida/i], lat: 10.4986, lng: -66.8567 },
  { patterns: [/san bernardino/i], lat: 10.5011, lng: -66.8753 },
  { patterns: [/montalban|montalbán/i], lat: 10.4536, lng: -66.9125 },
  { patterns: [/las mercedes/i], lat: 10.4819, lng: -66.8558 },
  { patterns: [/el cafetal/i], lat: 10.4192, lng: -66.8406 },
  { patterns: [/la trinidad/i], lat: 10.4192, lng: -66.8569 },
  { patterns: [/los chaguaramos|chaguaramos/i], lat: 10.4903, lng: -66.8847 },
  // --- Miranda (interior / valles) ---
  { patterns: [/los teques/i], lat: 10.3422, lng: -67.0392 },
  { patterns: [/guarenas/i], lat: 10.4681, lng: -66.6186 },
  { patterns: [/guatire/i], lat: 10.4719, lng: -66.5408 },
  { patterns: [/santa teresa del tuy/i], lat: 10.2311, lng: -66.6647 },
  { patterns: [/charallave/i], lat: 10.3186, lng: -66.8567 },
  { patterns: [/ocumare del tuy/i], lat: 10.1175, lng: -66.7811 },
  { patterns: [/higuerote/i], lat: 10.4819, lng: -66.1008 },
  { patterns: [/rio chico|río chico/i], lat: 10.3053, lng: -65.9811 },
  { patterns: [/caucagua/i], lat: 10.2853, lng: -66.3281 },
  // --- La Guaira (Vargas) ---
  { patterns: [/la guaira/i], lat: 10.6006, lng: -66.9331 },
  { patterns: [/macuto/i], lat: 10.6119, lng: -66.8769 },
  { patterns: [/catia la mar/i], lat: 10.6053, lng: -66.9758 },
  { patterns: [/caraballeda/i], lat: 10.6111, lng: -66.8492 },
  { patterns: [/naiguata|naiguatá/i], lat: 10.6189, lng: -66.7633 },
  // --- Aragua ---
  { patterns: [/maracay/i], lat: 10.2469, lng: -67.5958 },
  { patterns: [/turmero/i], lat: 10.2286, lng: -67.4722 },
  { patterns: [/la victoria/i], lat: 10.2325, lng: -67.3325 },
  { patterns: [/cagua/i], lat: 10.1858, lng: -67.4586 },
  { patterns: [/villa de cura/i], lat: 10.0369, lng: -67.4808 },
  { patterns: [/el limon|el limón/i], lat: 10.3061, lng: -67.6331 },
  { patterns: [/colonia tovar/i], lat: 10.4061, lng: -67.2908 },
  { patterns: [/ocumare de la costa/i], lat: 10.4572, lng: -67.7708 },
  // --- Carabobo ---
  { patterns: [/valencia/i], lat: 10.1806, lng: -68.0039 },
  { patterns: [/puerto cabello/i], lat: 10.4731, lng: -68.0125 },
  { patterns: [/naguanagua/i], lat: 10.2675, lng: -68.0186 },
  { patterns: [/guacara/i], lat: 10.2269, lng: -67.8789 },
  { patterns: [/san diego/i], lat: 10.2583, lng: -67.9442 },
  { patterns: [/mariara/i], lat: 10.3006, lng: -67.8308 },
  { patterns: [/moron|morón/i], lat: 10.4861, lng: -68.1994 },
  // --- Lara ---
  { patterns: [/barquisimeto/i], lat: 10.0736, lng: -69.3228 },
  { patterns: [/cabudare/i], lat: 10.0233, lng: -69.2708 },
  { patterns: [/carora/i], lat: 10.1753, lng: -70.0778 },
  { patterns: [/el tocuyo/i], lat: 9.7869, lng: -69.7919 },
  { patterns: [/quibor|quíbor/i], lat: 9.9289, lng: -69.6158 },
  // --- Falcón ---
  { patterns: [/coro/i], lat: 11.4039, lng: -69.6806 },
  { patterns: [/punto fijo/i], lat: 11.6997, lng: -70.1869 },
  { patterns: [/tucacas/i], lat: 10.7936, lng: -68.3256 },
  { patterns: [/chichiriviche/i], lat: 10.9331, lng: -68.2756 },
  { patterns: [/morrocoy/i], lat: 10.8903, lng: -68.2808 },
  // --- Yaracuy ---
  { patterns: [/san felipe/i], lat: 10.3381, lng: -68.7425 },
  { patterns: [/yaritagua/i], lat: 10.0819, lng: -69.1308 },
  { patterns: [/chivacoa/i], lat: 10.1581, lng: -68.8983 },
  // --- Mérida (Andes) ---
  { patterns: [/merida|mérida/i], lat: 8.5842, lng: -71.1417 },
  { patterns: [/el vigia|el vigía/i], lat: 8.6181, lng: -71.6531 },
  { patterns: [/tovar/i], lat: 8.3333, lng: -71.75 },
  { patterns: [/ejido/i], lat: 8.5467, lng: -71.2406 },
  { patterns: [/mucuchies|mucuchíes/i], lat: 8.75, lng: -70.9167 },
  { patterns: [/bailadores/i], lat: 8.25, lng: -71.8167 },
  // --- Táchira (zona sísmica activa) ---
  { patterns: [/san cristobal|san cristóbal/i], lat: 7.7683, lng: -72.2297 },
  { patterns: [/tariba|táriba/i], lat: 7.8189, lng: -72.2167 },
  { patterns: [/rubio/i], lat: 7.7, lng: -72.35 },
  { patterns: [/la grita/i], lat: 8.1372, lng: -71.9831 },
  { patterns: [/capacho/i], lat: 7.8167, lng: -72.3167 },
  // --- Zulia ---
  { patterns: [/maracaibo/i], lat: 10.6317, lng: -71.6406 },
  { patterns: [/cabimas/i], lat: 10.3986, lng: -71.4517 },
  { patterns: [/ciudad ojeda/i], lat: 10.2003, lng: -71.3075 },
  { patterns: [/machiques/i], lat: 10.0667, lng: -72.55 },
  { patterns: [/santa barbara|santa bárbara/i], lat: 8.9889, lng: -71.9558 },
  // --- Sucre (costa, zona sísmica) ---
  { patterns: [/cumana|cumaná/i], lat: 10.4564, lng: -64.1725 },
  { patterns: [/carupano|carúpano/i], lat: 10.6692, lng: -63.24 },
  { patterns: [/guiria|güiria/i], lat: 10.575, lng: -62.2981 },
  { patterns: [/rio caribe|río caribe/i], lat: 10.6967, lng: -63.1075 },
  // --- Anzoátegui ---
  { patterns: [/barcelona/i], lat: 10.1333, lng: -64.6833 },
  { patterns: [/puerto la cruz/i], lat: 10.2167, lng: -64.6167 },
  { patterns: [/lecheria|lechería/i], lat: 10.2, lng: -64.6833 },
  { patterns: [/anaco/i], lat: 9.4333, lng: -64.4667 },
  { patterns: [/el tigre/i], lat: 8.8833, lng: -64.25 },
  // --- Monagas ---
  { patterns: [/maturin|maturín/i], lat: 9.75, lng: -63.1833 },
  { patterns: [/punta de mata/i], lat: 9.6833, lng: -63.6167 },
  // --- Bolívar ---
  { patterns: [/ciudad bolivar|ciudad bolívar/i], lat: 8.1167, lng: -63.55 },
  { patterns: [/puerto ordaz/i], lat: 8.3167, lng: -62.7 },
  { patterns: [/upata/i], lat: 8.0167, lng: -62.4 },
  { patterns: [/caicara/i], lat: 7.6333, lng: -66.1667 },
  // --- Nueva Esparta (isla de Margarita) ---
  { patterns: [/porlamar/i], lat: 10.9589, lng: -63.8694 },
  { patterns: [/la asuncion|la asunción/i], lat: 11.0292, lng: -63.8678 },
  { patterns: [/pampatar/i], lat: 10.9944, lng: -63.7897 },
  { patterns: [/juan griego/i], lat: 11.0825, lng: -63.965 },
  { patterns: [/el yaque/i], lat: 10.9025, lng: -63.9344 },
];

function geoLookup(text: string): { lat: number | null; lng: number | null } {
  for (const entry of GEO_LOOKUP) {
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) return { lat: entry.lat, lng: entry.lng };
    }
  }
  return { lat: null, lng: null };
}

// ----- Clasificador principal -----------------------------------------------

export function classifyHeuristic(rawText: string): Classification {
  const text = normalize(rawText);
  const { type, score } = detectType(text);
  const priority = detectPriority(text, type);
  const peopleAffected = detectPeople(text);
  const locationText = detectLocation(rawText);
  const { lat, lng } = geoLookup(rawText);

  // Confianza calibrada según señales encontradas:
  //   - score de keywords (0-...)
  //   - prioridad detectada
  //   - personas afectadas detectadas
  //   - ubicación detectada
  let confidence = 0.3;
  if (score > 0) confidence += Math.min(score / 30, 0.3);
  if (priority === 'critica' || priority === 'alta') confidence += 0.12;
  if (peopleAffected !== null) confidence += 0.08;
  if (locationText !== null) confidence += 0.08;
  if (lat !== null) confidence += 0.07;
  confidence = Math.min(0.92, Number(confidence.toFixed(2)));

  return {
    incidentType: type,
    priority,
    peopleAffected,
    locationText,
    lat,
    lng,
    confidence,
    recommendedTeam: TEAM_BY_TYPE[type],
    engine: 'heuristic',
  };
}
