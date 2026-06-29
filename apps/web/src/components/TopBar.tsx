'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useApp } from './AppProvider';

const NAV = [
  { href: '/', label: 'Panel', icon: '🧭', hint: 'Coordinador' },
  { href: '/whatsapp', label: 'WhatsApp', icon: '💬', hint: 'Ciudadanos' },
  { href: '/reportar', label: 'Reportar', icon: '➕', hint: 'Voluntario' },
  { href: '/reportes', label: 'Reportes', icon: '🗂️', hint: 'Todos' },
  { href: '/mapa', label: 'Mapa', icon: '🗺️', hint: 'Terreno' },
];

export function TopBar() {
  const pathname = usePathname();
  const { online, syncing, pendingCount } = useApp();

  return (
    <header className="sticky top-0 z-[1000] border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-coral/10">
            <Image src="/brand/v-mark.svg" alt="Puente de Vida" width={22} height={22} priority />
          </span>
          <span className="hidden font-display text-sm font-bold tracking-tight sm:inline">
            PUENTE DE VIDA
          </span>
        </Link>

        <nav className="ml-1 flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.hint}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-coral text-white shadow-card'
                    : 'text-muted hover:bg-paper hover:text-ink'
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 text-xs">
          {pendingCount > 0 && (
            <span
              className="chip border border-amber/50 bg-amber/20 text-amberInk"
              title="Reportes guardados sin subir"
            >
              {pendingCount} sin subir
            </span>
          )}
          <span
            className={`chip ${
              online
                ? 'border border-wa/40 bg-wa/15 text-waInk'
                : 'border border-coral/40 bg-coral/15 text-coralInk'
            }`}
            title={online ? 'Conectado a Internet' : 'Trabajando sin conexión'}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                syncing ? 'animate-pulse bg-amber' : online ? 'bg-wa' : 'bg-coral'
              }`}
            />
            <span className="hidden sm:inline">
              {syncing ? 'Sincronizando' : online ? 'En línea' : 'Offline'}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
