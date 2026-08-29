# Local Authentik development

This Compose project is an isolated, disposable Authentik instance for local integration testing. It never shares a database, secret, hostname, OAuth client, or user data with production.

## Start

```bash
cd packages/infra/dev/authentik
cd ../..
pnpm authentik:dev:init
pnpm authentik:dev:up
```

`authentik:dev:init` generates a `.env` with unique local-only secrets and refuses
to overwrite it. Remove the file only when you intentionally want a fresh local
environment.

Open `http://127.0.0.1:9000/if/flow/initial-setup/` to initialize the local instance. Create a local-only OAuth/OIDC application with the slug and client ID `alternun-admin-dev`, then configure these exact redirect URIs:

```text
http://127.0.0.1:5173/auth/callback
http://127.0.0.1:5173/login
```

Set the local Admin environment to:

```text
VITE_AUTH_ISSUER=http://127.0.0.1:9000/application/o/alternun-admin-dev/
VITE_AUTH_CLIENT_ID=alternun-admin-dev
```

Assign each test user to `Alternun Dashboard Admins` before signing in. The
admin app accepts Authentik roles/groups only; an email address or domain does
not grant access.

Use only local test users and credentials. To remove all local Authentik data, run `pnpm authentik:dev:down` from `packages/infra`; this deletes the disposable development database volume.
