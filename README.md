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
pnpm dev:all        # starts local Authentik, api, admin, mobile, and docs
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

Routine production releases must use `pnpm release:patch` followed by `pnpm release:patch:promote`; the promotion command creates the guarded `develop` → `master` PR. Do not open a manual production PR unless a maintainer has explicitly authorized that exception. The complete policy is in [docs/release-promotion-process.md](docs/release-promotion-process.md).

The root README is kept aligned with the current release state by the local README maintenance hook. `pnpm version:validate` now includes the README guard, and the release flow refreshes the version line, latest changes block, and support contact automatically.
The CI test job now generates `apps/mobile/coverage/lcov.info` and uploads it to Codecov.

Current version: **1.1.109**

## 📋 Latest Changes (v1.1.109)

### Bug Fixes

- **airs-reports:** require a document number on every report ([ac0029c](https://github.com/alternun-development/alternun/commit/ac0029cc6dfc7ac8f4e34d084c1f3031096a3a60))
- **airs-reports:** never auto-approve a report to the submitter ([be8d215](https://github.com/alternun-development/alternun/commit/be8d2153e8bdd81f928b5cdabe397c5622c87abc))
- **marketplace:** allow image hosts for project logo, cover and gallery ([20594cc](https://github.com/alternun-development/alternun/commit/20594cce5b49e25179bb16bfa062feb24f422457))

### Changes

- **reentry:** note the User Airs Report next steps ([7d1be85](https://github.com/alternun-development/alternun/commit/7d1be85f8e912dc006ec0549bb9c6cf65f985c53))
- **airs-reports:** cover the User Airs Report cut (B15) ([8ffbb44](https://github.com/alternun-development/alternun/commit/8ffbb4462b4cb747d1403f4fcd94f51bda4cdf63))
- **reentry:** note marketplace media hosts follow-up ([d765fff](https://github.com/alternun-development/alternun/commit/d765fffc10ef98dcf43a62d302e84a29df845c51))

### Features

- **api:** add the User Airs Report admin endpoints ([8c07a96](https://github.com/alternun-development/alternun/commit/8c07a9685e668f90fbca5780613accac96579190))
- **db:** add the User Airs Report transition functions ([1973689](https://github.com/alternun-development/alternun/commit/1973689bc6963a3fd1adeb5f81cc7b63cdc1d7b9))
- **db:** add the airs_reports schema ([ad2cb5b](https://github.com/alternun-development/alternun/commit/ad2cb5b5e9920cb28b4acfce4de2fd1c580bd18d))
- **api:** add the User Airs Report API contract ([0cd5600](https://github.com/alternun-development/alternun/commit/0cd5600ba5f85133a75d5fdba52d1d31aecd22f9))

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
- Public docs site: [docs.alternun.io](https://docs.alternun.io)

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a PR.

## Support

- [GitHub Issues](https://github.com/alternun-development/alternun/issues)
- [GitHub Discussions](https://github.com/alternun-development/alternun/discussions)
- [Discord](https://discord.gg/DQmQbzcbER)
- support@alternun.co

## License

[MIT](LICENSE) © 2026 Alternun, Inc.
