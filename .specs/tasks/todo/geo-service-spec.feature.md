# Self-Hosted IP Geolocation Service — Replace ipapi.co

**Feature folder:** `geo-service`  
**Status:** pending — not yet started  
**Trigger:** Switch when ipapi.co free tier (1000 req/day) is consistently exhausted, or proactively before reaching the limit  
**Current state:** `GET /v1/geo` proxies to `ipapi.co` using `IPAPI_ACCESS` from SSM  
**Target state:** Same `GET /v1/geo` contract, backed by our own MMDB-based lookup — zero external dependency, unlimited lookups

---

## Why Build This

| Concern          | ipapi.co (current)                    | Self-hosted (target)               |
| ---------------- | ------------------------------------- | ---------------------------------- |
| Daily limit      | 1,000 req/day (trial)                 | Unlimited                          |
| Cost above limit | ~$15–50/mo paid plan                  | One-time infra cost (~$0–5/mo)     |
| Privacy          | Client IPs sent to third party        | IPs never leave our infrastructure |
| Latency          | External HTTP round-trip (~100–300ms) | In-process lookup (~1–5ms)         |
| Reliability      | Dependent on ipapi.co uptime          | Self-controlled                    |
| Data freshness   | ipapi.co managed                      | Weekly cron update from MaxMind    |

---

## How ipapi.co Works (What We're Replacing)

ipapi.co wraps the MaxMind GeoLite2 database and exposes it via HTTP. The database is a binary MMDB file containing IP range → location mappings. We can use the same database directly.

**Response contract we must preserve** (current `/v1/geo`):

```json
{ "countryName": "Colombia", "countryCode": "CO", "city": "Medellín" }
```

---

## GeoIP Database Options

### Option A: MaxMind GeoLite2 (Recommended)

- **GeoLite2-City.mmdb** — free, requires account registration + license key (no cost)
- Updated every Tuesday; download URL requires a MaxMind license key
- Data accuracy: city-level, ~95% country accuracy, ~60–80% city accuracy
- License: Creative Commons Attribution-ShareAlike 4.0
- MaxMind account: [maxmind.com](https://www.maxmind.com/en/geolite2/signup) (free)
- Download format: `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key={KEY}&suffix=tar.gz`
- File size: ~60MB compressed, ~110MB uncompressed

### Option B: DB-IP Lite (No Registration Required)

- No license key needed — monthly download, CC BY 4.0
- Slightly less accurate than MaxMind but fully open
- URL: `https://download.db-ip.com/free/dbip-city-lite-{YYYY-MM}.mmdb.gz`
- File size: ~30MB compressed, ~60MB uncompressed
- Good fallback if MaxMind account setup is blocked

**Recommendation**: Start with DB-IP (no registration needed, simpler bootstrap), migrate to MaxMind GeoLite2 once registration is done for better accuracy.

---

## Architecture

### Storage: S3 Bucket

```
alternun-geo-db-{stage}/
  GeoLite2-City.mmdb          ← current version (symlink-equivalent via metadata)
  GeoLite2-City-{date}.mmdb   ← versioned backups (7-day retention)
```

- Bucket: private, no public access
- Region: `us-east-1` (same as Lambda)
- Cost: ~$0.002/month for 110MB

### Lambda Integration: Two Options

#### Option A: Bundle MMDB in Lambda Layer (Simpler)

- Create a Lambda Layer containing `GeoLite2-City.mmdb`
- Layer size limit: 250MB unzipped — fits comfortably
- Update process: rebuild and republish the layer + update function config
- Cold start impact: none (layer is pre-extracted on Lambda filesystem)
- **Tradeoff**: redeploy required for each DB update

#### Option B: Download from S3 at Cold Start (Recommended)

- Lambda downloads `GeoLite2-City.mmdb` from S3 on first cold start
- Caches in `/tmp` (512MB–10GB depending on config) across warm invocations
- Weekly update: overwrite S3 file → next cold start picks up new version
- Forces cache refresh: touch the Lambda env var `GEO_DB_VERSION=YYYY-WW` weekly (via EventBridge)
- **Tradeoff**: ~200–400ms cold start overhead on first invocation after update

**Recommendation**: Option B (S3 + `/tmp` cache) — no redeploy needed for weekly updates.

### Database Reader: `mmdb-lib`

```bash
pnpm add mmdb-lib
```

- Pure JS/TS, no native binaries → works on Lambda arm64
- Reads `.mmdb` files directly
- Alternative: `@maxmind/geoip2-node` (official MaxMind client, heavier dependency)

### Update Pipeline: EventBridge Cron

```
EventBridge Rule: rate(7 days) → Lambda:GeoDbUpdater
GeoDbUpdater:
  1. Download fresh GeoLite2-City.mmdb.tar.gz from MaxMind (using MAXMIND_LICENSE_KEY from SSM)
  2. Extract and upload to S3: alternun-geo-db-{stage}/GeoLite2-City.mmdb
  3. Update Lambda env var GEO_DB_VERSION to today's date (forces cache invalidation)
  4. Alert on failure (SNS or CloudWatch alarm)
```

---

## Implementation Tasks

### Task GEO-01: Infrastructure Setup

Files: `packages/infra/modules/geo-db.ts`, `packages/infra/infra.config.ts`

1. Create private S3 bucket `alternun-geo-db-{stage}` per stage (dev, prod)
2. Create IAM role granting the API Lambda `s3:GetObject` on the bucket
3. Add SSM parameters:
   - `/alternun-infra/{stage}/maxmind-license-key` (SecureString) — MaxMind GeoLite2 license key
   - `/alternun-infra/{stage}/geo-db-version` (String) — current db date e.g. `2026-07-01`
4. Add `MAXMIND_LICENSE_KEY` and `GEO_DB_VERSION` to `backend-api.ts` Lambda env (from SSM)
5. SST resource definition for the S3 bucket and IAM grant

Verify: `aws s3 ls s3://alternun-geo-db-dev/` shows the bucket exists

### Task GEO-02: Initial DB Bootstrap Script

File: `scripts/bootstrap-geo-db.sh`

```bash
#!/bin/bash
# One-time: download and upload the initial MMDB to S3
STAGE=${1:-dev}
LICENSE_KEY=$(aws ssm get-parameter --name "/alternun-infra/${STAGE}/maxmind-license-key" --with-decryption --query Parameter.Value --output text)

# Download from MaxMind (or DB-IP if no license yet)
curl -o /tmp/geo.tar.gz \
  "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${LICENSE_KEY}&suffix=tar.gz"

tar -xzf /tmp/geo.tar.gz -C /tmp
DB_FILE=$(find /tmp -name "GeoLite2-City.mmdb" | head -1)

# Upload to S3
aws s3 cp "$DB_FILE" "s3://alternun-geo-db-${STAGE}/GeoLite2-City.mmdb"
aws ssm put-parameter --name "/alternun-infra/${STAGE}/geo-db-version" \
  --value "$(date +%Y-%m-%d)" --type String --overwrite
```

Verify: file in S3, SSM version param updated

### Task GEO-03: API Lambda DB Loader

File: `apps/api/src/modules/geo/geo.db.ts`

```typescript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Reader } from 'mmdb-lib';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const CACHE_PATH = '/tmp/GeoLite2-City.mmdb';
let cachedReader: Reader<Record<string, unknown>> | null = null;
let cachedVersion: string | null = null;

export async function getGeoReader(): Promise<Reader<Record<string, unknown>> | null> {
  const currentVersion = process.env.GEO_DB_VERSION ?? '';

  // Return cached reader if DB version hasn't changed
  if (cachedReader && cachedVersion === currentVersion) {
    return cachedReader;
  }

  const bucket = process.env.GEO_DB_BUCKET;
  if (!bucket) return null; // dev fallback: no S3

  try {
    const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
    const resp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: 'GeoLite2-City.mmdb' }));
    const body = await resp.Body?.transformToByteArray();
    if (!body) return null;

    writeFileSync(CACHE_PATH, Buffer.from(body));
    cachedReader = new Reader<Record<string, unknown>>(readFileSync(CACHE_PATH));
    cachedVersion = currentVersion;
    return cachedReader;
  } catch {
    return null;
  }
}
```

### Task GEO-04: Update GeoController to Use Self-Hosted DB

File: `apps/api/src/modules/geo/geo.controller.ts`

Priority chain (env-driven feature flag):

1. If `GEO_DB_BUCKET` is set → use self-hosted MMDB via `getGeoReader()`
2. Else if `IPAPI_ACCESS` is set → proxy to ipapi.co (current behavior)
3. Else → return empty / graceful null

```typescript
@Get()
async locate(@Ip() clientIp: string) {
  // Try self-hosted first
  const reader = await getGeoReader();
  if (reader) {
    const result = reader.get(clientIp) as Record<string, unknown> | null;
    return {
      countryName: (result?.country as Record<string,unknown>)?.names?.en ?? '',
      countryCode: (result?.country as Record<string,unknown>)?.iso_code ?? '',
      city: ((result?.city as Record<string,unknown>)?.names?.en) ?? '',
    };
  }

  // Fallback: ipapi.co proxy (existing behavior, remove once self-hosted is stable)
  return this.fallbackToIpapi(clientIp);
}
```

Response format stays identical to current `/v1/geo` — no client changes needed.

### Task GEO-05: Weekly Update Lambda

File: `apps/api/src/modules/geo/geo-updater.handler.ts` (separate Lambda or scheduled NestJS task)

```typescript
// EventBridge trigger: cron(0 6 ? * TUE *) — every Tuesday at 6am UTC (MaxMind updates Tuesdays)
export async function handler(): Promise<void> {
  const licenseKey = process.env.MAXMIND_LICENSE_KEY;
  const bucket = process.env.GEO_DB_BUCKET;
  if (!licenseKey || !bucket) throw new Error('Missing config');

  const url = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${licenseKey}&suffix=tar.gz`;
  const tarBuffer = await fetch(url).then((r) => r.arrayBuffer());
  // extract + upload to S3 (use tar.js or spawn tar)
  // update SSM geo-db-version to today
  // update Lambda env var GEO_DB_VERSION via Lambda API (forces cache bust)
}
```

SST config: EventBridge schedule rule → this Lambda

### Task GEO-06: Monitoring + Alerting

1. CloudWatch alarm: `GeoDbUpdater` Lambda error rate > 0 for 2 consecutive runs → SNS alert
2. CloudWatch metric: `GeoLookupSource` custom metric (dimension: `self-hosted` vs `ipapi-fallback`) — track when fallback is being used
3. CloudWatch dashboard: geo lookups/day, source breakdown, latency p50/p99

### Task GEO-07: Remove ipapi.co Dependency

Once self-hosted has been stable for 30 days with < 0.1% error rate:

1. Remove `IPAPI_ACCESS` from SSM (dev + prod)
2. Remove `IPAPI_ACCESS` from `backend-api.ts` Lambda env
3. Remove `IPAPI_ACCESS` from `resolve-ssm-env.sh`
4. Remove ipapi fallback from `geo.controller.ts`
5. Delete the ipapi.co account (cancel before trial expires to avoid charges)

---

## Switch Trigger

Move from ipapi.co to self-hosted when ANY of these conditions is true:

- Daily request count consistently > 800/day (80% of free quota)
- Monthly bill from ipapi.co > $0 (i.e., paid plan kicks in)
- ipapi.co has a downtime incident
- GEO-01 through GEO-05 are complete and GEO-06 shows < 0.1% error rate for 7 days

The feature flag (`GEO_DB_BUCKET` env var) makes the switch instantaneous — set the SSM param, redeploy, done.

---

## Acceptance Criteria

- [ ] S3 bucket `alternun-geo-db-{stage}` exists with `GeoLite2-City.mmdb` in it
- [ ] `GET /v1/geo` returns `{ countryName, countryCode, city }` using local MMDB — no external HTTP call
- [ ] Response latency < 10ms (vs ~150ms for ipapi.co)
- [ ] Weekly cron updates the MMDB without manual intervention
- [ ] CloudWatch alarm fires if cron update fails
- [ ] `GEO_DB_BUCKET` not set → graceful fallback to ipapi.co (zero regression)
- [ ] `GEO_DB_BUCKET` set → ipapi.co never called (verified by CloudWatch metric)
- [ ] API response format identical to current (no mobile client changes)
- [ ] `mmdb-lib` or MaxMind reader library passes ARM64 Lambda integration test

---

## Cost Estimate (Self-Hosted)

| Resource                             | Cost/month                         |
| ------------------------------------ | ---------------------------------- |
| S3 storage (110MB)                   | ~$0.003                            |
| S3 GET requests (1000/mo updater)    | ~$0.0005                           |
| Lambda compute (updater, 1x/week)    | ~$0 (free tier)                    |
| Lambda compute (geo lookups, inline) | Already paid (existing API Lambda) |
| **Total**                            | **< $0.01/month**                  |

vs ipapi.co paid plan: $15–50/month once free quota is exhausted.
