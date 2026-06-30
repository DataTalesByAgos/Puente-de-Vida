import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocalReport } from '@/lib/types';

const ORG_COORDS: Record<string, [number, number]> = {
  Caracas: [10.4806, -66.9036],
  Petare: [10.4768, -66.8089],
  Catia: [10.5099, -66.9411],
  'El Valle': [10.4634, -66.9171],
  'La Vega': [10.4881, -66.9418],
  Antímano: [10.4657, -66.9791],
  Caricuao: [10.4347, -66.9778],
  'San Agustín': [10.4912, -66.8951],
  'Los Teques': [10.3422, -67.0392],
  'La Guaira': [10.6006, -66.9331],
  'El Ávila': [10.5417, -66.8775],
  Miranda: [10.3, -66.8],
  Nacional: [10.4806, -66.9036],
};

function orgCoords(
  name: string,
  location: string | null,
  desc: string | null,
): [number, number] | null {
  const text = `${name} ${location ?? ''} ${desc ?? ''}`;
  for (const [key, coords] of Object.entries(ORG_COORDS)) {
    if (text.includes(key)) return coords;
  }
  return null;
}

const CAT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  gobierno: { icon: '🏛️', label: 'Gobierno', color: 'from-blue-500 to-blue-600' },
  ong: { icon: '🤝', label: 'ONG', color: 'from-emerald-500 to-emerald-600' },
  privado: { icon: '🏢', label: 'Privado', color: 'from-purple-500 to-purple-600' },
  comunitario: { icon: '👥', label: 'Comunitario', color: 'from-amber-500 to-amber-600' },
  religioso: { icon: '⛪', label: 'Religioso', color: 'from-rose-500 to-rose-600' },
};

type Org = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  location: string | null;
  parent_id: string | null;
};
type Vol = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  profession: string | null;
  skills: string[];
  zone: string | null;
  availability: string;
  organization_id: string | null;
};

export default function OrganigramaView({
  orgs: initialOrgs,
  vols: initialVols,
  token,
  adminFetch,
  roleLevel,
}: {
  orgs: Org[];
  vols: Vol[];
  token: string;
  adminFetch: (path: string, token: string, opts?: Record<string, unknown>) => Promise<any>;
  roleLevel: number;
}) {
  const [orgs, setOrgs] = useState(initialOrgs);
  const [vols, setVols] = useState(initialVols);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('todas');
  const [modalOpen, setModalOpen] = useState<'org' | 'vol' | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Org form state
  const [orgForm, setOrgForm] = useState({
    name: '',
    category: 'comunitario',
    description: '',
    contact_name: '',
    contact_phone: '',
    location: '',
    parent_id: '',
  });
  // Vol form state
  const [volForm, setVolForm] = useState({
    name: '',
    phone: '',
    role: 'general',
    profession: '',
    skills: '',
    zone: '',
    availability: 'disponible',
    organization_id: '',
  });

  const refresh = async () => {
    setOrgs(await adminFetch('/api/admin/orgs', token));
    setVols(await adminFetch('/api/admin/volunteers', token));
  };

  const filtered = useMemo(() => {
    let list = orgs;
    if (activeCategory !== 'todas') list = list.filter((o) => o.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) => o.name.toLowerCase().includes(q) || o.contact_name?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [orgs, activeCategory, search]);

  const grouped = useMemo(() => {
    const map: Record<string, Org[]> = {};
    for (const o of filtered) {
      if (!map[o.category]) map[o.category] = [];
      map[o.category].push(o);
    }
    return map;
  }, [filtered]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { todas: orgs.length };
    for (const o of orgs) {
      counts[o.category] = (counts[o.category] ?? 0) + 1;
    }
    return counts;
  }, [orgs]);

  const activeContacts = useMemo(
    () => vols.filter((v) => v.availability === 'disponible').length,
    [vols],
  );

  // Map points
  const mapPoints = useMemo(() => {
    return orgs
      .map((o) => ({
        ...o,
        coords: orgCoords(o.name, o.location ?? o.description ?? '', o.description),
      }))
      .filter((o): o is Org & { coords: [number, number] } => o.coords !== null);
  }, [orgs]);

  const sortedCategories = ['gobierno', 'ong', 'privado', 'comunitario', 'religioso'];

  // Delete org
  async function deleteOrg(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    await adminFetch(`/api/admin/orgs/${id}`, token, { method: 'DELETE' });
    refresh();
  }

  // Delete vol
  async function deleteVol(id: string) {
    if (!confirm('¿Eliminar este voluntario?')) return;
    await adminFetch(`/api/admin/volunteers/${id}`, token, { method: 'DELETE' });
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Organizaciones</h1>
          <p className="text-sm text-muted">
            Directorio de organizaciones y contactos estratégicos
          </p>
        </div>
        <button
          onClick={() => setModalOpen('org')}
          className="flex items-center gap-2 rounded-xl bg-coral px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:brightness-110 active:scale-95"
        >
          <span className="text-lg leading-none">+</span> Crear
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            🔍
          </span>
          <input
            className="input h-10 w-full rounded-xl pl-9"
            placeholder="Buscar organización o contacto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'todas', icon: '📋', label: 'Todas' },
          ...sortedCategories.map((c) => ({ id: c, ...CAT_CONFIG[c] })),
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              activeCategory === cat.id
                ? 'bg-coral text-white shadow-card'
                : 'bg-surface text-muted hover:bg-paper hover:text-ink border border-line'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-paper text-muted'
              }`}
            >
              {categoryCounts[cat.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Main content: cards + map */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Cards */}
        <div className="flex-1 min-w-0 space-y-6">
          {sortedCategories
            .filter((cat) => grouped[cat]?.length > 0)
            .map((cat) => {
              const items = grouped[cat] ?? [];
              const config = CAT_CONFIG[cat];
              // Get volunteers for this category's orgs
              const catOrgIds = new Set(items.map((o) => o.id));
              const catVols = vols.filter(
                (v) => v.organization_id && catOrgIds.has(v.organization_id),
              );

              return (
                <section key={cat}>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <h2 className="font-display text-sm font-bold text-ink">{config.label}</h2>
                      <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-muted border border-line">
                        {items.length} orgs
                      </span>
                      {catVols.length > 0 && (
                        <span className="text-[11px] text-muted">
                          · {catVols.length} voluntarios
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {items.map((org) => {
                      const members = vols.filter((v) => v.organization_id === org.id);
                      return (
                        <div
                          key={org.id}
                          className="relative rounded-xl border border-line bg-surface p-4 shadow-card transition hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper text-xl">
                              {config.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-display text-sm font-bold text-ink truncate">
                                {org.name}
                              </h3>
                              {org.contact_name && (
                                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                                  <span>👤</span> {org.contact_name}
                                </p>
                              )}
                              {org.contact_phone && (
                                <p className="flex items-center gap-1.5 text-xs text-muted">
                                  <span>📞</span> {org.contact_phone}
                                </p>
                              )}
                              {org.location && (
                                <p className="flex items-center gap-1.5 text-xs text-muted">
                                  <span>📍</span> {org.location}
                                </p>
                              )}
                              {org.description && (
                                <p className="mt-1 text-[11px] text-muted/70 line-clamp-1">
                                  {org.description}
                                </p>
                              )}
                              {members.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {members.slice(0, 3).map((v) => (
                                    <span
                                      key={v.id}
                                      className="rounded-full bg-paper px-2 py-0.5 text-[10px] text-muted border border-line truncate max-w-28"
                                    >
                                      {v.name}
                                    </span>
                                  ))}
                                  {members.length > 3 && (
                                    <span className="text-[10px] text-muted">
                                      +{members.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* 3-dot menu */}
                            <div className="relative shrink-0">
                              <button
                                onClick={() => setMenuOpen(menuOpen === org.id ? null : org.id)}
                                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-paper hover:text-ink transition"
                              >
                                ⋯
                              </button>
                              {menuOpen === org.id && (
                                <div className="absolute right-0 top-full z-20 mt-1 min-w-36 rounded-xl border border-line bg-surface py-1 shadow-card">
                                  <button
                                    onClick={() => {
                                      setMenuOpen(null);
                                      setOrgForm({
                                        name: org.name,
                                        category: org.category,
                                        description: org.description ?? '',
                                        contact_name: org.contact_name ?? '',
                                        contact_phone: org.contact_phone ?? '',
                                        location: org.location ?? '',
                                        parent_id: org.parent_id ?? '',
                                      });
                                      setModalOpen('org');
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-ink hover:bg-paper transition"
                                  >
                                    ✏️ Editar
                                  </button>
                                  <hr className="my-1 border-line" />
                                  {roleLevel >= 2 && (
                                    <button
                                      onClick={() => {
                                        setMenuOpen(null);
                                        deleteOrg(org.id, org.name);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-coralInk hover:bg-paper transition"
                                    >
                                      🗑️ Eliminar
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          {/* Voluntarios independientes */}
          {(() => {
            const freeVols = vols.filter((v) => !v.organization_id);
            const freeFiltered = search.trim()
              ? freeVols.filter(
                  (v) =>
                    v.name.toLowerCase().includes(search.toLowerCase()) ||
                    v.zone?.toLowerCase().includes(search.toLowerCase()),
                )
              : freeVols;
            if (freeFiltered.length === 0 && activeCategory !== 'todas') return null;
            return (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg">🆓</span>
                  <h2 className="font-display text-sm font-bold text-ink">
                    Voluntarios independientes
                  </h2>
                  <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-muted border border-line">
                    {freeFiltered.length} disponibles
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {freeFiltered.map((v) => (
                    <div
                      key={v.id}
                      className="relative group rounded-xl border border-line bg-surface px-3 py-2.5 shadow-card transition hover:shadow-md"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-coral/10 text-[11px] font-bold text-coralInk">
                          {v.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{v.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {v.profession && (
                              <span className="text-[10px] text-muted">{v.profession}</span>
                            )}
                            {v.zone && <span className="text-[10px] text-muted">📍{v.zone}</span>}
                            <span
                              className={`text-[10px] font-medium ${v.availability === 'disponible' ? 'text-wa' : 'text-amber'}`}
                            >
                              {v.availability === 'disponible' ? '● disponible' : '● ocupado'}
                            </span>
                          </div>
                          {v.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {v.skills.slice(0, 2).map((s) => (
                                <span
                                  key={s}
                                  className="rounded-full bg-paper px-1.5 py-0.5 text-[9px] text-muted border border-line"
                                >
                                  {s}
                                </span>
                              ))}
                              {v.skills.length > 2 && (
                                <span className="text-[9px] text-muted">
                                  +{v.skills.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {roleLevel >= 1 && (
                          <div className="opacity-0 group-hover:opacity-100 transition shrink-0">
                            <button
                              onClick={() => deleteVol(v.id)}
                              className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:text-coralInk transition"
                              title="Eliminar"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {filtered.length === 0 && vols.filter((v) => !v.organization_id).length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="text-4xl">📭</span>
              <p className="text-sm font-medium text-ink">Sin organizaciones</p>
              <p className="text-xs text-muted">No hay organizaciones en esta categoría todavía.</p>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="w-full shrink-0 lg:w-[340px]">
          <div className="sticky top-20">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm">🗺️</span>
              <h3 className="text-sm font-bold text-ink">Mapa de organizaciones</h3>
            </div>
            <div className="h-[300px] overflow-hidden rounded-xl border border-line shadow-card lg:h-[420px]">
              <OrgMap points={mapPoints} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-line bg-surface p-4 text-center shadow-card">
          <p className="text-2xl font-bold tabular-nums">{orgs.length}</p>
          <p className="text-xs text-muted mt-0.5">Total organizaciones</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 text-center shadow-card">
          <p className="text-2xl font-bold tabular-nums">
            {activeContacts +
              vols.filter((v) => !v.organization_id && v.availability === 'disponible').length}
          </p>
          <p className="text-xs text-muted mt-0.5">Contactos activos</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 text-center shadow-card">
          <p className="text-2xl font-bold tabular-nums">
            {new Set(orgs.map((o) => o.category)).size}
          </p>
          <p className="text-xs text-muted mt-0.5">Categorías registradas</p>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => {
            setModalOpen(null);
            setMenuOpen(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal tabs */}
            <div className="mb-5 flex gap-1 rounded-xl bg-paper p-1">
              <button
                onClick={() => setModalOpen('org')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${modalOpen === 'org' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                🏛️ Organización
              </button>
              <button
                onClick={() => setModalOpen('vol')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${modalOpen === 'vol' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                👤 Voluntario
              </button>
            </div>

            {modalOpen === 'org' ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const body = { ...orgForm, parent_id: orgForm.parent_id || null };
                  if (orgForm.name && orgs.find((o) => o.name === orgForm.name)) {
                    const existing = orgs.find((o) => o.name === orgForm.name);
                    if (existing)
                      await adminFetch(`/api/admin/orgs/${existing.id}`, token, {
                        method: 'PUT',
                        body: JSON.stringify(body),
                      });
                  } else {
                    await adminFetch('/api/admin/orgs', token, {
                      method: 'POST',
                      body: JSON.stringify(body),
                    });
                  }
                  setModalOpen(null);
                  setOrgForm({
                    name: '',
                    category: 'comunitario',
                    description: '',
                    contact_name: '',
                    contact_phone: '',
                    location: '',
                    parent_id: '',
                  });
                  refresh();
                }}
                className="space-y-3"
              >
                <input
                  className="input h-10"
                  placeholder="Nombre de la organización"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="input h-10"
                    value={orgForm.category}
                    onChange={(e) => setOrgForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    <option value="gobierno">Gobierno</option>
                    <option value="ong">ONG</option>
                    <option value="comunitario">Comunitario</option>
                    <option value="privado">Privado</option>
                    <option value="religioso">Religioso</option>
                  </select>
                  <select
                    className="input h-10"
                    value={orgForm.parent_id}
                    onChange={(e) => setOrgForm((p) => ({ ...p, parent_id: e.target.value }))}
                  >
                    <option value="">— Sin dependencia —</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  className="input h-10"
                  placeholder="Persona de contacto"
                  value={orgForm.contact_name}
                  onChange={(e) => setOrgForm((p) => ({ ...p, contact_name: e.target.value }))}
                />
                <input
                  className="input h-10"
                  placeholder="Teléfono"
                  value={orgForm.contact_phone}
                  onChange={(e) => setOrgForm((p) => ({ ...p, contact_phone: e.target.value }))}
                />
                <input
                  className="input h-10"
                  placeholder="Ubicación (ciudad, estado — para el mapa)"
                  value={orgForm.location}
                  onChange={(e) => setOrgForm((p) => ({ ...p, location: e.target.value }))}
                />
                <textarea
                  className="input min-h-20"
                  placeholder="Descripción (opcional)"
                  value={orgForm.description}
                  onChange={(e) => setOrgForm((p) => ({ ...p, description: e.target.value }))}
                />
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(null);
                      setOrgForm({
                        name: '',
                        category: 'comunitario',
                        description: '',
                        contact_name: '',
                        contact_phone: '',
                        location: '',
                        parent_id: '',
                      });
                    }}
                    className="btn-ghost text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:brightness-110"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await adminFetch('/api/admin/volunteers', token, {
                    method: 'POST',
                    body: JSON.stringify({
                      ...volForm,
                      skills: volForm.skills ? volForm.skills.split(',').map((s) => s.trim()) : [],
                    }),
                  });
                  setModalOpen(null);
                  setVolForm({
                    name: '',
                    phone: '',
                    role: 'general',
                    profession: '',
                    skills: '',
                    zone: '',
                    availability: 'disponible',
                    organization_id: '',
                  });
                  refresh();
                }}
                className="space-y-3"
              >
                <input
                  className="input h-10"
                  placeholder="Nombre del voluntario"
                  value={volForm.name}
                  onChange={(e) => setVolForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="input h-10"
                    placeholder="Teléfono"
                    value={volForm.phone}
                    onChange={(e) => setVolForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                  <select
                    className="input h-10"
                    value={volForm.role}
                    onChange={(e) => setVolForm((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option value="general">General</option>
                    <option value="coordinador">Coordinador</option>
                    <option value="operador">Operador</option>
                    <option value="medico">Médico</option>
                    <option value="voluntario">Voluntario</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="input h-10"
                    placeholder="Profesión"
                    value={volForm.profession}
                    onChange={(e) => setVolForm((p) => ({ ...p, profession: e.target.value }))}
                  />
                  <input
                    className="input h-10"
                    placeholder="Zona"
                    value={volForm.zone}
                    onChange={(e) => setVolForm((p) => ({ ...p, zone: e.target.value }))}
                  />
                </div>
                <input
                  className="input h-10"
                  placeholder="Skills (coma separado: rescate, primeros auxilios…)"
                  value={volForm.skills}
                  onChange={(e) => setVolForm((p) => ({ ...p, skills: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="input h-10"
                    value={volForm.organization_id}
                    onChange={(e) => setVolForm((p) => ({ ...p, organization_id: e.target.value }))}
                  >
                    <option value="">— Independiente —</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input h-10"
                    value={volForm.availability}
                    onChange={(e) => setVolForm((p) => ({ ...p, availability: e.target.value }))}
                  >
                    <option value="disponible">Disponible</option>
                    <option value="ocupado">Ocupado</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(null);
                      setVolForm({
                        name: '',
                        phone: '',
                        role: 'general',
                        profession: '',
                        skills: '',
                        zone: '',
                        availability: 'disponible',
                        organization_id: '',
                      });
                    }}
                    className="btn-ghost text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:brightness-110"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}

function OrgMap({
  points,
}: {
  points: { id: string; name: string; coords: [number, number]; category: string }[];
}) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [10.4806, -66.9036],
      zoom: 8,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    const CAT_COLORS: Record<string, string> = {
      gobierno: '#3b82f6',
      ong: '#10b981',
      privado: '#8b5cf6',
      comunitario: '#f59e0b',
      religioso: '#f43f5e',
    };

    for (const p of points) {
      const color = CAT_COLORS[p.category] ?? '#6b7280';
      const marker = L.circleMarker(p.coords, {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.6,
        weight: 2,
      });
      marker.bindPopup(`<strong>${p.name}</strong>`);
      marker.addTo(layer);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => p.coords));
      map.fitBounds(bounds.pad(0.3), { maxZoom: 12 });
    }
  }, [points]);

  return <div ref={containerRef} className="h-full w-full" />;
}
