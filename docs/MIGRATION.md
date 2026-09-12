# Migrations

SQL files in `migrations/` are the durable schema. The memory store used in tests does not read them.

## Apply

```bash
export DATABASE_URL=postgres://realtime:realtime@localhost:5432/realtime
npm run migrate
```

`STORE_DRIVER=postgres` also applies pending files on platform start. Applied files are recorded in `schema_migrations`.

## Files

| File | Purpose |
|------|---------|
| `001_init.sql` | Tenants, applications, keys, rooms, comments, Yjs log, versions |
| `002_milestone_d.sql` | Suggestions, chat, reactions, grants |
| `003_schema_align.sql` | Columns added after 001 (request ids, quote, generation) |

Docker Compose mounts 001–003 into `docker-entrypoint-initdb.d` for a **new** volume. An existing volume is upgraded by `npm run migrate` / platform boot.

## From memory to Postgres

There is no automatic dump of the in-memory Maps. Export is not provided. Treat memory as ephemeral; use Postgres before you care about crash survival.

## Room tokens after migrate

Signing seed is independent of the database. Changing `PLATFORM_SIGNING_SEED` invalidates existing room JWTs. Customer `sk_` values stay valid if their hashes are in `api_credentials`.
