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
ALTER TABLE reports ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT FALSE;

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

CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'comunitario',
  description   TEXT,
  contact_name  TEXT,
  contact_phone TEXT,
  location      TEXT,
  parent_id     UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS location TEXT;

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

-- Asignación de reportes a organizaciones
CREATE TABLE IF NOT EXISTS report_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_by     TEXT,
  status          TEXT NOT NULL DEFAULT 'asignado' CHECK (status IN ('asignado', 'confirmado', 'atendido')),
  feedback        TEXT,
  area_status     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ra_report ON report_assignments(report_id);
CREATE INDEX IF NOT EXISTS idx_ra_org ON report_assignments(organization_id);

-- Fuentes externas de datos (APIs de desaparecidos)
CREATE TABLE IF NOT EXISTS external_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  base_url      TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  last_sync_at  TIMESTAMPTZ,
  record_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registros unificados de personas desaparecidas / localizadas
CREATE TABLE IF NOT EXISTS external_persons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  document_id   TEXT,
  age           INTEGER,
  status        TEXT NOT NULL DEFAULT 'desconocido',
  location      TEXT,
  facility      TEXT,
  notes         TEXT,
  source_id     UUID NOT NULL REFERENCES external_sources(id) ON DELETE CASCADE,
  source_url    TEXT,
  external_id   TEXT NOT NULL,
  ingested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_persons_name  ON external_persons(full_name);
CREATE INDEX IF NOT EXISTS idx_ext_persons_doc   ON external_persons(document_id);
CREATE INDEX IF NOT EXISTS idx_ext_persons_st    ON external_persons(status);

-- Full-text search en español para búsqueda escalable (GIN index)
ALTER TABLE external_persons ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('spanish', coalesce(full_name,'') || ' ' || coalesce(document_id,''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_ext_persons_search ON external_persons USING GIN(search_vector);

-- Inventario de suministros por organización
CREATE TABLE IF NOT EXISTS org_inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_name       TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  quantity        INTEGER NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL DEFAULT 'u',
  notes           TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_inv_org ON org_inventory(organization_id);

-- Códigos de invitación para organizaciones
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_org_invite_code ON organizations(invite_code);

-- Cédula y verificación en usuarios
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('viewer', 'operator', 'admin', 'citizen', 'volunteer', 'coordinator', 'organization'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation TEXT;

-- ====================================================================
-- NUEVO MODELO: Necesidades (reemplaza conceptualmente a reports)
-- ====================================================================

CREATE TABLE IF NOT EXISTS needs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        TEXT UNIQUE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  category         TEXT NOT NULL,
  subcategory      TEXT,
  priority         TEXT NOT NULL DEFAULT 'media',
  status           TEXT NOT NULL DEFAULT 'abierta',
  scope            TEXT NOT NULL DEFAULT 'micro',
  parent_id        UUID REFERENCES needs(id) ON DELETE SET NULL,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  location_text    TEXT,
  organization_id  UUID REFERENCES organizations(id) ON DELETE SET NULL,
  people_required  INTEGER,
  resources_needed TEXT,
  comments         TEXT,
  created_by       TEXT,
  created_by_role  TEXT,
  assigned_to      TEXT,
  assigned_by      TEXT,
  assigned_at      TIMESTAMPTZ,
  closed_by        TEXT,
  closed_at        TIMESTAMPTZ,
  source           TEXT NOT NULL DEFAULT 'pwa',
  photo_url        TEXT,
  age              INTEGER,
  is_minor         BOOLEAN,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_needs_status      ON needs(status);
CREATE INDEX IF NOT EXISTS idx_needs_category    ON needs(category);
CREATE INDEX IF NOT EXISTS idx_needs_priority    ON needs(priority);
CREATE INDEX IF NOT EXISTS idx_needs_scope       ON needs(scope);
CREATE INDEX IF NOT EXISTS idx_needs_parent      ON needs(parent_id);
CREATE INDEX IF NOT EXISTS idx_needs_org         ON needs(organization_id);
CREATE INDEX IF NOT EXISTS idx_needs_assigned    ON needs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_needs_updated     ON needs(updated_at);

CREATE TABLE IF NOT EXISTS need_updates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id         UUID NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
  volunteer_id    TEXT NOT NULL,
  status          TEXT NOT NULL,
  photos          TEXT[] DEFAULT '{}',
  observations    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nu_need ON need_updates(need_id);

CREATE TABLE IF NOT EXISTS volunteer_profiles (
  user_id             TEXT PRIMARY KEY,
  categories_of_interest TEXT[] DEFAULT '{}',
  skills              TEXT[] DEFAULT '{}',
  availability        TEXT NOT NULL DEFAULT 'programada',
  geo_zone            TEXT,
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  max_distance_km     INTEGER DEFAULT 50,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;
