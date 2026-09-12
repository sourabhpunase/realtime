# Milestone B — Collaborative documents

Built on the Milestone A token and socket path.

## What works

- Incremental **Yjs** updates. The server applies `Y.applyUpdate`, persists the bytes, then acknowledges `{ saved: true }`. “Saved” means the update is in the room log.
- `yjs:sync` exchanges state vectors. Reconnects send a vector and receive only missing updates.
- Duplicate `requestId` values are stored once.
- Updates larger than 256KB are rejected (`PAYLOAD_TOO_LARGE`).
- Viewers can sync (`room:read`) and cannot write (`room:write`).
- Editor: Tiptap + `@tiptap/extension-collaboration` (per-user undo via Yjs, default History disabled).
- Mouse pointers stay on the collaboration surface. Text carets/selections use Yjs awareness (`awareness:update`).
- Comment threads with optional selection quote, resolve/reopen, author-only edit/delete.
- Named versions and restore. Restore increments `generation`. Stale clients receive `CONFLICT` / `yjs:reset` and must resync. Offline caches are keyed by `pk + user + room + generation`.
- Logout in the sample app deletes that user’s IndexedDB copies.

## Not in this slice

- LiveKit audio (Milestone C). Suggestion mode and follow (Milestone D).
- Postgres document driver (log is still the in-memory store; schema already exists)
- DOCX import/export (print view is HTML + browser print)

## Run

```bash
npm install
npm run build
npm test
npm run dev:platform
npm run dev:sample
```

Open http://localhost:4000 as Alice and Bob on **Team welcome** and type in the same paragraph.
