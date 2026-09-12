# Repository audit

The previous product (`api/`, `realtime/` dashboard, `realtimecursor-sdk`) was removed. This repo is only the delegated-auth platform and `@realtime/*` SDKs.

Historical issues in the deleted dashboard (hardcoded Supabase service-role JWT, unauthenticated admin seed, unauthenticated sockets) do not apply to the current process. If those files were ever deployed, rotate any keys that lived in them.

The current trust model is in [SECURITY.md](SECURITY.md) and [PROTOCOL.md](PROTOCOL.md).
