# Realtime

Open-source, self-hostable **collaboration platform** plus **embeddable SDKs**.

You keep your own users and permissions. After someone signs in to *your* app, your server mints a short-lived **room JWT** with an `sk_` key. The browser joins one room with `pk_` and that token. The platform never becomes the identity provider.

This is not a hosted Google Docs, not a paid seat product, and the packages are **not on the public npm registry** yet. Run the server yourself (or on a free VM). Use `npm run pack:sdks` for local tarballs.

License: [MIT](LICENSE).

---

## What you get

| Capability | Behavior |
|------------|----------|
| Shared documents | Incremental **Yjs** updates. Persist, then ack, then broadcast. Not last-write-wins whole-document overwrite. |
| Presence | Who is in the room, colored cursors, follow (only the follower scrolls). |
| Comments | Durable threads on a room. |
| Suggestions | Propose insert/delete/replace **plain text**. Accept applies on the server and broadcasts `yjs:update`. |
| Chat and reactions | Persist and broadcast with `chat:write`. |
| Versions | Named snapshots and restore (`generation` bumps). |
| Voice | Optional **LiveKit**. Join voice does not start on document open. Mic only until the user clicks camera/screen. |
| Export | Plain text, Markdown, sanitized HTML, limited DOCX (headings, marks, lists, tables). |

**You provide:** login, who may open which document, and which permission list goes into `identify()`.

---

## How it fits together

```
Your app (login + ACL)                 This repo
----------------------                 ---------
POST /api/realtime/token  -----------> POST /v1/tokens   (Authorization: Bearer sk_…)
Browser @realtime/react   -----------> Socket.IO         (room JWT, one room)
Optional @realtime/media  -----------> LiveKit           (separate WebRTC path)
```

- `pk_…` identifies the application. It does not grant room access.
- `sk_…` stays on your server. Never send it to the browser.
- Room JWTs are signed with `PLATFORM_SIGNING_SEED`, not with the customer `sk_`.
- One Socket.IO connection is valid for **exactly one room**.
- Platform grants (`POST /v1/rooms/:id/grants`) are records. **Delegated `identify()` permissions win** unless you copy grants into the token yourself.

---

## Repository layout

```
apps/platform/              Collaboration server (HTTP + Socket.IO)
apps/sample-integrator/     Demo host app: Alice/Bob login, sharing, editor
packages/protocol/          Permissions, events, token/media schemas
packages/core/              Framework-independent browser client
packages/react/             Provider, room, presence, comments, chat, share
packages/editor/            Tiptap + Yjs CollaborativeEditor and export
packages/media/             LiveKit session + VoiceToolbar
packages/node/              Server helper: identify(), rooms.ensure(), revoke
migrations/                 Postgres schema (001–003)
docs/                       Protocol, self-hosting, security, milestones
```

The old dashboard (`api/`, `realtime/` on port 3000) and `realtimecursor-sdk` were removed. Do not look for `/auth/login` on the platform.

---

## Quick start

Requires **Node.js 18+**.

```bash
cp .env.example .env
npm install
npm run build
npm test
```

Two terminals:

```bash
npm run dev:platform    # http://localhost:3080
npm run dev:sample      # http://localhost:4000
```

Open [http://localhost:4000](http://localhost:4000).

| Email | Password | Notes |
|-------|----------|--------|
| `alice@example.com` | `alice-pass-1` | Administrator on Team welcome and Q3 review |
| `bob@example.com` | `bob-pass-1` | Editor on welcome; **suggester** on Q3 review |

Try: both in the same document, comments, Bob proposing on Q3 review, Alice accepting, share, chat, Join voice (if LiveKit is running). Alice can start camera/screen after Join voice; Bob-as-editor cannot.

Health:

```bash
curl http://localhost:3080/health
curl http://localhost:3080/ready
```

`/ready` reports `{ ok, store, media, instance }` (`store` is `memory` or `postgres`; `instance` is `single` or `redis-adapter`).

---

## Environment

Copy [`.env.example`](.env.example) to `.env` (gitignored).

| Variable | Purpose |
|----------|---------|
| `PLATFORM_PORT` | Default `3080` |
| `PLATFORM_SIGNING_SEED` | Signs room JWTs. Use a long random string in any shared host. |
| `STORE_DRIVER` | `memory` (default, lost on restart) or `postgres` |
| `DATABASE_URL` | Required when `STORE_DRIVER=postgres` |
| `REDIS_URL` | Optional. Leave unset unless Redis is actually running. |
| `CORS_ORIGINS` | Comma-separated browser origins (sample: `http://localhost:4000`) |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Optional voice. Dev defaults are LiveKit `--dev` (`devkey` / `secret`). |
| `REALTIME_SECRET_KEY` / `VITE_REALTIME_PUBLIC_KEY` | Sample integrator credentials (`sk_test_…` / `pk_test_…` locally only) |

Local demo keys:

- `pk_test_sample_local_dev_only`
- `sk_test_sample_local_dev_only_rotate`

Do not use those on a public internet host.

---

## Voice (optional)

Opening a document does **not** turn on the microphone.

```bash
# macOS example
brew install livekit
livekit-server --dev --bind 0.0.0.0
```

Or: `docker compose --profile media up livekit`.

Then set `LIVEKIT_*` in `.env` and restart the platform. Without those variables, the editor still works; Join voice returns a clear “not configured” error.

| Grant | Effect |
|-------|--------|
| none | Voice toolbar disabled |
| `media:join` | Listen only |
| `media:publish` | Microphone after Join voice |
| `media:video` / `media:screen` | Camera / screen after an explicit click |

An audio-only token requesting camera or screen is **403**. LiveKit Cloud automatic revocation is not used; revoke calls `RemoveParticipant`.

---

## Persistence and scale

| Mode | When to use |
|------|-------------|
| `STORE_DRIVER=memory` | Tests and local demo. All rooms vanish when the process exits. |
| `STORE_DRIVER=postgres` | Anything you care about after a crash. Migrations apply on boot. |
| `REDIS_URL` unset | One platform process. `instance: "single"`. Enough for ~10 users. |
| `REDIS_URL` set | Socket.IO fan-out, Redis presence, Y.Doc cache invalidation. Also needs **shared Postgres**. |

```bash
docker compose up -d postgres          # then STORE_DRIVER=postgres
docker compose --profile platform up --build
```

There is no per-user license fee. Ten users on one small VPS or your laptop is enough. Redis is not required at that size.

---

## Integrate into your app

Packages are not published to npm. From this repo:

```bash
npm run pack:sdks
# tarballs in dist-packages/
```

**Server** (never in the browser):

```ts
import { Realtime } from "@realtime/node";

const realtime = new Realtime({
  secretKey: process.env.REALTIME_SECRET_KEY!,
  endpoint: process.env.REALTIME_API_URL ?? "http://localhost:3080",
});

await realtime.rooms.ensure({ id: roomId });
const issued = await realtime.identify({
  user: { id: user.id, name: user.name },
  room: roomId,
  permissions: ["room:join", "room:read", "room:write", "presence:write" /* … */],
});
```

**Browser:**

```tsx
import { RealtimeProvider, Room, PresenceBar, CursorOverlay } from "@realtime/react";
import { CollaborativeEditor } from "@realtime/editor";
import { VoiceToolbar } from "@realtime/media/react";

<RealtimeProvider
  publicKey={import.meta.env.VITE_REALTIME_PUBLIC_KEY}
  endpoint={import.meta.env.VITE_REALTIME_URL}
  authEndpoint="/api/realtime/token"
>
  <Room id={roomId}>
    <PresenceBar />
    <VoiceToolbar />
    <div data-realtime-surface>
      <CollaborativeEditor />
      <CursorOverlay />
    </div>
  </Room>
</RealtimeProvider>
```

Your `authEndpoint` must run **after your login** and return the body of `identify()`. See `apps/sample-integrator` for a complete path.

### Packages

| Package | Role |
|---------|------|
| `@realtime/protocol` | Shared schemas, permissions, errors |
| `@realtime/core` | Socket client |
| `@realtime/react` | React bindings and panels |
| `@realtime/editor` | Collaborative editor + export |
| `@realtime/media` | LiveKit + `VoiceToolbar` |
| `@realtime/node` | Server `identify` / room admin helpers |

---

## Roles and permissions

Presets in `@realtime/protocol`: `viewer`, `commenter`, `suggester`, `editor`, `administrator`.

| Role | Document write | Propose | Accept | Chat | Mic (if you add media grants) |
|------|----------------|---------|--------|------|-------------------------------|
| viewer | no | no | no | no | no |
| commenter | no | no | no | yes | no |
| suggester | no | yes | no | yes | no |
| editor | yes | yes | yes | yes | only if you attach `media:*` |
| administrator | all listed permissions | | | | including camera/screen |

`room:admin` is treated as a super-grant. Suggesters must **not** receive `room:write`.

---

## What this is not (current limits)

- Not a public npm package until a maintainer publishes.
- Installing SDKs does nothing without a running platform and your auth endpoint.
- Suggestions are plain text (no marks, tables, or images).
- DOCX is export-only: images become a placeholder; comments and suggestions are dropped; not a round-trip format.
- Follow uses the other user’s latest selection; concurrent edits can shift the landing spot.
- Default store is memory. Postgres exists; you must run it yourself.
- More than one platform process needs Redis **and** shared Postgres.
- Voice needs LiveKit. Opening a doc never auto-starts mic, camera, or screen.
- Sharing UI in the sample is the integrator’s ACL, not a hosted accounts product.

---

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev:platform` | Platform on :3080 |
| `npm run dev:sample` | Sample app on :4000 |
| `npm run build` | Build `@realtime/*` packages |
| `npm test` | Protocol, platform, editor, media, sample, pack-install |
| `npm run migrate` | Apply `migrations/*.sql` (Postgres) |
| `npm run pack:sdks` | Write tarballs to `dist-packages/` |
| `npm run bench:latency` | Measure local loopback latency; writes [docs/PERFORMANCE.md](docs/PERFORMANCE.md) |

---

## Further docs

| Doc | Contents |
|-----|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Trust boundaries and data flow |
| [docs/PROTOCOL.md](docs/PROTOCOL.md) | Events, HTTP, `/ready` |
| [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) | Memory, Postgres, Compose, TLS |
| [docs/SECURITY.md](docs/SECURITY.md) | Keys, reporting |
| [docs/RELEASE.md](docs/RELEASE.md) | Local tarballs; do not publish without authorization |
| [docs/MIGRATION.md](docs/MIGRATION.md) | SQL files and memory → Postgres |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to change the protocol and store |

Milestone notes A–E in `docs/` describe how the stack was built.

---

## Cost

There is **no seat fee**. Ten users can run on a laptop (localhost or a Cloudflare Tunnel) or one small VPS. You pay only for the machine, domain, and bandwidth. Voice/video uses more upload than typing. Skip Redis, LiveKit Cloud, and npm publish unless you need them.
