import { useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useApp } from './AppProvider';

const NAV = [
  { href: '/', label: 'Panel', icon: '🧭', hint: 'Coordinador' },
  { href: '/whatsapp', label: 'WhatsApp', icon: '💬', hint: 'Ciudadanos' },
  { href: '/reportar', label: 'Solicitar', icon: '➕', hint: 'Nueva necesidad' },
  { href: '/reportes', label: 'Necesidades', icon: '📋', hint: 'Todas' },
  { href: '/mapa', label: 'Mapa', icon: '🗺️', hint: 'Terreno' },
];

const ROLE_LABELS: Record<string, string> = {
  viewer: 'Solo lectura',
  operator: 'Operador',
  admin: 'Admin',
};
const ROLE_COLORS: Record<string, string> = {
  viewer: 'bg-gray-100 text-gray-700',
  operator: 'bg-blue-100 text-blue-700',
  admin: 'bg-red-100 text-red-700',
};

export function TopBar() {
  const pathname = useLocation().pathname;
  const { online, syncing, pendingCount } = useApp();
  const [session, setSession] = useState<{ username: string; role: string } | null>(() => {
    const u = sessionStorage.getItem('admin_user');
    const r = sessionStorage.getItem('admin_role');
    return u ? { username: u, role: r ?? 'viewer' } : null;
  });

  useEffect(() => {
    const handler = () => {
      const u2 = sessionStorage.getItem('admin_user');
      const r2 = sessionStorage.getItem('admin_role');
      if (u2) setSession({ username: u2, role: r2 ?? 'viewer' });
      else setSession(null);
    };
    window.addEventListener('storage', handler);
    window.addEventListener('admin-auth-change', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('admin-auth-change', handler);
    };
  }, []);

  return (
    <header className="sticky top-0 z-[1000] border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <Link to="/" className="flex shrink-0 items-center gap-1.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-coral/10">
            <img src="/brand/v-mark.svg" alt="Puente de Vida" width={22} height={22} />
          </span>
          <span className="hidden font-display text-sm font-bold tracking-tight sm:inline">
            PUENTE DE VIDA
          </span>
        </Link>

        <nav className="ml-1 flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV.filter((item) => {
            if (item.href === '/reportes' || item.href === '/mapa') return !!session;
            return true;
          }).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
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

          {/* Auth */}
          {session ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline text-muted">{session.username}</span>
              <span
                className={`hidden sm:inline rounded px-1.5 py-0.5 text-[10px] font-medium ${ROLE_COLORS[session.role]}`}
              >
                {ROLE_LABELS[session.role]}
              </span>
              <Link
                to="/admin"
                className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-paper text-muted hover:bg-line hover:text-ink transition-all"
                title="Panel de control"
              >
                ⚙️
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-muted">Invitado</span>
              <Link
                to="/admin"
                className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-muted hover:bg-paper hover:text-ink transition whitespace-nowrap"
                title="Iniciar sesión"
              >
                Entrar →
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
