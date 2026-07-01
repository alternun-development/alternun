#!/usr/bin/env bash
# archive-task.sh — move a completed task file to done-tasks, preserving its content.
#
# Usage:
#   bash scripts/archive-task.sh active-tasks/alternun-wallet-system/01-db-schema-migration.md
#   bash scripts/archive-task.sh pending-tasks/alternun-wallet-system/SEC-02-RLS-policy-redesign-wallet-tables.md
#
# The feature subfolder inside done-tasks/ is inferred from the source path.
# done-tasks/<feature>/ is created if it doesn't exist.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <path-to-task-file-under-.agents/>" >&2
  exit 1
fi

SOURCE="$1"
AGENTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.agents"

# Resolve to absolute path if relative
if [[ "$SOURCE" != /* ]]; then
  SOURCE="$AGENTS_DIR/$SOURCE"
fi

if [[ ! -f "$SOURCE" ]]; then
  echo "❌ File not found: $SOURCE" >&2
  exit 1
fi

# Must be under .agents/active-tasks/ or .agents/pending-tasks/
if [[ "$SOURCE" != "$AGENTS_DIR/active-tasks/"* && "$SOURCE" != "$AGENTS_DIR/pending-tasks/"* ]]; then
  echo "❌ Task must be under .agents/active-tasks/ or .agents/pending-tasks/" >&2
  exit 1
fi

# Derive the feature subfolder (the segment between active/pending-tasks/ and the filename)
REL="${SOURCE#$AGENTS_DIR/}"           # e.g. "active-tasks/alternun-wallet-system/01-db..."
PARTS=(${REL//\// })                   # split by /
if [[ ${#PARTS[@]} -lt 3 ]]; then
  echo "❌ Task must be in a feature subfolder (e.g. active-tasks/<feature>/<file>.md)" >&2
  exit 1
fi
FEATURE="${PARTS[1]}"
FILENAME="${PARTS[${#PARTS[@]}-1]}"

DEST_DIR="$AGENTS_DIR/done-tasks/$FEATURE"
DEST="$DEST_DIR/$FILENAME"

mkdir -p "$DEST_DIR"

if [[ -f "$DEST" ]]; then
  echo "⚠️  Already exists in done-tasks: $DEST" >&2
  exit 1
fi

mv "$SOURCE" "$DEST"
echo "✅ Archived: $FILENAME → done-tasks/$FEATURE/"
echo ""
echo "Next steps:"
echo "  1. Update done-tasks/$FEATURE/README.md to list the new file"
echo "  2. Update active/pending-tasks/$FEATURE/README.md to remove it"
echo "  3. Run: pnpm exec versioning reentry sync"
