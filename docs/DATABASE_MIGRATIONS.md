# Database Migrations Guide

Automated, version-tracked database migrations for Supabase PostgreSQL.

## Overview

- **Automatic Discovery**: Scans `supabase/migrations/` for `.sql` files
- **Version Tracking**: `_migrations` table tracks applied migrations
- **Idempotent**: Can be run multiple times safely
- **Scalable**: Add new migrations without code changes
- **Deployment-Ready**: Runs on Lambda cold start or manually

## File Format

Migrations must follow the naming convention:

```
YYYYMMDD_NNNN_description.sql
```

**Examples:**

- `20260417_0001_create_better_auth_tables.sql`
- `20260418_0002_add_user_profiles.sql`
- `20260420_0003_create_audit_logs.sql`

**Components:**

- `YYYYMMDD` - Date migration was created (sortable)
- `NNNN` - Sequence number (0001, 0002, etc.)
- `description` - Human-readable name (snake_case)

## Running Migrations

### During Development

```bash
# Run all pending migrations
pnpm --filter @alternun/api run db:migrate

# Output shows:
# ✅ Connected to database
# 📋 Creating _migrations tracking table...
# 📦 Found 2 pending migration(s)
# 🔄 Running migration: 20260417_0001_create_better_auth_tables
# ✅ Applied: 20260417_0001_create_better_auth_tables
# ✨ All migrations completed successfully!
```

### During Deployment (AWS Lambda)

The API can automatically run migrations on cold start. Update `src/main.ts`:

```typescript
import { initMigrations } from '../scripts/run-migrations-lambda';

async function main(): Promise<void> {
  // Run pending migrations before starting API
  await initMigrations();

  const app = await createApp();
  // ... rest of startup
}

main();
```

### Manual Deployment

```bash
# Compiled version (after build)
pnpm --filter @alternun/api run db:migrate:compiled

# Or with environment variable
DATABASE_URL="postgresql://..." pnpm --filter @alternun/api run db:migrate
```

## Adding New Migrations

1. **Create SQL File**

```bash
# Naming: YYYYMMDD_NNNN_description.sql
touch supabase/migrations/20260420_0003_create_audit_logs.sql
```

2. **Write SQL**

```sql
-- Make tables with IF NOT EXISTS for safety
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
```

3. **Test Locally**

```bash
pnpm --filter @alternun/api run db:migrate
```

4. **Commit & Deploy**

```bash
git add supabase/migrations/20260420_*.sql
git commit -m "migration: add audit logs table"

# Deploy will automatically apply migration
bash scripts/setup-aws-account.sh && APPROVE=true STACK=dev packages/infra/scripts/sst-deploy.sh
```

## Migration Tracking Table

The `_migrations` table tracks all applied migrations:

```sql
CREATE TABLE _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,    -- "add_audit_logs"
  version VARCHAR(50) UNIQUE NOT NULL,  -- "20260420_0003"
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Query applied migrations:**

```sql
SELECT * FROM _migrations ORDER BY version DESC;
```

## Best Practices

### ✅ Do

- **Use `IF NOT EXISTS`** for all CREATE TABLE/INDEX statements
- **Name migrations clearly** - describe what they do
- **Keep migrations simple** - one feature per migration
- **Use CASCADE deletes** for foreign keys when appropriate
- **Add indexes** for frequently queried columns
- **Sort migrations by date** - filename ordering ensures execution order

### ❌ Don't

- **Don't delete old migrations** - they're part of your schema history
- **Don't use transactions** - Supabase handles this per query
- **Don't rename columns mid-migration** - create new, migrate data, drop old
- **Don't assume production schema** - always check and create if needed

## Troubleshooting

### "Table already exists" error

This is safe - the migration runner handles idempotent migrations:

```sql
-- ✅ Safe, won't error if table exists
CREATE TABLE IF NOT EXISTS users (...);

-- ❌ Will fail on re-run
CREATE TABLE users (...);
```

### "Migration failed: connect ENETUNREACH"

Local development can't reach Supabase database due to network restrictions. Use:

- Supabase dashboard SQL editor for manual testing
- Deploy to Lambda for automatic migration
- Use connection pooler if deploying from CI/CD

### Check migration status

```bash
# Connect to Supabase and query:
SELECT version, name, executed_at FROM _migrations ORDER BY version;
```

## Example Migrations

### Better Auth Schema

```sql
-- File: 20260417_0001_create_better_auth_tables.sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT NOT NULL PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Adding User Profiles

```sql
-- File: 20260420_0002_create_user_profiles.sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);
```

## Deployment Checklist

Before deploying migrations:

- [ ] Migration files added to `supabase/migrations/`
- [ ] Filenames follow `YYYYMMDD_NNNN_description.sql` format
- [ ] SQL uses `IF NOT EXISTS` for safety
- [ ] Tested locally with `pnpm run db:migrate`
- [ ] Committed to `develop` branch
- [ ] Ready for deployment to testnet/production
