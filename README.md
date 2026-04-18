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
pnpm dev:all        # starts api, better-auth, admin, mobile, docs concurrently
```

### Common Commands

```bash
pnpm lint           # lint all packages
pnpm type-check     # TypeScript across monorepo
pnpm test           # run all tests
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

Versioning is handled by `@edcalderon/versioning`. Never edit `version` fields in `package.json`, `apps/mobile/app.json`, or `CHANGELOG.md` manually.

```bash
pnpm version:validate     # validate version sync across monorepo
pnpm version:sync         # sync versions across workspace
pnpm release              # build release on current branch
pnpm release patch        # bump patch, regenerate changelog, stage-aware build, tag, push
pnpm release -- --promote # promote current release (no version bump)
pnpm version:check-secrets # scan staged files for secrets
```

Current version: **1.0.151**

## Security

- `.env.*` files are never committed — use AWS Secrets Manager in prod
- Pre-commit hooks run staged secret checks (`pnpm version:check-secrets`)
- CI runs Gitleaks on push/PR to `develop` and `master`
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
- support@alternun.io

## License

[MIT](LICENSE) © 2026 Alternun, Inc.
