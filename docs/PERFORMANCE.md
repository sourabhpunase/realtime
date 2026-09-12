# Documented local latency

These numbers were measured on this machine. They are not a production SLO and do not include WAN, TLS, LiveKit, or a browser editor.

## Environment

| Field | Value |
|-------|--------|
| Date | 2026-09-12T21:01:48.979Z |
| Node | v24.14.1 |
| OS | darwin 25.3.0 arm64 |
| CPU | Apple M4 |
| Store | memory |
| Instance | single |
| Target | 127.0.0.1 loopback, in-process platform |
| Samples | 40 (after 5 warmup) |

## Results (ms)

| Operation | p50 | p95 | max |
|-----------|-----|-----|-----|
| `POST /v1/tokens` | 0.5 | 0.9 | 1.2 |
| Socket.IO `join-room` ack | 0.1 | 0.2 | 0.2 |
| `yjs:sync` ack | 0.1 | 0.2 | 0.3 |
| `yjs:update` persist-then-ack | 0.1 | 0.2 | 0.3 |

Re-run with `npm run bench:latency`.
