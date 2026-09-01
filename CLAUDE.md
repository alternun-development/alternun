# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

When editing code:

- Think first.
- Edit only what changes; do not rewrite whole files.
- Do not reread files you already read unless they changed.
- Keep responses terse: no preambles, no summaries, no obvious explanations.
- Test before claiming done.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. AWS Account Guard

**CRITICAL: Use Alternun's AWS account, NOT the default.**

### The Problem

Your machine likely has **two** AWS CLI profiles:

- **Default** (`~/.aws/credentials` → account `05....35`) — DO NOT USE
- **Alternun** (from `.env` → account `12....16`) — MUST USE

Accidental use of the default account will deploy to the wrong infrastructure and create resources in the wrong account.

### The Solution

#### Quick Setup (do this first)

```bash
# One-time: Load Alternun credentials
bash scripts/setup-aws-account.sh

# Verify
bash scripts/validate-aws-account.sh
# Output: ✅ Using CORRECT Alternun AWS account: 12....16
```

#### In Your Shell (permanent for session)

```bash
# Add to ~/.bashrc or ~/.zshrc
source ~/Documents/Alternun/alternun/scripts/setup-aws-account.sh
```

#### Per-Command (one-off)

```bash
# Before any deployment
bash scripts/setup-aws-account.sh && APPROVE=true STACK=dev packages/infra/scripts/sst-deploy.sh
```

### Guards In Place

| When                 | Guard                                          | Effect                                |
| -------------------- | ---------------------------------------------- | ------------------------------------- |
| **Release**          | `pnpm release`                                 | ❌ Fails if wrong account             |
| **Pre-commit**       | `git commit`                                   | ⚠️ Warns if wrong account (info only) |
| **Manual**           | `bash scripts/validate-aws-account.sh`         | Shows current account                 |
| **Manual (enforce)** | `bash scripts/validate-aws-account.sh enforce` | Exits with error if wrong             |

### AWS CLI Command Protocol

**Before running ANY `aws` or deploy command**, verify account first:

```bash
bash scripts/validate-aws-account.sh enforce  # Exits with error if wrong account
```

**ALWAYS follow this pattern:**

```bash
bash scripts/validate-aws-account.sh enforce && \
  APPROVE=true STACK=dev packages/infra/scripts/sst-deploy.sh
```

Never run AWS CLI commands without this guard.

### Troubleshooting

**Q: How do I know which account I'm using?**

```bash
bash scripts/validate-aws-account.sh
```

**Q: I got "WRONG AWS ACCOUNT DETECTED" on release. What do I do?**

```bash
bash scripts/setup-aws-account.sh  # Load correct credentials
pnpm release                        # Try again
```

**Q: Can I change my default AWS profile?**
No — don't modify `~/.aws/credentials`. Instead, always load Alternun credentials from `.env` using `setup-aws-account.sh`.

---

## 6. Git Safety & Uncommitted Changes

**CRITICAL: Never silently drop uncommitted work.**

Uncommitted changes are the most fragile form of work - they're not in git history and can't be recovered. Before running any git command that affects uncommitted changes, **always confirm with the user first**.

### Protection Rules

**ALWAYS ASK TWICE before:**

- `git restore .` (restore all working directory changes)
- `git restore <file>` (restore specific files)
- `git reset --hard` (discard all changes)
- `git clean -f` (remove untracked files)
- Any operation that would discard uncommitted changes

### The Protocol

1. **First Ask**: Show what files have uncommitted changes

   ```
   M apps/mobile/components/auth/AuthSignInScreen.tsx
   M apps/mobile/components/onboarding/AirsIntroExperience.tsx
   ?? packages/auth/dist/core/contracts.d.ts
   ```

2. **Second Ask**: Explicitly confirm before executing

   ```
   These files have uncommitted changes that will be PERMANENTLY LOST.
   Should I proceed with git restore .? (yes/no)
   ```

3. **After Confirmation**: Execute the command and verify
   - Run `git status` to confirm changes are gone
   - Show the result to the user

### Common Scenarios

**Linting failures blocking commit:**

- ❌ WRONG: Silently run `git restore .` to fix linting errors
- ✅ RIGHT: Show the errors, ask if user wants to discard changes or fix them

**Build artifacts with uncommitted changes:**

- ❌ WRONG: Silently discard build artifact changes
- ✅ RIGHT: Ask if those artifacts were intentional or can be discarded

**Multiple tools (LSP, formatter) making changes:**

- ❌ WRONG: Run restore to clean up
- ✅ RIGHT: Show what changed, ask before discarding

### Example Dialog

```
User: "push all unstaged changes"

Me: "I see uncommitted changes in these files:
 - AuthSignInScreen.tsx
 - AirsIntroExperience.tsx
 - auth dist files (8 files)

Should I commit these, or were they temporary and can be discarded?"

[Wait for user response before proceeding]
```

---

## 7. AWS Resource Naming Conventions

**Use clear, consistent names. Don't expose implementation details.**

### Quick Rules

| Resource   | Format                            | Example                          |
| ---------- | --------------------------------- | -------------------------------- |
| Lambda     | `alternun-{component}-{stage}`    | `alternun-api-dev`               |
| API Domain | `{stage}.{component}.alternun.co` | `testnet.api.alternun.co`        |
| SST Stack  | `{component}-{stage}`             | `api-dev`                        |
| Env Var    | `{PREFIX}_{COMPONENT}_{SETTING}`  | `INFRA_BACKEND_API_DATABASE_URL` |

### Guidelines

- ✅ **DO** use descriptive, short names (under 64 chars)
- ✅ **DO** include stage (dev, staging, prod)
- ✅ **DO** use consistent prefixes (`alternun-`, `INFRA_`, `EXPO_PUBLIC_`)
- ❌ **DON'T** expose framework names (NestJS, React, etc.)
- ❌ **DON'T** expose language (Python, Node, etc.)
- ❌ **DON'T** use auto-generated IDs

### Example: Bad vs Good

**Lambda function**:

- ❌ `alternun-infra-dashboard-dev-nestjs-api` (41 chars, exposes framework)
- ✅ `alternun-api-dev` (16 chars, clear purpose)

**SST Stack Aliases**:

- ❌ Deploy `api-dev` and `backend-api-dev` separately (creates duplicates)
- ✅ Deploy `api-dev` primary; document other aliases in pipeline config

### Full Details

See `docs/AWS_RESOURCE_NAMING.md` for:

- Naming convention deep dive
- SST alias resolution strategy
- Migration plan for existing resources
- Resource naming checklist

---

## 8. Repository Organization & Cleanup (Updated)

**Keep root clean. Archive non-critical docs in `docs/`.**

### Critical Root Files (only these .md files at root)

- `AGENTS.md` — agent compatibility
- `CHANGELOG.md` — release notes
- `CLAUDE.md` — Claude Code compatibility
- `CODE_OF_CONDUCT.md` — community guidelines
- `CONTRIBUTING.md` — contribution guide
- `README.md` — project overview
- `SECURITY.md` — security policy
- `LICENSE` — license file

### Non-Critical Files (move to `docs/`)

All other `.md` files (deployment guides, incident reports, architecture decisions, etc.) belong in the `docs/` directory.

### Guards

- **Pre-commit hook** (`scripts/validate-root-docs.sh`): Blocks commits with non-critical .md files at root
- **Release script** (`scripts/release.mjs`): Validates root structure before publishing
- **Manual check**: `bash scripts/validate-root-docs.sh false`

### Usage

```bash
# Check current state
bash scripts/validate-root-docs.sh false

# Move files
mv DEPLOYMENT_FIX_SUMMARY.md docs/
mv ENVIRONMENT_SETUP_SUMMARY.md docs/

# Pre-commit (automatic)
git add SOME_FILE.md  # automatically validated by husky

# Release (automatic)
pnpm release          # fails if non-critical .md at root
```

---

---

## 9. Reentry & Roadmap Sync

**Keep `.versioning/REENTRY.md` and `.versioning/ROADMAP.md` in sync with actual progress.**

After completing any non-trivial task or when switching context:

1. Run `pnpm exec versioning reentry set --next "<what comes next>"` to update the next micro-step.
2. Update `.agents/active-tasks/*/README.md` task statuses (todo → in-progress → done).
3. Run `pnpm exec versioning reentry sync` to regenerate REENTRY.md and the ROADMAP.md managed block.

A Husky pre-push guard enforces that REENTRY.md is not stale on pushes to `develop` or `master`.
Use `--no-validate-reentry` on commits/pushes when changes are trivial (typos, config tweaks) and
a reentry update would be noisy.

### When to update

| Event                                 | Update reentry?                          |
| ------------------------------------- | ---------------------------------------- |
| Task completed (code + tests passing) | Yes — set `--next` to the following task |
| Task blocked or abandoned             | Yes — note the blocker                   |
| Pure typo / formatting fix            | No — use `--no-validate-reentry`         |
| Config or dependency bump only        | No — use `--no-validate-reentry`         |

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 10. Task Archival — `.agents/` folder discipline

`.agents/` has three distinct folders, each organized by feature subfolder (e.g. `alternun-wallet-system/`):

| Folder           | Purpose                                | When to use                                   |
| ---------------- | -------------------------------------- | --------------------------------------------- |
| `active-tasks/`  | Tasks in progress or not yet started   | Default home for new tasks                    |
| `pending-tasks/` | Security findings, debt, deferred work | Items that surface but aren't actively worked |
| `done-tasks/`    | Completed, verified, archived          | After a task is done and verified             |

### When a task is complete

**Move, do not copy.** The original file is the authoritative record — creating a new summary loses history.

```bash
# Move from active or pending to done (script handles subfolder creation):
bash scripts/archive-task.sh active-tasks/alternun-wallet-system/01-db-schema-migration.md
bash scripts/archive-task.sh pending-tasks/alternun-wallet-system/SEC-02-RLS-policy.md

# Then update the READMEs in both source and destination folders.
# Then run:
pnpm exec versioning reentry sync
```

### Subfolder per feature

Always place tasks in a per-feature subfolder inside each of the three folders:

- ✅ `active-tasks/alternun-wallet-system/06-mobile-home.md`
- ❌ `active-tasks/06-mobile-home.md` (flat, no feature subfolder)

### File naming in done-tasks

Keep the original filename as-is — do NOT rename files when moving to `done-tasks/`. The filename is its own
identity; renaming breaks cross-references and git history.

---

## 11. Release Flow — develop → master (no release branches)

**All production releases go directly from `develop` to `master` via a single PR. Never create `release/v*` or `promote/v*` branches.**

> **Hard guard:** `.husky/pre-push` blocks any push to a branch matching `release/*`, `release-*`, or `promote/*` with an error message. This is enforced automatically — you cannot bypass it without editing the hook.

### The canonical flow

```
develop  ── pnpm release patch ──► v1.2.3-dev.N ── pnpm release:patch:promote ──► PR (develop→master) ──► merge ──► CI deploys to prod
```

**The `develop` → `master` PR must always be created/updated by `pnpm release:patch:promote`, never by hand.** `.github/workflows/release-promotion-guard.yml` blocks any PR into `master`/`main` whose head isn't `develop`, whose title isn't exactly `chore: release vX.Y.Z`, whose body is missing the `<!-- alternun-release:patch -->` marker, or whose tag `vX.Y.Z` doesn't exactly match the PR head commit. A manually-run `gh pr create` (or a hand-edited title/body) fails all four checks and will not pass CI — do not do it, even as a "just this once" fallback.

#### Step-by-step

1. **On `develop`**, with your changes already committed, cut a dev release:

   ```bash
   pnpm release patch   # or minor / major
   ```

   This bumps the version to a `-dev.N` prerelease, updates the changelog, commits, tags, and pushes `develop`. (`pnpm release patch` on `develop` also deploys the live testnet API — this is expected.)

2. **Promote it** — this is the only supported way to open or update the `develop` → `master` PR:

   ```bash
   pnpm release:patch:promote   # wraps: node scripts/release.mjs --promote
   ```

   This strips the `-dev.N` suffix, tags the real production version, pushes `develop` and the tag, then opens (or, if one already exists, updates in place) the PR into `master` with the title/body/marker the Release Promotion Guard requires.

3. **Merge the PR** once approved. Merging to `master` triggers the production deploy pipeline (AWS CodePipeline watches `master`) — treat the merge itself as the outward-facing, hard-to-reverse step and confirm before doing it.

4. **Sync master back to develop** via the `Sync Master To Develop` GitHub Action (`workflow_dispatch`), or manually:
   ```bash
   git checkout develop
   git merge origin/master --no-ff -m "chore: merge master vX.Y.Z into develop"
   git push
   ```

If a PR into `master` genuinely needs to be opened by hand (e.g. the promote script itself is broken), label it `release:manual-exception` — that's the guard's only recognized escape hatch — and say so explicitly rather than silently working around the check.

### What NOT to do

- ❌ Never create `release/vX.Y.Z` or `promote/vX.Y.Z` branches — the pre-push hook blocks this
- ❌ Never release a patch from `develop` (`pnpm release patch` on develop creates dev builds)
- ❌ Never open a PR from a release or promote branch — always PR from `develop`
- ❌ Never run `gh pr create` (or hand-edit the title/body) for the `develop` → `master` release PR — always use `pnpm release:patch:promote`. The Release Promotion Guard CI check will fail a manually-created PR every time.

### Guards (enforced automatically)

- **`.husky/pre-push`**: blocks any push to `release/*`, `release-*`, `promote/*` branches with a clear error
- `pnpm release` on `develop` → creates dev releases only (e.g. `1.1.2-dev.0`)
- `pnpm release patch` on `master` → creates production patch releases (e.g. `1.1.2`)
- Pre-push hook also validates: AWS account, version sync, secrets scan, changelog entry, reentry status

---

## 12. Code Coverage — 70% Minimum Threshold

**Every PR must maintain ≥ 70% code coverage (lines, functions, branches, statements).**

This threshold is enforced at three levels:

| Level        | Guard                                                                 | Effect                                   |
| ------------ | --------------------------------------------------------------------- | ---------------------------------------- |
| **Local**    | `jest --coverage` in `@alternun/mobile`                               | Fails if global coverage drops below 70% |
| **Pre-push** | `.husky/pre-push` runs `pnpm --filter @alternun/mobile test:coverage` | Blocks push if threshold not met         |
| **CI**       | `CI / Test` GitHub Actions job                                        | Blocks PR merge if threshold not met     |

### Jest config (`apps/mobile/package.json`)

```json
"jest": {
  "preset": "jest-expo",
  "coverageThreshold": {
    "global": {
      "lines": 70,
      "functions": 70,
      "statements": 70,
      "branches": 60
    }
  }
}
```

> **Note:** Branch coverage is currently ~65% (floor set at 60% to avoid immediate failure).
> Target is 70% for all metrics. Improve branch coverage by adding tests for
> conditional paths in UI providers and config files before raising the floor.

### Rules

- ✅ **DO** write tests alongside any new component, hook, or utility you add
- ✅ **DO** update existing tests when you change behavior (especially source of truth, e.g. which JSON file a function reads from)
- ❌ **DON'T** ship logic changes without updating the test that covers that path
- ❌ **DON'T** skip the threshold — it exists to catch regressions like the v1.1.8 release that broke `Footer.shared` test expectations after changing `resolveVersionMetadata` to read from `changelogData` instead of `version.production.json`

### When you change a function's behavior

Always grep for its test file before committing:

```bash
grep -r "resolveVersionMetadata\|functionYouChanged" apps/mobile/**/__tests__/
```

If a test exists, update it. If none exists, add a minimal one covering the changed path.
