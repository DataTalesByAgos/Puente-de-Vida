import type { Priority, NeedCategory, NeedStatus, NeedScope } from './types';

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function timeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PRIORITY_COLOR: Record<Priority, string> = {
  critica: '#e11d3f',
  alta: '#ea6a0a',
  media: '#eab308',
  baja: '#1f9cd6',
};

export const PRIORITY_CHIP: Record<Priority, string> = {
  critica: 'bg-coral/15 text-coralInk border border-coral/40',
  alta: 'bg-orange-500/10 text-prio-alta border border-orange-400/40',
  media: 'bg-amber/25 text-amberInk border border-amber/60',
  baja: 'bg-sky/15 text-skyInk border border-sky/40',
};

export const PRIORITY_DOT: Record<Priority, string> = {
  critica: 'bg-prio-critica',
  alta: 'bg-prio-alta',
  media: 'bg-prio-media',
  baja: 'bg-prio-baja',
};

export const CATEGORY_CHIP: Record<NeedCategory, string> = {
  profesionales: 'bg-purple-100 text-purple-800 border-purple-300',
  no_profesionales: 'bg-teal-100 text-teal-800 border-teal-300',
  logistica: 'bg-amber-100 text-amber-800 border-amber-300',
  otros: 'bg-gray-100 text-gray-700 border-gray-300',
};

export const STATUS_CHIP: Record<NeedStatus, string> = {
  abierta: 'bg-sky/15 text-skyInk border border-sky/40',
  en_proceso: 'bg-amber/20 text-amberInk border border-amber/50',
  resuelta: 'bg-wa/15 text-waInk border border-wa/40',
  cerrada: 'bg-gray-100 text-gray-500 border-gray-300',
};

export const SCOPE_CHIP: Record<NeedScope, string> = {
  micro: 'bg-blue-100 text-blue-700 border-blue-300',
  macro: 'bg-violet-100 text-violet-700 border-violet-300',
};
