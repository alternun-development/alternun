#!/bin/bash
# validate-reentry-status.sh — guard that REENTRY.md and reentry.status.json are in sync and not stale.
# Called by the pre-push Husky hook. Pass --no-validate-reentry to skip.

set -e

# Allow callers to opt out for trivial changes (typos, config bumps, etc.)
for arg in "$@"; do
  if [[ "$arg" == "--no-validate-reentry" ]]; then
    echo "ℹ️  Skipping reentry validation (--no-validate-reentry)."
    exit 0
  fi
done

# Also skip if the env var is set (e.g., in CI that manages its own state)
if [[ -n "$SKIP_REENTRY_VALIDATION" ]]; then
  echo "ℹ️  Skipping reentry validation (SKIP_REENTRY_VALIDATION set)."
  exit 0
fi

REENTRY_JSON=".versioning/reentry.status.json"
REENTRY_MD=".versioning/REENTRY.md"

if [[ ! -f "$REENTRY_JSON" ]]; then
  echo "⚠️  $REENTRY_JSON not found — skipping reentry validation."
  exit 0
fi

# Check REENTRY.md is not stale vs the JSON (simple: check both exist and REENTRY.md was updated
# after or at the same time as the JSON — if they diverge a sync is needed).
if [[ "$REENTRY_JSON" -nt "$REENTRY_MD" ]]; then
  echo ""
  echo "❌  Reentry status is out of sync!"
  echo "   $REENTRY_JSON is newer than $REENTRY_MD."
  echo ""
  echo "   Run the following to sync:"
  echo "     pnpm exec versioning reentry sync"
  echo ""
  echo "   If this push doesn't need a reentry update (typo / config bump):"
  echo "     git push --no-validate-reentry"
  echo "   Or: SKIP_REENTRY_VALIDATION=true git push"
  echo ""
  exit 1
fi

echo "✅  Reentry status is in sync."
exit 0
