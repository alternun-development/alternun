# SES Migration Module (Supabase Auth SMTP)

This module provisions and validates Amazon SES for Supabase Auth email delivery.
It is designed for public repositories:
- no secrets committed
- local config file ignored
- deterministic script outputs

## Location

`packages/auth/infra/ses`

## What It Automates

1. SES identity bootstrap (domain + sender email)
2. Custom MAIL FROM configuration
3. DNS record export for DKIM + MAIL FROM
4. Optional Route53 UPSERT for those DNS records
5. SES SMTP credential derivation from IAM secret access key
6. Supabase Auth SMTP config update via Supabase Management API
7. Final status/audit report

## Security Model

- Use tracked `config.example.json` as template.
- Create untracked `config.local.json` for business/domain values.
- Secrets are read from environment variables in root `.env` (also untracked).
- Generated secrets are written under `out/`, which is ignored.

## Files

- `config.example.json`: tracked template
- `config.local.json`: local runtime config (ignored)
- `scripts/01-bootstrap-identity.cjs`
- `scripts/02-apply-route53.cjs`
- `scripts/03-generate-smtp-config.cjs`
- `scripts/04-sync-supabase-smtp.cjs`
- `scripts/05-status-report.cjs`

## Required Runtime Inputs

### `config.local.json` (copy from example)

```json
{
  "awsRegion": "us-east-1",
  "domain": "example.com",
  "fromEmail": "no-reply@example.com",
  "senderName": "YOUR_APP",
  "mailFromSubdomain": "mail",
  "route53HostedZoneId": "Z1234567890EXAMPLE",
  "supabaseProjectRef": "your-supabase-project-ref",
  "supabaseSmtpMaxFrequencySeconds": 45
}
```

### Environment variables (`.env`)

Minimum:

```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

Supabase automation:

```bash
SUPABASE_ACCESS_TOKEN=... # personal access token with project config scope
SUPABASE_PROJECT_REF=...  # optional override, can stay in config.local.json
```

Compatibility:
- `AWS_KEY_ID` is also supported (legacy key name).

## IAM Permissions Needed

For SES scripts:
- `ses:GetAccount`
- `ses:CreateEmailIdentity`
- `ses:GetEmailIdentity`
- `ses:PutEmailIdentityMailFromAttributes`

For Route53 automation (`ses:route53`):
- `route53:ChangeResourceRecordSets`
- `route53:ListHostedZonesByName` (optional, only if you extend script)

For Supabase sync:
- Supabase PAT capable of editing auth config for the target project.

## Command Flow

Run from repo root:

```bash
pnpm --filter @alternun/auth ses:bootstrap
pnpm --filter @alternun/auth ses:route53   # optional if using Route53
pnpm --filter @alternun/auth ses:smtp
pnpm --filter @alternun/auth ses:supabase
pnpm --filter @alternun/auth ses:status
```

One-shot (without Route53):

```bash
pnpm --filter @alternun/auth ses:migrate
```

## Outputs

All outputs are written to `packages/auth/infra/ses/out/` (ignored):

- `bootstrap-report.json`
- `route53-report.json`
- `smtp.env.local`
- `supabase-auth-config.local.json`
- `supabase-sync-report.local.json`
- `status-report.json`

## Troubleshooting

### SES auth works but sends fail

Likely causes:
- SES account still in sandbox
- recipient not verified (sandbox limitation)
- identity verification incomplete

Use:

```bash
pnpm --filter @alternun/auth ses:status
```

Check:
- `productionAccessEnabled`
- domain verification and DKIM status

### Supabase update fails

- verify `SUPABASE_ACCESS_TOKEN`
- verify project ref
- confirm API token has permission for project config updates

## Rollback

To rollback SMTP config in Supabase:
- update `Auth > SMTP settings` manually in dashboard
- or rerun `ses:supabase` with alternate config values

This module does not delete identities or DNS records automatically.
