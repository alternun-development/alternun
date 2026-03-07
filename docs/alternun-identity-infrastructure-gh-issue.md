## Summary

Implement Alternun's lean production identity infrastructure using:

- Authentik as the identity provider
- Supabase as the application database and authorization layer
- AWS EC2 + RDS PostgreSQL as the infrastructure layer for Authentik

The goal is to ship a low-cost, portable, infrastructure-as-code-managed identity stack that can support initial production usage without coupling Supabase directly to Authentik's database.

## Target Architecture

Identity flow:

`Client -> Authentik -> JWT -> Supabase -> Postgres RLS`

Deployment topology:

- EC2 instance running Traefik, Authentik server, and Authentik worker
- RDS PostgreSQL dedicated to Authentik identity state
- Supabase Cloud retained for application data and RLS authorization

## Proposed Baseline

- EC2: `t3.small`
- RDS: PostgreSQL 16 on `db.t4g.micro`
- Storage: 20GB gp3
- RDS public access: disabled
- Multi-AZ: disabled initially
- Backups: 7-day retention
- Performance Insights: off
- Enhanced Monitoring: off

## Why

This keeps the identity stack:

- lean
- inexpensive
- operationally simple
- cleanly separated from application data concerns
- compatible with Supabase JWT validation and RLS

## Scope

- Provision AWS infrastructure for Authentik
- Deploy and operate Authentik on EC2
- Configure dedicated RDS PostgreSQL for Authentik
- Configure TLS, DNS, and secrets handling
- Integrate Authentik-issued JWTs with Supabase
- Validate claims required for RLS authorization
- Document backup, restore, and operational procedures

## Out of Scope

- Replacing Supabase as the application data layer
- Sharing the Authentik database with Supabase
- Premature high-availability or high-scale architecture changes

## Acceptance Criteria

- Authentik is reachable through the agreed production identity domain over HTTPS
- Authentik uses its own dedicated RDS PostgreSQL instance
- Supabase accepts Authentik-issued JWTs and rejects invalid tokens
- Required JWT claims are available for Postgres RLS decisions
- Secrets, DNS, TLS, and database access are managed without hardcoded credentials
- Backup and restore procedures are documented and validated
- Baseline monthly cost remains within the intended lean operating range

## Initial Task Breakdown

- Finalize identity domain, TLS strategy, and DNS ownership
- Define the Authentik to Supabase JWT contract
- Provision Authentik EC2 infrastructure in IaC
- Provision dedicated Authentik RDS PostgreSQL in IaC
- Configure Authentik runtime, reverse proxy, and secrets
- Integrate Supabase JWT validation with Authentik issuer
- Validate end-to-end authorization through Supabase RLS
- Implement backups, restore validation, and ops runbook
- Validate cost profile and scaling thresholds
- Execute cutover checklist for production enablement

## Risks

- JWT contract mismatch between Authentik and Supabase can block authorization
- DNS/TLS/reverse proxy mistakes can block authentication completely
- Under-sized compute or DB resources can create avoidable instability
- Missing restore validation creates operational risk

## Reference

Detailed execution plan:

- `docs/alternun-identity-infrastructure-execution-plan.md`
