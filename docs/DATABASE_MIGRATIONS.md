# Database Migrations

This guide explains how to manage database migrations in Alternun using the automated migration system.

## Quick Start

### Development Database

```bash
# Run pending migrations on development database
pnpm db:migrate:dev

# Preview what would be applied (dry-run)
pnpm db:migrate:dry-run
```

### Production Database

⚠️ **Production backend migrations require explicit approval:**

```bash
# Preview the pending production migrations against the backend DATABASE_URL secret
bash scripts/sync-db-migrations.sh production --dry-run

# Apply one migration at a time after reviewing the preview
bash scripts/sync-db-migrations.sh production --file supabase/migrations/20260424_0002_better_auth_user_identity_defaults.sql --force-prod
```

Current production state:

- the live backend database is now up to date with the repo migration history; the June 29 AIRS eligible-user count
  and wallet schema migrations were applied after previewing the production queue one migration at a time
- the safe repair path starts with the Better Auth fixes in `20260424_0001`, `20260424_0002`, and `20260424_0003`
- do **not** batch-apply the whole pending queue unless you are intentionally performing a recovery exercise and have reviewed every file

### Using the Wrapper Script

```bash
# Run with automatic environment detection
./scripts/db-migrate.sh

# Dry-run on development
./scripts/db-migrate.sh --dry-run

# Stage-aware sync wrapper (preferred for dev/testnet/prod promotion)
bash scripts/sync-db-migrations.sh dev --dry-run
bash scripts/sync-db-migrations.sh production --file supabase/migrations/20260424_0002_better_auth_user_identity_defaults.sql --force-prod
```

## Stage Promotion

The repo migrations are the source of truth. Do not copy schemas directly from
development to production.

Use the stage-aware wrapper when you need to reconcile a stage database with
the current `supabase/migrations/` history. It resolves the stage-scoped
backend `DATABASE_URL` secret and applies migrations one by one:

```bash
# Dry-run the next migrations for development/testnet
bash scripts/sync-db-migrations.sh dev --dry-run

# Dry-run the next migrations for production
bash scripts/sync-db-migrations.sh production --dry-run

# Apply a single production migration after review
bash scripts/sync-db-migrations.sh production --file supabase/migrations/20260424_0002_better_auth_user_identity_defaults.sql --force-prod

# Legacy full-queue apply path, only when you explicitly want the entire backlog
bash scripts/sync-db-migrations.sh production --all --force-prod
```

`pnpm db:migrate` remains available when you already have the correct
`MIGRATION_DATABASE_URL` or `INFRA_BACKEND_API_DATABASE_URL` in your shell. For
promotion work, prefer the wrapper above because it resolves the stage-specific
backend database secret before running the repo migration chain.

If you are repairing the current live auth issue, prefer the one-by-one flow:

1. preview with `bash scripts/sync-db-migrations.sh production --dry-run`
2. apply only the next safe repair file with `--file`
3. re-run the preview before touching the next migration

## How It Works

### Migration Tracking

Migrations are tracked in the `_migrations` table in your database:

```sql
CREATE TABLE _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  version VARCHAR(50) UNIQUE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Automatic Detection

The system automatically detects:

1. **Environment** (dev/prod) based on database hostname and env vars
2. **Applied migrations** from the `_migrations` table
3. **Pending migrations** by comparing available files to applied ones
4. **Skipped migrations** (see `skippedMigrationVersions` in apply-migrations.ts)

### Migration Naming

Migrations must follow this naming convention:

```
supabase/migrations/YYYYMMDD_NNNN_description.sql
```

Examples:

- `20260426_0001_create_user_achievements.sql`
- `20260417_0006_create_airs_accumulation.sql`

## Creating a New Migration

### 1. Create the migration file

```bash
touch supabase/migrations/20260430_0001_my_feature.sql
```

### 2. Write your SQL

```sql
-- Description of what this migration does
-- Reason: Brief explanation of why

CREATE TABLE my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_my_table_user_id ON my_table(user_id);
```

### 3. Test it

```bash
# Preview the migration
pnpm db:migrate:dry-run

# Apply to development
pnpm db:migrate:dev

# Verify it worked
psql $DATABASE_URL_DEV -c "SELECT * FROM my_table;"
```

### 4. Commit

```bash
git add supabase/migrations/20260430_0001_my_feature.sql
git commit -m "feat(db): add my_feature table"
```

## Environment Detection

The system detects the environment based on:

1. **Database hostname** - Production uses different Supabase project
2. **Environment variables**:
   - `INFRA_BACKEND_API_DATABASE_URL` → Uses this if set
   - `DATABASE_URL_DEV` → Development
   - `DATABASE_URL_PROD` → Production
   - `DATABASE_URL` → Falls back

### How to Tell Which Environment

```bash
# Check which database URL is being used
pnpm db:migrate --dry-run
# Output will show: 🟢 Development or 🔴 PRODUCTION
```

## Safety Features

### Production Checks

- ❌ Won't run a production apply without `APPROVE_PROD_MIGRATION=true` or `--force-prod`
- ✅ Prevents accidental production changes
- 🔐 Requires explicit opt-in

### Migration Validation

- ✅ Validates filename format
- ✅ Prevents duplicate migrations
- ✅ Skips known problematic migrations
- ✅ Tracks execution with timestamps

### Idempotent Operations

Use `IF NOT EXISTS` / `IF NOT FOUND` to make migrations safely re-runnable:

```sql
-- Good (safe for reruns)
CREATE TABLE IF NOT EXISTS my_table (...)
CREATE INDEX IF NOT EXISTS my_index ON ...
DROP TABLE IF EXISTS old_table;

-- Avoid (fails on rerun)
CREATE TABLE my_table (...)
DROP TABLE old_table;
```

## Troubleshooting

### Migration fails with "permission denied"

```
ERROR: permission denied for schema public
```

**Solution**: Ensure the database user has proper permissions. On Supabase, use the service role key.

### "User X not found" error

```
ERROR: User ... not found
```

**Solution**: The function is expecting UUID format. Check the user_id being passed.

### Column reference ambiguous

```
ERROR: column reference "X" is ambiguous
```

**Solution**: Use table aliases in subqueries:

```sql
-- ❌ Wrong
SELECT column FROM table WHERE id = ...

-- ✅ Correct
SELECT t.column FROM public.table t WHERE t.id = ...
```

## Related

- [Supabase README](../supabase/README.md) - Migration file organization
- [Auth sync triggers](../docs/AUTH_SYNC_TRIGGERS.md) - Example complex migrations
