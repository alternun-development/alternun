#!/usr/bin/env bash
set -euo pipefail

REMOTE=${REMOTE:-origin}
SOURCE_BRANCH=${SOURCE_BRANCH:-develop}
TARGET_BRANCH=${TARGET_BRANCH:-master}

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

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

echo "Returning to ${SOURCE_BRANCH} and updating from remote..."
git checkout "$SOURCE_BRANCH"
git pull --ff-only "$REMOTE" "$SOURCE_BRANCH"

echo "Sync complete: ${SOURCE_BRANCH} -> ${TARGET_BRANCH}"
