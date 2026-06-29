// Tipos compartidos del frontend (espejo de la API).

export const INCIDENT_TYPES = [
  'medico',
  'desaparecido',
  'estructural',
  'agua',
  'alimento',
  'incendio',
  'rescate',
  'refugio',
  'otro',
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export type Priority = 'critica' | 'alta' | 'media' | 'baja';
export type Status = 'nuevo' | 'triage' | 'en_proceso' | 'resuelto';
export type Source = 'whatsapp' | 'pwa' | 'telefono' | 'redes';

export interface ServerReport {
  id: string;
  client_id: string | null;
  source: Source;
  raw_text: string;
  incident_type: IncidentType;
  priority: Priority;
  status: Status;
  lat: number | null;
  lng: number | null;
  location_text: string | null;
  people_affected: number | null;
  confidence: number;
  recommended_team: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
  photo_url: string | null;
  ai_engine: string | null;
  duplicate_of: string | null;
  group_relation_type: 'mismo_suceso' | 'en_cadena' | null;
  group_score: number | null;
  created_at: string;
  updated_at: string;
}

// Registro local en IndexedDB (offline-first).
export interface LocalReport {
  key: string; // clave primaria local (clientId o srv:<id>)
  serverId: string | null;
  clientId: string | null;
  source: Source;
  rawText: string;
  incidentType: IncidentType;
  priority: Priority;
  status: Status;
  lat: number | null;
  lng: number | null;
  locationText: string | null;
  peopleAffected: number | null;
  confidence: number;
  recommendedTeam: string | null;
  reporterName: string | null;
  reporterPhone: string | null;
  photoDataUrl: string | null;
  duplicateOf: string | null;
  groupRelationType: 'mismo_suceso' | 'en_cadena' | null;
  groupScore: number | null;
  createdAt: string;
  updatedAt: string;
  synced: 0 | 1; // 0 = pendiente de subir
}

export const TYPE_LABELS: Record<IncidentType, string> = {
  medico: 'Médico',
  desaparecido: 'Desaparecido',
  estructural: 'Estructural',
  agua: 'Agua',
  alimento: 'Alimento',
  incendio: 'Incendio',
  rescate: 'Rescate',
  refugio: 'Refugio',
  otro: 'Otro',
};

export const TYPE_ICONS: Record<IncidentType, string> = {
  medico: '🚑',
  desaparecido: '🔍',
  estructural: '🏚️',
  agua: '💧',
  alimento: '🍞',
  incendio: '🔥',
  rescate: '🛟',
  refugio: '⛺',
  otro: '📌',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const STATUS_LABELS: Record<Status, string> = {
  nuevo: 'Nuevo',
  triage: 'Triage',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
};

// Metadatos de cada canal de entrada (de dónde llega el reporte).
export interface SourceMeta {
  label: string;
  icon: string;
  // Clases de Tailwind para el "badge" del canal.
  chip: string;
}

export const SOURCE_META: Record<Source, SourceMeta> = {
  whatsapp: {
    label: 'WhatsApp',
    icon: '💬',
    chip: 'bg-wa/15 text-waInk border border-wa/40',
  },
  pwa: {
    label: 'App voluntario',
    icon: '📱',
    chip: 'bg-sky/15 text-skyInk border border-sky/40',
  },
  telefono: {
    label: 'Teléfono',
    icon: '📞',
    chip: 'bg-amber/20 text-amberInk border border-amber/50',
  },
  redes: {
    label: 'Redes',
    icon: '🌐',
    chip: 'bg-coral/10 text-coralInk border border-coral/30',
  },
};
