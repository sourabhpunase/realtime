-- Durable schema for the platform store (Postgres driver).
-- Milestone A tests use the in-memory store; apply this before STORE_DRIVER=postgres.

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('development', 'production')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS applications_tenant_idx ON applications (tenant_id);

CREATE TABLE IF NOT EXISTS api_credentials (
  id uuid PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id),
  public_key text NOT NULL UNIQUE,
  secret_hash text NOT NULL UNIQUE,
  secret_prefix text NOT NULL,
  scopes jsonb NOT NULL DEFAULT '["*"]',
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id),
  external_id text NOT NULL,
  title text NOT NULL,
  generation integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, external_id)
);

CREATE TABLE IF NOT EXISTS revoked_sessions (
  jti text PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id),
  room_external_id text,
  user_id text,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS comment_threads (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES rooms(id),
  status text NOT NULL CHECK (status IN ('open', 'resolved')),
  anchor jsonb,
  created_by_external_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES comment_threads(id),
  room_id uuid NOT NULL REFERENCES rooms(id),
  body text NOT NULL,
  author_external_id text NOT NULL,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS document_updates (
  id bigserial PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES rooms(id),
  seq bigint NOT NULL,
  update bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, seq)
);

CREATE TABLE IF NOT EXISTS document_snapshots (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES rooms(id),
  seq bigint NOT NULL,
  snapshot bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES rooms(id),
  name text NOT NULL,
  snapshot bytea NOT NULL,
  seq bigint NOT NULL,
  created_by_external_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  application_id uuid REFERENCES applications(id),
  room_id uuid REFERENCES rooms(id),
  actor_external_id text,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
