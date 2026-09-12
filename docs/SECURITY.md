# Security policy

## Reporting

Email the maintainers privately. Do not open a public issue for an unpatched vulnerability.

## Trust boundaries

- Integrator applications own end-user identity and authorization.
- `pk_...` is a public application identifier. It does not grant room access.
- `sk_...` is server-side only. It is never returned to a browser.
- Room tokens prove a single user’s grants for a single room. They cannot call tenant-wide admin APIs.
- Platform JWT signing keys are independent of customer API secrets.
- Do not add `/auth/login` to the platform. Do not point `@realtime/*` clients at a product dashboard.

## Historical note

An older dashboard in this repository committed a Supabase service-role JWT. Those files are gone. If that key was real for any hosted project, rotate it and treat historical logs as exposed.
