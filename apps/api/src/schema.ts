// Esquema de la base de datos embebido como string para simplificar el runtime
// (no hay que copiar archivos .sql al contenedor). Es idempotente.

export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        TEXT UNIQUE,
  source           TEXT NOT NULL DEFAULT 'pwa',
  raw_text         TEXT NOT NULL,
  incident_type    TEXT NOT NULL DEFAULT 'otro',
  priority         TEXT NOT NULL DEFAULT 'media',
  status           TEXT NOT NULL DEFAULT 'nuevo',
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  location_text    TEXT,
  people_affected  INTEGER,
  confidence       REAL NOT NULL DEFAULT 0.5,
  recommended_team TEXT,
  reporter_name    TEXT,
  reporter_phone   TEXT,
  photo_url        TEXT,
  ai_engine        TEXT,
  duplicate_of     UUID REFERENCES reports(id) ON DELETE SET NULL,
  group_relation_type TEXT,
  group_score      DOUBLE PRECISION,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asegurar columnas en tablas existentes si ya existen
ALTER TABLE reports ADD COLUMN IF NOT EXISTS group_relation_type TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS group_score DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_reports_status      ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type        ON reports(incident_type);
CREATE INDEX IF NOT EXISTS idx_reports_priority    ON reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_updated_at  ON reports(updated_at);
CREATE INDEX IF NOT EXISTS idx_reports_duplicate   ON reports(duplicate_of);

CREATE TABLE IF NOT EXISTS shelters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  capacity    INTEGER NOT NULL DEFAULT 0,
  occupancy   INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'abierto',
  contact     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS volunteers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'general',
  status          TEXT NOT NULL DEFAULT 'activo',
  profession      TEXT,
  skills          TEXT[] DEFAULT '{}',
  zone            TEXT,
  availability    TEXT NOT NULL DEFAULT 'disponible',
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'comunitario',
  description   TEXT,
  contact_name  TEXT,
  contact_phone TEXT,
  parent_id     UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  quantity    INTEGER NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL DEFAULT 'u',
  shelter_id  UUID REFERENCES shelters(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_summaries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary      TEXT NOT NULL,
  report_count INTEGER NOT NULL DEFAULT 0,
  engine       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,  -- bcrypt hash
  role       TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'operator', 'admin')),
  name       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  username   TEXT,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;
