#!/usr/bin/env bash
set -euo pipefail

REMOTE=${REMOTE:-origin}
SOURCE_BRANCH=${SOURCE_BRANCH:-}
TARGET_BRANCH=${TARGET_BRANCH:-}
RETURN_BRANCH=${RETURN_BRANCH:-}

if [ -z "$SOURCE_BRANCH" ] || [ -z "$TARGET_BRANCH" ]; then
  echo "SOURCE_BRANCH and TARGET_BRANCH are required." >&2
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

ORIGINAL_BRANCH=$(git branch --show-current 2>/dev/null || true)

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit or stash changes before syncing branches." >&2
  exit 1
fi

echo "Fetching latest branches from ${REMOTE}..."
git fetch "$REMOTE" "$SOURCE_BRANCH" "$TARGET_BRANCH"

echo "Updating ${TARGET_BRANCH} from ${REMOTE}/${TARGET_BRANCH}..."
git checkout "$TARGET_BRANCH"
git pull --ff-only "$REMOTE" "$TARGET_BRANCH"

echo "Fast-forwarding ${TARGET_BRANCH} with ${REMOTE}/${SOURCE_BRANCH}..."
git merge --ff-only "$REMOTE/$SOURCE_BRANCH"

echo "Pushing ${TARGET_BRANCH} to ${REMOTE}..."
git push "$REMOTE" "$TARGET_BRANCH"

RETURN_TO=${RETURN_BRANCH:-${ORIGINAL_BRANCH:-$SOURCE_BRANCH}}

echo "Returning to ${RETURN_TO}..."
git checkout "$RETURN_TO"

if git show-ref --verify --quiet "refs/remotes/${REMOTE}/${RETURN_TO}"; then
  git pull --ff-only "$REMOTE" "$RETURN_TO"
fi

echo "Sync complete: ${SOURCE_BRANCH} -> ${TARGET_BRANCH}"
