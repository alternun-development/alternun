# Supabase Configuration

Organized structure for database schema, functions, triggers, and migrations.

## Directory Structure

```
supabase/
├── migrations/          Schema migrations (auto-applied on deploy)
│   ├── YYYYMMDD_NNNN_*.sql
│   ├── 20260422_0003_bidirectional_auth_user_sync.sql  (historical)
│   ├── 20260422_0010_public_users_reuse_existing_auth_identity.sql  (historical)
│   ├── 20260422_0011_backfill_public_users_into_auth_users.sql  (historical)
│   └── 20260422_0013_auth_users_source_of_truth.sql
│
├── functions/           Trigger functions & stored procedures (source of truth)
│   ├── fill_public_users_better_auth_identity.sql  (legacy cleanup script)
│   ├── delete_public_user_auth_user.sql  (legacy cleanup script)
│   ├── sync_auth_user_to_app_users.sql
│   ├── sync_public_user_to_auth_user.sql  (legacy cleanup script)
│   └── user_profiles_handle_auth_user_created.sql
│
├── triggers/            Trigger definitions (source of truth)
│   ├── auth_users_sync.sql
│   ├── public_users_delete.sql  (legacy cleanup script)
│   ├── public_users_fill_better_auth_identity.sql  (legacy cleanup script)
│   └── public_users_sync.sql  (legacy cleanup script)
│
└── README.md           (this file)
```

## Workflow

### 1. Edit Function/Trigger Logic

Edit the source files in `functions/` or `triggers/` folders directly. These are the canonical source.

### 2. Create Migration

When ready to deploy:

- Add entries to migration file in `migrations/` folder
- Migrations are auto-applied in order (by version number)
- Point to source files in header comments

### 3. Deploy

```bash
pnpm run db:migrate
```

## Important Notes

- **migrations/** folder is auto-processed by version (YYYYMMDD prefix)
- **functions/** and **triggers/** are for organization and clarity
- Keep migrations as source of truth for what's deployed
- Always update function source files AND the migration file together
- When a trigger behavior changes in production/dev, update the matching file in
  `triggers/` and the corresponding migration that introduced it

## Common Tasks

### Add new function

1. Create `supabase/functions/my_function_name.sql`
2. Add function definition to migration file
3. Run `pnpm run db:migrate`

### Modify existing function

1. Edit in `supabase/functions/my_function_name.sql`
2. Update migration to use `CREATE OR REPLACE FUNCTION`
3. Run `pnpm run db:migrate`

### View all triggers

```bash
# In database
SELECT trigger_schema, trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema != 'pg_catalog';
```

## Related Documentation

- [AUTH_SYNC_TRIGGERS.md](../docs/AUTH_SYNC_TRIGGERS.md) - Detailed explanation of the bidirectional auth sync triggers
- [CLAUDE.md](../CLAUDE.md) - Project guidelines
