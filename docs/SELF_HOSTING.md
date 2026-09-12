# Self-hosting

The core stack does not require a paid collaboration account. Single-instance first.

## Local (memory)

```bash
npm install
npm run build
npm run dev:platform   # :3080
npm run dev:sample     # :4000
```

Optional voice: `livekit-server --dev --bind 0.0.0.0` or `docker compose --profile media up livekit`, with `LIVEKIT_*` in `.env`.

Optional Redis (multi-process Socket.IO): `docker compose up -d redis` and `REDIS_URL=redis://localhost:6379`.

## Local (Postgres)

1. Start Postgres:

```bash
docker compose up -d postgres
```

2. Copy `.env.example` to `.env` and set:

```
STORE_DRIVER=postgres
DATABASE_URL=postgres://realtime:realtime@localhost:5432/realtime
PLATFORM_SIGNING_SEED=a-long-random-string
```

3. Run the platform (it applies migrations on boot):

```bash
npm run dev:platform
```

`GET http://localhost:3080/ready` should include `"store":"postgres"`.

## Compose platform image

```bash
docker compose --profile platform up --build
```

This starts Postgres and the platform with `STORE_DRIVER=postgres`. Point an integrator at `http://localhost:3080`.

## Production notes

- Put the platform behind TLS. Use `wss://` for LiveKit.
- Set a unique `PLATFORM_SIGNING_SEED`. It signs room JWTs and is not a customer `sk_`.
- One replica is enough for local and small deploys. More than one replica needs `STORE_DRIVER=postgres`, `REDIS_URL`, and a shared LiveKit. `GET /ready` should show `"instance":"redis-adapter"`.
- Unset `REDIS_URL` unless Redis is actually running; a bad URL prevents boot.
- Mandatory telemetry is off. Document contents, audio, and keys are not sent anywhere unless you add a feature.
- Open LiveKit UDP/TCP ports and configure TURN for restrictive NATs.

## Health

| Endpoint | Meaning |
|----------|---------|
| `GET /health` | Process is up |
| `GET /ready` | Store ping succeeded; includes `store`, `media`, and `instance` |

Graceful shutdown handles `SIGINT` / `SIGTERM`.
