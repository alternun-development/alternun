# Alternun Identity Infrastructure Execution Plan

## Objective

Deploy a lean production-ready identity stack for Alternun using:

- Authentik as the identity provider
- Supabase as the application data and authorization layer
- AWS EC2 + RDS PostgreSQL as the infrastructure layer for Authentik

The target outcome is a low-cost, portable, infrastructure-as-code-managed deployment with clear operational ownership.

## Success Criteria

- Authentik is deployed on AWS EC2 behind HTTPS and is reachable through the chosen identity domain.
- Authentik uses a dedicated AWS RDS PostgreSQL database.
- Supabase accepts and validates Authentik-issued JWTs for application authorization.
- JWT claims are mapped to Supabase/Postgres RLS requirements.
- Secrets, DNS, TLS, backups, and recovery procedures are documented and reproducible.
- Monthly infrastructure cost remains within the expected lean target band.

## Constraints

- Keep production cost close to the original target of roughly $30/month.
- Avoid coupling Supabase directly to the Authentik database.
- Keep deployment reproducible through infrastructure as code and repeatable scripts.
- Minimize operational overhead for the first production version.

## Phase 1: Architecture Finalization

### Tasks

- Confirm the production identity domain and DNS ownership model.
- Define the JWT trust contract between Authentik and Supabase.
- Decide required claims, roles, and token lifetime strategy.
- Confirm whether Traefik remains the production reverse proxy or if AWS-native ingress should replace it.
- Decide whether SES will be used for Authentik transactional email from day one.
- Define backup, restore, and patching expectations for the initial production release.

### Exit Criteria

- Auth domain, TLS strategy, and DNS ownership are documented.
- JWT issuer, audience, signing, and claims contract are documented.
- Open design decisions are closed or explicitly deferred.

## Phase 2: Infrastructure as Code

### Tasks

- Add or extend IaC for the Authentik EC2 instance.
- Add or extend IaC for the dedicated RDS PostgreSQL instance.
- Create security groups restricting PostgreSQL access to the Authentik host only.
- Provision EBS and RDS storage with the agreed gp3 configuration.
- Configure DNS records for the Authentik domain.
- Provision TLS certificate handling for the identity endpoint.
- Define IAM roles and instance permissions for logging, secrets retrieval, and operational access.
- Define secrets storage for database credentials, Authentik secret key, SMTP credentials, and JWT signing material.

### Exit Criteria

- Infrastructure can be created from code in a clean AWS account/project context.
- Authentik EC2, RDS, security groups, DNS, and certificate resources are declared and reviewable.
- Secrets are not hardcoded anywhere in the repo or deploy scripts.

## Phase 3: Authentik Runtime Deployment

### Tasks

- Create the Authentik Docker runtime configuration for server and worker services.
- Configure Traefik or the chosen ingress layer for HTTPS termination and routing.
- Wire Authentik to the RDS PostgreSQL database.
- Configure persistent volumes, environment variables, and health checks.
- Add service management so the stack survives host restarts.
- Define log locations and log shipping behavior.

### Exit Criteria

- Authentik server and worker start cleanly on the EC2 instance.
- Login page and admin access are available through the production hostname.
- Services recover correctly after a restart.

## Phase 4: Supabase Integration

### Tasks

- Configure Supabase to trust Authentik-issued JWTs.
- Map Authentik claims to the application authorization model.
- Validate issuer, audience, signing algorithm, and key rotation path.
- Add or update application-side auth configuration for web, mobile, and backend consumers as needed.
- Create a minimal end-to-end auth test flow covering login, token issuance, and Supabase access.

### Exit Criteria

- A valid Authentik token can be used against Supabase successfully.
- RLS policies can consume the expected claims.
- Invalid or malformed tokens are rejected as expected.

## Phase 5: Operations and Security Hardening

### Tasks

- Configure RDS automated backups and confirm retention.
- Document a restore procedure and test it at least once.
- Define monitoring, alerting, and log review expectations.
- Document OS patching and Authentik upgrade procedures.
- Restrict inbound EC2 access to required ports and trusted operator sources.
- Review least-privilege IAM permissions for runtime and operators.
- Verify database isolation from Supabase and external systems.

### Exit Criteria

- Backup and restore procedure is documented and validated.
- Basic operational runbook exists for restart, upgrade, and incident response.
- Security review items for networking, secrets, and admin access are closed.

## Phase 6: Cost and Performance Validation

### Tasks

- Measure idle and normal-load memory/CPU utilization on EC2.
- Measure baseline Authentik database load on RDS.
- Validate that Performance Insights and Enhanced Monitoring remain disabled unless justified.
- Review actual monthly forecast after deployment.
- Record the upgrade path to `db.t4g.small` if growth requires it.

### Exit Criteria

- Actual cost forecast is documented.
- Resource utilization confirms that the selected instance sizes are sufficient.
- Scaling triggers are defined for CPU, memory, auth latency, and DB pressure.

## Phase 7: Cutover and Acceptance

### Tasks

- Define the cutover sequence for enabling Authentik as the production identity provider.
- Prepare rollback steps if login or token validation fails.
- Verify web and mobile authentication flows after cutover.
- Verify admin access, audit visibility, email delivery, and token-based Supabase access.
- Capture post-cutover issues and operational follow-ups.

### Exit Criteria

- Production cutover is completed or rehearsed with a validated rollback path.
- Core user authentication flows are confirmed working.
- Remaining follow-ups are tracked separately and prioritized.

## Task Board Seed

Use these as the initial trackable tasks:

- Finalize identity domain, TLS, and DNS ownership
- Define Authentik to Supabase JWT contract
- Provision Authentik EC2 infrastructure in IaC
- Provision dedicated Authentik RDS PostgreSQL in IaC
- Configure Authentik runtime and reverse proxy
- Configure secrets management and operator access
- Integrate Supabase JWT validation with Authentik issuer
- Validate RLS claims mapping end to end
- Implement backups, restore test, and ops runbook
- Validate cost profile and define scaling thresholds
- Execute production cutover checklist

## Dependencies

- AWS account and DNS control for the chosen identity domain
- Supabase configuration access for JWT validation settings
- A decision on email delivery provider for Authentik notifications
- Existing application role model and RLS expectations

## Risks

- JWT contract mismatch between Authentik and Supabase can block authorization.
- Certificate, DNS, or reverse proxy misconfiguration can block auth flows.
- Under-sizing the EC2 or RDS instance can create avoidable instability.
- Missing backup and restore validation creates operational risk.
- Over-customizing the first deployment can increase complexity beyond the lean target.
