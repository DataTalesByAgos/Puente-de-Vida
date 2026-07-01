# Puente de Vida — Red Colaborativa de Gestión de Necesidades

**Puente de Vida** es una plataforma colaborativa **mobile-first** donde personas, organizaciones y voluntarios publican, descubren y coordinan solicitudes de ayuda de manera organizada — incluso sin conexión a Internet.

> **Ninguna necesidad debería quedar sin atención porque se cayó Internet.**

---

📘 [**Roadmap Mobile**](ROADMAP-MOBILE.md) — plan actual de desarrollo (mobile-first, necesidades)
🧭 [**Roadmap anterior**](ROADMAP.md) — plan legacy de incidentes (en migración)

---

## 🚀 Características

- **Mobile-first:** App nativa Android (Expo/React Native) con experiencia adaptada por rol (Ciudadano, Voluntario, Coordinador, Organización, Admin).
- **Necesidades como eje principal:** Publicá una necesidad (micro o macro), agrupalas, asigná voluntarios, seguí el progreso.
- **Dos niveles:** Micro-necesidades (específicas, en terreno) y Macro-necesidades (campañas organizadas por coordinadores).
- **Offline-first:** SQLite local con sync cuando hay conexión. Opera sin internet.
- **Descubrimiento inteligente:** Voluntarios ven necesidades que matchean sus intereses y habilidades.
- **Seguimiento automático:** Recordatorios para evitar necesidades abandonadas.
- **Privacidad por niveles:** Cada rol ve solo la información que necesita.
- **Registro con verificación:** 4 pasos con verificación de identidad según el rol.
- **PWA web existente:** La versión web (Vite + React PWA) sigue operativa mientras migramos a mobile.

---

## 🛠️ Stack

| Capa      | Tecnología                                            |
| --------- | ----------------------------------------------------- |
| Mobile    | Expo SDK 52+ + React Native + Expo Router             |
| Web (PWA) | Vite + React 19 + TanStack Router + Tailwind (legacy) |
| Backend   | Node.js + Fastify + TypeScript + @fastify/rate-limit  |
| DB        | PostgreSQL + expo-sqlite (local)                      |
| Mapas     | Mapbox GL (offline)                                   |
| IA        | Heurística local / OpenAI-compatible (conmutable)     |
| WhatsApp  | Simulador mock / proveedor genérico vía API           |
| Push      | Expo Push Notifications                               |

---

## 📁 Estructura

```
├── packages/
│   └── shared/      # @pdv/shared (tipos, schemas, constantes, api-client)
├── apps/
│   ├── api/         # Fastify + PostgreSQL (needs routes + reports legacy)
│   ├── web/         # Vite + React PWA (legacy, en migración)
│   └── mobile/      # React Native Expo (target principal)
├── material-visual/ # Brand assets (logos, tipografía)
├── docker-compose.yml
└── package.json     # Monorepo npm workspaces
```

---

## 💻 Inicio rápido (desarrollo actual)

### Docker

```bash
npm run up
# Web: http://localhost:3000
# API: http://localhost:4000
npm run down  # detener
```

### Desarrollo local

```bash
cp .env.example .env
npm run db:up        # PostgreSQL en Docker
npm run dev          # API + Web con hot reload
```

## 📋 Comandos

```bash
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run build        # Build producción (shared + api + web)
```

### Seed de datos

```bash
npm run seed:demo -w @pdv/api -- 1500   # Reportes demo
npm run seed:orgs -w @pdv/api           # Organizaciones + usuarios
npm run sim -w @pdv/api -- --rate 20 --total 300  # Simulador
```

Usuarios de prueba: `admin` / `PdV2026!`, `lector` / `lector2026`, `operador` / `operador2026`.

> **Nota:** La app mobile (Expo) se está desarrollando. Consultá [ROADMAP-MOBILE.md](ROADMAP-MOBILE.md) para el estado.

## 📄 Licencia

MIT
