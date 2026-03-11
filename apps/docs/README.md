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
- Local callback: `http://localhost:3000/admin/auth/callback`
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

### GitHub backend note

Decap's GitHub backend requires an OAuth bridge/proxy for authentication on a static site.
That bridge is not created by the Docusaurus app itself. Until the OAuth bridge is configured,
the editor UI works, but write-back should be treated as preview/test only.
