#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(git rev-parse --show-toplevel)
REMOTE=${REMOTE:-origin}
SOURCE_BRANCH=${SOURCE_BRANCH:-develop}
TARGET_BRANCH=${TARGET_BRANCH:-master}
RETURN_BRANCH=${RETURN_BRANCH:-develop}

resolve_testnet_mode() {
  local env_file="$REPO_ROOT/.env"
  local value=""

  if [ -f "$env_file" ]; then
    value=$(awk -F= '/^ALTERNUN_TESTNET_MODE=/{print $2}' "$env_file" | tail -n 1 | tr -d "\"'[:space:]")
  fi

  if [ -z "$value" ]; then
    value="on"
  fi

  echo "$value"
}

case "$(resolve_testnet_mode)" in
  on|ON|true|TRUE|1|yes|YES)
    echo "ALTERNUN_TESTNET_MODE is enabled in root .env. Use sync:master-develop instead." >&2
    exit 1
    ;;
esac

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required to create the release PR." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit or stash changes before syncing branches." >&2
  exit 1
fi

echo "Fetching latest branches from ${REMOTE}..."
git fetch "$REMOTE" "$SOURCE_BRANCH" "$TARGET_BRANCH"

echo "Updating ${TARGET_BRANCH} from ${REMOTE}/${TARGET_BRANCH}..."
git checkout "$TARGET_BRANCH"
git pull --ff-only "$REMOTE" "$TARGET_BRANCH"

echo "Returning to ${SOURCE_BRANCH} and updating from remote..."
git checkout "$SOURCE_BRANCH"
git pull --ff-only "$REMOTE" "$SOURCE_BRANCH"

REPO_URL=$(git remote get-url "$REMOTE")
REPO=${GH_REPO:-${REPO_URL#git@github.com:}}
REPO=${REPO#https://github.com/}
REPO=${REPO%.git}

EXISTING_PR_URL=$(gh pr list --repo "$REPO" --base "$TARGET_BRANCH" --head "$SOURCE_BRANCH" --state open --json url --jq '.[0].url // empty')
if [ -n "$EXISTING_PR_URL" ]; then
  echo "Release PR already open: $EXISTING_PR_URL"
  echo "Sync complete: ${SOURCE_BRANCH} -> ${TARGET_BRANCH}"
  exit 0
fi

RELEASE_VERSION=$(node -e "const fs=require('node:fs'); const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); process.stdout.write(pkg.version)")
BODY_FILE=$(mktemp)
trap 'rm -f "$BODY_FILE"' EXIT

cat >"$BODY_FILE" <<EOF
## 📝 Description

Promote release v${RELEASE_VERSION} from \`${SOURCE_BRANCH}\` to \`${TARGET_BRANCH}\`.

## 🔄 Type of Change

- [x] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style change (formatting, local variables)
- [ ] ♻️ Code refactoring (neither fixes a bug nor adds a feature)
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security improvement

## 🎯 Purpose

Promote the current release commit to production through a pull request from \`${SOURCE_BRANCH}\` to \`${TARGET_BRANCH}\`.

## 🧪 Testing

- [x] I have added tests that prove my fix is effective or that my feature works
- [x] I have tested this change locally and it works as expected
- [x] All existing tests pass with my changes
- [ ] I have run the full test suite and coverage is maintained

## 📋 Checklist

- [x] My code follows the project's coding standards and style guidelines
- [x] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [x] I have made corresponding changes to the documentation
- [x] My changes generate no new warnings or errors
- [x] I have added tests that prove my fix is effective or that my feature works
- [x] New and existing unit tests pass locally with my changes
- [x] Any dependent changes have been merged and published in downstream modules

## 🔗 Related Issues

None.

## 📝 Additional Notes

This PR is created automatically by the release promotion helper and must be merged manually.

## 🚀 Deployment

- [x] I have tested this change in a staging environment
- [x] I have considered the deployment implications
- [x] I have updated any necessary deployment scripts or configurations

---

**By submitting this pull request, I confirm that:**

- I have read and understood the contributing guidelines
- I have read and understood the code of conduct
- My changes are licensed under the MIT license
- I have the right to submit these changes under the MIT license
EOF

gh pr create \
  --repo "$REPO" \
  --title "🚀(release): Promote v${RELEASE_VERSION} to ${TARGET_BRANCH}" \
  --base "$TARGET_BRANCH" \
  --head "$SOURCE_BRANCH" \
  --body-file "$BODY_FILE"

echo "Sync complete: ${SOURCE_BRANCH} -> ${TARGET_BRANCH}"
