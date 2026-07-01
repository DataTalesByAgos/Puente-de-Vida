import type {
  NeedCategory,
  NeedStatus,
  NeedScope,
  Priority,
  Source,
  NeedUpdateStatus,
} from './types';

export const CATEGORY_LABELS: Record<NeedCategory, string> = {
  profesionales: 'Profesionales',
  no_profesionales: 'No profesionales',
  logistica: 'Logística',
  otros: 'Otros',
};

export const CATEGORY_ICONS: Record<NeedCategory, string> = {
  profesionales: '👨‍⚕️',
  no_profesionales: '🤝',
  logistica: '🚚',
  otros: '📌',
};

export const SUBCATEGORY_LABELS: Record<string, string> = {
  medico: 'Médico',
  enfermeria: 'Enfermería',
  ingenieria: 'Ingeniería',
  psicologia: 'Psicología',
  educacion: 'Educación',
  legal: 'Legal',
  comunicacion: 'Comunicación',
  otro_prof: 'Otro profesional',
  carga: 'Carga',
  limpieza: 'Limpieza',
  cocina: 'Cocina',
  cuidado: 'Cuidado',
  traduccion: 'Traducción',
  compania: 'Compañía',
  otro_no_prof: 'Otro no profesional',
  transporte: 'Transporte',
  donaciones: 'Donaciones',
  albergue: 'Albergue',
  alimento: 'Alimento',
  agua: 'Agua',
  medicinas: 'Medicinas',
  ropa: 'Ropa',
  otro_log: 'Otro logístico',
  informacion: 'Información',
  difusion: 'Difusión',
  apoyo_moral: 'Apoyo moral',
  otro: 'Otro',
};

export const NEED_STATUS_LABELS: Record<NeedStatus, string> = {
  abierta: 'Abierta',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
};

export const NEED_SCOPE_LABELS: Record<NeedScope, string> = {
  micro: 'Micro',
  macro: 'Macro',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  critica: '#e11d3f',
  alta: '#ea6a0a',
  media: '#eab308',
  baja: '#1f9cd6',
};

export const STATUS_COLORS: Record<NeedStatus, string> = {
  abierta: '#6fcaef',
  en_proceso: '#eab308',
  resuelta: '#25d366',
  cerrada: '#5d6675',
};

export const SOURCE_LABELS: Record<Source, string> = {
  pwa: 'App',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  telefono: 'Teléfono',
  sms: 'SMS',
};

export const UPDATE_STATUS_LABELS: Record<NeedUpdateStatus, string> = {
  en_proceso: 'En proceso',
  requiere_recursos: 'Requiere recursos',
  completado_parcial: 'Completado parcial',
};
