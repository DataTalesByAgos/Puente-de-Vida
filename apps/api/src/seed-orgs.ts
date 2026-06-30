/* eslint-disable no-console */

import { randomBytes } from 'node:crypto';
import { query, queryOne } from './db';
import { hashPass } from './auth';

// ---------------------------------------------------------------------------
// Seed de datos mock para el organigrama y usuarios de prueba.
// Crea organizaciones jerárquicas, voluntarios y usuarios de cada rol.
//
// Uso: npm run seed:orgs -w @pdv/api
// ---------------------------------------------------------------------------

interface OrgInput {
  name: string;
  category: string;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  location: string | null;
  parent_name: string | null;
}

interface VolInput {
  name: string;
  phone: string | null;
  role: string;
  profession: string | null;
  skills: string[];
  zone: string | null;
  availability: string;
  org_name: string | null;
}

const ORGANIZATIONS: OrgInput[] = [
  // ── Gobierno ──
  {
    name: 'Protección Civil Venezuela',
    category: 'gobierno',
    description: 'Coordinación nacional de protección civil y desastres',
    contact_name: 'Director Nacional',
    contact_phone: '+584121111111',
    location: 'Caracas, Distrito Capital',
    parent_name: null,
  },
  {
    name: 'PC Distrito Capital',
    category: 'gobierno',
    description: 'Dirección regional Protección Civil Distrito Capital',
    contact_name: 'LCDO. José Martínez',
    contact_phone: '+584121111112',
    location: 'Parroquia Altagracia, Caracas',
    parent_name: 'Protección Civil Venezuela',
  },
  {
    name: 'PC Estado Miranda',
    category: 'gobierno',
    description: 'Dirección regional Protección Civil Miranda',
    contact_name: 'Ing. Carmen López',
    contact_phone: '+584121111113',
    location: 'Los Teques, Miranda',
    parent_name: 'Protección Civil Venezuela',
  },
  {
    name: 'PC Estado La Guaira',
    category: 'gobierno',
    description: 'Dirección regional Protección Civil La Guaira',
    contact_name: 'Sgto. Pedro Hernández',
    contact_phone: '+584121111114',
    location: 'La Guaira, La Guaira',
    parent_name: 'Protección Civil Venezuela',
  },
  {
    name: 'Cuerpo de Bomberos Caracas',
    category: 'gobierno',
    description: 'Cuerpo de bomberos del Distrito Capital',
    contact_name: 'Cmdte. Roberto Sánchez',
    contact_phone: '+584121111115',
    location: 'Sabana Grande, Caracas',
    parent_name: null,
  },
  {
    name: 'Bomberos Forestales',
    category: 'gobierno',
    description: 'División de bomberos forestales del Ministerio de Ecosocialismo',
    contact_name: 'TSU. Ana Flores',
    contact_phone: '+584121111116',
    location: 'El Ávila, Distrito Capital',
    parent_name: null,
  },
  {
    name: 'Ministerio de Salud (MPPS)',
    category: 'gobierno',
    description: 'Ministerio del Poder Popular para la Salud',
    contact_name: 'Dr. Luis Rojas',
    contact_phone: '+584121111117',
    location: 'Parque Central, Caracas',
    parent_name: null,
  },
  {
    name: 'Hospital Pérez Carreño',
    category: 'gobierno',
    description: 'Hospital general en Caracas',
    contact_name: 'Dr. Mario Contreras',
    contact_phone: '+584121111118',
    location: 'Antímano, Caracas',
    parent_name: 'Ministerio de Salud (MPPS)',
  },
  {
    name: 'Ambulatorio El Valle',
    category: 'gobierno',
    description: 'Centro de diagnóstico integral en El Valle',
    contact_name: 'Dra. Rosa Mendoza',
    contact_phone: '+584121111119',
    location: 'El Valle, Caracas',
    parent_name: 'Ministerio de Salud (MPPS)',
  },
  {
    name: 'INE – Gestión de Riesgos',
    category: 'gobierno',
    description: 'Instituto Nacional de Estadística – Monitoreo de zonas de riesgo',
    contact_name: 'Carlos Aguilar',
    contact_phone: '+584121111120',
    location: 'La Candelaria, Caracas',
    parent_name: null,
  },
  // ── ONG ──
  {
    name: 'Cruz Roja Venezolana',
    category: 'ong',
    description: 'Socorro humanitario y atención prehospitalaria',
    contact_name: 'María Fernanda Torres',
    contact_phone: '+584122222221',
    location: 'San Bernardino, Caracas',
    parent_name: null,
  },
  {
    name: 'Cruz Roja – Capítulo Caracas',
    category: 'ong',
    description: 'Delegación Caracas de la Cruz Roja Venezolana',
    contact_name: 'Alejandro Rivas',
    contact_phone: '+584122222222',
    location: 'Sabana Grande, Caracas',
    parent_name: 'Cruz Roja Venezolana',
  },
  {
    name: 'Cruz Roja – Capítulo Miranda',
    category: 'ong',
    description: 'Delegación Miranda de la Cruz Roja Venezolana',
    contact_name: 'Valentina Suárez',
    contact_phone: '+584122222223',
    location: 'Los Teques, Miranda',
    parent_name: 'Cruz Roja Venezolana',
  },
  {
    name: 'Médicos Sin Fronteras Venezuela',
    category: 'ong',
    description: 'Asistencia médica humanitaria en zonas de desastre',
    contact_name: 'Dr. Andrés Castillo',
    contact_phone: '+584122222224',
    location: 'Caracas, Distrito Capital',
    parent_name: null,
  },
  {
    name: 'Un Techo para Venezuela',
    category: 'ong',
    description: 'Construcción de viviendas de emergencia y refugios',
    contact_name: 'Gabriela Mendoza',
    contact_phone: '+584122222225',
    location: 'Caricuao, Caracas',
    parent_name: null,
  },
  {
    name: 'Fundana',
    category: 'ong',
    description: 'Fundación de asistencia a niños y familias vulnerables',
    contact_name: 'Daniela Peña',
    contact_phone: '+584122222226',
    location: 'Las Mercedes, Caracas',
    parent_name: null,
  },
  {
    name: 'Caritas Venezuela',
    category: 'ong',
    description: 'Red de asistencia social de la Iglesia Católica',
    contact_name: 'Pdre. Miguel Orozco',
    contact_phone: '+584122222227',
    location: 'Montalbán, Caracas',
    parent_name: null,
  },
  {
    name: 'Brigada de Rescate Águila',
    category: 'ong',
    description: 'Equipo especializado en rescate vertical y estructuras colapsadas',
    contact_name: 'José Gregorio Ramos',
    contact_phone: '+584122222228',
    location: 'El Paraíso, Caracas',
    parent_name: null,
  },
  // ── Comunitario ──
  {
    name: 'Comité Local Petare',
    category: 'comunitario',
    description: 'Comité de gestión de riesgos de Petare',
    contact_name: 'Yolanda Ríos',
    contact_phone: '+584123333331',
    location: 'Petare, Miranda',
    parent_name: null,
  },
  {
    name: 'Comité Local Catia',
    category: 'comunitario',
    description: 'Comité de gestión de riesgos de Catia',
    contact_name: 'Carlos Mendoza',
    contact_phone: '+584123333332',
    location: 'Catia, Caracas',
    parent_name: null,
  },
  {
    name: 'Comité Local La Vega',
    category: 'comunitario',
    description: 'Comité de gestión de riesgos de La Vega',
    contact_name: 'Sofía Medina',
    contact_phone: '+584123333333',
    location: 'La Vega, Caracas',
    parent_name: null,
  },
  {
    name: 'Comité Local Antímano',
    category: 'comunitario',
    description: 'Comité de gestión de riesgos de Antímano',
    contact_name: 'Samuel Contreras',
    contact_phone: '+584123333334',
    location: 'Antímano, Caracas',
    parent_name: null,
  },
  {
    name: 'Red de Vecinos de San Agustín',
    category: 'comunitario',
    description: 'Red de apoyo vecinal del Sur de Caracas',
    contact_name: 'Isabella Rojas',
    contact_phone: '+584123333335',
    location: 'San Agustín, Caracas',
    parent_name: null,
  },
  {
    name: 'Mesa Técnica de Agua – Caricuao',
    category: 'comunitario',
    description: 'Mesa técnica para gestión del agua en Caricuao',
    contact_name: 'Mateo Hernández',
    contact_phone: '+584123333336',
    location: 'Caricuao, Caracas',
    parent_name: null,
  },
  // ── Privado ──
  {
    name: 'CANTV – Telecomunicaciones',
    category: 'privado',
    description: 'Empresa de telecomunicaciones – restauración de red en desastres',
    contact_name: 'Ing. Fernando Ortiz',
    contact_phone: '+584124444441',
    location: 'Plaza Venezuela, Caracas',
    parent_name: null,
  },
  {
    name: 'Corpoelec – Distribución',
    category: 'privado',
    description: 'Corporación eléctrica – restauración de servicio post-desastre',
    contact_name: 'Luciana Gil',
    contact_phone: '+584124444442',
    location: 'San Martín, Caracas',
    parent_name: null,
  },
  {
    name: 'Hidrocapital – Operaciones',
    category: 'privado',
    description: 'Hidrológica de la región capital – restauración de acueductos',
    contact_name: 'Pablo Acosta',
    contact_phone: '+584124444443',
    location: 'El Silencio, Caracas',
    parent_name: null,
  },
  {
    name: 'Mercado Mayorista de Coche',
    category: 'privado',
    description: 'Distribución de alimentos para damnificados',
    contact_name: 'Martina Cárdenas',
    contact_phone: '+584124444444',
    location: 'Coche, Caracas',
    parent_name: null,
  },
  // ── Religioso ──
  {
    name: 'Cáritas Arquidiócesis Caracas',
    category: 'religioso',
    description: 'Red de asistencia social de la Arquidiócesis de Caracas',
    contact_name: 'Mons. Ricardo Barrios',
    contact_phone: '+584125555551',
    location: 'La Candelaria, Caracas',
    parent_name: null,
  },
  {
    name: 'Iglesia San José – Petare',
    category: 'religioso',
    description: 'Centro de acopio y refugio temporal en Petare',
    contact_name: 'Pdre. Antonio López',
    contact_phone: '+584125555552',
    location: 'Petare, Miranda',
    parent_name: null,
  },
  {
    name: 'Concilio Evangéico de Venezuela',
    category: 'religioso',
    description: 'Red de iglesias evangélicas para asistencia humanitaria',
    contact_name: 'Pastor David Silva',
    contact_phone: '+584125555553',
    location: 'Santa Mónica, Caracas',
    parent_name: null,
  },
];

const VOLUNTEERS: VolInput[] = [
  // ── Protección Civil ──
  {
    name: 'José Martínez',
    phone: '+584126000001',
    role: 'coordinador',
    profession: 'Ingeniero Civil',
    skills: ['rescate', 'evaluación estructural', 'gestión de riesgos'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'PC Distrito Capital',
  },
  {
    name: 'Carmen López',
    phone: '+584126000002',
    role: 'coordinador',
    profession: 'Geógrafo',
    skills: ['cartografía', 'evaluación de terrenos', 'gestión de riesgos'],
    zone: 'Los Teques',
    availability: 'disponible',
    org_name: 'PC Estado Miranda',
  },
  {
    name: 'Pedro Hernández',
    phone: '+584126000003',
    role: 'operador',
    profession: 'Paramédico',
    skills: ['primeros auxilios', 'rescate acuático', 'evaluación de daños'],
    zone: 'La Guaira',
    availability: 'disponible',
    org_name: 'PC Estado La Guaira',
  },
  {
    name: 'Ana Flores',
    phone: '+584126000004',
    role: 'operador',
    profession: 'Técnico Forestal',
    skills: ['combate incendios', 'rescate en montaña', 'primeros auxilios'],
    zone: 'El Ávila',
    availability: 'disponible',
    org_name: 'Bomberos Forestales',
  },
  {
    name: 'Roberto Sánchez',
    phone: '+584126000005',
    role: 'coordinador',
    profession: 'Oficial de Bomberos',
    skills: ['comando de incidentes', 'rescate estructural', 'materiales peligrosos'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Cuerpo de Bomberos Caracas',
  },
  {
    name: 'Luis Rojas',
    phone: '+584126000006',
    role: 'coordinador',
    profession: 'Médico Cirujano',
    skills: ['triaje', 'medicina de emergencia', 'gestión hospitalaria'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Hospital Pérez Carreño',
  },
  {
    name: 'Rosa Mendoza',
    phone: '+584126000007',
    role: 'medico',
    profession: 'Médico General',
    skills: ['atención primaria', 'pediatría', 'triaje'],
    zone: 'El Valle',
    availability: 'disponible',
    org_name: 'Ambulatorio El Valle',
  },
  {
    name: 'Carlos Aguilar',
    phone: '+584126000008',
    role: 'analista',
    profession: 'Estadístico',
    skills: ['análisis de datos', 'cartografía', 'evaluación de riesgos'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'INE – Gestión de Riesgos',
  },
  // ── Bomberos adicionales ──
  {
    name: 'Mario Contreras',
    phone: '+584126000009',
    role: 'operador',
    profession: 'Bombero',
    skills: ['rescate vehicular', 'incendios estructurales', 'primeros auxilios'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Cuerpo de Bomberos Caracas',
  },
  {
    name: 'Diego Castillo',
    phone: '+584126000010',
    role: 'operador',
    profession: 'Bombero',
    skills: ['rescate en alturas', 'incendios forestales', 'materiales peligrosos'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Cuerpo de Bomberos Caracas',
  },
  // ── Cruz Roja ──
  {
    name: 'Alejandro Rivas',
    phone: '+584127000001',
    role: 'coordinador',
    profession: 'Enfermero',
    skills: ['triaje avanzado', 'rescate', 'apoyo psicológico'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Cruz Roja – Capítulo Caracas',
  },
  {
    name: 'Valentina Suárez',
    phone: '+584127000002',
    role: 'coordinador',
    profession: 'Trabajadora Social',
    skills: ['apoyo psicosocial', 'gestión de albergues', 'evaluación de daños'],
    zone: 'Los Teques',
    availability: 'disponible',
    org_name: 'Cruz Roja – Capítulo Miranda',
  },
  {
    name: 'Tomás Aguirre',
    phone: '+584127000003',
    role: 'voluntario',
    profession: 'Estudiante de Medicina',
    skills: ['primeros auxilios', 'apoyo logístico', 'comunicaciones'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Cruz Roja – Capítulo Caracas',
  },
  {
    name: 'Mariana Ochoa',
    phone: '+584127000004',
    role: 'voluntario',
    profession: 'Psicóloga',
    skills: ['apoyo psicológico', 'atención a víctimas', 'intervención en crisis'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Cruz Roja – Capítulo Caracas',
  },
  // ── Médicos Sin Fronteras ──
  {
    name: 'Andrés Castillo',
    phone: '+584127000005',
    role: 'medico',
    profession: 'Médico Emergenciólogo',
    skills: ['cirugía de emergencia', 'triaje masivo', 'medicina de desastre'],
    zone: 'Nacional',
    availability: 'disponible',
    org_name: 'Médicos Sin Fronteras Venezuela',
  },
  {
    name: 'Gabriela Mendoza',
    phone: '+584127000006',
    role: 'medico',
    profession: 'Enfermera',
    skills: ['cuidados intensivos', 'vacunación', 'apoyo psicosocial'],
    zone: 'Nacional',
    availability: 'disponible',
    org_name: 'Médicos Sin Fronteras Venezuela',
  },
  // ── Un Techo ──
  {
    name: 'Santiago Cruz',
    phone: '+584127000007',
    role: 'coordinador',
    profession: 'Arquitecto',
    skills: ['construcción rápida', 'evaluación estructural', 'gestión de albergues'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Un Techo para Venezuela',
  },
  {
    name: 'Valeria Bravo',
    phone: '+584127000008',
    role: 'voluntario',
    profession: 'Ingeniero Civil',
    skills: ['evaluación de daños', 'construcción', 'topografía'],
    zone: 'Miranda',
    availability: 'disponible',
    org_name: 'Un Techo para Venezuela',
  },
  // ── Brigada de Rescate ──
  {
    name: 'José Gregorio Ramos',
    phone: '+584127000009',
    role: 'coordinador',
    profession: 'Técnico en Rescate',
    skills: ['rescate vertical', 'rescate en espacios confinados', 'búsqueda y salvamento'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Brigada de Rescate Águila',
  },
  {
    name: 'Jorge Ramos',
    phone: '+584127000010',
    role: 'operador',
    profession: 'Buzo Profesional',
    skills: ['rescate acuático', 'buceo de búsqueda', 'primeros auxilios'],
    zone: 'La Guaira',
    availability: 'disponible',
    org_name: 'Brigada de Rescate Águila',
  },
  // ── Comunitarios ──
  {
    name: 'Yolanda Ríos',
    phone: '+584128000001',
    role: 'coordinador',
    profession: 'Líder Comunitario',
    skills: ['organización vecinal', 'evaluación de daños', 'comunicaciones'],
    zone: 'Petare',
    availability: 'disponible',
    org_name: 'Comité Local Petare',
  },
  {
    name: 'Carlos Mendoza',
    phone: '+584128000002',
    role: 'operador',
    profession: 'Albañil',
    skills: ['evaluación estructural', 'construcción', 'primeros auxilios'],
    zone: 'Catia',
    availability: 'disponible',
    org_name: 'Comité Local Catia',
  },
  {
    name: 'Samuel Contreras',
    phone: '+584128000003',
    role: 'voluntario',
    profession: 'Docente',
    skills: ['primeros auxilios', 'apoyo psicosocial', 'logística'],
    zone: 'Antímano',
    availability: 'disponible',
    org_name: 'Comité Local Antímano',
  },
  {
    name: 'Isabella Rojas',
    phone: '+584128000004',
    role: 'voluntario',
    profession: 'Comunicadora Social',
    skills: ['comunicaciones', 'redes sociales', 'apoyo psicológico'],
    zone: 'San Agustín',
    availability: 'disponible',
    org_name: 'Red de Vecinos de San Agustín',
  },
  {
    name: 'Mateo Hernández',
    phone: '+584128000005',
    role: 'operador',
    profession: 'Plomero',
    skills: ['fontanería', 'gestión del agua', 'evaluación de daños'],
    zone: 'Caricuao',
    availability: 'disponible',
    org_name: 'Mesa Técnica de Agua – Caricuao',
  },
  {
    name: 'Sofía Medina',
    phone: '+584128000006',
    role: 'voluntario',
    profession: 'Enfermera',
    skills: ['primeros auxilios', 'atención a adultos mayores', 'apoyo psicosocial'],
    zone: 'La Vega',
    availability: 'disponible',
    org_name: 'Comité Local La Vega',
  },
  // ── Empresas privadas ──
  {
    name: 'Fernando Ortiz',
    phone: '+584129000001',
    role: 'coordinador',
    profession: 'Ingeniero en Telecomunicaciones',
    skills: ['telecomunicaciones', 'restauración de red', 'radioenlaces'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'CANTV – Telecomunicaciones',
  },
  {
    name: 'Pablo Acosta',
    phone: '+584129000002',
    role: 'coordinador',
    profession: 'Ingeniero Eléctrico',
    skills: ['restauración eléctrica', 'evaluación de daños', 'gestión de riesgos'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Corpoelec – Distribución',
  },
  {
    name: 'Martina Cárdenas',
    phone: '+584129000003',
    role: 'operador',
    profession: 'Administradora',
    skills: ['logística', 'distribución de alimentos', 'gestión de inventarios'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Mercado Mayorista de Coche',
  },
  // ── Religiosos ──
  {
    name: 'Ricardo Barrios',
    phone: '+584120000001',
    role: 'coordinador',
    profession: 'Sacerdote',
    skills: ['apoyo espiritual', 'gestión de refugios', 'coordinación de voluntarios'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Cáritas Arquidiócesis Caracas',
  },
  {
    name: 'Antonio López',
    phone: '+584120000002',
    role: 'voluntario',
    profession: 'Sacerdote',
    skills: ['apoyo espiritual', 'logística', 'red de ayuda'],
    zone: 'Petare',
    availability: 'disponible',
    org_name: 'Iglesia San José – Petare',
  },
  {
    name: 'David Silva',
    phone: '+584120000003',
    role: 'coordinador',
    profession: 'Pastor Evangélico',
    skills: ['apoyo espiritual', 'gestión de voluntarios', 'distribución de ayuda'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: 'Concilio Evangéico de Venezuela',
  },
  // ── Voluntarios independientes ──
  {
    name: 'Julieta Paredes',
    phone: '+584120000010',
    role: 'voluntario',
    profession: 'Médico',
    skills: ['primeros auxilios', 'triaje', 'atención primaria'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Emilio Guerrero',
    phone: '+584120000011',
    role: 'voluntario',
    profession: 'Conductor de Ambulancia',
    skills: ['transporte de heridos', 'primeros auxilios', 'radio operador'],
    zone: 'Miranda',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Bárbara Salazar',
    phone: '+584120000012',
    role: 'voluntario',
    profession: 'Psicóloga',
    skills: ['apoyo psicológico', 'intervención en crisis', 'atención a niños'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Leonardo Quintero',
    phone: '+584120000013',
    role: 'voluntario',
    profession: 'Ingeniero de Sonido',
    skills: ['comunicaciones', 'radioaficionado', 'logística'],
    zone: 'La Guaira',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Andrea Cordero',
    phone: '+584120000014',
    role: 'voluntario',
    profession: 'Chef',
    skills: ['cocina para grandes grupos', 'logística alimentaria', 'primeros auxilios'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Joaquín Montero',
    phone: '+584120000015',
    role: 'voluntario',
    profession: 'Médico Veterinario',
    skills: ['atención de animales', 'primeros auxilios', 'rescate de mascotas'],
    zone: 'Los Teques',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Sara Navarro',
    phone: '+584120000016',
    role: 'voluntario',
    profession: 'Estudiante de Ingeniería',
    skills: ['logística', 'relevamiento de daños', 'apoyo técnico'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Facundo Rivas',
    phone: '+584120000017',
    role: 'voluntario',
    profession: 'Paramédico',
    skills: ['emergencias prehospitalarias', 'rescate básico', 'triaje'],
    zone: 'Baruta',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Antonella Campos',
    phone: '+584120000018',
    role: 'voluntario',
    profession: 'Abogada',
    skills: ['gestión de trámites', 'apoyo legal', 'coordinación de voluntarios'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Nicolás Herrera',
    phone: '+584120000019',
    role: 'voluntario',
    profession: 'Bombero (retirado)',
    skills: ['incendios', 'rescate', 'primeros auxilios'],
    zone: 'El Valle',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Renata Suárez',
    phone: '+584120000020',
    role: 'voluntario',
    profession: 'Trabajadora Social',
    skills: ['apoyo psicosocial', 'gestión de albergues', 'evaluación familiar'],
    zone: 'Catia',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Bruno Vega',
    phone: '+584120000021',
    role: 'voluntario',
    profession: 'Electricista',
    skills: ['restauración eléctrica', 'evaluación de daños', 'primeros auxilios'],
    zone: 'Antímano',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Emilia Paz',
    phone: '+584120000022',
    role: 'voluntario',
    profession: 'Fisioterapeuta',
    skills: ['rehabilitación', 'atención a lesionados', 'apoyo psicosocial'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Martín León',
    phone: '+584120000023',
    role: 'voluntario',
    profession: 'Topógrafo',
    skills: ['cartografía', 'evaluación de terrenos', 'vuelo de drones'],
    zone: 'Miranda',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Josefina Mora',
    phone: '+584120000024',
    role: 'voluntario',
    profession: 'Docente de Educación Inicial',
    skills: ['atención a niños', 'apoyo psicológico', 'primeros auxilios'],
    zone: 'La Vega',
    availability: 'disponible',
    org_name: null,
  },
  {
    name: 'Benjamín Soto',
    phone: '+584120000025',
    role: 'voluntario',
    profession: 'Radioaficionado',
    skills: ['comunicaciones de emergencia', 'radioenlaces', 'logística'],
    zone: 'Caracas',
    availability: 'disponible',
    org_name: null,
  },
];

interface UserInput {
  username: string;
  pass: string;
  role: string;
  name: string;
}

const USERS: UserInput[] = [
  { username: 'lector', pass: 'lector2026', role: 'viewer', name: 'María Rodríguez' },
  { username: 'operador', pass: 'operador2026', role: 'operator', name: 'Carlos Méndez' },
  { username: 'admin', pass: 'PdV2026!', role: 'admin', name: 'Administrador del Sistema' },
];

async function main() {
  console.log('[seed-orgs] Insertando organizaciones, voluntarios y usuarios...\n');

  // ── Limpiar datos existentes ──
  await query('DELETE FROM volunteers');
  await query('DELETE FROM organizations');
  console.log('  Limpiadas organizaciones y voluntarios existentes.\n');

  // ── Insertar organizaciones ──
  const orgIds = new Map<string, string>();
  for (const org of ORGANIZATIONS) {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO organizations (name, category, description, contact_name, contact_phone, location)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [org.name, org.category, org.description, org.contact_name, org.contact_phone, org.location],
    );
    if (row) orgIds.set(org.name, row.id);
    console.log(`  ✓ Organización: ${org.name}`);
  }

  // ── Asignar parent_id (jerarquía) ──
  for (const org of ORGANIZATIONS) {
    if (!org.parent_name) continue;
    const childId = orgIds.get(org.name);
    const parentId = orgIds.get(org.parent_name);
    if (childId && parentId) {
      await query('UPDATE organizations SET parent_id = $1 WHERE id = $2', [parentId, childId]);
      console.log(`    ↳ "${org.name}" depende de "${org.parent_name}"`);
    }
  }

  console.log(`\n  Total: ${ORGANIZATIONS.length} organizaciones insertadas.\n`);

  // ── Insertar voluntarios ──
  let volCount = 0;
  for (const v of VOLUNTEERS) {
    const orgId = v.org_name ? (orgIds.get(v.org_name) ?? null) : null;
    await query(
      `INSERT INTO volunteers (name, phone, role, profession, skills, zone, availability, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [v.name, v.phone, v.role, v.profession, v.skills, v.zone, v.availability, orgId],
    );
    volCount++;
    if (orgId) console.log(`  ✓ Voluntario: ${v.name} → ${v.org_name}`);
    else console.log(`  ✓ Voluntario independiente: ${v.name}`);
  }

  console.log(`\n  Total: ${volCount} voluntarios insertados.\n`);

  // ── Insertar usuarios ──
  await query("DELETE FROM users WHERE username IN ('lector', 'operador', 'admin')");
  for (const u of USERS) {
    const salt = randomBytes(16).toString('hex');
    const hash = hashPass(u.pass, salt);
    await query('INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)', [
      u.username,
      `${salt}:${hash}`,
      u.role,
      u.name,
    ]);
    console.log(`  ✓ Usuario: ${u.username} (${u.role}) → contraseña: ${u.pass}`);
  }

  console.log('\n[seed-orgs] Hecho.');
}

main().catch((err) => {
  console.error('[seed-orgs] Error:', err);
  process.exit(1);
});
