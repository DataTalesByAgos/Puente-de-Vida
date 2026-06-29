import type { Priority } from './types';

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

// Hora corta (HH:MM) para la bandeja tipo chat.
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

// Punto de color sólido (para leyendas/indicadores).
export const PRIORITY_DOT: Record<Priority, string> = {
  critica: 'bg-prio-critica',
  alta: 'bg-prio-alta',
  media: 'bg-prio-media',
  baja: 'bg-prio-baja',
};
