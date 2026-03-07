# Alternun Identity Architecture Decision Record

## Status

Accepted for initial implementation.

References:

- Parent issue: `#69`
- Phase 1 task: `#70`

## Context

Alternun needs a lean production identity stack that keeps:

- Authentik as the identity provider
- Supabase as the application data and authorization layer
- AWS EC2 + RDS PostgreSQL as the infrastructure layer for Authentik

The current repo already standardizes customer-facing application delivery around `alternun.co` stage domains:

- production: `airs.alternun.co`
- dev: `testnet.airs.alternun.co`
- preview/mobile: `preview.airs.alternun.co`

The marketing and corporate site remains on `alternun.io`.

The architecture must keep Authentik logically separate from Supabase while still allowing Supabase to authorize application access through JWT claims and Postgres RLS.

## Decisions

### 1. Identity Domain Model

Use the application domain family, not the marketing domain family, for Authentik.

Initial domain decisions:

- production identity domain: `auth.alternun.co`
- non-production identity domain: `auth.testnet.alternun.co`

Rationale:

- keeps identity traffic under the same operational root as the application stack
- avoids mixing product identity concerns with the marketing site on `alternun.io`
- leaves room for future environment-specific identity endpoints without changing the core production hostname

Follow-up:

- if the final DNS convention prefers `auth.dev.alternun.co` or a different non-prod host, that is an implementation detail and does not change the production decision

### 2. Trust Boundary

Authentik is the identity source of truth.

Supabase remains the application data and authorization layer.

Supabase must not access the Authentik database directly.

The only trust bridge between systems is the Authentik-issued JWT validated by Supabase.

### 3. JWT Contract for Supabase

Alternun will use Authentik as an external JWT issuer for Supabase-backed application authorization.

Required JWT characteristics:

- `iss`: Authentik issuer URL for the Alternun OIDC provider
- `aud`: `alternun-app`
- `sub`: stable Authentik user identifier
- `exp`, `iat`, `nbf`: standard token timing claims
- `email`: normalized user email
- `email_verified`: boolean verification state
- `role`: `authenticated`
- `alternun_roles`: array of application roles used by RLS and app policy decisions

Rules:

- Supabase authorization logic must rely on `sub` as the stable principal identifier
- application-specific authorization must use `alternun_roles`, not ad hoc string parsing from email or display name
- `role=authenticated` is the baseline database role expected for normal signed-in traffic

Notes:

- if Supabase requires a different claim shape for external JWT validation, adapt the mapping layer in Authentik without changing the architectural ownership model
- if additional claims are required later, extend the contract intentionally and document the change here

### 4. Token Lifetime Strategy

Initial token policy:

- access token TTL: 15 minutes
- refresh/session continuity handled by Authentik

Rationale:

- short-lived access tokens reduce blast radius
- Authentik, not Supabase, should own primary session lifecycle and refresh behavior

### 5. Reverse Proxy Choice

Keep Traefik as the initial reverse proxy for the Authentik EC2 deployment.

Rationale:

- it matches the current lean Docker-on-EC2 approach from the infrastructure proposal
- it minimizes moving parts for the first production version
- it keeps the Authentik runtime self-contained and portable

This can be revisited later if the stack moves to a more AWS-native ingress model.

### 6. Email Provider Choice

Use AWS SES as the initial transactional email provider for Authentik.

Rationale:

- the repo already contains SES-oriented auth/email support scripts
- SES fits the low-cost AWS-first deployment model
- using SES reduces the number of third-party dependencies in the first production cut

Postmark remains a valid fallback option if SES deliverability or operational complexity becomes a blocker.

### 7. Database and Infrastructure Baseline

Approved initial sizing:

- EC2: `t3.small`
- RDS: PostgreSQL 16 on `db.t4g.micro`
- storage: `20GB gp3`

Configuration constraints:

- RDS public access: disabled
- RDS multi-AZ: disabled initially
- Performance Insights: disabled
- Enhanced Monitoring: disabled

These are accepted as the default lean production baseline, not long-term scaling commitments.

### 8. Backup and Recovery Policy

Initial backup policy:

- RDS automated backups with 7-day retention
- daily automated snapshots via RDS policy
- weekly manual snapshot before planned Authentik upgrades or schema changes

Recovery policy:

- one restore procedure must be documented and rehearsed before production cutover is considered complete

### 9. Patching and Upgrade Policy

Initial operations policy:

- monthly EC2 patch window for host OS updates
- Authentik version upgrades on a planned cadence or immediately for critical security fixes
- every Authentik upgrade must include a pre-upgrade snapshot and rollback note

## Consequences

Positive:

- clean separation between identity and application data
- low-cost initial production footprint
- portable runtime model
- explicit JWT ownership and claims strategy for Supabase RLS

Tradeoffs:

- single-instance Authentik on EC2 is not highly available
- Traefik on EC2 is operationally simple but not as managed as an AWS-native ingress stack
- external JWT validation requires disciplined claims design and documentation

## Required Follow-up Work

- provision `auth.alternun.co` and the chosen non-production identity hostname in infrastructure as code
- configure Authentik to issue the approved JWT claim set
- configure Supabase to validate the Authentik issuer and audience
- implement and test the restore procedure
- document any claim-shape deviations required by Supabase implementation details

## Explicit Non-Decisions

These items are intentionally not decided here:

- whether future high-availability deployment uses ECS, EKS, or multiple EC2 nodes
- whether Postmark becomes the long-term email provider
- whether the non-production identity hostname keeps the `auth.testnet.alternun.co` convention permanently
