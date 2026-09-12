-- Durable tables for suggestions, chat, reactions, and optional grants.

CREATE TABLE IF NOT EXISTS suggestions (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES rooms(id),
  kind text NOT NULL CHECK (kind IN ('insert', 'delete', 'replace')),
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  insert_text text,
  delete_text text,
  quote text,
  offset integer,
  author_external_id text NOT NULL,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_external_id text
);

CREATE INDEX IF NOT EXISTS suggestions_room_idx ON suggestions (room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES rooms(id),
  body text NOT NULL,
  author_external_id text NOT NULL,
  author_name text NOT NULL,
  client_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, client_id)
);

CREATE INDEX IF NOT EXISTS chat_room_idx ON chat_messages (room_id, created_at);

CREATE TABLE IF NOT EXISTS reactions (
  room_id uuid NOT NULL REFERENCES rooms(id),
  target_type text NOT NULL CHECK (target_type IN ('chat', 'comment', 'suggestion')),
  target_id text NOT NULL,
  emoji text NOT NULL,
  user_external_id text NOT NULL,
  user_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, target_type, target_id, emoji, user_external_id)
);

CREATE TABLE IF NOT EXISTS room_grants (
  room_id uuid NOT NULL REFERENCES rooms(id),
  user_external_id text NOT NULL,
  permissions jsonb NOT NULL,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_external_id)
);
