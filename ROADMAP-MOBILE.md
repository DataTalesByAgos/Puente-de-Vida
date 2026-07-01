# Roadmap Mobile — Puente de Vida v2

## Stack

| Componente | Elección                   |
| ---------- | -------------------------- |
| Framework  | Expo SDK 52+               |
| Navegación | Expo Router (file-based)   |
| DB local   | expo-sqlite                |
| Mapas      | Mapbox GL (offline)        |
| Target     | Android API 24+            |
| Auth       | Token + SecureStore        |
| Push       | Expo Push Notifications    |
| Registro   | 4 pasos nativos (carrusel) |
| Cámara     | expo-image-picker          |

---

## Modelo de datos principal: Need

```
Need
├── scope: 'micro' | 'macro'
├── parent_id: string | null (micro apunta a macro)
├── created_by_role: 'citizen' | 'volunteer' | 'coordinator' | null
├── title, description, category, subcategory, priority
├── status: abierta → en_proceso → resuelta → cerrada
├── assigned_to / assigned_by / assigned_at
├── closed_by / closed_at
├── location (lat, lng, location_text)
├── people_required, resources_needed
├── photo_url, source, comments
├── organization_id, org_name
├── age, is_minor (del solicitante)
└── created_at, updated_at

NeedUpdate (avances del voluntario)
├── need_id, volunteer_id
├── status: en_proceso | requiere_recursos | completado_parcial
├── photos[], observations
└── created_at
```

### Categorías y subcategorías

| Categoría        | Subcategorías                                                                         |
| ---------------- | ------------------------------------------------------------------------------------- |
| profesionales    | medico, enfermeria, ingenieria, psicologia, educacion, legal, comunicacion, otro_prof |
| no_profesionales | carga, limpieza, cocina, cuidado, traduccion, compania, otro_no_prof                  |
| logistica        | transporte, donaciones, albergue, alimento, agua, medicinas, ropa, otro_log           |
| otros            | informacion, difusion, apoyo_moral, otro                                              |

---

## Ciclo de vida

### Micro-necesidad (ciudadano o voluntario en terreno)

```
abierta → coordinador asigna → en_proceso (voluntario acepta)
       → requiere_recursos (opcional, pide apoyo)
       → resuelta (voluntario completa)
       → cerrada (coordinador confirma cierre)
```

### Macro-necesidad (solo coordinador/organización)

```
abierta → se le agrupan micros
       → en_proceso (tiene micros asignadas)
       → resuelta (coordinador decide que está completa)
       → cerrada
```

---

## Permisos por rol

| Acción                            | Ciudadano | Voluntario  | Coordinador     | Organización | Admin |
| --------------------------------- | --------- | ----------- | --------------- | ------------ | ----- |
| Crear micro-need                  | ✅        | ✅          | ✅              | ❌           | ❌    |
| Crear macro-need                  | ❌        | ❌          | ✅              | ✅           | ❌    |
| Agrupar micro → macro             | ❌        | ❌          | ✅              | ✅           | ❌    |
| Asignar voluntario                | ❌        | ❌          | ✅              | ✅           | ❌    |
| Updatear micro (fotos, estado)    | ❌        | ✅          | ✅              | ❌           | ❌    |
| Cerrar micro propia               | ❌        | ✅ (propia) | ✅ (cualquiera) | ❌           | ❌    |
| Cerrar macro                      | ❌        | ❌          | ✅              | ✅           | ❌    |
| Ver info pública                  | ✅        | ✅          | ✅              | ✅           | ✅    |
| Admin sistema (users, APIs, logs) | ❌        | ❌          | ❌              | ❌           | ✅    |

---

## Navegación por rol

```
App Root (_layout.tsx)
├── No auth → Welcome / Login / Register / Info
├── Ciudadano → Tab: [Inicio, Publicar, Info útil, Config]
├── Voluntario → Tab: [Asignaciones, Descubrir, Mapa, Recursos, Perfil]
├── Coordinador → Drawer + Tab: [Dashboard, Necesidades, Voluntarios, Mapa, Stats]
├── Organización → Drawer + Tab: [Dashboard, Personal, Recursos, Campañas, Stats, Config]
└── Admin → Drawer: [Dashboard, Usuarios, Fuentes, Integraciones, Config, Logs]
```

---

## Privacidad por niveles

| Dato                   | Público | Ciudadano | Voluntario | Coordinador | Org | Admin |
| ---------------------- | ------- | --------- | ---------- | ----------- | --- | ----- |
| Título + descripción   | ✅      | ✅        | ✅         | ✅          | ✅  | ✅    |
| Categoría / prioridad  | ✅      | ✅        | ✅         | ✅          | ✅  | ✅    |
| Ubicación (ciudad)     | ✅      | ✅        | ✅         | ✅          | ✅  | ✅    |
| Ubicación exacta       | ❌      | ❌        | ✅         | ✅          | ✅  | ✅    |
| Nombre del solicitante | ❌      | ❌        | ❌         | ✅          | ✅  | ✅    |
| Teléfono / contacto    | ❌      | ❌        | ❌         | ✅          | ✅  | ✅    |
| Voluntario asignado    | ❌      | ❌        | ✅         | ✅          | ✅  | ✅    |
| Updates (fotos, obs)   | ❌      | ❌        | ✅         | ✅          | ✅  | ✅    |
| Comentarios internos   | ❌      | ❌        | ❌         | ✅          | ✅  | ✅    |
| Logs de auditoría      | ❌      | ❌        | ❌         | ❌          | ✅  | ✅    |
| Config del sistema     | ❌      | ❌        | ❌         | ❌          | ❌  | ✅    |

---

## Orden de implementación

### Fase 0 — Shared package

- [ ] Crear `packages/shared`: tipos Need, Zod schemas, constantes, api-client
- [ ] Refactor API + web para consumir `@pdv/shared`

### Fase 1 — API: modelo Needs

- [ ] Migración DB: tablas `needs`, `need_updates`, `volunteer_profiles`
- [ ] Rutas CRUD needs + sync
- [ ] Rutas perfil voluntario + matching
- [ ] Info útil pública (orgs, centros, guías)
- [ ] Recordatorios automáticos de seguimiento (7/14 días)

### Fase 2 — App mobile base

- [ ] Inicializar Expo + config (app.json, babel, metro)
- [ ] Pantalla inicio + login + AuthProvider + SecureStore
- [ ] Info previa al registro (3 pantallas: cómo funciona, roles, antes de empezar)
- [ ] Registro 4 pasos con carrusel + validación

### Fase 3 — Módulos por rol

- [ ] Layout por rol con redirección automática post-login
- [ ] Ciudadano: publicar micro-need, info útil
- [ ] Voluntario: asignaciones, descubrir con matching, perfil, updates
- [ ] Coordinador: dashboard, CRUD needs, agrupar micros en macros, asignar, cerrar
- [ ] Organización: personal, recursos, campañas, métricas
- [ ] Admin: usuarios, fuentes, integraciones, logs

### Fase 4 — Offline + extras

- [ ] SQLite local + sync engine + auditoría offline
- [ ] Mapbox GL (mapa de needs)
- [ ] Push notifications (recordatorios seguimiento + nuevas asignaciones)
- [ ] Pruebas en Android real (gama baja, API 24+)

---

## Estructura del proyecto

```
puente-de-vida/
├── packages/
│   └── shared/              # @pdv/shared
│       └── src/
│           ├── types.ts     # Need, NeedUpdate, VolunteerProfile, enums
│           ├── schemas.ts   # Zod: createNeed, updateNeed, register, profile
│           ├── constants.ts # Labels, colores, subcategorías
│           ├── api-client.ts # http helper + api object
│           └── index.ts     # barrel export
├── apps/
│   ├── api/                 # Fastify (needs routes nuevas + reports legacy)
│   ├── web/                 # Vite PWA (se migrará después)
│   └── mobile/              # React Native (Expo) — objetivo principal
│       ├── app/             # Expo Router: screens por rol
│       ├── src/
│       │   ├── lib/         # api.ts, db.ts, auth.ts, audit.ts, geo.ts
│       │   ├── components/  # NeedCard, NeedForm, StatusBadge, MapView...
│       │   ├── providers/   # AuthProvider, NeedProvider
│       │   └── hooks/       # useAuth, useNeeds, useVolunteerMatch...
│       ├── app.json
│       └── package.json
└── docs/
    ├── ROADMAP.md           # Roadmap anterior (incidentes) — migrado a mobile
    └── PRIVACIDAD.md        # Política de privacidad actualizada
```
