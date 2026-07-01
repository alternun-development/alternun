# Self-Hosted IP Geolocation Service — Pending Tasks

Replace `ipapi.co` (1000 req/day trial limit) with an owned MaxMind GeoLite2-based service.
Same `GET /v1/geo` contract, zero external dependency, < $0.01/month infra cost.

## Task index

| ID     | Task                                                        | Phase              |
| ------ | ----------------------------------------------------------- | ------------------ |
| GEO-01 | S3 bucket + IAM + SSM params in SST infra                   | 1 — Infrastructure |
| GEO-02 | One-time bootstrap script to seed S3 with MMDB              | 1 — Infrastructure |
| GEO-03 | Lambda DB loader (`geo.db.ts`) — S3 download + `/tmp` cache | 2 — API            |
| GEO-04 | Update `GeoController` — self-hosted first, ipapi fallback  | 2 — API            |
| GEO-05 | Weekly update Lambda triggered by EventBridge cron          | 3 — Automation     |
| GEO-06 | CloudWatch alarms + `GeoLookupSource` metric                | 3 — Automation     |
| GEO-07 | Remove ipapi.co entirely once stable 30 days                | 4 — Cleanup        |

## Switch trigger

Start this work when **any** of:

- Daily lookups consistently > 800/day (80% of free quota)
- ipapi.co sends a bill
- ipapi.co has a downtime event

## Start order

GEO-01 → GEO-02 → GEO-03 → GEO-04 (deploy, validate) → GEO-05 → GEO-06 → GEO-07

Full spec: [00-SPEC.md](./00-SPEC.md)
