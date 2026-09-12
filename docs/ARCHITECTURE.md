# Architecture

```
Integrator app                This platform
-------------                 -------------
Own users + ACL               tenants → applications → rooms
POST /api/realtime/token  →   POST /v1/tokens (sk_)
Browser @realtime/react   →   Socket.IO (room JWT, one room)
```

- **Collaboration auth** is delegated: the integrator decides who may join; the platform enforces the resulting token.
- **Persistence:** `STORE_DRIVER=memory` (default) or `postgres`. Migrations live in `migrations/`. Optional `REDIS_URL` adds Socket.IO fan-out and document-cache invalidation across processes.
- **Media and Yjs** are separate packages so the presence client stays small.
- **Suggestions** are not Yjs writes. Accept applies a server-side plain-text mutation, then broadcasts `yjs:update`.
- **Sharing** is delegated: the integrator decides membership. Optional platform grants are records only unless copied into `identify()`.

See `docs/PROTOCOL.md` for events and permissions.
