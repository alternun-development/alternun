# @alternun/status-checker

Standalone infrastructure status checker for Alternun. **No third-party services and no
third-party runtime dependencies** — only the Node.js standard library.

It probes the public surfaces of both environments, computes a status per environment,
detects prod/dev version drift, keeps a history on disk, and serves a status page plus a
JSON API.

## Surfaces monitored

| Env  | Surface | Endpoint                                         |
| ---- | ------- | ------------------------------------------------ |
| prod | API     | `https://api.alternun.co/health`                 |
| prod | Admin   | `https://admin.alternun.co`                      |
| prod | SSO     | `https://sso.alternun.co/-/health/live/`         |
| dev  | API     | `https://testnet.api.alternun.co/health`         |
| dev  | Admin   | `https://testnet.admin.alternun.co`              |
| dev  | SSO     | `https://testnet.sso.alternun.co/-/health/live/` |

Edit `SURFACES` in `checker.mjs` to add or change endpoints.

## Status criteria

| Status                 | Condition                             |
| ---------------------- | ------------------------------------- |
| OK (`up`)              | HTTP 2xx and latency < 2s             |
| Lento (`slow`)         | HTTP 2xx and latency ≥ 2s             |
| Degradado (`degraded`) | HTTP 3xx/4xx                          |
| Caído (`down`)         | HTTP 5xx, timeout or connection error |

Environment status = worst of its surfaces. Version drift is flagged when prod and dev
API versions differ.

## Run it

```bash
cd services/status-checker
npm start                 # http://localhost:8787
# or one-shot JSON, no server:
npm run check
```

Config via env: `PORT` (8787), `CHECK_INTERVAL_MS` (60000), `STATE_DIR` (`./state`).

## Endpoints

- `GET /` — status page (auto-refresh)
- `GET /status.json` — latest computed status
- `GET /history.json` — recent checks (on-disk ring buffer, 500 max)
- `GET /healthz` — service liveness

## Deploy

- **Docker:** `docker build -t alternun-status . && docker run -p 8787:8787 -v status-data:/data alternun-status`
- **Behind a domain:** put it behind the existing ALB/Cloudflare as e.g. `status.alternun.co`.
- **Serverless option:** `checker.mjs` has no server coupling, so `checkAll()` can also run
  from a Lambda on a schedule that writes `status.json` to S3 for a static page.
