# Issue Draft: Alternun Identity Infrastructure Spec (Lean AWS Deployment)

## Overview

This issue proposes the production architecture for Alternun identity infrastructure using:

- **Authentik** as the Identity Provider (IdP) — requires **version 2025.10 or later**
- **Supabase** as the application database and authorization engine
- **AWS EC2 + RDS** as the lean infrastructure layer

Goal: keep infrastructure **low cost, portable, and infrastructure-as-code friendly**.

> **Note on Redis:** Authentik 2025.8 migrated background tasks from Redis to PostgreSQL, and Authentik 2025.10 completed the removal by migrating caching, WebSocket, and the embedded outpost session store to PostgreSQL as well. As of **2025.10, Redis is no longer a dependency**. This architecture targets Authentik ≥ 2025.10 and therefore does not include Redis. See [Authentik 2025.10 release notes](https://docs.goauthentik.io/docs/releases/2025.10) for details.

---

## Architecture

### Identity Flow

Authentik issues JWT tokens → Supabase validates JWT → Postgres RLS authorizes access.

```text
Client (Web / Mobile / API)
        |
        v
     Authentik
        |
      JWT Token
        |
        v
     Supabase
        |
     Postgres RLS
```

Authentik remains the **identity source of truth**, while Supabase remains the **application data authority**.

---

## AWS Infrastructure

### EC2 Instance

Runs Authentik services.

Recommended instance:

- `t3.small`
- 2 vCPU
- 2GB RAM

Services running via Docker (Authentik ≥ 2025.10, no Redis required):

- Traefik / Reverse Proxy
- Authentik Server
- Authentik Worker

---

### RDS PostgreSQL

Database used **only for Authentik identity state**.

> **Note:** Since Authentik 2025.10 removed Redis, all caching, tasks, WebSocket, and outpost session state are handled by PostgreSQL. Expect approximately 50% more database connections than older Authentik versions — still well within `db.t4g.micro` capacity for low-traffic deployments.

Recommended configuration:

- Engine: PostgreSQL 16
- Instance: `db.t4g.micro`
- Storage: 20GB gp3
- Multi-AZ: Disabled
- Public Access: Disabled
- Backup Retention: 7 days

Security group rule:

- Allow TCP 5432 only from Authentik EC2 instance

Estimated cost:

- $12–15 / month

---

## Performance Optimizations

To keep costs low and reduce unnecessary resource consumption, the following options must be disabled.

- Performance Insights: **OFF**
- Enhanced Monitoring: **OFF**

These features are useful for high-scale systems but unnecessary for the expected Authentik workload.

---

## Storage

Use GP3 storage:

- 20GB gp3

Advantages:

- Lower cost
- Better baseline IOPS
- Easy scaling

---

## Authentik Database Load Expectations

Typical operations:

- login
- session validation
- token issuance
- OAuth client lookup

Expected load:

- <50 queries/sec
- <400MB memory usage

Therefore a **`db.t4g.micro`** instance is sufficient.

---

## Backup Strategy

RDS automatic backups:

- 7-day retention
- daily snapshots

Optional additional strategy:

- weekly manual snapshot

---

## Estimated Monthly Cost

- EC2 `t3.small` ≈ $15
- RDS `t4g.micro` ≈ $12
- EBS storage ≈ $3
- SES + misc ≈ $1

**Total ≈ $30/month**

This provides a full production identity platform.

---

## Scaling Plan

If load increases, upgrade the database instance:

- `db.t4g.small`
- 2GB RAM

No architecture changes required.

---

## Final Deployment Topology

AWS

EC2

- Traefik
- Authentik Server (≥ 2025.10)
- Authentik Worker (≥ 2025.10)

RDS PostgreSQL

- Authentik Database

Supabase Cloud

- Application Database + RLS

---

## Security Notes

- Authentik and Supabase databases remain isolated.
- JWT tokens are the trust bridge between systems.
- Supabase does **not require direct access to Authentik DB**.

---

## Summary

This architecture provides:

- Lean infrastructure
- Low cost (~$30/month)
- Clean identity separation
- Compatibility with Supabase RLS
- Easy scaling path

Suitable for Alternun initial production deployment.
