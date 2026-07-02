// Tipos del frontend — conviven el modelo legacy (reportes) y el nuevo (necesidades).

// ── Import local + re-export desde @pdv/shared ──────────────────────────
import type {
  NeedCategory,
  NeedStatus,
  NeedScope,
  Source,
  NeedUpdateStatus,
  CreatedByRole,
  UserRole,
  AvailabilityType,
  GeoLocation,
  Need,
  NeedUpdate,
  VolunteerProfile,
  NeedDashboardStats,
  PendingReview,
} from '@pdv/shared';

export type {
  NeedCategory,
  NeedStatus,
  NeedScope,
  Source,
  NeedUpdateStatus,
  CreatedByRole,
  UserRole,
  AvailabilityType,
  GeoLocation,
  Need,
  NeedUpdate,
  VolunteerProfile,
  NeedDashboardStats,
  PendingReview,
} from '@pdv/shared';

import { PRIORITIES, SOURCES } from '@pdv/shared';
export type Priority = (typeof PRIORITIES)[number];
export {
  NEED_CATEGORIES,
  NEED_SUBCATEGORIES,
  NEED_STATUSES,
  NEED_SCOPES,
  PRIORITIES,
  SOURCES,
  CREATED_BY_ROLES,
  USER_ROLES,
  AVAILABILITY_TYPES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  SUBCATEGORY_LABELS,
  NEED_STATUS_LABELS,
  NEED_SCOPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  SOURCE_LABELS,
  UPDATE_STATUS_LABELS,
} from '@pdv/shared';

// ── Legacy: tipos del modelo de reportes (incidentes) ────────────────────
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

export type Status = 'nuevo' | 'triage' | 'en_proceso' | 'resuelto';
export type LegacySource = 'whatsapp' | 'pwa' | 'telefono' | 'redes';

export interface ServerReport {
  id: string;
  client_id: string | null;
  source: LegacySource;
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
  age: number | null;
  is_minor: boolean | null;
  ai_engine: string | null;
  duplicate_of: string | null;
  group_relation_type: 'mismo_suceso' | 'en_cadena' | null;
  group_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocalReport {
  key: string;
  serverId: string | null;
  clientId: string | null;
  source: LegacySource;
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
  age: number | null;
  isMinor: boolean | null;
  duplicateOf: string | null;
  groupRelationType: 'mismo_suceso' | 'en_cadena' | null;
  groupScore: number | null;
  createdAt: string;
  updatedAt: string;
  synced: 0 | 1;
  assignedOrgId?: string | null;
  assignedOrgStatus?: string | null;
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

export const STATUS_LABELS: Record<Status, string> = {
  nuevo: 'Nuevo',
  triage: 'Triage',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
};

export interface SourceMeta {
  label: string;
  icon: string;
  chip: string;
}

export const SOURCE_META: Record<LegacySource, SourceMeta> = {
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

// ── Nuevo modelo: Necesidad local (offline-first en IndexedDB) ───────────
export interface LocalNeed {
  key: string;
  serverId: string | null;
  clientId: string | null;
  title: string;
  description: string;
  category: NeedCategory;
  subcategory: string | null;
  priority: Priority;
  status: NeedStatus;
  scope: NeedScope;
  parentId: string | null;
  lat: number | null;
  lng: number | null;
  locationText: string | null;
  organizationId: string | null;
  orgName: string | null;
  peopleRequired: number | null;
  resourcesNeeded: string | null;
  comments: string | null;
  createdBy: string | null;
  createdByRole: CreatedByRole | null;
  assignedTo: string | null;
  assignedBy: string | null;
  assignedAt: string | null;
  closedBy: string | null;
  closedAt: string | null;
  source: Source;
  photoDataUrl: string | null;
  age: number | null;
  isMinor: boolean | null;
  createdAt: string;
  updatedAt: string;
  synced: 0 | 1;
}

export interface AuditEntry {
  id?: number;
  reportKey: string;
  action: string;
  fromStatus: Status | null;
  toStatus: Status | null;
  operator: string;
  notes: string;
  detail: Record<string, unknown>;
  createdAt: string;
  synced: 0 | 1;
}

export function serverNeedToLocal(n: Need): LocalNeed {
  return {
    key: n.client_id ?? `srv:${n.id}`,
    serverId: n.id,
    clientId: n.client_id,
    title: n.title,
    description: n.description,
    category: n.category,
    subcategory: n.subcategory,
    priority: n.priority,
    status: n.status,
    scope: n.scope,
    parentId: n.parent_id,
    lat: n.lat,
    lng: n.lng,
    locationText: n.location_text,
    organizationId: n.organization_id,
    orgName: n.org_name,
    peopleRequired: n.people_required,
    resourcesNeeded: n.resources_needed,
    comments: n.comments,
    createdBy: n.created_by,
    createdByRole: n.created_by_role,
    assignedTo: n.assigned_to,
    assignedBy: n.assigned_by,
    assignedAt: n.assigned_at,
    closedBy: n.closed_by,
    closedAt: n.closed_at,
    source: n.source,
    photoDataUrl: n.photo_url,
    age: n.age,
    isMinor: n.is_minor,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
    synced: 1,
  };
}
