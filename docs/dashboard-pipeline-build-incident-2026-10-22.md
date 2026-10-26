# Dashboard pipeline build incident — October 22, 2026

## Status

Resolved on October 26, 2026. Production runs API **v1.1.107** and the production
database has every repository migration applied.

- `alternun-dash-prod-pipeline` succeeded on master commit `9894dd7`. It was the
  first success since October 18.
- The pipeline's migration step reported `Database is up to date`.
- `https://api.alternun.co/health` returns version `1.1.107`.
- `alternun-prod-pipeline` and `alternun-auth-prod-pipeline` also succeeded on the same commit.

## Cause and impact

`apps/api/src/modules/marketplace/project-proposal.service.ts` started importing
`@alternun/i18n` in PR #272, merged to `develop` on October 22. `apps/api/build.sh`
built `@alternun/email-templates` but not `@alternun/i18n`. CodeBuild starts from a
clean checkout, so `packages/i18n/dist` did not exist, and `tsc` failed:

```
src/modules/marketplace/project-proposal.service.ts(3,34): error TS2307: Cannot find module '@alternun/i18n'
```

The build failed only in the pipelines:

- **Local builds and `scripts/deploy-testnet-api.sh`** reused an existing `packages/i18n/dist`.
- **The CI `Build` job** uses `turbo run build`, which builds workspace dependencies first.

Impact:

| Area                          | Effect                                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `alternun-dash-prod-pipeline` | 7 consecutive failed runs, October 22–26                                                                                                       |
| `alternun-dash-dev-pipeline`  | Failed on every `develop` push in the same period                                                                                              |
| Production API                | Stayed on v1.1.100. Releases v1.1.101–v1.1.106 were tagged and merged to `master` but never deployed.                                          |
| Production database           | Migrations `20261019_0001`, `20261020_0001` and `20261020_0002` were not applied, because the pipeline applies migrations after the API build. |
| Testnet                       | Not affected. `pnpm release patch` deploys testnet from the local workspace, and the testnet database was up to date.                          |

No failure notification reached the team. A merged release PR was treated as a
completed deployment.

## Timeline (UTC)

| Time           | Event                                                                        |
| -------------- | ---------------------------------------------------------------------------- |
| Oct 19, 04:27  | Last successful `alternun-dash-prod-pipeline` run before the incident        |
| Oct 22, 10:40  | PR #272 merged to `develop`                                                  |
| Oct 22, 12:09  | First failed production run                                                  |
| Oct 26, 22:22  | Release v1.1.106 merged (PR #283). The production run fails again.           |
| Oct 26, ~22:55 | Investigation finds 3 pending production migrations and the failing build    |
| Oct 26, ~23:00 | The 3 migrations applied to production manually, one at a time               |
| Oct 26, ~23:05 | Build fix released as v1.1.107-dev.0. `alternun-dash-dev-pipeline` succeeds. |
| Oct 26, 23:34  | Release v1.1.107 merged (PR #284)                                            |
| Oct 26, ~23:39 | All three production pipelines succeed. Production API reports 1.1.107.      |

## Fix

- `aee3bc543` — `apps/api/build.sh` now builds `@alternun/i18n` before `tsc`.
- Production migrations were applied with
  `bash scripts/sync-db-migrations.sh production --file <file> --force-prod`, in order:
  `20261019_0001_create_project_proposals`,
  `20261020_0001_restrict_moderator_completion_approval`,
  `20261020_0002_restrict_media_reorder_and_scoped_approval`.
  A dry run afterwards reported no pending migrations.

The fix was verified two ways:

1. In a clean worktree, all three pipeline build commands passed.
2. With the fix removed, the API build reproduced the same TS2307 failure.

## Prevention

- `3943c5584` — the new CI job `pipeline-build` (`Pipeline Build (api|admin|expo)`)
  runs the exact build commands from `packages/infra/config/infrastructure-specs.ts` on
  a clean checkout, without turbo.
- `packages/infra/test/ci-pipeline-build-commands.test.ts` fails if those commands and
  the CI job drift apart.
- After every `develop` → `master` merge, verify the deployment, not just the merge. See
  [release-promotion-process.md](release-promotion-process.md#after-the-merge-verify-the-deployment).

## Follow-ups

- [ ] **Require status checks on `master`.** The `master` ruleset requires a review,
      CodeQL and code quality, but no status checks. That includes `release-promotion-guard`,
      which [release-promotion-process.md](release-promotion-process.md) says must be
      required. A repository admin should add `release-promotion-guard` and
      `Pipeline Build (api)`, `(admin)` and `(expo)` under
      Settings → Rules → Rulesets → master. Do not add required checks to `develop`:
      `pnpm release` pushes to it directly.
- [ ] **Alert on pipeline failure.** Send a notification when a production CodePipeline
      execution fails, so a failed run is not silent.
