/* eslint-disable no-console */

import { config } from './config';

// ---------------------------------------------------------------------------
// Seed DEMO: envía reportes realistas contra el endpoint de simulación
// (POST /api/whatsapp/simulate + POST /api/reports) para que pasen por TODO
// el pipeline: clasificación, dedup, inserción y sync al frontend.
//
// No toca la base de datos: todo entra como si fuera un mensaje ciudadano.
//
// Uso: npm run seed:demo -w @pdv/api -- [cantidad]
//      API_URL=http://localhost:4000 npm run seed:demo -w @pdv/api -- 3000
// ---------------------------------------------------------------------------

const TOWNS: { name: string; lat: number; lng: number }[] = [
  // --- Distrito Capital (sectores de Caracas) ---
  { name: 'Petare', lat: 10.4768, lng: -66.8089 },
  { name: 'El Valle', lat: 10.4634, lng: -66.9171 },
  { name: 'La Vega', lat: 10.4881, lng: -66.9418 },
  { name: 'Antímano', lat: 10.4657, lng: -66.9791 },
  { name: 'Catia', lat: 10.5099, lng: -66.9411 },
  { name: 'Caricuao', lat: 10.4347, lng: -66.9778 },
  { name: 'Coche', lat: 10.4547, lng: -66.9028 },
  { name: 'San Agustín', lat: 10.4912, lng: -66.8951 },
  { name: 'Sabana Grande', lat: 10.4953, lng: -66.8373 },
  { name: 'Macarao', lat: 10.4462, lng: -67.0139 },
  { name: '23 de Enero', lat: 10.4953, lng: -66.9122 },
  { name: 'La Candelaria', lat: 10.5064, lng: -66.9017 },
  { name: 'San Bernardino', lat: 10.5011, lng: -66.8753 },
  { name: 'Los Chaguaramos', lat: 10.4903, lng: -66.8847 },
  { name: 'El Silencio', lat: 10.5036, lng: -66.9192 },
  { name: 'Santa Mónica', lat: 10.4947, lng: -66.8469 },
  { name: 'El Paraíso', lat: 10.4886, lng: -66.9225 },
  { name: 'Montalbán', lat: 10.4536, lng: -66.9125 },
  { name: 'Las Mercedes', lat: 10.4819, lng: -66.8558 },
  { name: 'Bello Monte', lat: 10.4883, lng: -66.8642 },
  { name: 'El Cafetal', lat: 10.4192, lng: -66.8406 },
  { name: 'La Trinidad', lat: 10.4192, lng: -66.8569 },
  { name: 'El Marqués', lat: 10.4936, lng: -66.8217 },
  { name: 'Palo Verde', lat: 10.4797, lng: -66.8203 },
  { name: 'Boleíta', lat: 10.4850, lng: -66.8322 },
  { name: 'Los Dos Caminos', lat: 10.5019, lng: -66.8283 },
  { name: 'Los Ruices', lat: 10.4950, lng: -66.8150 },
  { name: 'La Urbina', lat: 10.4900, lng: -66.8050 },
  { name: 'Copacabana', lat: 10.4961, lng: -66.8719 },
  // --- Miranda ---
  { name: 'Los Teques', lat: 10.3422, lng: -67.0392 },
  { name: 'Guarenas', lat: 10.4681, lng: -66.6186 },
  { name: 'Guatire', lat: 10.4719, lng: -66.5408 },
  { name: 'Santa Teresa del Tuy', lat: 10.2311, lng: -66.6647 },
  { name: 'Charallave', lat: 10.3186, lng: -66.8567 },
  { name: 'Ocumare del Tuy', lat: 10.1175, lng: -66.7811 },
  { name: 'Baruta', lat: 10.4335, lng: -66.8683 },
  { name: 'Chacao', lat: 10.4965, lng: -66.8507 },
  { name: 'Higuerote', lat: 10.4819, lng: -66.1008 },
  { name: 'Río Chico', lat: 10.3053, lng: -65.9811 },
  { name: 'Caucagua', lat: 10.2853, lng: -66.3281 },
  { name: 'San Francisco de Yare', lat: 10.1769, lng: -66.7489 },
  // --- La Guaira ---
  { name: 'La Guaira', lat: 10.6006, lng: -66.9331 },
  { name: 'Macuto', lat: 10.6119, lng: -66.8769 },
  { name: 'Catia La Mar', lat: 10.6053, lng: -66.9758 },
  { name: 'Caraballeda', lat: 10.6111, lng: -66.8492 },
  { name: 'Naiguatá', lat: 10.6189, lng: -66.7633 },
  { name: 'Maiquetía', lat: 10.5964, lng: -66.9519 },
  { name: 'Tanaguarena', lat: 10.6094, lng: -66.8936 },
  // --- Aragua ---
  { name: 'Maracay', lat: 10.2469, lng: -67.5958 },
  { name: 'Turmero', lat: 10.2286, lng: -67.4722 },
  { name: 'La Victoria', lat: 10.2325, lng: -67.3325 },
  { name: 'Cagua', lat: 10.1858, lng: -67.4586 },
  { name: 'Villa de Cura', lat: 10.0369, lng: -67.4808 },
  { name: 'El Limón', lat: 10.3061, lng: -67.6331 },
  { name: 'Colonia Tovar', lat: 10.4061, lng: -67.2908 },
  { name: 'Ocumare de la Costa', lat: 10.4572, lng: -67.7708 },
  { name: 'San Mateo', lat: 10.2100, lng: -67.4269 },
  { name: 'Palo Negro', lat: 10.1733, lng: -67.5494 },
  { name: 'Santa Rita', lat: 10.2058, lng: -67.5094 },
  // --- Carabobo ---
  { name: 'Valencia', lat: 10.1806, lng: -68.0039 },
  { name: 'Puerto Cabello', lat: 10.4731, lng: -68.0125 },
  { name: 'Naguanagua', lat: 10.2675, lng: -68.0186 },
  { name: 'Guacara', lat: 10.2269, lng: -67.8789 },
  { name: 'San Diego', lat: 10.2583, lng: -67.9442 },
  { name: 'Mariara', lat: 10.3006, lng: -67.8308 },
  { name: 'Los Guayos', lat: 10.1856, lng: -67.9308 },
  { name: 'Morón', lat: 10.4861, lng: -68.1994 },
  { name: 'Tocuyito', lat: 10.1000, lng: -68.0667 },
  // --- Lara ---
  { name: 'Barquisimeto', lat: 10.0736, lng: -69.3228 },
  { name: 'Cabudare', lat: 10.0233, lng: -69.2708 },
  { name: 'Carora', lat: 10.1753, lng: -70.0778 },
  { name: 'El Tocuyo', lat: 9.7869, lng: -69.7919 },
  { name: 'Quíbor', lat: 9.9289, lng: -69.6158 },
  { name: 'Duaca', lat: 10.2892, lng: -69.1681 },
  { name: 'Sarare', lat: 9.7833, lng: -69.1000 },
  // --- Falcón ---
  { name: 'Coro', lat: 11.4039, lng: -69.6806 },
  { name: 'Punto Fijo', lat: 11.6997, lng: -70.1869 },
  { name: 'Tucacas', lat: 10.7936, lng: -68.3256 },
  { name: 'Chichiriviche', lat: 10.9331, lng: -68.2756 },
  { name: 'Puerto Cumarebo', lat: 11.4869, lng: -69.3456 },
  { name: 'La Vela de Coro', lat: 11.4583, lng: -69.5653 },
  // --- Yaracuy ---
  { name: 'San Felipe', lat: 10.3381, lng: -68.7425 },
  { name: 'Yaritagua', lat: 10.0819, lng: -69.1308 },
  { name: 'Chivacoa', lat: 10.1581, lng: -68.8983 },
  { name: 'Aroa', lat: 10.4397, lng: -68.8892 },
  { name: 'Nirgua', lat: 10.1500, lng: -68.5667 },
  // --- Mérida ---
  { name: 'Mérida', lat: 8.5842, lng: -71.1417 },
  { name: 'El Vigía', lat: 8.6181, lng: -71.6531 },
  { name: 'Tovar', lat: 8.3333, lng: -71.7500 },
  { name: 'Ejido', lat: 8.5467, lng: -71.2406 },
  { name: 'Mucuchíes', lat: 8.7500, lng: -70.9167 },
  { name: 'Santa Elena de Arenales', lat: 8.8189, lng: -71.4417 },
  { name: 'Bailadores', lat: 8.2500, lng: -71.8167 },
  { name: 'Lagunillas', lat: 8.5139, lng: -71.3861 },
  { name: 'Tabay', lat: 8.6333, lng: -71.0833 },
  // --- Táchira ---
  { name: 'San Cristóbal', lat: 7.7683, lng: -72.2297 },
  { name: 'Táriba', lat: 7.8189, lng: -72.2167 },
  { name: 'Rubio', lat: 7.7000, lng: -72.3500 },
  { name: 'La Grita', lat: 8.1372, lng: -71.9831 },
  { name: 'Capacho', lat: 7.8167, lng: -72.3167 },
  { name: 'San Antonio del Táchira', lat: 7.8167, lng: -72.4500 },
  { name: 'Colón', lat: 8.0333, lng: -72.2500 },
  // --- Zulia ---
  { name: 'Maracaibo', lat: 10.6317, lng: -71.6406 },
  { name: 'Cabimas', lat: 10.3986, lng: -71.4517 },
  { name: 'Ciudad Ojeda', lat: 10.2003, lng: -71.3075 },
  { name: 'Machiques', lat: 10.0667, lng: -72.5500 },
  { name: 'Santa Bárbara del Zulia', lat: 8.9889, lng: -71.9558 },
  { name: 'La Cañada de Urdaneta', lat: 10.4344, lng: -71.6567 },
  { name: 'San Francisco', lat: 10.5750, lng: -71.6450 },
  { name: 'Villa del Rosario', lat: 10.3167, lng: -72.3167 },
  { name: 'Bachaquero', lat: 10.0000, lng: -71.1333 },
  // --- Sucre ---
  { name: 'Cumaná', lat: 10.4564, lng: -64.1725 },
  { name: 'Carúpano', lat: 10.6692, lng: -63.2400 },
  { name: 'Güiria', lat: 10.5750, lng: -62.2981 },
  { name: 'Río Caribe', lat: 10.6967, lng: -63.1075 },
  { name: 'Casanay', lat: 10.5000, lng: -63.4167 },
  { name: 'Yaguaraparo', lat: 10.5833, lng: -62.8333 },
  // --- Anzoátegui ---
  { name: 'Barcelona', lat: 10.1333, lng: -64.6833 },
  { name: 'Puerto La Cruz', lat: 10.2167, lng: -64.6167 },
  { name: 'Lechería', lat: 10.2000, lng: -64.6833 },
  { name: 'Anaco', lat: 9.4333, lng: -64.4667 },
  { name: 'El Tigre', lat: 8.8833, lng: -64.2500 },
  { name: 'Pariaguán', lat: 8.8500, lng: -64.7000 },
  { name: 'Cantaura', lat: 9.3000, lng: -64.3500 },
  // --- Monagas ---
  { name: 'Maturín', lat: 9.7500, lng: -63.1833 },
  { name: 'Punta de Mata', lat: 9.6833, lng: -63.6167 },
  { name: 'Temblador', lat: 9.0167, lng: -62.6333 },
  { name: 'Caripe', lat: 10.1667, lng: -63.5000 },
  // --- Bolívar ---
  { name: 'Ciudad Bolívar', lat: 8.1167, lng: -63.5500 },
  { name: 'Puerto Ordaz', lat: 8.3167, lng: -62.7000 },
  { name: 'Upata', lat: 8.0167, lng: -62.4000 },
  { name: 'Caicara del Orinoco', lat: 7.6333, lng: -66.1667 },
  { name: 'El Callao', lat: 7.3500, lng: -61.8167 },
  { name: 'Ciudad Guayana', lat: 8.3500, lng: -62.6500 },
  // --- Delta Amacuro ---
  { name: 'Tucupita', lat: 9.0500, lng: -62.0500 },
  // --- Amazonas ---
  { name: 'Puerto Ayacucho', lat: 5.6667, lng: -67.6333 },
  // --- Nueva Esparta ---
  { name: 'Porlamar', lat: 10.9589, lng: -63.8694 },
  { name: 'La Asunción', lat: 11.0292, lng: -63.8678 },
  { name: 'Pampatar', lat: 10.9944, lng: -63.7897 },
  { name: 'Juan Griego', lat: 11.0825, lng: -63.9650 },
  { name: 'El Yaque', lat: 10.9025, lng: -63.9344 },
  { name: 'Punta de Piedras', lat: 10.9000, lng: -64.1000 },
  // --- Cojedes ---
  { name: 'San Carlos', lat: 9.6500, lng: -68.5833 },
  { name: 'Tinaco', lat: 9.7000, lng: -68.4333 },
  // --- Trujillo ---
  { name: 'Valera', lat: 9.3167, lng: -70.6167 },
  { name: 'Trujillo', lat: 9.3667, lng: -70.4333 },
  { name: 'Boconó', lat: 9.2500, lng: -70.2667 },
  // --- Portuguesa ---
  { name: 'Acarigua', lat: 9.5500, lng: -69.2000 },
  { name: 'Araure', lat: 9.5667, lng: -69.2167 },
  { name: 'Guanare', lat: 9.0333, lng: -69.7500 },
  // --- Barinas ---
  { name: 'Barinas', lat: 8.6167, lng: -70.2167 },
  { name: 'Socopó', lat: 8.2333, lng: -70.8333 },
  { name: 'Santa Bárbara', lat: 7.8000, lng: -71.1833 },
  // --- Guárico ---
  { name: 'San Juan de los Morros', lat: 9.9000, lng: -67.3500 },
  { name: 'Calabozo', lat: 8.9333, lng: -67.4333 },
  { name: 'Valle de la Pascua', lat: 9.2000, lng: -66.0167 },
  { name: 'Zaraza', lat: 9.3333, lng: -65.3333 },
  { name: 'Altagracia de Orituco', lat: 9.8500, lng: -66.3833 },
  // --- Apure ---
  { name: 'San Fernando de Apure', lat: 7.8833, lng: -67.4667 },
  { name: 'Guasdualito', lat: 7.2500, lng: -70.7333 },
  { name: 'Elorza', lat: 7.0667, lng: -69.5000 },
];

const LOC_PREFIXES = [
  (n: string) => `en ${n}`,
  (n: string) => `cerca de ${n}`,
  (n: string) => `por el sector ${n}`,
  (n: string) => `en la zona de ${n}`,
  (n: string) => `al lado de ${n}`,
  (n: string) => `en las cercanías de ${n}`,
  (n: string) => `en ${n} centro`,
  (n: string) => `a dos cuadras de ${n}`,
  (n: string) => `en los alrededores de ${n}`,
  (n: string) => `subiendo hacia ${n}`,
  (n: string) => `detrás del mercado de ${n}`,
  (n: string) => `en la entrada de ${n}`,
  (n: string) => `cruzando el puente de ${n}`,
  (n: string) => `en el barrio ${n}`,
  (n: string) => `en la parte alta de ${n}`,
  (n: string) => `a orillas del río en ${n}`,
  (n: string) => `en la carretera hacia ${n}`,
  (n: string) => `en las afueras de ${n}`,
  (n: string) => `por la plaza de ${n}`,
  (n: string) => `en el casco central de ${n}`,
];

const TEMPLATES = [
  (loc: string, n: number) => `Se derrumbó un edificio en ${loc}, hay ${n} personas atrapadas bajo los escombros, necesitamos maquinaria pesada urgente`,
  (loc: string, n: number) => `Colapsó una vivienda en ${loc} por las lluvias, ${n} familias perdieron todo lo que tenían`,
  (loc: string, n: number) => `Incendio descontrolado en ${loc}, el fuego consumió ${n} viviendas y avanza rápido`,
  (loc: string, n: number) => `Deslave de tierra en ${loc}, ${n} casas quedaron sepultadas, hay personas desaparecidas`,
  (loc: string, n: number) => `Explosión por acumulación de gas en ${loc}, dejó ${n} heridos graves y daños materiales enormes`,
  (loc: string, n: number) => `Inundación repentina en ${loc}, el agua subió hasta los techos y ${n} personas quedaron atrapadas`,
  (loc: string, n: number) => `Buscamos a ${n} personas desaparecidas en ${loc}, salieron ayer y no regresaron a sus casas`,
  (loc: string, n: number) => `${n} niños con deshidratación severa en ${loc}, el ambulatorio no tiene suero ni medicinas básicas`,
  (loc: string, n: number) => `Corte de agua lleva ${n} días en ${loc}, las familias están comprando agua a camiones cisterna a precios muy altos`,
  (loc: string, n: number) => `${n} familias sin alimentos en ${loc}, los niños llevan dos días sin comer, necesitamos ayuda urgente`,
  (loc: string, n: number) => `Desbordamiento del río en ${loc}, ${n} viviendas fueron arrastradas por la corriente`,
  (loc: string, n: number) => `Mujer embarazada con complicaciones en ${loc}, necesita ambulancia urgente, tiene contracciones cada 2 minutos`,
  (loc: string, n: number) => `Paro cardíaco en ${loc}, un adulto mayor se desplomó en la vía pública, alguien sabe RCP pero necesita desfibrilador`,
  (loc: string, n: number) => `Adulto mayor abandonado en ${loc}, tiene ${n} años y está solo sin comida ni medicinas desde hace días`,
  (loc: string, n: number) => `Grietas profundas en las paredes de ${n} edificios en ${loc}, los vecinos temen que se caigan con el próximo sismo`,
  (loc: string, n: number) => `Fuga de gas peligrosa en ${loc}, están evacuando ${n} manzanas a la redonda por riesgo de explosión`,
  (loc: string, n: number) => `Accidente de tránsito múltiple en ${loc}, ${n} vehículos involucrados y varios heridos atrapados dentro`,
  (loc: string, n: number) => `Disparos en ${loc} durante ${n} horas, los vecinos no pueden salir de sus casas, hay heridos`,
  (loc: string, n: number) => `Derrumbe de un cerro en ${loc}, ${n} toneladas de tierra cayeron sobre la carretera principal y hay vehículos sepultados`,
  (loc: string, n: number) => `${n} adolescentes intoxicados con alcohol adulterado en ${loc}, están graves en la emergencia del hospital`,
  (loc: string, n: number) => `Corte eléctrico en el hospital de ${loc}, los generadores funcionan pero solo tienen combustible para ${n} horas más`,
  (loc: string, n: number) => `Se cayó un árbol gigante en ${loc}, bloqueó la calle principal y dañó ${n} vehículos estacionados`,
  (loc: string, n: number) => `Brote de diarrea en ${n} niños de ${loc}, el agua de la quebrada está contaminada con aguas negras`,
  (loc: string, n: number) => `Incendio en un depósito de reciclaje en ${loc}, el humo negro se ve desde ${n} kilómetros a la redonda`,
  (loc: string, n: number) => `Alud de lodo en la carretera cerca de ${loc}, hay personas atrapadas dentro de sus vehículos`,
  (loc: string, n: number) => `Tanque de agua potable contaminado en ${loc}, ${n} familias beben agua sucia y ya hay casos de diarrea`,
  (loc: string, n: number) => `Desapareció una niña de ${n} años en ${loc}, salió a la escuela y nunca llegó, lleva 24 horas perdida`,
  (loc: string, n: number) => `Riña colectiva en ${loc}, ${n} personas heridas con arma blanca y una está muy grave`,
  (loc: string, n: number) => `Refugio colapsó en ${loc}: ${n} personas duermen a la intemperie porque no hay espacio para todos`,
  (loc: string, n: number) => `Se reporta un sismo de magnitud ${(n / 10 + 4).toFixed(1)} en ${loc}, hay grietas en varias edificaciones`,
  (loc: string, n: number) => `Se necesitan donantes de sangre tipo O+ para ${n} heridos graves en el hospital de ${loc}`,
  (loc: string, n: number) => `La quebrada de ${loc} se desbordó, ${n} familias perdieron sus enseres y están en los techos esperando rescate`,
  (loc: string, n: number) => `Plantas de tratamiento de agua dañadas en ${loc}, ${n} barrios sin servicio por tiempo indeterminado`,
  (loc: string, n: number) => `Desplome de un puente peatonal en ${loc}, dejó varias personas heridas que cayeron desde gran altura`,
  (loc: string, n: number) => `Incendio estructural en un galpón industrial en ${loc}, ${n} trabajadores lograron salir pero hay uno atrapado`,
  (loc: string, n: number) => `Vivienda precaria colapsó en ${loc}, una familia de ${n} personas quedó damnificada y necesita refugio urgente`,
  (loc: string, n: number) => `En ${loc} hay ${n} pacientes graves y el hospital no tiene insumos para tratarlos`,
  (loc: string, n: number) => `Lluvias torrenciales en ${loc}, el nivel del río subió ${n} metros en una hora, evacuación preventiva activada`,
  (loc: string, n: number) => `Se registraron ${n} réplicas del sismo en ${loc}, la población está en pánico y duerme en las calles`,
  (loc: string, n: number) => `Fallas en el sistema de cloacas en ${loc}, las aguas negras brotan en las calles y hay riesgo de epidemia`,
  (loc: string, n: number) => `Se necesita transporte para evacuar ${n} personas de ${loc}, las calles están bloqueadas por el lodo`,
  (loc: string, n: number) => `Un poste de luz cayó en ${loc}, hay cables electrificados en la calle y ${n} casas sin electricidad`,
  (loc: string, n: number) => `Se reportan ${n} casos de dengue en ${loc}, el hospital está colapsado y no tienen medicamentos`,
  (loc: string, n: number) => `Deslizamiento de tierra en ${loc}, ${n} viviendas están en riesgo de colapsar, necesitan ser evacuadas ya`,
  (loc: string, n: number) => `Incendio forestal en ${loc}, el fuego se acerca a ${n} viviendas y el viento está fuerte`,
  (loc: string, n: number) => `Robo con violencia en ${loc}, ${n} vecinos fueron asaltados en sus casas anoche, hay inseguridad total`,
  (loc: string, n: number) => `Filtración de gas en ${loc}, ${n} familias fueron evacuadas por prevención, bomberos en el sitio`,
  (loc: string, n: number) => `Colapso de un muro de contención en ${loc}, ${n} casas quedaron expuestas a derrumbes`,
  (loc: string, n: number) => `Se busca a ${n} pescadores desaparecidos en ${loc}, salieron al mar y no regresaron, mal tiempo`,
  (loc: string, n: number) => `Cerro amenaza con derrumbarse sobre ${n} viviendas en ${loc}, están pidiendo reubicación urgente`,
  (loc: string, n: number) => `Ancianos abandonados en ${loc}, ${n} adultos mayores están solos sin agua ni comida desde hace una semana`,
];

const SOURCES = ['whatsapp', 'whatsapp', 'telefono', 'pwa', 'redes'] as const;

const NAMES = [
  'María Pérez', 'José Rodríguez', 'Ana Gómez', 'Luis Martínez', 'Carla Díaz',
  'Pedro Sánchez', 'Rosa Herrera', 'Miguel Torres', 'Yolanda Ríos', 'Carlos Mendoza',
  'Sofía Medina', 'Diego Castillo', 'Valentina López', 'Andrés Silva', 'Gabriela Moreno',
  'Samuel Contreras', 'Isabella Rojas', 'Mateo Hernández', 'Victoria Jiménez',
  'Sebastián Díaz', 'Daniela Peña', 'Jorge Ramos', 'Camila Flores', 'Fernando Ortiz',
  'Luciana Gil', 'Pablo Acosta', 'Martina Cárdenas', 'Adrián Delgado', 'Julieta Paredes',
  'Emilio Guerrero', 'Bárbara Salazar', 'Leonardo Quintero', 'Andrea Cordero',
  'Joaquín Montero', 'Sara Navarro', 'Facundo Rivas', 'Antonella Campos',
  'Nicolás Herrera', 'Renata Suárez', 'Bruno Vega', 'Emilia Paz', 'Martín León',
  'Josefina Mora', 'Benjamín Soto', 'Guadalupe Ferrer', 'Santiago Cruz',
  'Mariana Ochoa', 'Tomás Aguirre', 'Valeria Bravo', 'Maximiliano Luna',
];

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

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function randomPhone(rng: () => number): string {
  const prefix = pick(['412', '414', '424', '416', '426'], rng);
  let n = '';
  for (let i = 0; i < 7; i++) n += String(randInt(0, 9, rng));
  return `+58${prefix}${n}`;
}

/**
 * Genera reportes simulando la dinámica real de un desastre:
 * - Eventos aislados en distintas ciudades aparecen constantemente.
 * - Olas de emergencia: cada cierto número de reportes, se desata un desastre
 *   regional (ej. terremoto, inundaciones) que genera múltiples reportes
 *   desde la misma zona con tipos relacionados durante varios mensajes.
 * - Cada reporte tiene ubicación, texto y coordenadas únicas.
 */
function generateMessages(total: number, seed: number) {
  const rng = mulberry32(seed);
  const messages: Array<{ text: string; phone: string; name: string; lat: number; lng: number; source: string }> = [];
  const remaining = TOWNS.slice(); // copia para consumir sin repetir en lo posible
  let waveType: string | null = null;
  let waveCount = 0;

  for (let i = 0; i < total; i++) {
    // Selección aleatoria de ubicación con sesgo a no repetir
    let base: typeof TOWNS[number];
    if (remaining.length > 0 && rng() < 0.7) {
      const idx = Math.floor(rng() * remaining.length);
      base = remaining.splice(idx, 1)[0];
    } else {
      base = pick(TOWNS, rng);
    }

    // Olas de desastre: cada ~80 reportes, 15-30 mensajes concentrados en una zona
    const waveTrigger = i > 0 && i % randInt(60, 120, rng) === 0 && waveCount === 0;
    if (waveTrigger) {
      waveType = pick(['inundacion', 'sismo', 'deslave', 'incendio_masivo', 'estructural'], rng);
      waveCount = randInt(15, 35, rng);
    }

    let tplIdx: number;
    let n: number;
    if (waveCount > 0 && waveType) {
      // Durante una ola, usar templates relacionados
      const waveTemplates: Record<string, number[]> = {
        inundacion: [5, 10, 31, 37, 43],
        sismo: [14, 29, 38, 42],
        deslave: [3, 18, 27, 44],
        incendio_masivo: [2, 23, 45],
        estructural: [0, 1, 14, 33, 48],
      };
      const idxs = waveTemplates[waveType] ?? [0];
      tplIdx = pick(idxs, rng);
      n = randInt(10, 200, rng);
      waveCount--;
      // Usar ubicaciones cercanas durante la ola
      if (waveCount > 0) {
        const nearby = TOWNS.filter((t) => {
          const dlat = t.lat - base.lat;
          const dlng = t.lng - base.lng;
          return Math.sqrt(dlat * dlat + dlng * dlng) < 1.5;
        });
        if (nearby.length > 0 && rng() < 0.6) base = pick(nearby, rng);
      }
    } else {
      tplIdx = Math.floor(rng() * TEMPLATES.length);
      n = randInt(1, 25, rng);
    }

    const prefixIdx = Math.floor(rng() * LOC_PREFIXES.length);
    const prefix = LOC_PREFIXES[prefixIdx];
    const locText = prefix(base.name);
    const text = TEMPLATES[tplIdx](locText, n);

    // Jitter de coordenadas (~3km) para que no todas las coordenadas sean idénticas
    const jitter = 0.03;
    const lat = base.lat + (rng() - 0.5) * jitter;
    const lng = base.lng + (rng() - 0.5) * jitter;

    messages.push({
      text,
      phone: randomPhone(rng),
      name: pick(NAMES, rng),
      lat,
      lng,
      source: SOURCES[Math.floor(rng() * SOURCES.length)],
    });
  }
  return messages;
}

/**
 * Modelo de tráfico realista: simula el ritmo variable de llegada de reportes.
 *
 * - Tráfico normal: 1-4 msg/s (delay 250-1000ms entre mensajes).
 * - Ráfaga (ola de desastre): 10-30 msg/s (delay 30-100ms).
 * - Silencio: pausas de 2-5s que simulan momentos sin novedades.
 * - Noche: cada ~30s hay una "noche" que ralentiza todo (8-15s de silencio).
 */
function* trafficPattern(total: number, waveRegions: boolean[], rng: () => number): Generator<number> {
  let nightTimer = 0;
  for (let i = 0; i < total; i++) {
    const inWave = waveRegions[i] ?? false;
    nightTimer++;

    // Cada ~30 mensajes, una pausa nocturna de 8-15s
    if (nightTimer > randInt(25, 45, rng) && rng() < 0.3) {
      nightTimer = 0;
      yield randInt(8000, 15000, rng);
      continue;
    }

    // Cada ~70 mensajes, un silencio de 2-5s
    if (rng() < 0.02) {
      yield randInt(2000, 5000, rng);
      continue;
    }

    if (inWave) {
      // Ráfaga: mensajes cada 30-100ms
      yield randInt(30, 100, rng);
    } else {
      // Normal: 250-1200ms entre mensajes
      yield randInt(250, 1200, rng);
    }
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main() {
  const countArg = Number(process.argv[2] ?? '1500');
  const total = Math.max(10, Math.min(5000, Number.isFinite(countArg) ? countArg : 1500));
  const seed = Number(process.env.SIM_SEED ?? Math.floor(Math.random() * 2147483647));

  const url = (process.env.API_URL ?? `http://127.0.0.1:${config.port}`).replace(/\/$/, '');
  const quiet = !!process.env.SIM_QUIET;

  // Primero generamos los mensajes para saber qué posiciones son "ola"
  const rng = mulberry32(seed);
  const waveRegions: boolean[] = [];
  let wave = 0;
  for (let i = 0; i < total; i++) {
    if (wave > 0) { waveRegions.push(true); wave--; }
    else {
      waveRegions.push(false);
      if (i > 0 && i % randInt(60, 120, rng) === 0) wave = randInt(15, 35, rng);
    }
  }

  // Re-generar con nueva seed para los mensajes (sin contaminar waveRegions)
  const msgSeed = seed + 1;
  const messages = generateMessages(total, msgSeed);

  const delays = [...trafficPattern(total, waveRegions, mulberry32(seed + 2))];

  console.log(`[seed-demo] ${total} reportes contra ${url} (seed=${seed}) — tráfico variable realista`);
  const started = Date.now();
  let ok = 0, failed = 0, duplicates = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const delay = delays[i] ?? 300;

    // Esperar el delay simulado (excepto el primero)
    if (i > 0) await sleep(delay);

    try {
      const isWa = msg.source === 'whatsapp';
      const endpoint = isWa ? '/api/whatsapp/simulate' : '/api/reports';
      const body = isWa
        ? { text: msg.text, phone: msg.phone, name: msg.name, lat: msg.lat, lng: msg.lng }
        : { source: msg.source, rawText: msg.text, reporterPhone: msg.phone, reporterName: msg.name, lat: msg.lat, lng: msg.lng };
      const t0 = Date.now();
      const res = await fetch(`${url}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const ms = Date.now() - t0;

      if (res.ok) {
        ok++;
        const data = await res.json() as { report?: { duplicate_of: string | null } };
        if (data.report?.duplicate_of) duplicates++;
        if (!quiet) {
          const waveMark = waveRegions[i] ? ' 🌊' : '';
          console.log(
            `  #${String(i + 1).padStart(4)} ${delay < 150 ? '⚡' : delay < 400 ? '·' : '—'} ${String(ms).padStart(3)}ms  ✓${ok}  ${msg.source.padEnd(9)} "${msg.text.slice(0, 50).replace(/\s+\S*$/, '')}…"${waveMark}`,
          );
        }
      } else {
        failed++;
        if (!quiet) console.log(`  #${String(i + 1).padStart(4)}  HTTP ${res.status} ✗`);
      }
    } catch {
      failed++;
      if (!quiet) console.log(`  #${String(i + 1).padStart(4)}  ✗ error de red`);
    }

    if (!quiet && (i + 1) % 50 === 0) {
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`  ─── ${i + 1}/${total}  ✓${ok} ✗${failed}  dupes ${duplicates}  ${elapsed}s ───`);
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[seed-demo] Hecho: ${ok}✓ ${failed}✗ ${duplicates} duplicados en ${elapsed}s`);
}

main().catch((err) => {
  console.error('[seed-demo] Error:', err);
  process.exit(1);
});
