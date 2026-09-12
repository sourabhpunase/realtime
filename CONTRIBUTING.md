# Contributing

1. Read `docs/AUDIT.md` and `docs/MILESTONE_A.md`.
2. Keep integrator identity out of the platform. Do not add `/auth/login` to `@realtime/*`.
3. New socket events belong in `@realtime/protocol` first.
4. Store changes need a `migrations/*.sql` file when they must persist in Postgres.
5. Run `npm run build` and `npm test` before opening a change.

Security reports: see `docs/SECURITY.md`.
