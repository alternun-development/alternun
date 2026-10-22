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

Current version: **1.1.101**

## 📋 Latest Changes (v1.1.101)

### Bug Fixes

- **mobile:** localize the web tab title and link the FP note to the docs ([19b600e](https://github.com/alternun-development/alternun/commit/19b600e2250d99402a2cd92d42b89483c413093d))
- **api:** address CodeQL alerts from release v1.1.101 ([6a1c956](https://github.com/alternun-development/alternun/commit/6a1c9563ee9c3d7d36e4d4a019e7378f099df306))
- **db:** close moderator media reorder and sub_admin approval in SQL ([55b7ece](https://github.com/alternun-development/alternun/commit/55b7ece56b61bdea187e541573e59ca21aca57cf))
- **marketplace:** stop global moderator from pausing activities ([62c1f13](https://github.com/alternun-development/alternun/commit/62c1f1381ea5c857f8aefd3fa9f69d7242cec30d))
- **admin:** align marketplace permissions with the API role limits ([1c7ac55](https://github.com/alternun-development/alternun/commit/1c7ac557053546aafb1ce880322414d96b029b08))
- **marketplace:** stop global moderator from approving activities and protect brand media ([6826a07](https://github.com/alternun-development/alternun/commit/6826a0784ffac307d2b9650a1969bfa25000165a))
- **mobile:** show the Airs title, description and logo in link previews ([610133a](https://github.com/alternun-development/alternun/commit/610133a51ac682ba06946f0abdb31c1bd8ddc580))
- **mobile:** embed the Canva presentation on the web project detail ([36c1321](https://github.com/alternun-development/alternun/commit/36c132146c2739b8f28cb618816c292f69242dbd))
- **ui:** never show a negative progress to the next tier ([fa06554](https://github.com/alternun-development/alternun/commit/fa0655498c73985bc967ccfcfba4d5dca775c251))
- **api:** require a verified session for /auth/exchange (refs #100) ([ff0d43c](https://github.com/alternun-development/alternun/commit/ff0d43c1cd9ec479381094af140a2712bd8c286a))
- **auth:** send credentials and drop legacy exchange fields (refs #100) ([2b90bd5](https://github.com/alternun-development/alternun/commit/2b90bd534b24089402a24a86cfe09be6d899db94))
- **api:** restrict CORS to trusted origins (refs #100) ([c6ba118](https://github.com/alternun-development/alternun/commit/c6ba118982baf54322dd6291e2d641ae09877e86))

### Changes

- **versioning:** refresh reentry status after PR integration batch ([53a08e0](https://github.com/alternun-development/alternun/commit/53a08e08bd773299d7f12e760d526b3da0832937))
- **repo:** update reentry for the Airs share link preview ([4159be5](https://github.com/alternun-development/alternun/commit/4159be55d4e725571bdc78f1fcf0261311f094c5))
- **mobile:** publish the official Airs logo for link previews ([30f63da](https://github.com/alternun-development/alternun/commit/30f63da709eb60bfe70f850a889d2755e4c89291))
- **repo:** update reentry for the paginated Explorer enterprise directory ([f376e59](https://github.com/alternun-development/alternun/commit/f376e59aef8aa6178b52ddd6ff2ccc2608ee7dc5))
- **repo:** update reentry for the project detail Canva embed ([3b11de4](https://github.com/alternun-development/alternun/commit/3b11de41e32582aa6d1dbc161d42c9f71e0f3ae7))
- **repo:** update reentry for marketplace project proposals ([49d5939](https://github.com/alternun-development/alternun/commit/49d5939b7fe9133c1beb2653c4ae9aaec2f47b1f))
- **infra:** wire MARKETPLACE_CONTACT_EMAIL through env and deploys ([f91e786](https://github.com/alternun-development/alternun/commit/f91e7861ed63c1cc451e0d6b0fe533c26cd7c6b9))
- **db:** verify project proposal rate limits and authenticated denial ([e721e42](https://github.com/alternun-development/alternun/commit/e721e42680ba0eb91839b735b40660eda0dd9699))
- **airs:** note pending community equivalent AIRS and update reentry ([402244b](https://github.com/alternun-development/alternun/commit/402244b5319a4f300f5dc468b70f79dd8f2a15e4))
- **api:** add HTTP-level regression test for /auth/exchange (refs #100) ([a259ad0](https://github.com/alternun-development/alternun/commit/a259ad03b8c6a40700388826e5fabeca48968cc6))

### Documentation

- **marketplace:** document admin roles, Authentik groups, and assignment ([b287d33](https://github.com/alternun-development/alternun/commit/b287d33be1184ec449617b3782c15f44ce66c757))
- **auth:** drop branch-specific wording from the backend handoff (refs #100) ([6bd25f1](https://github.com/alternun-development/alternun/commit/6bd25f148cce6695cc3e5d0b62c0653ae1883837))
- **auth:** update backend handoff now that the client sends credentials (refs #100) ([cb18da6](https://github.com/alternun-development/alternun/commit/cb18da68e08102714e77b97ad6ca804a17ff8ab0))

### Features

- **infra:** map one Authentik group to each admin role ([863818f](https://github.com/alternun-development/alternun/commit/863818f4f842d14064f1d4c66ab378de9d6424f9))
- **mobile:** scroll back to the enterprise list on page or view change ([5c54535](https://github.com/alternun-development/alternun/commit/5c54535845b01ed250ce73b861bc721d9b893899))
- **mobile:** paginate the Explorer enterprise directory with three views ([d34d1e0](https://github.com/alternun-development/alternun/commit/d34d1e07e1834b5036fdd119739ee2f6fc6aa1f1))
- **i18n:** add enterprise directory view and pagination labels ([d118c5f](https://github.com/alternun-development/alternun/commit/d118c5f42584f4b807f0a18d3cd6d6a2a9774961))
- **i18n:** add accessible title for the project presentation embed ([04ec26a](https://github.com/alternun-development/alternun/commit/04ec26a56f9ccc391853b8dfa2899f9b1c2cd654))
- **mobile:** send Explorer project proposals to the API ([f98d194](https://github.com/alternun-development/alternun/commit/f98d1942b42132fd6aa9deb76736156bf8824dd0))
- **api:** accept marketplace project proposals and notify by email ([192cb4e](https://github.com/alternun-development/alternun/commit/192cb4eb5ea3f875b0dceb1d63b0696ab81788ad))
- **mobile:** label provisional FP as estimated and clarify RBI help texts ([d922c46](https://github.com/alternun-development/alternun/commit/d922c467484012d6b53cbf1f8859376e8956eabc))
- **api:** return provisional participation factor from /v1/airs/me ([6eec5b3](https://github.com/alternun-development/alternun/commit/6eec5b30cbce48b02bf3d7fb9f01f4658ef0cfed))
- **db:** store marketplace project proposals ([924972d](https://github.com/alternun-development/alternun/commit/924972d7bd51c978b4be016f710ac293e12425dd))

### Refactoring

- **auth:** use an explicit bearer token field for the exchange (refs #100) ([f3a7171](https://github.com/alternun-development/alternun/commit/f3a7171228eadc9049f9468acac8f78ebb977d2a))

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
