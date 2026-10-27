# Patch Release And Production Promotion

This is the required release path for Alternun. Standard releases are always patch releases. Do not open a hand-written pull request into `master` to deploy production changes.

## Required Flow

Run these commands from a clean, up-to-date `develop` checkout, in order:

```bash
pnpm release:patch
pnpm release:patch:promote
```

`pnpm release:patch` performs the local release validation, rebuilds the workspace, creates the development release commit and tag, pushes `develop`, and deploys the live testnet runtime. Validate testnet before continuing.

`pnpm release:patch:promote` performs the production-mode validation and build, creates the production tag, and opens or updates the generated `develop` → `master` promotion PR. Review and merge that PR through the normal production controls.

The generated PR has all of these properties:

- head branch `develop`
- title `chore: release vX.Y.Z`
- hidden marker `<!-- alternun-release:patch -->`
- matching `vX.Y.Z` tag contained in the PR head
- a linked comparison from the preceding production tag to the release tag
- a concise changelog-derived release summary
- an affected-surfaces table listing apps, packages, infrastructure, workflows, database, documentation, and the deployment resources they affect
- collapsible commit details for auditability without obscuring the release summary

The release description is generated from the exact `previous production tag..release tag` range. It deliberately excludes the tag being promoted when selecting the previous tag, so the reported scope cannot collapse to an empty range after the promotion tag is created.

The `release-promotion-guard` check verifies these properties on every PR to `master`. It must remain required by branch protection.

## After the merge: verify the deployment

A merged release PR is not a deployed release. Merging to `master` starts the production pipelines, and a failed run does not block or revert the merge. In October 2026, the production API stayed on v1.1.100 for four days while v1.1.101–v1.1.106 were merged; see [dashboard-pipeline-build-incident-2026-10-22.md](dashboard-pipeline-build-incident-2026-10-22.md).

After every merge into `master`:

1. Confirm that `alternun-dash-prod-pipeline`, `alternun-prod-pipeline` and `alternun-auth-prod-pipeline` succeeded for the merge commit (run `bash scripts/validate-aws-account.sh enforce` first).
2. Confirm that `https://api.alternun.co/health` reports the released version.
3. If the release includes migrations, confirm that `bash scripts/sync-db-migrations.sh production --dry-run` reports no pending migrations.

If a pipeline failed, fix it on `develop` and ship the fix through the same release flow.

## Explicit Exceptions

An unrelated or direct PR to `master` is prohibited unless a maintainer has explicitly authorized that exact exception. After authorization, a maintainer may apply the `release:manual-exception` label. The label records the exception and allows the guard to pass; it is not a substitute for authorization, review, or production validation.

Do not add this label for routine fixes, release work, or to bypass a failed release command. Cut a new patch release instead.

## Version Sources Of Truth

- `develop` uses `version.development.json`.
- `master` uses `version.production.json`.
- `release:patch` owns the development manifest and development tag.
- `release:patch:promote` owns the production manifest, production tag, and promotion PR.

The semantic package version is synchronized by the scripts. Do not manually edit manifests, tags, or the generated production PR to simulate a release.

## Non-Standard Releases

Minor, major, and manually-versioned releases are not routine commands. They require explicit maintainer authorization before execution and must retain the generated promotion process and production review controls.

`pnpm release:promote` remains a compatibility alias for `pnpm release:patch:promote`.
