'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

// ---------------------------------------------------------------------------
// Admin panel con roles: viewer (solo stats+export), admin (todo)
// ---------------------------------------------------------------------------

type AdminStats = {
  totals: { total: number; duplicates: number; active: number; people: number };
  bySource: { source: string; count: number }[];
  byType: { incident_type: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byEngine: { engine: string; count: number }[];
  hourly: { hour: string; count: number }[];
  shelters: { count: number; capacity: number; occupancy: number };
  volunteers: { active: number };
  supplies: number;
};

type AdminUser = { id: string; username: string; role: string; name: string | null; created_at: string };

const ROLE_LABELS: Record<string, string> = { viewer: 'Solo lectura', operator: 'Operador', admin: 'Administrador' };
const ROLE_COLORS: Record<string, string> = { viewer: 'bg-gray-100 text-gray-700', operator: 'bg-blue-100 text-blue-700', admin: 'bg-red-100 text-red-700' };

const TABS = [
  { id: 'stats', label: '📊 Observabilidad', minRole: 'viewer' },
  { id: 'export', label: '📥 Exportar', minRole: 'viewer' },
  { id: 'orgs', label: '🏛️ Organigrama', minRole: 'admin' },
  { id: 'users', label: '👥 Usuarios', minRole: 'admin' },
  { id: 'config', label: '⚙️ Proveedores', minRole: 'admin' },
  { id: 'audit', label: '📋 Auditoría', minRole: 'admin' },
] as const;

type TabId = typeof TABS[number]['id'];

const HIERARCHY: Record<string, number> = { viewer: 0, operator: 1, admin: 2 };

async function apiAdmin(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-bold text-sm text-gray-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function Bar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 shrink-0 text-right text-gray-600 truncate">{label}</span>
      <div className="h-5 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      <span className="w-10 text-right font-mono text-xs text-gray-500">{count}</span>
    </div>
  );
}

const PRIO_COLORS: Record<string, string> = { critica: 'bg-red-600', alta: 'bg-orange-500', media: 'bg-yellow-400', baja: 'bg-gray-300' };

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<{ username: string; role: string } | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState<TabId>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'viewer', name: '' });
  const [configData, setConfigData] = useState<{ env: Record<string, string>; db: Record<string, string> } | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});
  const [configSaved, setConfigSaved] = useState(false);
  const [auditLog, setAuditLog] = useState<{ id: string; username: string | null; action: string; entity: string; entity_id: string | null; created_at: string }[]>([]);
  const [apiErr, setApiErr] = useState('');

  // Org chart state
  const [orgs, setOrgs] = useState<{ id: string; name: string; category: string; description: string | null; contact_name: string | null; contact_phone: string | null; parent_id: string | null; created_at: string }[]>([]);
  const [vols, setVols] = useState<{ id: string; name: string; phone: string | null; role: string; profession: string | null; skills: string[]; zone: string | null; availability: string; organization_id: string | null; org_name: string | null; status: string; created_at: string }[]>([]);
  const [newOrg, setNewOrg] = useState({ name: '', category: 'comunitario', description: '', contact_name: '', contact_phone: '', parent_id: '' });
  const [newVol, setNewVol] = useState({ name: '', phone: '', role: 'general', profession: '', skills: '', zone: '', availability: 'disponible', organization_id: '' });
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  // Restaurar sesión del sessionStorage
  useEffect(() => {
    const t = sessionStorage.getItem('admin_token');
    const u = sessionStorage.getItem('admin_user');
    const r = sessionStorage.getItem('admin_role');
    if (t && u) { setToken(t); setSession({ username: u, role: r ?? 'viewer' }); }
  }, []);

  // Cargar datos según tab y rol
  const loadData = useCallback(async () => {
    if (!token) return;
    setApiErr('');
    try {
      if (tab === 'stats') setStats(await apiAdmin('/api/admin/stats', token));
      if (HIERARCHY[session?.role ?? ''] >= 2) {
        if (tab === 'users') setUsers(await apiAdmin('/api/admin/users', token));
        if (tab === 'orgs') {
          setOrgs(await apiAdmin('/api/admin/orgs', token));
          setVols(await apiAdmin('/api/admin/volunteers', token));
        }
        if (tab === 'config') {
          const c = await apiAdmin('/api/admin/config', token) as typeof configData;
          setConfigData(c); setEditConfig(c.db);
        }
        if (tab === 'audit') setAuditLog(await apiAdmin('/api/admin/audit', token));
      }
    } catch (err) {
      setApiErr(String(err));
      setToken(null); setSession(null);
      sessionStorage.removeItem('admin_token');
    }
  }, [token, tab, session?.role]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginErr('');
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: loginUser, pass: loginPass }),
      });
      if (!res.ok) { setLoginErr('Credenciales inválidas'); return; }
      const data = await res.json();
      setToken(data.token); setSession({ username: data.username, role: data.role });
      sessionStorage.setItem('admin_token', data.token);
      sessionStorage.setItem('admin_user', data.username);
      sessionStorage.setItem('admin_role', data.role);
    } catch { setLoginErr('Error de conexión'); }
  }

  async function handleLogout() {
    if (token) apiAdmin('/api/admin/logout', token).catch(() => {});
    setToken(null); setSession(null);
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_role');
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    await apiAdmin('/api/admin/users', token!, { method: 'POST', body: JSON.stringify(newUser) });
    setNewUser({ username: '', password: '', role: 'viewer', name: '' });
    setUsers(await apiAdmin('/api/admin/users', token!));
  }

  async function deleteUser(id: string) {
    if (!confirm('¿Eliminar este usuario?')) return;
    await apiAdmin(`/api/admin/users/${id}`, token!, { method: 'DELETE' });
    setUsers(await apiAdmin('/api/admin/users', token!));
  }

  async function saveConfig() {
    await apiAdmin('/api/admin/config', token!, { method: 'PUT', body: JSON.stringify(editConfig) });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  }

  const isAdmin = HIERARCHY[session?.role ?? ''] >= 2;
  const visibleTabs = TABS.filter((t) => HIERARCHY[session?.role ?? ''] >= HIERARCHY[t.minRole]);

  // ── Login screen ────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/v-mark.svg" alt="" className="mx-auto h-10 w-10 mb-4" />
          <h1 className="mb-1 text-center font-bold text-xl">Admin</h1>
          <p className="mb-6 text-center text-sm text-gray-500">Panel de administración</p>
          {loginErr && <p className="mb-3 rounded-lg bg-red-50 p-2 text-center text-sm text-red-600">{loginErr}</p>}
          <input className="mb-3 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Usuario" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} autoFocus />
          <input className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500" type="password" placeholder="Contraseña" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
          <button className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">Ingresar</button>
          <p className="mt-4 text-center text-xs text-gray-400">Configurar vía ADMIN_USER y ADMIN_PASS en .env</p>
        </form>
      </div>
    );
  }

  // ── Main panel ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/v-mark.svg" alt="" className="h-7 w-7" />
            <span className="font-bold text-base">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[session?.role ?? 'viewer']}`}>
              {ROLE_LABELS[session?.role ?? 'viewer']}
            </span>
            <span className="text-xs text-gray-400">{session?.username}</span>
            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-600 transition-colors">Salir</button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {visibleTabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as TabId)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        {apiErr && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{apiErr}</p>}

        {/* ── Stats ───────────────────────────────────────────────────── */}
        {tab === 'stats' && stats && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-400">Total reportes</p><p className="text-2xl font-black">{stats.totals.total}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-400">Activos</p><p className="text-2xl font-black text-amber-600">{stats.totals.active}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-400">Duplicados</p><p className="text-2xl font-black text-purple-600">{stats.totals.duplicates}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-400">Personas afectadas</p><p className="text-2xl font-black text-orange-600">{stats.totals.people}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-400">Refugios</p><p className="text-lg font-bold">{stats.shelters.count} ({stats.shelters.occupancy}/{stats.shelters.capacity} ocup.)</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-400">Voluntarios activos</p><p className="text-lg font-bold">{stats.volunteers.active}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-400">Tipos de insumos</p><p className="text-lg font-bold">{stats.supplies}</p></div>
              <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-400">Motor IA</p><p className="text-lg font-bold">{stats.byEngine.map((e) => e.engine).join(', ')}</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Section title="Por fuente">
                {stats.bySource.map((s) => <Bar key={s.source} label={s.source} count={s.count} max={Math.max(...stats.bySource.map((x) => x.count), 1)} color="bg-blue-500" />)}
              </Section>
              <Section title="Por tipo">
                {stats.byType.map((t) => <Bar key={t.incident_type} label={t.incident_type} count={t.count} max={Math.max(...stats.byType.map((x) => x.count), 1)} color="bg-emerald-500" />)}
              </Section>
              <Section title="Por prioridad">
                {stats.byPriority.map((p) => <Bar key={p.priority} label={p.priority} count={p.count} max={Math.max(...stats.byPriority.map((x) => x.count), 1)} color={PRIO_COLORS[p.priority] ?? 'bg-gray-400'} />)}
              </Section>
              <Section title="Por estado">
                {stats.byStatus.map((s) => <Bar key={s.status} label={s.status} count={s.count} max={Math.max(...stats.byStatus.map((x) => x.count), 1)} color="bg-indigo-500" />)}
              </Section>
            </div>
            <Section title="Reportes por hora (últimas 24h)">
              <div className="flex items-end gap-1 h-24">
                {stats.hourly.map((h) => {
                  const maxH = Math.max(...stats.hourly.map((x) => x.count), 1);
                  return (
                    <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-400">{h.count}</span>
                      <div className="w-full rounded-t bg-gray-900 transition-all" style={{ height: `${(h.count / maxH) * 100}%`, minHeight: h.count > 0 ? 4 : 0 }} />
                      <span className="text-[9px] text-gray-400 -rotate-45 origin-left whitespace-nowrap">{h.hour.slice(11, 16)}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          </>
        )}
        {tab === 'stats' && !stats && <p className="text-center text-sm text-gray-400 py-12">Cargando...</p>}

        {/* ── Export ───────────────────────────────────────────────────── */}
        {tab === 'export' && (
          <Section title="Exportar reportes (no duplicados)">
            <div className="flex flex-wrap gap-3">
              {['csv', 'json'].map((fmt) => (
                <a key={fmt}
                  href={`${API_URL}/api/admin/reports/export?format=${fmt}&_t=${Date.now()}`}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
                  download>
                  📥 {fmt.toUpperCase()}
                </a>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-400">Descarga todos los reportes no duplicados.</p>
          </Section>
        )}

        {/* ── Usuarios ─────────────────────────────────────────────────── */}
        {tab === 'users' && isAdmin && (
          <>
            <Section title="Crear usuario">
              <form onSubmit={createUser} className="flex flex-wrap items-end gap-3">
                <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Usuario" value={newUser.username} onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))} required />
                <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" type="password" placeholder="Contraseña" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} required />
                <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Nombre (opcional)" value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} />
                <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                  <option value="viewer">Solo lectura</option>
                  <option value="operator">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
                <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">Crear</button>
              </form>
            </Section>

            <Section title="Usuarios existentes">
              <div className="space-y-2">
                {users.length === 0 && <p className="text-sm text-gray-400">Sin usuarios en DB. Usando credenciales del .env.</p>}
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{u.name ?? u.username}</span>
                      <span className="text-xs text-gray-400">@{u.username}</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</span>
                      <button onClick={() => deleteUser(u.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ── Config (proveedores) ─────────────────────────────────────── */}
        {tab === 'config' && configData && isAdmin && (
          <>
            <Section title="Proveedores activos (desde .env)">
              <div className="space-y-2 text-sm">
                {Object.entries(configData.env).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-4">
                    <span className="w-44 font-mono text-xs text-gray-500">{k}</span>
                    <span className="font-mono text-xs">{v || <span className="text-gray-300">—</span>}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">Los cambios requieren reiniciar el servidor.</p>
            </Section>

            <Section title="Configuración en base de datos">
              <div className="space-y-2">
                {Object.entries(editConfig).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-40 shrink-0 font-mono text-xs text-gray-500">{k}</span>
                    <input className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500 font-mono" value={v} onChange={(e) => setEditConfig((p) => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
                <button onClick={saveConfig} className="mt-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-colors">{configSaved ? '✓ Guardado' : 'Guardar'}</button>
              </div>
            </Section>
          </>
        )}

        {/* ── Organigrama ─────────────────────────────────────────────── */}
        {tab === 'orgs' && isAdmin && (
          <>
            {/* Formulario nueva organización */}
            <Section title="Agregar organización">
              <form onSubmit={async (e) => { e.preventDefault(); await apiAdmin('/api/admin/orgs', token!, { method: 'POST', body: JSON.stringify({ ...newOrg, parent_id: newOrg.parent_id || null }) }); setNewOrg({ name: '', category: 'comunitario', description: '', contact_name: '', contact_phone: '', parent_id: '' }); setOrgs(await apiAdmin('/api/admin/orgs', token!)); }} className="flex flex-wrap items-end gap-3">
                <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Nombre" value={newOrg.name} onChange={(e) => setNewOrg((p) => ({ ...p, name: e.target.value }))} required />
                <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" value={newOrg.category} onChange={(e) => setNewOrg((p) => ({ ...p, category: e.target.value }))}>
                  <option value="gobierno">Gobierno</option><option value="ong">ONG</option><option value="comunitario">Comunitario</option><option value="privado">Privado</option><option value="religioso">Religioso</option>
                </select>
                <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Contacto" value={newOrg.contact_name} onChange={(e) => setNewOrg((p) => ({ ...p, contact_name: e.target.value }))} />
                <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Teléfono" value={newOrg.contact_phone} onChange={(e) => setNewOrg((p) => ({ ...p, contact_phone: e.target.value }))} />
                <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" value={newOrg.parent_id} onChange={(e) => setNewOrg((p) => ({ ...p, parent_id: e.target.value }))}>
                  <option value="">— Sin dependencia —</option>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">Crear</button>
              </form>
            </Section>

            {/* Formulario nuevo voluntario */}
            <Section title="Agregar voluntario">
              <form onSubmit={async (e) => { e.preventDefault(); await apiAdmin('/api/admin/volunteers', token!, { method: 'POST', body: JSON.stringify({ ...newVol, skills: newVol.skills ? newVol.skills.split(',').map((s) => s.trim()) : [] }) }); setNewVol({ name: '', phone: '', role: 'general', profession: '', skills: '', zone: '', availability: 'disponible', organization_id: '' }); setVols(await apiAdmin('/api/admin/volunteers', token!)); }} className="flex flex-wrap items-end gap-3">
                <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Nombre" value={newVol.name} onChange={(e) => setNewVol((p) => ({ ...p, name: e.target.value }))} required />
                <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Teléfono" value={newVol.phone} onChange={(e) => setNewVol((p) => ({ ...p, phone: e.target.value }))} />
                <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Profesión" value={newVol.profession} onChange={(e) => setNewVol((p) => ({ ...p, profession: e.target.value }))} />
                <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Skills (coma separado)" value={newVol.skills} onChange={(e) => setNewVol((p) => ({ ...p, skills: e.target.value }))} />
                <input className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Zona" value={newVol.zone} onChange={(e) => setNewVol((p) => ({ ...p, zone: e.target.value }))} />
                <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" value={newVol.organization_id} onChange={(e) => setNewVol((p) => ({ ...p, organization_id: e.target.value }))}>
                  <option value="">— Independiente —</option>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">Crear</button>
              </form>
            </Section>

            {/* Visualización tipo organigrama */}
            <Section title="Organigrama">
              {orgs.length === 0 && vols.length === 0 && <p className="text-sm text-gray-400">Sin organizaciones ni voluntarios todavía.</p>}
              <div className="space-y-1">
                {orgs.filter((o) => !o.parent_id).map((root) => (
                  <OrgNode key={root.id} org={root} allOrgs={orgs} vols={vols} depth={0} expandedOrgs={expandedOrgs} setExpandedOrgs={setExpandedOrgs} apiAdmin={apiAdmin} token={token!} refresh={async () => { setOrgs(await apiAdmin('/api/admin/orgs', token!)); setVols(await apiAdmin('/api/admin/volunteers', token!)); }} />
                ))}
                {/* Voluntarios independientes (sin org) */}
                {vols.filter((v) => !v.organization_id).length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Voluntarios independientes</p>
                    <div className="flex flex-wrap gap-2">
                      {vols.filter((v) => !v.organization_id).map((v) => (
                        <VolChip key={v.id} vol={v} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </>
        )}

        {/* ── Auditoría ────────────────────────────────────────────────── */}
        {tab === 'audit' && isAdmin && (
          <Section title="Registro de cambios">
            <div className="space-y-1">
              {auditLog.length === 0 && <p className="text-sm text-gray-400">Sin registro todavía.</p>}
              {auditLog.map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2 text-xs">
                  <span className="text-gray-400 shrink-0">{new Date(log.created_at).toLocaleString()}</span>
                  <span className="font-medium text-gray-700 shrink-0">{log.username ?? '—'}</span>
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 shrink-0">{log.action}</span>
                  <span className="text-gray-500">{log.entity}{log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ''}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ── Componente visual de nodo de organización (árbol jerárquico) ──────

function OrgNode({
  org, allOrgs, vols, depth, expandedOrgs, setExpandedOrgs, apiAdmin, token, refresh,
}: {
  org: { id: string; name: string; category: string; description: string | null; contact_name: string | null; contact_phone: string | null };
  allOrgs: typeof org[];
  vols: { id: string; name: string; phone: string | null; role: string; profession: string | null; skills: string[]; zone: string | null; availability: string; organization_id: string | null }[];
  depth: number;
  expandedOrgs: Set<string>;
  setExpandedOrgs: React.Dispatch<React.SetStateAction<Set<string>>>;
  apiAdmin: typeof import('@/lib/api')['api']['admin'];
  token: string;
  refresh: () => Promise<void>;
}) {
  const children = allOrgs.filter((o) => o.parent_id === org.id);
  const members = vols.filter((v) => v.organization_id === org.id);
  const expanded = expandedOrgs.has(org.id);

  const catColors: Record<string, string> = { gobierno: 'bg-blue-500', ong: 'bg-emerald-500', comunitario: 'bg-amber-500', privado: 'bg-purple-500', religioso: 'bg-rose-500' };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 transition-colors" style={{ marginLeft: `${depth * 24}px` }}>
        {/* Toggle expand */}
        {(children.length > 0 || members.length > 0) && (
          <button onClick={() => setExpandedOrgs((prev) => { const next = new Set(prev); expanded ? next.delete(org.id) : next.add(org.id); return next; })} className="shrink-0 grid h-5 w-5 place-items-center rounded border border-gray-200 text-xs text-gray-400 hover:bg-gray-100">
            {expanded ? '−' : '+'}
          </button>
        )}
        {(children.length === 0 && members.length === 0) && <span className="shrink-0 w-5" />}
        {/* Categoría */}
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${catColors[org.category] ?? 'bg-gray-400'}`} title={org.category} />
        {/* Nombre */}
        <span className="font-medium text-sm">{org.name}</span>
        {/* Contacto */}
        {org.contact_name && <span className="text-xs text-gray-400">· {org.contact_name}</span>}
        {org.contact_phone && <span className="text-xs text-gray-400">{org.contact_phone}</span>}
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">{org.category}</span>
        {/* Delete */}
        <button onClick={async () => { if (confirm(`¿Eliminar "${org.name}"?`)) { await apiAdmin(`/api/admin/orgs/${org.id}`, token, { method: 'DELETE' }); refresh(); } }} className="ml-auto text-xs text-gray-300 hover:text-red-500 transition-colors">✕</button>
      </div>
      {/* Hijos expandidos */}
      {expanded && (
        <div className="mt-1 space-y-1">
          {children.map((child) => (
            <OrgNode key={child.id} org={child} allOrgs={allOrgs} vols={vols} depth={depth + 1} expandedOrgs={expandedOrgs} setExpandedOrgs={setExpandedOrgs} apiAdmin={apiAdmin} token={token} refresh={refresh} />
          ))}
          {members.map((v) => (
            <div key={v.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 text-sm" style={{ marginLeft: `${(depth + 1) * 24}px` }}>
              <span className="font-medium text-sm">{v.name}</span>
              {v.profession && <span className="text-xs text-gray-400">· {v.profession}</span>}
              {v.skills?.length > 0 && <span className="text-[10px] text-gray-400">{v.skills.slice(0, 3).join(', ')}{v.skills.length > 3 ? '…' : ''}</span>}
              {v.zone && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{v.zone}</span>}
              <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium ${v.availability === 'disponible' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {v.availability}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chip para voluntario independiente ────────────────────────────────

function VolChip({ vol }: { vol: { id: string; name: string; phone: string | null; profession: string | null; skills: string[]; zone: string | null; availability: string } }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
      <span className="font-medium text-sm">{vol.name}</span>
      {vol.profession && <span className="text-xs text-gray-400">· {vol.profession}</span>}
      {vol.skills?.length > 0 && <span className="text-[10px] text-gray-400">{vol.skills.slice(0, 2).join(', ')}</span>}
      {vol.zone && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{vol.zone}</span>}
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${vol.availability === 'disponible' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
        {vol.availability}
      </span>
    </div>
  );
}
