-- Align Milestone A schema with later store fields.

ALTER TABLE comment_threads ADD COLUMN IF NOT EXISTS quote text;
ALTER TABLE comment_threads ADD COLUMN IF NOT EXISTS created_by_name text NOT NULL DEFAULT 'Unknown';

ALTER TABLE document_updates ADD COLUMN IF NOT EXISTS request_id text;
CREATE UNIQUE INDEX IF NOT EXISTS document_updates_request_idx
  ON document_updates (room_id, request_id)
  WHERE request_id IS NOT NULL;

ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS generation integer NOT NULL DEFAULT 1;

ALTER TABLE revoked_sessions ALTER COLUMN expires_at DROP NOT NULL;
