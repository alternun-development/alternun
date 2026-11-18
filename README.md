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

Current version: **1.2.8**

## 📋 Latest Changes (v1.2.8)

### Bug Fixes

- **airs-reports:** approvers read proof files only while the report is in review ([e204e1f](https://github.com/alternun-development/alternun/commit/e204e1fc7627caa18f8c67c04768412f2f9fb7d4)), closes [#315](https://github.com/alternun-development/alternun/issues/315)
- **airs:** self-assigned Airs always need another admin ([d19392e](https://github.com/alternun-development/alternun/commit/d19392e1c083cafb60ec960b539d8af274d51ff3)), closes [#315](https://github.com/alternun-development/alternun/issues/315)
- **mobile:** pin expo-modules-core to the app's Expo SDK in Metro and Jest ([734a052](https://github.com/alternun-development/alternun/commit/734a05284628c1e3d9093914a98fc18d318b85af)), closes [#315](https://github.com/alternun-development/alternun/issues/315)
- **security:** CORS origin echoed only after an allowlist membership check ([837524b](https://github.com/alternun-development/alternun/commit/837524bb15d16dadf563e3990c1914f41eade460)), closes [#74](https://github.com/alternun-development/alternun/issues/74) [#315](https://github.com/alternun-development/alternun/issues/315)
- **security:** rate-limit email sign-in per client IP with @fastify/rate-limit ([1214da8](https://github.com/alternun-development/alternun/commit/1214da875f385626d7d99892568e91d314e16c0a)), closes [#75](https://github.com/alternun-development/alternun/issues/75) [#315](https://github.com/alternun-development/alternun/issues/315)

### Features

- **api:** in-app review of Airs in review for approvers ([55dc597](https://github.com/alternun-development/alternun/commit/55dc597432a3ea405891e2ded7342d388d48cea8)), closes [#315](https://github.com/alternun-development/alternun/issues/315)
- **api:** legacy medal catalog and project details on honor awards ([2440c48](https://github.com/alternun-development/alternun/commit/2440c4854cf53f3554e70c633496ccd01cba063c))
- **mobile:** Airs in review entry point in the Explorer header ([f5abeb0](https://github.com/alternun-development/alternun/commit/f5abeb00bc54af168e5a037e9c566783b1379ffa)), closes [#315](https://github.com/alternun-development/alternun/issues/315)
- **mobile:** Airs in review screen for approvers ([de0ea13](https://github.com/alternun-development/alternun/commit/de0ea137190da39eb2e152faf2b5e9a875a456ae)), closes [#315](https://github.com/alternun-development/alternun/issues/315)
- **mobile:** legacy mission medals and a shared share system ([465af63](https://github.com/alternun-development/alternun/commit/465af6353008951258dfabc70090d085700c787d))

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
