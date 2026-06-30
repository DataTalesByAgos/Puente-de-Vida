// Tipos de dominio compartidos por la API.

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

export const PRIORITIES = ['critica', 'alta', 'media', 'baja'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ['nuevo', 'triage', 'en_proceso', 'resuelto'] as const;
export type Status = (typeof STATUSES)[number];

export const SOURCES = ['whatsapp', 'pwa', 'telefono', 'redes'] as const;
export type Source = (typeof SOURCES)[number];

export interface GeoLocation {
  lat: number | null;
  lng: number | null;
}

export interface Classification {
  incidentType: IncidentType;
  priority: Priority;
  peopleAffected: number | null;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  confidence: number; // 0..1
  recommendedTeam: string;
  engine: 'heuristic' | 'claude' | 'openai';
}

export interface Report {
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
  age: number | null;
  is_minor: boolean | null;
  duplicate_of: string | null;
  group_relation_type: 'mismo_suceso' | 'en_cadena' | null;
  group_score: number | null;
  created_at: string;
  updated_at: string;
}
