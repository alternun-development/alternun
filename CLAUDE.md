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

## 5. Repository Organization & Cleanup

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

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
