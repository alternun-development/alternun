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

⚠️ **Production migrations require explicit approval:**

```bash
# Set environment variable to approve production migration
APPROVE_PROD_MIGRATION=true pnpm db:migrate:dev

# Or use the wrapper script with --force-prod
./scripts/db-migrate.sh --force-prod
```

### Using the Wrapper Script

```bash
# Run with automatic environment detection
./scripts/db-migrate.sh

# Dry-run on development
./scripts/db-migrate.sh --dry-run

# Force production (after confirming)
./scripts/db-migrate.sh --force-prod
```

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

- ❌ Won't run on production without `APPROVE_PROD_MIGRATION=true`
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
