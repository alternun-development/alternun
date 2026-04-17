# Email SMTP Infra (Supabase Auth)

Provider-driven SMTP automation for Supabase Auth.

- default provider: `postmark`
- fallback provider: `ses`
- no secrets committed

## Location

`packages/auth/infra/email`

## What It Does

1. Resolves SMTP credentials from env + local config
2. Generates local SMTP artifacts for audit/debug
3. Updates Supabase Auth SMTP config via Supabase Management API
4. Fetches current SMTP status from Supabase
5. Optionally generates and syncs multilingual Supabase Auth templates from `packages/email-templates`

## Local Config

Copy:

```bash
cp packages/auth/infra/email/config.example.json packages/auth/infra/email/config.local.json
```

If this file is missing, scripts fall back to:

`packages/auth/infra/ses/config.local.json`

## Provider Selection

Set in config:

```json
{ "provider": "postmark" }
```

Or override per command:

```bash
EMAIL_SMTP_PROVIDER=postmark ...
EMAIL_SMTP_PROVIDER=ses ...
```

## Env Variables

Required for Supabase API sync:

- `SUPABASE_ACCESS_TOKEN` (or `SUPABASE_MANAGEMENT_TOKEN`)
- `SUPABASE_PROJECT_REF` (or `supabaseProjectRef` in config)

Optional for multilingual template generation/sync:

- `SUPABASE_EMAIL_TEMPLATE_LOCALES` (default `en,es,th`)
- `SUPABASE_EMAIL_TEMPLATE_FALLBACK_LOCALE` (default `en`)
- `SUPABASE_EMAIL_TEMPLATE_OUTPUT` (output JSON path)
- `SUPABASE_EMAIL_TEMPLATE_PAYLOAD` (input JSON path when syncing)

Common sender fields:

- `EMAIL_FROM` (optional override for `fromEmail`)
- `EMAIL_SENDER_NAME` (optional override for `senderName`)
- `SUPABASE_SMTP_MAX_FREQUENCY` (optional override)

Postmark credentials (any one mode):

1. SMTP token mode:

- `POSTMARK_SMTP_ACCESS_KEY`
- `POSTMARK_SMTP_SECRET_KEY`

2. Explicit username/password mode:

- `POSTMARK_SMTP_USERNAME`
- `POSTMARK_SMTP_PASSWORD`

3. Server token mode:

- `POSTMARK_SERVER_TOKEN` or `POSTMARK_SERVER_API_TOKEN` or `POSTMARK_API_TOKEN`

Optional Postmark host/port:

- `POSTMARK_SMTP_HOST` (default `smtp-broadcasts.postmarkapp.com`)
- `POSTMARK_SMTP_PORT` (default `587`)

SES rollback credentials:

- `AWS_SES_SMTP_ACCESS_KEY_ID` + `AWS_SES_SMTP_PASSWORD`
- or `AWS_SES_SMTP_ACCESS_KEY_ID` + `AWS_SES_SMTP_SECRET_ACCESS_KEY`
- or `AWS_ACCESS_KEY_ID`/`AWS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`
- optional `AWS_REGION` and `AWS_SES_SMTP_HOST`/`AWS_SES_SMTP_PORT`

## Commands

From repo root:

```bash
pnpm --filter @alternun/auth email:generate
pnpm --filter @alternun/auth email:supabase
pnpm --filter @alternun/auth email:status
pnpm --filter @alternun/auth email:apply
```

Generate multilingual auth template payload from locale JSON:

```bash
pnpm --filter @alternun/auth email:templates:generate
```

Generated Supabase auth events:

- `confirmation` (confirm sign up)
- `invite` (invite user)
- `magic_link`
- `email_change` (change email address)
- `recovery` (reset password)
- `reauthentication`

Locale selection uses Supabase Go templates with:

- `{{ .Data.locale }}`

The generator writes conditional blocks per locale with fallback to `en`.

Sync multilingual auth templates to Supabase:

```bash
pnpm --filter @alternun/auth email:templates:supabase
```

Generate + sync multilingual templates:

```bash
pnpm --filter @alternun/auth email:templates:apply
```

Force Postmark:

```bash
pnpm --filter @alternun/auth email:postmark
```

Force SES rollback:

```bash
pnpm --filter @alternun/auth email:ses
```

## Outputs

Generated in `packages/auth/infra/email/out/` (ignored):

- `smtp.env.local`
- `supabase-auth-config.local.json`
- `supabase-sync-report.local.json`
- `supabase-auth-templates.local.json`
- `supabase-template-sync-report.local.json`
- `status-report.json`
