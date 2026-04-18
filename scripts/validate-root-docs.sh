#!/bin/bash
# validate-root-docs.sh
# Guards against non-critical .md files in the repository root.
# Critical files (allowed at root):
#   - AGENTS.md (agent compatibility)
#   - CHANGELOG.md (release notes)
#   - CLAUDE.md (Claude Code compatibility)
#   - CODE_OF_CONDUCT.md (community guidelines)
#   - CONTRIBUTING.md (contribution guide)
#   - README.md (project overview)
#   - SECURITY.md (security policy)
#   - LICENSE (license file, not .md but included)
#
# All other .md files should be archived in docs/

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
CRITICAL_FILES=(
  "AGENTS.md"
  "CHANGELOG.md"
  "CLAUDE.md"
  "CODE_OF_CONDUCT.md"
  "CONTRIBUTING.md"
  "README.md"
  "SECURITY.md"
  "LICENSE"
)

# Determine what files to check (staged if in pre-commit, all if in release script)
check_staged_only=${1:-false}

if [ "$check_staged_only" = "true" ]; then
  # Pre-commit: check only staged files
  root_md_files=$(git diff --cached --name-only --diff-filter=ACM -- "$REPO_ROOT"/*.md 2>/dev/null || true)
else
  # Release/manual: check all .md files in root
  root_md_files=$(find "$REPO_ROOT" -maxdepth 1 -name "*.md" -type f 2>/dev/null || true)
fi

if [ -z "$root_md_files" ]; then
  exit 0
fi

# Check for violations
violations=()
while IFS= read -r file; do
  filename=$(basename "$file")
  is_critical=false

  for critical in "${CRITICAL_FILES[@]}"; do
    if [ "$filename" = "$critical" ]; then
      is_critical=true
      break
    fi
  done

  if [ "$is_critical" = false ]; then
    violations+=("$file")
  fi
done <<< "$root_md_files"

if [ ${#violations[@]} -gt 0 ]; then
  echo "❌ VIOLATION: Non-critical .md files in root directory"
  echo ""
  echo "Critical files (keep at root):"
  for critical in "${CRITICAL_FILES[@]}"; do
    echo "  ✅ $critical"
  done
  echo ""
  echo "Non-critical files found (move to docs/):"
  for violation in "${violations[@]}"; do
    echo "  ❌ $(basename "$violation")"
  done
  echo ""
  echo "Fix: Move non-critical files to docs/"
  echo "  mv <file>.md docs/"
  echo ""
  exit 1
fi

exit 0
