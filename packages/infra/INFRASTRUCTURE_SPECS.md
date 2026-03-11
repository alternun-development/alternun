# Infrastructure Specs

This file is the human-readable inventory of what `@alternun/infra` actually provisions today.

It exists because:

- `packages/infra/schemas/` currently describes secret payload shapes, not the full infrastructure topology
- the real resource definitions are spread across SST/Pulumi modules
- `deployment.config.example.json` shows configurable values, but not the complete resource inventory

## Source Of Truth

The actual deployed infrastructure is defined in these files:

- stack orchestration: `packages/infra/infra.config.ts`
- SST app wrapper: `packages/infra/sst.config.ts`
- typed default specs: `packages/infra/config/infrastructure-specs.ts`
- public Expo/mobile web site config: `packages/infra/config/expo.ts`
- pipeline catalog and stage mapping: `packages/infra/config/pipelines/**`
- backend API resources: `packages/infra/modules/backend-api.ts`
- admin site resources: `packages/infra/modules/admin-site.ts`
- identity settings/defaults: `packages/infra/modules/identity.ts`
- identity runtime resources: `packages/infra/modules/identity-resources.ts`
- redirect resources: `packages/infra/modules/redirects.ts`
- configurable example values: `packages/infra/config/deployment.config.example.json`

## What `schemas/` Covers

Current schema coverage:

- `packages/infra/schemas/secrets.schema.json`

That schema validates secret/config payload structure. It does not describe:

- EC2 instance types
- RDS sizes
- Lambda memory/timeouts
- Route53 records
- API Gateway resources
- CloudFront/static site resources
- pipeline topology

## Resource Inventory

### Public App Site

Primary stages:

- `production`
- `dev`
- `mobile`

Resources created:

- `sst.aws.Bucket` for public web assets
- `sst.aws.StaticSite` for the Expo web build
- optional redirect routers via `sst.aws.Router`

Default specs:

- app path: `../../apps/mobile`
- build command: `npx expo export -p web`
- build output: `dist`
- domains:
  - production: `airs.alternun.co`
  - dev: `testnet.airs.alternun.co`
  - mobile: `preview.airs.alternun.co`

Defined in:

- `packages/infra/config/expo.ts`
- `packages/infra/infra.config.ts`
- `packages/infra/modules/redirects.ts`

### Dashboard Stack

Recommended internal release stacks:

- `dashboard-dev`
- `dashboard-prod`

Purpose:

- deploy the internal admin UI and backend API together as one release unit

Contains:

- backend API stack resources
- admin site stack resources

Defined in:

- `packages/infra/infra.config.ts`
- `packages/infra/config/pipelines/specs/dashboard.ts`

### Backend API

Deployment modes:

- combined dashboard stacks: `dashboard-dev`, `dashboard-prod`
- dedicated manual escape-hatch stacks: `api-dev`, `api-prod`

Resources created:

- IAM role for Lambda
- IAM policy attachment for basic execution
- CloudWatch log group
- Lambda function
- API Gateway HTTP API
- API Gateway integration
- API Gateway `$default` route
- API Gateway `$default` stage
- Lambda invoke permission for API Gateway
- custom API domain when enabled
- API mapping when custom domain is enabled
- Route53 alias record for the custom domain
- ACM certificate + DNS validation when custom domain is enabled and no cert ARN is pre-supplied

Default specs:

- app path: `../../apps/api`
- build command: `pnpm --filter @alternun/api run build`
- build output: `dist-lambda`
- architecture: `arm64`
- memory: `1024 MB`
- timeout: `30 seconds`
- log retention: `14 days`
- domains:
  - production: `api.alternun.co`
  - dev: `testnet.api.alternun.co`
  - mobile: `preview.api.alternun.co`

Defined in:

- `packages/infra/modules/backend-api.ts`
- `apps/api`

### Admin Site

Deployment modes:

- combined dashboard stacks: `dashboard-dev`, `dashboard-prod`
- dedicated manual escape-hatch stacks: `admin-dev`, `admin-prod`

Resources created:

- `sst.aws.StaticSite`
- S3 asset bucket behind the site
- CloudFront distribution
- CloudFront function for SPA routing
- CDN invalidation
- Route53 records for custom domain
- ACM certificate and validation for the site domain

Default specs:

- app path: `../../apps/admin`
- build command: `pnpm --filter @alternun/admin run build`
- build output: `dist`
- domains:
  - production: `admin.alternun.co`
  - dev: `testnet.admin.alternun.co`
  - mobile: `preview.admin.alternun.co`
- admin auth client id: `alternun-admin`
- admin auth audience: `alternun-app`

Defined in:

- `packages/infra/modules/admin-site.ts`
- `apps/admin`

### Identity

Deployment modes:

- dedicated stacks: `identity-dev`, `identity-prod`

Resources created:

- `sst.aws.Vpc`
- app security group
- database security group
- Secrets Manager secrets:
  - authentik secret key
  - SMTP credentials
  - JWT signing key
  - integration config
  - database credentials
- optional RDS subnet group
- optional RDS monitoring IAM role + policy attachment
- optional RDS PostgreSQL instance
- EC2 instance role
- EC2 SSM policy attachment
- EC2 Secrets Manager access policy
- EC2 Route53 access policy for DNS-01 updates
- EC2 S3 access policy for ACME backup state
- EC2 instance profile
- EC2 instance for Authentik
- Elastic IP for direct-ingress identity stages
- Elastic IP association for direct-ingress identity stages
- private S3 bucket for Traefik ACME backup state on Route53 DNS-01 stages
- production Application Load Balancer
- production target group + listeners
- production ACM certificate + DNS validation record when no explicit cert ARN is provided
- Route53 DNS record for the identity domain
- user-data/bootstrap from the templates in `packages/infra/scripts/templates`

Default specs:

- domains:
  - production: `sso.alternun.co`
  - dev: `testnet.sso.alternun.co`
  - mobile: `preview.sso.alternun.co`
- EC2 instance type: `t3.small`
- EC2 volume size: `20 GiB`
- ingress defaults:
  - production: `alb`
  - dev: `instance`
  - mobile: `instance`
- TLS defaults:
  - production: `alb-acm`
  - dev: `acme-route53-dns-01`
  - mobile: `acme-route53-dns-01`
- ACME backup defaults:
  - enabled: `true`
  - prefix: `state`
- RDS engine: PostgreSQL `16`
- RDS instance type: `db.t4g.micro`
- RDS storage: `20 GiB`
- RDS backup retention: `7 days`
- default email provider: `ses`
- default Authentik image tag: `2026.2`

Defined in:

- `packages/infra/modules/identity.ts`
- `packages/infra/modules/identity-resources.ts`
