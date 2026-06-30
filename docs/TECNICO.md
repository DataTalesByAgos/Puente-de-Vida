# Documentación Técnica

## Arquitectura general

```
Browser (Vite SPA + PWA)
    ↕ Service Worker (cache + background sync)
    ↕ IndexedDB (Dexie.js) — capa offline
    ↕ HTTP REST
API (Fastify + TypeScript)
    ↕ PostgreSQL
```

La app web es un **SPA estático** servido desde cualquier CDN, S3 o incluso USB. No requiere Node.js en el edge.

---

## Clasificación de reportes

### Modo offline / heurístico (default)

Sin necesidad de APIs externas, la plataforma clasifica reportes con reglas locales:

1. **Tipo de incidente** — matching de palabras clave sobre el texto (`derrumbe` → `estructura`, `herido` → `salud`, etc.)
2. **Prioridad** — calculada con una fórmula basada en:
   - Tipo de incidente (peso base)
   - Urgencia léxica detectada ("atrapado", "grave", "inmediato")
   - Cantidad de personas afectadas (si se menciona)
3. **Deduplicación** — comparación por:
   - Mismo número de teléfono + tipo + ventana de tiempo
   - Similitud coseno básica sobre el texto (sin vectores ni embeddings)
4. **Completitud** — puntuación según qué campos se llenaron (ubicación, contacto, descripción, tipo)

Este modo es **infinitamente escalable** (no hay llamadas externas, no hay costos por request) y funciona **offline total**. Es suficiente para una demo o un despliegue inicial sin presupuesto.

### Modo con IA (OpenAI-compatible)

Si se configura un `AI_API_URL` (puede ser OpenAI, Ollama local, Azure, etc.), el clasificador envía el texto del reporte y la heurística previa como contexto, y la IA puede:

- Refinar la categoría
- Ajustar la prioridad
- Detectar duplicados con más precisión
- Extraer ubicaciones y personas mencionadas

La IA es un **refuerzo opcional**. Si falla, timeout o no hay conexión, el reporte se guarda igual con la clasificación heurística. Nunca se pierde un reporte por una caída de la IA.

```
Reporte entrante
    → Clasificación heurística (siempre, local, instantánea)
    → Si hay AI provider configurado: se dispara en background
    → Si AI responde: se actualiza la clasificación
    → Si AI falla: se conserva la heurística intacta
```

---

## Offline-first

### IndexedDB (Dexie.js)

Cuando un voluntario registra un reporte desde la PWA sin conexión:

1. El reporte se guarda en IndexedDB (`pdv-db` → tabla `reports`)
2. Se muestra inmediatamente en la interfaz como "pendiente de sync"
3. El Service Worker encola un evento `sync`

### Service Worker

El SW custom (no Workbox genérico) hace dos cosas:

- **Precaching:** en `install`, cachea todos los assets del build para que la app cargue sin red
- **Background sync:** cuando el navegador detecta conectividad, reenvía los reportes pendientes a la API. Si la API responde OK, se eliminan de IndexedDB.

### Sincronización bidireccional

La API soporta un header `X-Offline-Sync` que permite al SW traer reportes nuevos desde el servidor y fusionarlos con los locales sin duplicar.

---

## Sistema de proveedores (WhatsApp / IA)

Todos los proveedores siguen un patrón de **interface única + implementación conmutable por variable de entorno**.

### WhatsApp

```
WHATSAPP_MODE=mock         # Simulador local (default, no requiere nada)
WHATSAPP_MODE=generic      # Cualquier API REST compatible
```

El modo `generic` espera:

```env
WHATSAPP_API_URL=https://...
WHATSAPP_API_KEY=...
```

### IA

```env
AI_PROVIDER=openai    # Único disponible actualmente
AI_MODEL=gpt-4o-mini  # Por defecto
AI_API_URL=           # Opcional: apunta a un proxy/compatible (Ollama, Azure, etc.)
AI_API_KEY=
```

Si `AI_API_KEY` no está definida, el clasificador opera solo en modo heurístico.

---

## Auth y roles

Sistema simple con sesiones en memoria (sin JWT, sin refresh tokens).

### Login

```http
POST /api/admin/login
Content-Type: application/json

{ "user": "admin", "pass": "PdV2026!" }
```

Responde con un token de sesión que se pasa como `Authorization: Bearer <token>`.

### Roles

| Rol        | Acceso                                     |
| ---------- | ------------------------------------------ |
| `viewer`   | Dashboard, reportes, mapa, export          |
| `operator` | Lo anterior + organizaciones y voluntarios |
| `admin`    | Todo (configuración, usuarios, auditoría)  |

---

## API clave

| Ruta                     | Método              | minRole  | Descripción              |
| ------------------------ | ------------------- | -------- | ------------------------ |
| `/api/admin/login`       | POST                | —        | Iniciar sesión           |
| `/api/reports`           | GET                 | viewer   | Listar reportes          |
| `/api/reports`           | POST                | —        | Crear reporte (público)  |
| `/api/reports/export`    | GET                 | viewer   | Exportar CSV/JSON        |
| `/api/stats`             | GET                 | viewer   | Métricas agregadas       |
| `/api/orgs`              | GET/POST/PUT/DELETE | operator | CRUD organizaciones      |
| `/api/volunteers`        | GET/POST/PUT/DELETE | operator | CRUD voluntarios         |
| `/api/admin/config`      | GET/PUT             | admin    | Config de proveedores    |
| `/api/admin/users`       | GET/POST/PUT/DELETE | admin    | Gestión de usuarios      |
| `/api/whatsapp/simulate` | POST                | —        | Simular mensaje entrante |
| `/api/whatsapp/webhook`  | POST                | —        | Webhook real de WhatsApp |
| `/api/whatsapp/status`   | GET                 | —        | Estado del proveedor     |

---

## Seed de datos

### Reportes demo

```bash
npm run seed:demo -w @pdv/api -- 1500
```

Genera tráfico variable simulado con silencios, ráfagas y olas de desastre. Los reportes se distribuyen en las últimas 72h.

### Organizaciones y voluntarios

```bash
npm run seed:orgs -w @pdv/api
```

32 organizaciones jerárquicas con ubicación, 43 voluntarios (asignados e independientes), 3 usuarios de prueba.

### Simulador en vivo

```bash
npm run sim -w @pdv/api -- --rate 20 --total 300
```

Inyecta reportes en tiempo real contra la API en funcionamiento. Mide latencia, throughput y detecta cuellos de botella.

---

## Consideraciones de producción

- La configuración de proveedores se guarda en PostgreSQL (tabla `admin_config`) pero se lee al iniciar el servidor. Cambios requieren reinicio — no hay hot-reload de config desde DB aún.
- Las sesiones expiran al reiniciar la API. Para producción agregar Redis o JWT.
- El Service Worker precachea todos los assets del build. Para actualizar, el navegador descarga el nuevo SW en segundo plano y aplica el cambio en la próxima carga.
- Para limpiar completamente la DB:
  ```bash
  npm run db:reset
  ```
