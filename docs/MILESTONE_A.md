# Milestone A — Secure integration

This slice is implemented. Later slices (Yjs editor, LiveKit audio, reference Docs-style app) build on it.

## What works

- Integrators keep their own users. The sample app authenticates Alice and Bob; they never register on the platform.
- `pk_` identifies an application. `sk_` mints room tokens. Room JWTs are signed with a **platform** key, not the customer secret.
- Default token lifetime is 15 minutes (60–3600s allowed).
- Socket.IO middleware verifies the room token. Each event also checks the required permission.
- A token is valid for exactly one room. Joining another room with that token returns `WRONG_ROOM`.
- Two applications using the same external room id (`shared-name`) stay isolated.
- Revoking a user disconnects their live socket.
- Pointers are normalized 0–1 coordinates inside `[data-realtime-surface]`.

## What is not in this slice

- Yjs document editing (`yjs:update` is rejected on purpose)
- Comments, versions, media tokens
- Postgres/Redis drivers (schema is in `migrations/001_init.sql`; runtime store is memory)
- `@realtime/editor` and `@realtime/media` throw if imported

## Run locally

```bash
npm install
npm run build
npm test
```

Terminal 1:

```bash
npm run dev:platform
```

Terminal 2:

```bash
npm run dev:sample
```

Open http://localhost:4000

- `alice@example.com` / `alice-pass-1`
- `bob@example.com` / `bob-pass-1`

Both can open **Team welcome** and see each other's cursors. Bob cannot mint a token for `doc:alice`.

## Packages

| Package | Role |
|---------|------|
| `@realtime/protocol` | Events, permissions, token claims |
| `@realtime/core` | Browser/node client, token refresh |
| `@realtime/react` | `RealtimeProvider`, `Room`, `PresenceBar`, `CursorOverlay` |
| `@realtime/node` | `identify()` and `rooms.ensure()` with `sk_` |
| `@realtime/platform` | HTTP + Socket.IO server |

## Auth mapping

1. User signs in to the integrator (`POST /auth/login` cookie).
2. Browser asks `POST /api/realtime/token` with `{ roomId }`.
3. Integrator checks session + document ACL, then calls `realtime.identify()`.
4. SDK connects with the returned room token only (memory, not localStorage).
