# Collaboration protocol v1

Raw Socket.IO event names are internal to `@realtime/core`. Applications should use the SDK.

## Connection

Handshake: `auth.token` = room JWT from `POST /v1/tokens`.

Claims: `iss`, `aud`, `sub`, `tid`, `aid`, `env`, `rid`, `room_uuid`, `perms`, `jti`, `iat`, `nbf`, `exp`.

Algorithm allowlist: `HS256`. Clock skew: 5 seconds.

## Events

| Event | Direction | Permission | Delivery |
|-------|-----------|------------|----------|
| `join-room` | c→s | `room:join` | ack |
| `leave-room` | c→s | `room:join` | ack |
| `room-users` | s→c | — | snapshot |
| `user-joined` / `user-left` | s→c | — | best-effort + snapshot on join |
| `cursor-move` / `cursor-update` | both | `presence:write` | ephemeral |
| `presence:update` | both | `presence:write` | ephemeral |
| `typing:update` | both | `presence:write` | ephemeral |
| `yjs:sync` | both | `room:read` | ack + state-vector diff |
| `yjs:update` | both | `room:write` | persist, then ack `{ saved: true }`, then broadcast |
| `yjs:reset` | s→c | — | after authorized restore; new `generation` |
| `awareness:update` | both | `presence:write` | ephemeral editor carets |
| `comment:*` / `thread:*` | both | `comments:write` | durable threads |
| `suggestion:created` / `suggestion:updated` | s→c | — | durable proposals |
| `chat:message` | s→c | — | durable chat |
| `reaction:changed` | s→c | — | reaction toggle |
| `room:permissions-changed` | s→c | — | disconnect follows revocation |
| `room:error` | s→c | — | structured error |

Cursor payloads use normalized coordinates `{ x, y }` in `[0, 1]` relative to `[data-realtime-surface]`, including that element's scroll. Do not send viewport pixels.

## Rejected event names

The server does not implement `join-project`, `join-document`, unauthenticated `join-room`, `content-change`, `cursor-click`, or `input-change`.

## HTTP

| Endpoint | Auth |
|----------|------|
| `POST /v1/tokens` | `sk_` |
| `POST /v1/rooms` | `sk_` |
| `GET /v1/rooms/:id` | `sk_` or room token with `room:read` |
| `POST /v1/rooms/:id/revoke` | `sk_` |
| `GET/POST /v1/rooms/:id/comments` | room token (`room:read` / `comments:write`) or `sk_` |
| `PATCH/DELETE /v1/rooms/:id/comments/:commentId` | author or `room:admin` |
| `GET/POST /v1/rooms/:id/versions` | `history:read` / `room:write` |
| `POST /v1/rooms/:id/versions/:id/restore` | `history:restore` |
| `POST /v1/rooms/:id/media-token` | room token with `media:join` |
| `GET/POST /v1/rooms/:id/suggestions` | `room:read` / `suggestions:write` |
| `POST /v1/rooms/:id/suggestions/:id` | `suggestions:accept`, or author withdraw with `suggestions:write` |
| `GET/POST /v1/rooms/:id/chat` | `room:read` / `chat:write` |
| `POST /v1/rooms/:id/reactions` | `chat:write` |
| `GET/POST/DELETE /v1/rooms/:id/grants` | `sk_` or `room:admin` |

A room token cannot create keys, list applications, or revoke other rooms.

`GET /ready` includes `store` (`memory` | `postgres`) and `instance` (`single` | `redis-adapter`).

`POST /v1/rooms/:id/media-token` body `{ sources }` may include `microphone`, `camera`, and `screen`. The server returns the intersection with the caller’s grants. `media:publish` is microphone only. `media:video` and `media:screen` are required for those sources. Listen-only (`media:join` without publish) may send `{ sources: ["microphone"] }` and receives `allowedSources: []`.
