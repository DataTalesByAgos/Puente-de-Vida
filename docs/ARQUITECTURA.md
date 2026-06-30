# Arquitectura modular de Puente de Vida

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Vite + TanStack)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │Dashboard │ │Reportes  │ │  Mapa    │ │ Admin (panel web) │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
│         │            │            │                │            │
│         ▼            ▼            ▼                ▼            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    lib/ (API client)                    │   │
│  │   api.ts · sync.ts · heuristic.ts · db.ts (Dexie)      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │  HTTP (REST)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API (Fastify)                            │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Routes      │  │  Auth              │  │  Providers            │   │
│  │ reports.ts  │  │  sessions (mem)    │  │  AI (openai|none)     │   │
│  │ admin.ts    │  │  TTL 24h           │  │  WhatsApp (generic)   │   │
│  │ external.ts │  │  rate-limit◄───────│──│  Ingestion plugins    │   │
│  │ whatsapp.ts │  │  JWT (futuro)      │  │                       │   │
│  │ orgs.ts     │  └────────────────────┘  └──────────────────────┘   │
│  │ orgs.ts     │                       │         │             │
│  └─────┬───────┘                       ▼         ▼             │
│        │                     ┌────────────┐ ┌───────────┐      │
│        ▼                     │ ingestion  │ │ classifier│      │
│  ┌──────────┐                │ .ts        │ │ .ts       │      │
│  │  db.ts   │                │ localizados│ │ heuristica│      │
│  │  Pool    │                │ aquiestoy  │ │ + openai  │      │
│  │  query() │                │ ...        │ │ fallback  │      │
│  └────┬─────┘                └────────────┘ └───────────┘      │
│       │                                                         │
└───────┼─────────────────────────────────────────────────────────┘
        │  TCP
        ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL (única dependencia externa)              │
│  reports · organizations · volunteers · external_persons        │
│  supplies · ai_summaries · audit_log · admin_config             │
└─────────────────────────────────────────────────────────────────┘
```

## Puntos de intercambio (pluggable)

| Componente           | Implementación actual                         | Alternativa futura                               | Cómo se cambia                                                           |
| -------------------- | --------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| **Base de datos**    | PostgreSQL via `pg.Pool`                      | SQLite (single-user), CockroachDB (multi-región) | Solo cambiar `DATABASE_URL`                                              |
| **Sesiones**         | `Map` en memoria + TTL 24h                    | JWT + Redis (multi-instancia)                    | `auth.ts` — exporta la misma interfaz                                    |
| **Rate limiting**    | `@fastify/rate-limit` (en proceso, sin Redis) | Redis distribudo (multi-instancia)               | `RATE_LIMIT_*` env vars                                                  |
| **Clasificación IA** | Heurística local + OpenAI                     | Claude, Ollama, vLLM                             | `AI_PROVIDER` + archivo en `ai/providers/`                               |
| **WhatsApp**         | Mock (demo) + Generic                         | Meta API, 360dialog, Kapso                       | `WHATSAPP_API_URL` + `WHATSAPP_API_KEY`                                  |
| **Fuentes externas** | Localizados VE + Aquí Estoy                   | Venezuela Te Busca, Localízalo, etc.             | Agregar función en `ingestion.ts` + registrar en `seedExternalSources()` |
| **Cache**            | Ninguno                                       | Redis (sesiones + stats)                         | Opcional, solo con `REDIS_URL`                                           |
| **Background jobs**  | `setInterval` en server                       | Bull (Redis), RabbitMQ                           | `INGEST_INTERVAL_MIN=0` desactiva; job queue aparte                      |
| **Frontend DB**      | Dexie (IndexedDB)                             | SQLite via OPFS (más capacidad)                  | Solo `lib/db.ts`                                                         |
| **Sync**             | Polling cada 30s                              | WebSocket, SSE                                   | `lib/sync.ts` — misma interfaz                                           |

## Escalabilidad por capas

### Free tier (Railway, Fly.io, Render — 512MB RAM, 1 CPU)

- PostgreSQL externo (Neon, Supabase free — 500MB/1GB)
- API + Web en un mismo proceso, o separados
- Rate limiting activo (100 global, 5 login)
- Sesiones con TTL 24h (se pierden al reiniciar)
- Auto-ingesta cada 60 min
- Sin Redis ni colas
- **Capacidad: ~100k registros en external_persons, ~50k reportes**

### Medium (VPS 2GB, 2 CPU)

- PostgreSQL local (misma máquina)
- API + Web + Auto-ingesta cada 30 min
- Redis opcional para caché de stats
- **Capacidad: ~500k registros, ~200k reportes**

### Producción (4GB+, multi-instancia)

- PostgreSQL administrado (RDS, Cloud SQL)
- Redis para sesiones + caché + cola de jobs
- API detrás de balanceador (múltiples instancias)
- Ingesta vía job queue (Bull o RabbitMQ)
- Full-text search con GIN index en PostgreSQL
- **Capacidad: millones de registros**

## Decisiones para escalar

### 1. Full-text search (ya preparado)

Se agregó índice GIN + tsvector para búsqueda rápida en `external_persons`:

```sql
ALTER TABLE external_persons ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('spanish', coalesce(full_name,'') || ' ' || coalesce(document_id,''))) STORED;
CREATE INDEX IF NOT EXISTS idx_ext_persons_search ON external_persons USING GIN(search_vector);
```

### 2. Batch INSERT (ya implementado)

La ingesta usa `batchInsert()` con UNNEST en lugar de 1 INSERT por fila — ~10x más rápido.

### 3. Pool de conexiones configurable

```env
DB_POOL_MAX=20           # default 10
DB_IDLE_TIMEOUT=60000    # default 30000ms
```

### 4. Caché de stats

El endpoint `/api/admin/stats` puede cachearse 30s en Redis o en memoria para evitar recalcular en cada request.
