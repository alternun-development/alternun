# Profile badges release verification

## Scope and contract impact

The AIRS profile uses supplied badge artwork and opens tier explanation modals.
Tier earning rules are unchanged. API changes only affect local environment loading,
startup migration file discovery and diagnostics for an unavailable Supabase tenant. No controller, DTO,
route, response schema, SQL migration or OpenAPI contract changed.

The package version changes in the generated promotion commit are release metadata;
they did not change dependency resolution. Test-file paths reported as CI signals
are regression coverage, not deployment workflow changes.

## Verified evidence

- Profile component tests cover all four tier selections, locked achievements,
  missing artwork, score availability, remaining AIRS and dismissal: 17 passing tests.
  Tier Journey now has 100% line, statement and function coverage; branch coverage
  is 96.15%. The remaining branch is unreachable with the current artwork catalog.
- Full mobile coverage: 51 suites, 235 tests; statements 75.44%, branches 65.63%,
  functions 71.26%, lines 76.33%. Existing thresholds remain enforced.
- Migration runtime regression tests cover root migration discovery from `apps/api`,
  missing migration files, sanitized pooler errors and connection cleanup.
- The root-launch env regression was reproduced before the fix. Root and `apps/api`
  launches now load root `.env` followed by `apps/api/.env`; tests preserve explicit
  custom-file isolation, production skip and the existing local-file precedence.
  All 11 focused API tests and API type-check pass.
- Browser component inspection used the real journey and modal, canonical tier
  definitions and English catalog content. At 375px the modal was 335px wide and
  scrollable; at 1000px it was 760px wide with artwork beside text. Close and Escape
  dismissed it; no uncaught browser errors were reported. This was manual component
  verification, not authenticated end-to-end coverage.
- Development and production workspace builds passed for the profile release.
- After deploying `1.1.84-dev.0`, testnet `/health` and `/v1/health` returned HTTP 200,
  `status: ok`, and the expected version.

## Security failure at the first promotion

Commit `993b3c471e6134727bf4fd9c0f25d41b3732d8db` failed the
[Security Audit job](https://github.com/alternun-development/alternun/actions/runs/35475058664/job/105982773686).
The lockfile was unchanged from production. Four critical audit entries represented
two upstream advisories across two installed Next.js versions:

| Dependency path                                                   | Affected version | Patched version |
| ----------------------------------------------------------------- | ---------------- | --------------- |
| `apps/web → next`                                                 | 15.2.6           | 15.5.24         |
| `apps/api` / `packages/auth → better-auth → next` (optional peer) | 16.2.4           | 16.3.3          |

References:

- [Windows server remote code execution](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)
- [AVIF image optimization remote code execution](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)

Remediation upgrades the web dependency and overrides the exact vulnerable optional
peer resolution. The regenerated lockfile contains only Next.js 15.5.24; pnpm removed
the unused optional Next.js 16 resolution. The override prevents 16.2.4 from returning. It does not raise the audit threshold, suppress advisories, or
exclude development dependencies. Regenerate the lockfile, run `pnpm security:audit`,
and build the affected web surface before cutting a new patch through the standard
release and promotion commands.

CI now retains `security-audit-<commit SHA>` artifacts for both passing and failing
audits. Shell `pipefail` preserves audit failure when output is captured with `tee`.
The report includes dependency names, vulnerable version ranges and advisory links.

Local remediation validation: `pnpm security:audit` checked 2,518 packages and found
zero critical advisories. The web production build passed with Next.js 15.5.24.
The Next-generated `next-env.d.ts` update is retained with the dependency upgrade.

## Follow-up verification boundaries

- Signed-in profile end-to-end coverage remains follow-up work; do not bypass or
  mock Authentik in an integration path to manufacture that evidence.
- The neutral reference-readiness report describes analyzer/RAG/review/discussion
  corpora outside this release's scope. Those fixtures are not substitutes for the
  component, migration, build and security evidence above.
- A reporting app unable to publish checks needs its owner to grant Checks read/write
  and the installation owner to approve the permission. Repository workflow token
  permissions do not grant permissions to a separate installed GitHub App. See
  [GitHub permission-update requirements](https://docs.github.com/en/apps/maintaining-github-apps/modifying-a-github-app-registration#changing-the-permissions-of-a-github-app).
- Production merge remains subject to the generated promotion PR and required checks.
