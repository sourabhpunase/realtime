# Milestone E — Distribution

Single-instance self-hosting, a real Postgres driver, and SDK tarballs that install outside this monorepo.

## What works

- `STORE_DRIVER=memory` (default) for tests and `npm run dev:platform`.
- `STORE_DRIVER=postgres` plus `DATABASE_URL` applies `migrations/*.sql`, then uses Postgres as the system of record for rooms, updates, comments, versions, suggestions, chat, grants, and revocations.
- `GET /ready` reports `{ store, media, instance }` (`single` or `redis-adapter`) and 503s if the store ping fails.
- `npm run pack:sdks` writes tarballs to `dist-packages/`. `scripts/pack-install.test.mjs` installs `@realtime/protocol`, `@realtime/core`, and `@realtime/node` in a fresh directory with no `workspace:` aliases.
- Compose can run Postgres and the platform together (`--profile platform`).
- Docs: [SELF_HOSTING.md](SELF_HOSTING.md), [MIGRATION.md](MIGRATION.md), [RELEASE.md](RELEASE.md).

## Honest limits

- `REDIS_URL` is optional. When set, the process uses `@socket.io/redis-adapter`, stores presence in Redis, and publishes `rt:doc-invalidate` so other processes drop their in-memory Y.Doc cache. Without Redis, fan-out stays in-process (`instance: "single"`).
- Horizontal scale still needs a **shared Postgres** (or another shared `PlatformStore`). Memory store + Redis only shares sockets, not document bytes.
- Revocation is store-backed. Multiple processes polling the same Postgres see revokes; live `yjs:update` needs the Redis adapter to reach sockets on other processes.
- Packages are not published to npm. Use `npm pack` / local tarballs until a maintainer publishes.

## Commands

```bash
npm install
npm run build
npm test
npm run migrate          # STORE_DRIVER=postgres
npm run pack:sdks
npm run bench:latency    # writes docs/PERFORMANCE.md
```
