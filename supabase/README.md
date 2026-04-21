# Supabase Configuration

Organized structure for database schema, functions, triggers, and migrations.

## Directory Structure

```
supabase/
├── migrations/          Schema migrations (auto-applied on deploy)
│   ├── YYYYMMDD_NNNN_*.sql
│   └── 20260419_0002_auth_sync_triggers.sql  (applies functions & triggers)
│
├── functions/           Trigger functions & stored procedures (source of truth)
│   ├── sync_auth_user_to_app_users.sql
│   └── user_profiles_handle_auth_user_created.sql
│
├── triggers/            Trigger definitions (source of truth)
│   └── auth_users_sync.sql
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

- [AUTH_SYNC_TRIGGERS.md](../docs/AUTH_SYNC_TRIGGERS.md) - Detailed explanation of auth sync triggers
- [CLAUDE.md](../CLAUDE.md) - Project guidelines
