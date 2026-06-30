import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';
import { initCrypto, resetCrypto } from '@/lib/crypto';
import OrganigramaView from '@/components/OrganigramaView';

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

type AdminUser = {
  id: string;
  username: string;
  role: string;
  name: string | null;
  created_at: string;
};

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

const TABS = [
  { id: 'stats', label: '📊 Estadísticas', minRole: 'viewer' },
  { id: 'orgs', label: '🏛️ Organizaciones', minRole: 'operator' },
  { id: 'inventory', label: '📦 Inventario', minRole: 'operator' },
  { id: 'missing', label: '🔍 Desaparecidos', minRole: 'viewer' },
  { id: 'users', label: '👥 Usuarios', minRole: 'admin' },
  { id: 'config', label: '⚙️ Configuración', minRole: 'admin' },
  { id: 'export', label: '📥 Exportar', minRole: 'viewer' },
  { id: 'audit', label: '📋 Registro', minRole: 'admin' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const HIERARCHY: Record<string, number> = { viewer: 0, operator: 1, admin: 2 };

async function apiAdmin(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
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

function Bar({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 shrink-0 text-right text-gray-600 truncate">{label}</span>
      <div className="h-5 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs text-gray-500">{count}</span>
    </div>
  );
}

const PRIO_COLORS: Record<string, string> = {
  critica: 'bg-red-600',
  alta: 'bg-orange-500',
  media: 'bg-yellow-400',
  baja: 'bg-gray-300',
};

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('admin_token'));
  const [session, setSession] = useState<{ username: string; role: string } | null>(() => {
    const u = sessionStorage.getItem('admin_user');
    const r = sessionStorage.getItem('admin_role');
    return u ? { username: u, role: r ?? 'viewer' } : null;
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState<TabId>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'viewer', name: '' });
  const [configData, setConfigData] = useState<{
    env: Record<string, string>;
    db: Record<string, string>;
  } | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});
  const [configSaved, setConfigSaved] = useState(false);
  const [auditLog, setAuditLog] = useState<
    {
      id: string;
      username: string | null;
      action: string;
      entity: string;
      entity_id: string | null;
      created_at: string;
    }[]
  >([]);
  const [apiErr, setApiErr] = useState('');

  // Inventory state
  const [invFilterOrg, setInvFilterOrg] = useState<string>('');
  const [invSearch, setInvSearch] = useState('');
  const [invItems, setInvItems] = useState<
    {
      id: string;
      item_name: string;
      category: string;
      quantity: number;
      unit: string;
      notes: string | null;
      organization_id: string;
      org_name: string;
    }[]
  >([]);
  const [invForm, setInvForm] = useState({
    organization_id: '',
    item_name: '',
    category: 'general',
    quantity: 0,
    unit: 'u',
    notes: '',
  });

  // Org chart state
  const [orgs, setOrgs] = useState<
    {
      id: string;
      name: string;
      category: string;
      description: string | null;
      contact_name: string | null;
      contact_phone: string | null;
      location: string | null;
      parent_id: string | null;
      created_at: string;
    }[]
  >([]);
  const [vols, setVols] = useState<
    {
      id: string;
      name: string;
      phone: string | null;
      role: string;
      profession: string | null;
      skills: string[];
      zone: string | null;
      availability: string;
      organization_id: string | null;
      org_name: string | null;
      status: string;
      created_at: string;
    }[]
  >([]);

  // Cargar datos según tab y rol
  const roleLevel = HIERARCHY[session?.role ?? ''] ?? 0;
  useEffect(() => {
    if (!token) return;
    setApiErr('');
    const fn = async () => {
      try {
        if (tab === 'stats') setStats(await apiAdmin('/api/admin/stats', token));
        if (roleLevel >= 2) {
          if (tab === 'users') setUsers(await apiAdmin('/api/admin/users', token));
          if (tab === 'config') {
            const c = (await apiAdmin('/api/admin/config', token)) as {
              env: Record<string, string>;
              db: Record<string, string>;
            };
            setConfigData(c);
            if (c) setEditConfig(c.db);
          }
          if (tab === 'audit') setAuditLog(await apiAdmin('/api/admin/audit', token));
        }
        if (roleLevel >= 1 && tab === 'orgs') {
          setOrgs(await apiAdmin('/api/admin/orgs', token));
          setVols(await apiAdmin('/api/admin/volunteers', token));
        }
        if (roleLevel >= 1 && tab === 'inventory') {
          if (orgs.length === 0) setOrgs(await apiAdmin('/api/admin/orgs', token));
          setInvItems(await apiAdmin('/api/admin/inventory', token));
        }
      } catch (err) {
        setApiErr(String(err));
        setToken(null);
        setSession(null);
        sessionStorage.removeItem('admin_token');
      }
    };
    fn();
  }, [token, tab, roleLevel]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr('');
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: loginUser, pass: loginPass }),
      });
      if (!res.ok) {
        setLoginErr('Credenciales inválidas');
        return;
      }
      const data = await res.json();
      setToken(data.token);
      setSession({ username: data.username, role: data.role });
      sessionStorage.setItem('admin_token', data.token);
      sessionStorage.setItem('admin_user', data.username);
      sessionStorage.setItem('admin_role', data.role);
      initCrypto(data.token).catch(() => {});
      window.dispatchEvent(new Event('admin-auth-change'));
    } catch {
      setLoginErr('Error de conexión');
    }
  }

  async function handleLogout() {
    if (token) apiAdmin('/api/admin/logout', token).catch(() => {});
    setToken(null);
    setSession(null);
    resetCrypto();
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_role');
    window.dispatchEvent(new Event('admin-auth-change'));
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
    await apiAdmin('/api/admin/config', token!, {
      method: 'PUT',
      body: JSON.stringify(editConfig),
    });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  }

  const isAdmin = roleLevel >= 2;
  const canManageOrgs = roleLevel >= 1;
  const visibleTabs = TABS.filter((t) => roleLevel >= HIERARCHY[t.minRole]);

  // ── Login screen ────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <form
          onSubmit={handleLogin}
          autoComplete="off"
          className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-lg"
        >
          <img src="/brand/v-mark.svg" alt="" className="mx-auto h-10 w-10 mb-4" />
          <h1 className="text-center font-bold text-gray-900 text-lg mb-1">Panel de Control</h1>
          <p className="mb-6 text-center text-sm text-gray-500">
            Puente de Vida · Coordinación de Emergencias
          </p>
          {loginErr && (
            <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{loginErr}</p>
          )}
          <div className="space-y-3">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Usuario"
              autoComplete="off"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              autoFocus
            />
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              type="password"
              placeholder="Contraseña"
              autoComplete="new-password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
            />
            <button className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">
              Ingresar
            </button>
          </div>
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
          <div className="flex items-center gap-2">
            <img src="/brand/v-mark.svg" alt="" className="h-6 w-6" />
            <span className="font-bold text-sm">Panel de Control</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">{session?.username}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${ROLE_COLORS[session?.role ?? 'viewer']}`}
            >
              {ROLE_LABELS[session?.role ?? 'viewer']}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as TabId)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
                <p className="text-2xl font-bold">{stats.totals.total}</p>
                <p className="text-xs text-gray-500">Total reportes</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
                <p className="text-2xl font-bold">{stats.totals.active}</p>
                <p className="text-xs text-gray-500">Activos</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
                <p className="text-2xl font-bold">{stats.totals.people}</p>
                <p className="text-xs text-gray-500">Afectados</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
                <p className="text-2xl font-bold">{stats.totals.duplicates}</p>
                <p className="text-xs text-gray-500">Duplicados agrupados</p>
              </div>
            </div>

            <Section title="Por fuente">
              {stats.bySource.map((s) => (
                <Bar
                  key={s.source}
                  label={s.source}
                  count={s.count}
                  max={Math.max(...stats.bySource.map((x) => x.count), 1)}
                  color="bg-blue-500"
                />
              ))}
            </Section>
            <Section title="Por tipo de incidente">
              {stats.byType.map((t) => (
                <Bar
                  key={t.incident_type}
                  label={t.incident_type}
                  count={t.count}
                  max={Math.max(...stats.byType.map((x) => x.count), 1)}
                  color="bg-emerald-500"
                />
              ))}
            </Section>
            <Section title="Por prioridad">
              {stats.byPriority.map((p) => (
                <Bar
                  key={p.priority}
                  label={p.priority}
                  count={p.count}
                  max={Math.max(...stats.byPriority.map((x) => x.count), 1)}
                  color={PRIO_COLORS[p.priority] ?? 'bg-gray-400'}
                />
              ))}
            </Section>
            <Section title="Por estado">
              {stats.byStatus.map((s) => (
                <Bar
                  key={s.status}
                  label={s.status}
                  count={s.count}
                  max={Math.max(...stats.byStatus.map((x) => x.count), 1)}
                  color="bg-purple-500"
                />
              ))}
            </Section>
            <Section title="Motor de clasificación">
              {stats.byEngine.map((e) => (
                <Bar
                  key={e.engine}
                  label={e.engine}
                  count={e.count}
                  max={Math.max(...stats.byEngine.map((x) => x.count), 1)}
                  color="bg-cyan-500"
                />
              ))}
            </Section>
            <Section title="Actividad por hora (últimas 24 h)">
              <div className="flex items-end gap-1 h-24">
                {stats.hourly.map((h) => {
                  const maxH = Math.max(...stats.hourly.map((x) => x.count), 1);
                  return (
                    <div key={h.hour} className="flex flex-1 flex-col items-center gap-0.5">
                      <span className="text-[10px] text-gray-400">{h.count}</span>
                      <div
                        className="w-full rounded-t bg-gray-800 transition-all"
                        style={{ height: `${(h.count / maxH) * 100}%` }}
                      />
                      <span className="text-[9px] text-gray-400">{h.hour.slice(0, 2)}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
            <Section title="Recursos">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold">{stats.shelters.count}</p>
                  <p className="text-xs text-gray-500">Refugios</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.shelters.capacity}</p>
                  <p className="text-xs text-gray-500">Capacidad</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.volunteers.active}</p>
                  <p className="text-xs text-gray-500">Voluntarios</p>
                </div>
              </div>
            </Section>
          </>
        )}
        {tab === 'stats' && !stats && (
          <p className="text-center text-sm text-gray-400 py-12">Cargando...</p>
        )}

        {/* ── Export ──────────────────────────────────────────────────── */}
        {/* ── Desaparecidos (registros unificados) ─────────────────────── */}
        {tab === 'missing' && <MissingPersonsView token={token!} apiAdmin={apiAdmin} />}

        {tab === 'export' && (
          <div className="flex gap-3">
            <a
              href={`${API_URL}/api/admin/export?format=csv`}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                fetch(`${API_URL}/api/admin/export?format=csv`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then((r) => r.blob())
                  .then((b) => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(b);
                    a.download = 'reportes.csv';
                    a.click();
                  });
              }}
            >
              📥 Exportar CSV
            </a>
            <a
              href={`${API_URL}/api/admin/export?format=json`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                fetch(`${API_URL}/api/admin/export?format=json`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then((r) => r.blob())
                  .then((b) => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(b);
                    a.download = 'reportes.json';
                    a.click();
                  });
              }}
            >
              📥 Exportar JSON
            </a>
          </div>
        )}

        {/* ── Usuarios ────────────────────────────────────────────────── */}
        {tab === 'users' && isAdmin && (
          <>
            <Section title="Agregar usuario">
              <form onSubmit={createUser} className="flex flex-wrap items-end gap-3">
                <input
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Usuario"
                  value={newUser.username}
                  onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
                  required
                />
                <input
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  type="password"
                  placeholder="Contraseña"
                  value={newUser.password}
                  onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                  required
                />
                <input
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Nombre"
                  value={newUser.name}
                  onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                />
                <select
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={newUser.role}
                  onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                >
                  <option value="viewer">Solo lectura</option>
                  <option value="operator">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
                <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">
                  Crear
                </button>
              </form>
            </Section>
            <Section title="Usuarios existentes">
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{u.username}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${ROLE_COLORS[u.role]}`}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                      {u.name && <span className="text-gray-400">{u.name}</span>}
                    </div>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ── Config / Proveedores ────────────────────────────────────── */}
        {tab === 'config' && configData && isAdmin && (
          <>
            <Section title="Proveedores">
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span>🤖</span> Clasificación por IA
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        configData.env.aiProvider === 'openai'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {configData.env.aiProvider === 'openai' ? 'Conectado' : 'Heurística local'}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    <LabelInput
                      label="Proveedor"
                      value={editConfig.aiProvider ?? ''}
                      onChange={(v) => setEditConfig((p) => ({ ...p, aiProvider: v }))}
                      placeholder="none / openai"
                    />
                    <LabelInput
                      label="URL API"
                      value={editConfig.aiApiUrl ?? ''}
                      onChange={(v) => setEditConfig((p) => ({ ...p, aiApiUrl: v }))}
                    />
                    <LabelInput
                      label="Modelo"
                      value={editConfig.aiModel ?? ''}
                      onChange={(v) => setEditConfig((p) => ({ ...p, aiModel: v }))}
                      placeholder="gpt-4o-mini"
                    />
                    <LabelInput
                      label="API Key"
                      value={editConfig.aiApiKey ?? ''}
                      onChange={(v) => setEditConfig((p) => ({ ...p, aiApiKey: v }))}
                      sensitive
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span>💬</span> WhatsApp
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        configData.env.whatsappApiUrl
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {configData.env.whatsappApiUrl ? 'Configurado' : 'Modo demo'}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    <LabelInput
                      label="URL API"
                      value={editConfig.whatsappApiUrl ?? ''}
                      onChange={(v) => setEditConfig((p) => ({ ...p, whatsappApiUrl: v }))}
                    />
                    <LabelInput
                      label="API Key"
                      value={editConfig.whatsappApiKey ?? ''}
                      onChange={(v) => setEditConfig((p) => ({ ...p, whatsappApiKey: v }))}
                      sensitive
                    />
                    <LabelInput
                      label="Phone ID"
                      value={editConfig.whatsappPhoneId ?? ''}
                      onChange={(v) => setEditConfig((p) => ({ ...p, whatsappPhoneId: v }))}
                    />
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={editConfig.whatsappAutoReply === 'true'}
                        onChange={(e) =>
                          setEditConfig((p) => ({
                            ...p,
                            whatsappAutoReply: e.target.checked ? 'true' : 'false',
                          }))
                        }
                        className="rounded border-gray-300"
                      />
                      Auto-respuesta activa
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveConfig}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
                  >
                    {configSaved ? '✓ Guardado' : 'Guardar cambios'}
                  </button>
                  <span className="text-xs text-gray-400">Requiere reiniciar el servidor.</span>
                </div>
              </div>
            </Section>
          </>
        )}

        {/* ── Organizaciones ─────────────────────────────────────────────── */}
        {tab === 'orgs' && canManageOrgs && (
          <OrganigramaView
            orgs={orgs}
            vols={vols}
            token={token!}
            adminFetch={apiAdmin}
            roleLevel={roleLevel}
            onNavigateToInventory={(orgId) => {
              setInvFilterOrg(orgId);
              setTab('inventory');
            }}
          />
        )}

        {/* ── Inventario ────────────────────────────────────────────────── */}
        {tab === 'inventory' && canManageOrgs && (
          <Section title="Inventario de organizaciones">
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={invFilterOrg}
                onChange={(e) => setInvFilterOrg(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Todas las organizaciones</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <input
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 w-64"
              />
            </div>

            {/* Formulario de alta */}
            <details className="mb-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                + Agregar item
              </summary>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const body = {
                    item_name: invForm.item_name,
                    category: invForm.category,
                    quantity: invForm.quantity,
                    unit: invForm.unit,
                    notes: invForm.notes || undefined,
                  };
                  await apiAdmin(`/api/admin/orgs/${invForm.organization_id}/inventory`, token!, {
                    method: 'POST',
                    body: JSON.stringify(body),
                  });
                  setInvItems(await apiAdmin('/api/admin/inventory', token!));
                  setInvForm({
                    organization_id: '',
                    item_name: '',
                    category: 'general',
                    quantity: 0,
                    unit: 'u',
                    notes: '',
                  });
                }}
                className="mt-2 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  Organización
                  <select
                    required
                    value={invForm.organization_id}
                    onChange={(e) => setInvForm((f) => ({ ...f, organization_id: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">—</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  Item
                  <input
                    required
                    value={invForm.item_name}
                    onChange={(e) => setInvForm((f) => ({ ...f, item_name: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  Categoría
                  <select
                    value={invForm.category}
                    onChange={(e) => setInvForm((f) => ({ ...f, category: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="medico">Médico</option>
                    <option value="alimento">Alimento</option>
                    <option value="higiene">Higiene</option>
                    <option value="herramienta">Herramienta</option>
                    <option value="comunicacion">Comunicación</option>
                    <option value="transporte">Transporte</option>
                    <option value="otro">Otro</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  Cantidad
                  <input
                    type="number"
                    min={0}
                    required
                    value={invForm.quantity}
                    onChange={(e) =>
                      setInvForm((f) => ({ ...f, quantity: Number(e.target.value) }))
                    }
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  Unidad
                  <input
                    value={invForm.unit}
                    onChange={(e) => setInvForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  Notas
                  <input
                    value={invForm.notes}
                    onChange={(e) => setInvForm((f) => ({ ...f, notes: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">
                  Agregar
                </button>
              </form>
            </details>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="pb-2 pr-4">Organización</th>
                    <th className="pb-2 pr-4">Item</th>
                    <th className="pb-2 pr-4">Categoría</th>
                    <th className="pb-2 pr-4 text-right">Cantidad</th>
                    <th className="pb-2 pr-4">Unidad</th>
                    <th className="pb-2 pr-4">Notas</th>
                    <th className="pb-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {invItems
                    .filter((i) => !invFilterOrg || i.organization_id === invFilterOrg)
                    .filter(
                      (i) =>
                        !invSearch || i.item_name.toLowerCase().includes(invSearch.toLowerCase()),
                    )
                    .map((i) => (
                      <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4 text-gray-500">{i.org_name}</td>
                        <td className="py-2 pr-4 font-medium text-gray-900">{i.item_name}</td>
                        <td className="py-2 pr-4">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                            {i.category}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right font-semibold">{i.quantity}</td>
                        <td className="py-2 pr-4 text-gray-500">{i.unit}</td>
                        <td className="py-2 pr-4 text-gray-400 max-w-xs truncate">
                          {i.notes ?? '—'}
                        </td>
                        <td className="py-2 pr-4">
                          <button
                            onClick={async () => {
                              await apiAdmin(`/api/admin/inventory/${i.id}`, token!, {
                                method: 'DELETE',
                              });
                              setInvItems(await apiAdmin('/api/admin/inventory', token!));
                            }}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {invItems.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">Sin items de inventario.</p>
              )}
            </div>
          </Section>
        )}

        {/* ── Auditoría ────────────────────────────────────────────────── */}
        {tab === 'audit' && isAdmin && (
          <Section title="Registro de cambios">
            <div className="space-y-1">
              {auditLog.length === 0 && (
                <p className="text-sm text-gray-400">Sin registro todavía.</p>
              )}
              {auditLog.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2 text-xs"
                >
                  <span className="text-gray-400 shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                  <span className="font-medium text-gray-700 shrink-0">{log.username ?? '—'}</span>
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 shrink-0">
                    {log.action}
                  </span>
                  <span className="text-gray-500">
                    {log.entity}
                    {log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ── Vista de búsqueda unificada de desaparecidos ──────────────────────────

type ExternalPerson = {
  id: string;
  full_name: string;
  document_id: string | null;
  age: number | null;
  status: string;
  location: string | null;
  facility: string | null;
  notes: string | null;
  source_name: string;
  source_url: string | null;
  external_id: string;
  ingested_at: string;
  updated_at: string;
};

type ExternalStats = {
  total: number;
  byStatus: { status: string; count: string }[];
  sources: { name: string; record_count: number; last_sync_at: string | null }[];
};

const STATUS_COLORS: Record<string, string> = {
  desaparecido: 'bg-red-100 text-red-700',
  localizado: 'bg-green-100 text-green-700',
  hospitalizado: 'bg-amber-100 text-amber-700',
  fallecido: 'bg-gray-200 text-gray-700',
  desconocido: 'bg-blue-100 text-blue-700',
};

function MissingPersonsView({
  token,
  apiAdmin,
}: {
  token: string;
  apiAdmin: (path: string, token: string, init?: RequestInit) => Promise<unknown>;
}) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [results, setResults] = useState<ExternalPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ExternalStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  const [selected, setSelected] = useState<ExternalPerson | null>(null);

  // Cargar stats al montar
  useEffect(() => {
    apiAdmin('/api/external/stats', token)
      .then((d) => setStats(d as ExternalStats))
      .catch(() => {});
  }, []);

  async function handleSearch() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '100');
      const data = (await apiAdmin(`/api/external/search?${params.toString()}`, token)) as {
        rows: ExternalPerson[];
        total: number;
      };
      setResults(data.rows);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  async function handleIngest() {
    setIngesting(true);
    setIngestResult(null);
    try {
      const data = (await apiAdmin('/api/external/ingest', token, {
        method: 'POST',
      })) as { sources: { name: string; inserted: number }[]; total: number };
      setIngestResult(`Sincronizadas ${data.total} personas de ${data.sources.length} fuentes.`);
      // Recargar stats
      apiAdmin('/api/external/stats', token)
        .then((d) => setStats(d as ExternalStats))
        .catch(() => {});
    } catch {
      setIngestResult('Error al sincronizar');
    } finally {
      setIngesting(false);
    }
  }

  const allStatuses = stats?.byStatus.map((s) => s.status) ?? [];

  return (
    <>
      {/* Stats header */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-500">Registros unificados</p>
          </div>
          {stats.byStatus.map((s) => (
            <div
              key={s.status}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center"
            >
              <p className="text-lg font-bold">{s.count}</p>
              <p className="text-xs text-gray-500 capitalize">{s.status}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fuentes */}
      {stats && stats.sources.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-bold text-sm text-gray-500 uppercase tracking-wider">Fuentes</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {stats.sources.map((s) => (
              <div key={s.name} className="rounded-lg bg-gray-50 px-3 py-2 text-xs">
                <span className="font-medium text-gray-700">{s.name}</span>
                <span className="ml-2 text-gray-400">{s.record_count} registros</span>
                {s.last_sync_at && (
                  <span className="ml-2 text-gray-400">
                    · {new Date(s.last_sync_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">Buscar por nombre o cédula</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Ej: Martínez Camargo"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Estado</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {allStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {results.length > 0 && (
        <p className="text-sm text-gray-500">
          {total} resultado{total !== 1 ? 's' : ''}
        </p>
      )}

      <div className="space-y-2">
        {results.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelected(selected?.id === p.id ? null : p)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{p.full_name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {p.document_id && <span>🪪 {p.document_id}</span>}
                  {p.age != null && <span>🎂 {p.age} años</span>}
                  {p.location && <span>📍 {p.location}</span>}
                </div>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-500'}`}
              >
                {p.status}
              </span>
            </div>
            {selected?.id === p.id && (
              <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500">
                {p.facility && <p>🏥 {p.facility}</p>}
                {p.notes && <p>📝 {p.notes}</p>}
                <p className="text-gray-400">Fuente: {p.source_name}</p>
                {p.source_url && (
                  <a
                    href={p.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Ver original ↗
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
        {results.length === 0 && !loading && (
          <p className="text-center text-sm text-gray-400 py-8">
            Buscá por nombre o cédula para ver resultados.
          </p>
        )}
      </div>

      {/* Ingesta */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleIngest}
          disabled={ingesting}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {ingesting ? 'Sincronizando...' : '🔄 Sincronizar fuentes externas'}
        </button>
        {ingestResult && <span className="text-xs text-gray-500">{ingestResult}</span>}
      </div>
    </>
  );
}

function LabelInput({
  label,
  value,
  onChange,
  sensitive,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  sensitive?: boolean;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="relative flex-1">
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-mono"
          type={sensitive && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? (sensitive ? '••••••••' : '')}
        />
        {sensitive && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
          >
            {show ? '🙈' : '👁️'}
          </button>
        )}
      </div>
    </div>
  );
}
