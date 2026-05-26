# Better Auth Supabase Migration

This guide is historical, but the current repo-safe migration path is still the same:

- preview with `scripts/sync-db-migrations.sh <stage> --dry-run`
- apply one reviewed migration file at a time with `--file`
- use `--force-prod` for production review/apply runs
- do not batch-apply the full queue unless you are doing a deliberate recovery

## Apply Better Auth Tables Migration

### Option 1: Supabase SQL Editor

Use the SQL editor only when you are intentionally applying a single reviewed migration manually.

### Option 2: Supabase CLI

```bash
supabase db push --linked
```

### Option 3: During Deployment

Prefer the stage-aware wrapper:

```bash
bash scripts/sync-db-migrations.sh dev --dry-run
bash scripts/sync-db-migrations.sh production --dry-run

bash scripts/sync-db-migrations.sh production \
  --file supabase/migrations/20260424_0001_better_auth_id_defaults.sql \
  --force-prod
```

## Verification

After migration is applied, the Better Auth tables will persist:

- user accounts
- OAuth sessions and tokens
- email verification codes

Sessions no longer disappear on API restart.
