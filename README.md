<p align="center">
  <img src="packages/ui/src/public/alternun-black.svg" alt="Alternun" width="320" />
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/alternun-development/alternun/actions"><img src="https://github.com/alternun-development/alternun/workflows/CI/badge.svg" alt="Build Status" /></a>
  <a href="https://codecov.io/gh/alternun-development/alternun"><img src="https://codecov.io/gh/alternun-development/alternun/branch/master/graph/badge.svg" alt="codecov" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" alt="TypeScript" /></a>
  <a href="https://turbo.build/"><img src="https://img.shields.io/badge/Turbo-2.x-ff6d00.svg" alt="Turbo" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-22.20.0+-green.svg" alt="Node.js" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
</p>

<p align="center">
  <strong>#ReDeFine the future with sustainable technology and innovation</strong>
</p>

---

Alternun is a Turborepo monorepo containing all platform surfaces and shared packages. TypeScript throughout. Auth is handled through the Alternun auth facade, with Better Auth as the execution layer, Authentik as the canonical issuer, and Supabase as the data/compatibility layer. Deployed on AWS.

## Repo Structure

```
alternun/
├── apps/
│   ├── api/          # NestJS + Fastify backend (@alternun/api)
│   ├── admin/        # Internal admin console (@alternun/admin)
│   ├── mobile/       # Expo / React Native — AIRS client
│   ├── web/          # Next.js secondary web surface
│   └── docs/         # Docusaurus public documentation
└── packages/
    ├── ui/           # Cross-platform React components
    ├── auth/         # Auth facade and Alternun auth helpers (@edcalderon/auth)
    ├── infra/        # AWS CDK deploy + pipeline scripts (@alternun/infra)
    ├── i18n/         # Shared translations
    ├── email-templates/
    └── update/       # Shared release-update worker
```

## Tech Stack

| Layer       | Technology                                         |
| ----------- | -------------------------------------------------- |
| Language    | TypeScript 5.0+                                    |
| Build       | Turborepo 2.x, pnpm 9+                             |
| Backend     | NestJS + Fastify, OpenAPI                          |
| Web / Admin | Next.js (App Router)                               |
| Mobile      | Expo / React Native                                |
| Docs        | Docusaurus 3.5+                                    |
| Auth        | Better Auth execution + Authentik issuer           |
| Data        | Supabase (PostgreSQL + RLS)                        |
| Infra       | AWS (CDK, CodePipeline, EC2, SSM, Secrets Manager) |
| Styling     | Tailwind CSS                                       |

## Quick Start

**Prerequisites:** Node.js ≥ 22.20.0, pnpm ≥ 9.0.0

```bash
git clone https://github.com/alternun-development/alternun.git
cd alternun
pnpm install
pnpm dev:all        # starts api, admin, mobile, docs concurrently
```

### Common Commands

```bash
pnpm lint           # lint all packages
pnpm type-check     # TypeScript across monorepo
pnpm test           # run all tests
pnpm test:coverage  # run coverage-producing tests for Codecov uploads
pnpm build          # full production build

# Targeted (prefer before root commands)
pnpm --filter @alternun/api run dev
pnpm --filter @alternun/admin run dev:local
pnpm --filter @alternun/mobile run web:local
```

### Validation Order (smallest first)

1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`

## Git Workflow

**Branch flow:** `feature/*` → `develop` → `master`

- PRs normally target `develop` (except hotfixes and release promotion PRs)
- `master` is the production branch
- While `ALTERNUN_TESTNET_MODE=on`, every push to `master` is mirrored into `develop` automatically via GitHub Actions

## Version Management

Versioning is handled by `@edcalderon/versioning`. Never edit `version` fields in `package.json`, `version.development.json`, `version.production.json`, `apps/mobile/app.json`, or `CHANGELOG.md` manually.
`version.development.json` and `version.production.json` are structured release manifests with `version`, `build`, `lastUpdated`, `environment`, `lastDeployment`, and `deploymentHistory`.
Development branches write `version.development.json`.
Promotion writes the production branch version into `package.json` and `version.production.json`.
Production branches mirror `package.json` into `version.production.json`.
Workspace package versions stay on the semantic base version; the branch-aware build number lives in the manifest files.

```bash
pnpm version:validate     # validate version sync across monorepo
pnpm version:sync         # sync versions across workspace
pnpm readme:check         # validate the root README version, latest changes, and support email
pnpm readme:update        # sync the root README from the current changelog and release version
pnpm release              # build release on current branch
pnpm release patch        # branch-aware release bump, regenerate changelog, stage-aware build, tag, push
pnpm release:patch:promote # promote current release to production without a new semantic bump
pnpm version:check-secrets # scan staged files for secrets
```

The root README is kept aligned with the current release state by the local README maintenance hook. `pnpm version:validate` now includes the README guard, and the release flow refreshes the version line, latest changes block, and support contact automatically.
The CI test job now generates `apps/mobile/coverage/lcov.info` and uploads it to Codecov.

Current version: **1.1.2**

## 📋 Latest Changes (v1.1.2)

### Bug Fixes

* **ui:** move profile tab pills below title, fix ATN/RBI card overlap on small screens ([f849d3e](https://github.com/alternun-development/alternun/commit/f849d3e99dc227e4dd5022bac2cd514b5a044bfd))
* **wallet:** card UI + routing fix + vault detection + PIN change flow ([e74c06d](https://github.com/alternun-development/alternun/commit/e74c06d4ccce6db0523461836da3e4fc6e9984ae))
* **wallet:** eliminate layout gap in manage wallets screen ([9db2fbc](https://github.com/alternun-development/alternun/commit/9db2fbc2ecdc4a75b1bc6b5f6961c72fb069db6d))
* **wallet:** MetaMask body error, PIN false-positive, progressive image loading ([671cc4e](https://github.com/alternun-development/alternun/commit/671cc4e9d5e81aa55c98687d6ccfed8fe802c6a7))
* **wallet:** remove flex:1 from title style causing layout gap ([9311109](https://github.com/alternun-development/alternun/commit/931110979d07c9f1ae0d909746a8cfdeed0b3795))
* **wallet:** resolve 2 high-severity CodeQL alerts in packages/wallet ([5c6aaeb](https://github.com/alternun-development/alternun/commit/5c6aaeb234086c49f4c4a9b12a7fe898fc0b9fdc)), closes [#62](https://github.com/alternun-development/alternun/issues/62) [#61](https://github.com/alternun-development/alternun/issues/61)


### Features

* **i18n:** add missing wallet.changePin and addAccount.noVault translations to es/th ([630036c](https://github.com/alternun-development/alternun/commit/630036c790bc5e7233ff8348b04bdb1180bd73ea))
* **wallet:** full wallet management — add/delete/import + MetaMask linking + layout fix ([592f737](https://github.com/alternun-development/alternun/commit/592f737ac3234efcc1f4e83ad0cf2f57c3f4a95f))

For full version history, see [CHANGELOG.md](./CHANGELOG.md) and [GitHub releases](https://github.com/alternun-development/alternun/releases)

## Security

- `.env.*` files are never committed — use AWS Secrets Manager in prod
- Pre-commit hooks run staged secret checks (`pnpm version:check-secrets`)
- CI is PR-based; Secret Scan runs Gitleaks on push/PR to `develop` and `master`
- Auth: Authentik OIDC — never bypass or mock in integration paths
- Input validation at API boundary only

## Documentation

- Public architecture: [`apps/docs/docs/Architecture/`](apps/docs/docs/Architecture/)
- Internal ops: [`docs/`](docs/)
- API blueprint: [`docs/alternun_nestjs_fastify_openapi_blueprint.md`](docs/alternun_nestjs_fastify_openapi_blueprint.md)
- Contribution workflow: [`docs/contribution-workflow.md`](docs/contribution-workflow.md)
- Public docs site: [alternun-development.github.io](https://alternun-development.github.io)

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a PR.

## Support

- [GitHub Issues](https://github.com/alternun-development/alternun/issues)
- [GitHub Discussions](https://github.com/alternun-development/alternun/discussions)
- [Discord](https://discord.gg/DQmQbzcbER)
- support@alternun.co

## License

[MIT](LICENSE) © 2026 Alternun, Inc.
