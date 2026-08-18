# Email SMTP Infra (Supabase Auth)

Provider-driven SMTP automation for Supabase Auth.

- default provider: `tlao`
- optional fallback provider: `postmark`
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

## Provider Selection

Set in config:

```json
{
  "provider": "tlao",
  "fallbackProviders": ["postmark"]
}
```

Or override per command:

```bash
EMAIL_SMTP_PROVIDER=tlao ...
EMAIL_SMTP_PROVIDER=postmark ...
```

## Env Variables

Required for Supabase API sync:

- `SUPABASE_ACCESS_TOKEN` (or `SUPABASE_MANAGEMENT_TOKEN`)
- `SUPABASE_ENVIRONMENT` (or `supabaseEnvironment` in config): `development` or `production`

### Environment mapping and drift protection

| Environment           | Supabase project ref   | Auth/site URL                      |
| --------------------- | ---------------------- | ---------------------------------- |
| Development (testnet) | `aznfyazjndfniwsocdka` | `https://testnet.airs.alternun.co` |
| Production            | `rjebeugdvwbjpaktrrbx` | `https://airs.alternun.co`         |

Email sync commands require `SUPABASE_ENVIRONMENT`. The scripts resolve the
project ref from this mapping and reject a conflicting `SUPABASE_PROJECT_REF`.
This prevents a stale local value from applying production SMTP or templates to
development, or the reverse.

For example:

```bash
SUPABASE_ENVIRONMENT=development pnpm --filter @alternun/auth email:apply
SUPABASE_ENVIRONMENT=production pnpm --filter @alternun/auth email:apply
```

### Production management-token rotation

`DATABASE_PERSONAL_ACCESS_TOKEN_PROD` is the production secret used to supply
the Supabase Management API token to these commands. It was created without an
expiry on 2026-08-18 as a temporary operational exception. Never commit it or
substitute a database/service key for it.

The next security iteration must move this token to a finite-lifetime rotation
policy: assign an owner, use the production secret-injection path, replace it
on a defined cadence (recommended: every 90 days or sooner), and run
`email:status` after each rotation. Record the rotation date and replacement
owner in the operational change record; do not record the token value.

Optional for multilingual template generation/sync:

- `SUPABASE_EMAIL_TEMPLATE_LOCALES` (default `en,es,th`)
- `SUPABASE_EMAIL_TEMPLATE_FALLBACK_LOCALE` (default `en`)
- `SUPABASE_EMAIL_TEMPLATE_OUTPUT` (output JSON path)
- `SUPABASE_EMAIL_TEMPLATE_PAYLOAD` (input JSON path when syncing)

Common sender fields:

- `EMAIL_FROM` (optional override for `fromEmail`)
- `EMAIL_SENDER_NAME` (optional override for `senderName`)
- `SUPABASE_SMTP_MAX_FREQUENCY` (optional override)
- `EMAIL_SMTP_PROVIDER` (override the selected provider)
- `EMAIL_SMTP_FALLBACK_PROVIDERS` (comma-separated ordered fallback providers)

Tláo SMTP credentials:

- `TLAO_SMTP_HOST` (default `mail.xn--tlo-fla.com`)
- `TLAO_SMTP_PORT` (default `587`)
- `TLAO_SMTP_USERNAME`
- `TLAO_SMTP_PASSWORD`

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

Apply the Tláo configuration to Supabase:

```bash
SUPABASE_ENVIRONMENT=production pnpm --filter @alternun/auth email:tlao
```

Switch Supabase to the configured Postmark fallback:

```bash
SUPABASE_ENVIRONMENT=production pnpm --filter @alternun/auth email:postmark
```

## Fallback behavior

The provider chain automatically picks the first provider with valid local
configuration when generating or applying Supabase SMTP settings. Supabase Auth
itself supports one active SMTP server, so it cannot retry an individual
confirmation email through a second provider. If delivery begins failing after a
provider has been applied, switch the active configuration with `email:tlao` or
`email:postmark` after investigating the provider error.

## Outputs

Generated in `packages/auth/infra/email/out/` (ignored):

- `smtp.env.local`
- `supabase-auth-config.local.json`
- `supabase-sync-report.local.json`
- `supabase-auth-templates.local.json`
- `supabase-template-sync-report.local.json`
- `status-report.json`
