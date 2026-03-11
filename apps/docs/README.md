# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

### Installation

```
$ yarn
```

### Local Development

```
$ yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

Using SSH:

```
$ USE_SSH=true yarn deploy
```

Not using SSH:

```
$ GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

## Decap CMS

The docs editor is exposed at `/admin` and is protected by Authentik before Decap loads.

- Auth client: `alternun-docs-cms`
- Expected callback: `https://docs.alternun.io/admin/auth/callback`
- Local callback: `http://127.0.0.1:8083/admin/auth/callback`
- Allowed groups:
  - `authentik Admins`
  - `Alternun Dashboard Admins`
  - `Alternun Docs Editors`

### Build-time configuration

The Docusaurus build reads these optional environment variables:

- `DOCS_CMS_AUTH_ISSUER`
- `DOCS_CMS_AUTH_CLIENT_ID`
- `DOCS_CMS_AUTH_AUDIENCE`
- `DOCS_CMS_ALLOWED_GROUPS`
- `DOCS_CMS_GITHUB_REPO`
- `DOCS_CMS_GITHUB_BRANCH`
- `DOCS_CMS_GITHUB_OAUTH_BASE_URL`
- `DOCS_CMS_GITHUB_AUTH_ENDPOINT`

If `DOCS_CMS_GITHUB_OAUTH_BASE_URL` is not provided, the editor falls back to Decap's
`test-repo` backend so the UI can still be exercised safely.

Recommended production values:

```env
DOCS_CMS_GITHUB_REPO=alternun-development/alternun
DOCS_CMS_GITHUB_BRANCH=master
DOCS_CMS_GITHUB_OAUTH_BASE_URL=https://api.alternun.co
DOCS_CMS_GITHUB_AUTH_ENDPOINT=decap/auth
```

Temporary fallback when production API is not available:

```env
DOCS_CMS_USE_TESTNET_API_FALLBACK=true
DOCS_CMS_GITHUB_TESTNET_API_BASE_URL=https://testnet.api.alternun.co
```

### GitHub backend note

Decap's GitHub backend requires an OAuth bridge/proxy for authentication on a static site.
That bridge is now expected to be served by `apps/api` at:

- `GET /decap/auth`
- `GET /decap/callback`

GitHub OAuth App callback URLs must point at the API bridge, not the docs site itself. For
production, use:

- `https://api.alternun.co/decap/callback`

For local development, use:

- `http://127.0.0.1:8082/decap/callback`
