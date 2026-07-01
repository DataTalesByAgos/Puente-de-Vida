export const NEED_CATEGORIES = ['profesionales', 'no_profesionales', 'logistica', 'otros'] as const;
export type NeedCategory = (typeof NEED_CATEGORIES)[number];

export const NEED_SUBCATEGORIES: Record<NeedCategory, string[]> = {
  profesionales: [
    'medico',
    'enfermeria',
    'ingenieria',
    'psicologia',
    'educacion',
    'legal',
    'comunicacion',
    'otro_prof',
  ],
  no_profesionales: [
    'carga',
    'limpieza',
    'cocina',
    'cuidado',
    'traduccion',
    'compania',
    'otro_no_prof',
  ],
  logistica: [
    'transporte',
    'donaciones',
    'albergue',
    'alimento',
    'agua',
    'medicinas',
    'ropa',
    'otro_log',
  ],
  otros: ['informacion', 'difusion', 'apoyo_moral', 'otro'],
};

export const NEED_STATUSES = ['abierta', 'en_proceso', 'resuelta', 'cerrada'] as const;
export type NeedStatus = (typeof NEED_STATUSES)[number];

export const NEED_SCOPES = ['micro', 'macro'] as const;
export type NeedScope = (typeof NEED_SCOPES)[number];

export const NEED_UPDATE_STATUSES = [
  'en_proceso',
  'requiere_recursos',
  'completado_parcial',
] as const;
export type NeedUpdateStatus = (typeof NEED_UPDATE_STATUSES)[number];

export const PRIORITIES = ['critica', 'alta', 'media', 'baja'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SOURCES = ['pwa', 'whatsapp', 'telegram', 'telefono', 'sms'] as const;
export type Source = (typeof SOURCES)[number];

export const CREATED_BY_ROLES = ['citizen', 'volunteer', 'coordinator'] as const;
export type CreatedByRole = (typeof CREATED_BY_ROLES)[number];

export const USER_ROLES = ['citizen', 'volunteer', 'coordinator', 'organization', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const AVAILABILITY_TYPES = ['inmediata', 'programada', 'limitada'] as const;
export type AvailabilityType = (typeof AVAILABILITY_TYPES)[number];

export interface GeoLocation {
  lat: number | null;
  lng: number | null;
}

export interface Need {
  id: string;
  client_id: string | null;
  title: string;
  description: string;
  category: NeedCategory;
  subcategory: string | null;
  priority: Priority;
  status: NeedStatus;
  scope: NeedScope;
  parent_id: string | null;
  lat: number | null;
  lng: number | null;
  location_text: string | null;
  organization_id: string | null;
  org_name: string | null;
  people_required: number | null;
  resources_needed: string | null;
  comments: string | null;
  created_by: string | null;
  created_by_role: CreatedByRole | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  source: Source;
  photo_url: string | null;
  age: number | null;
  is_minor: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface NeedUpdate {
  id: string;
  need_id: string;
  volunteer_id: string;
  status: NeedUpdateStatus;
  photos: string[];
  observations: string | null;
  created_at: string;
}

export interface VolunteerProfile {
  user_id: string;
  categories_of_interest: NeedCategory[];
  skills: string[];
  availability: AvailabilityType;
  geo_zone: string | null;
  lat: number | null;
  lng: number | null;
  max_distance_km: number | null;
}

export interface NeedDashboardStats {
  total: number;
  by_category: { category: NeedCategory; count: number }[];
  by_status: { status: NeedStatus; count: number }[];
  by_priority: { priority: Priority; count: number }[];
  by_scope: { scope: NeedScope; count: number }[];
  volunteers_active: number;
  organizations_active: number;
  needs_pending_review: number;
}

export interface PendingReview {
  need: Need;
  days_without_update: number;
  last_update_at: string | null;
}
