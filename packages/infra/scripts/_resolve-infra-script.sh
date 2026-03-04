#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME=${1:-}
if [ -z "$SCRIPT_NAME" ]; then
  echo "Missing script name" >&2
  exit 1
fi

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
INFRA_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

CANDIDATES=(
  "$INFRA_DIR/node_modules/@lsts_tech/infra/scripts/${SCRIPT_NAME}"
  "$INFRA_DIR/../node_modules/@lsts_tech/infra/scripts/${SCRIPT_NAME}"
  "$INFRA_DIR/../../node_modules/@lsts_tech/infra/scripts/${SCRIPT_NAME}"
)

for candidate in "${CANDIDATES[@]}"; do
  if [ -f "$candidate" ]; then
    echo "$candidate"
    exit 0
  fi
done

echo "Could not locate @lsts_tech/infra script: ${SCRIPT_NAME}" >&2
exit 1
