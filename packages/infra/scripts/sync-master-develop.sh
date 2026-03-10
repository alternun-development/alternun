#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(git rev-parse --show-toplevel)

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
  on|ON|true|TRUE|1|yes|YES) ;;
  *)
    echo "ALTERNUN_TESTNET_MODE is disabled in root .env. Refusing master -> develop sync." >&2
    exit 1
    ;;
esac

export SOURCE_BRANCH=${SOURCE_BRANCH:-master}
export TARGET_BRANCH=${TARGET_BRANCH:-develop}
export RETURN_BRANCH=${RETURN_BRANCH:-master}

exec bash "$SCRIPT_DIR/sync-branches.sh"
