#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

STAGE=${1:-dev}
VALUES_FILE=${2:-}

if [ -n "$VALUES_FILE" ] && [ -f "$VALUES_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$VALUES_FILE"
  set +a
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx is required to set SST secrets." >&2
  exit 1
fi

is_truthy() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES | on | ON) return 0 ;;
    *) return 1 ;;
  esac
}

SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL:-}
SUPABASE_KEY=${EXPO_PUBLIC_SUPABASE_KEY:-${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}}
WALLETCONNECT_PROJECT_ID=${EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID:-}
WALLETCONNECT_CHAIN_ID=${EXPO_PUBLIC_WALLETCONNECT_CHAIN_ID:-}
API_BASE_URL=${EXPO_PUBLIC_API_URL:-}

if is_truthy "${INFRA_REQUIRE_EXPO_PUBLIC_AUTH:-true}"; then
  if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "ERROR: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY are required to set secrets." >&2
    exit 1
  fi
fi

set_secret_if_present() {
  local key=$1
  local value=$2

  if [ -z "$value" ]; then
    return 0
  fi

  echo "Setting SST secret: ${key} (stage=${STAGE})"
  npx --yes sst secret set "$key" "$value" --stage "$STAGE"
}

set_secret_if_present "ExpoPublicSupabaseUrl" "$SUPABASE_URL"
set_secret_if_present "ExpoPublicSupabaseKey" "$SUPABASE_KEY"
set_secret_if_present "ExpoPublicWalletConnectProjectId" "$WALLETCONNECT_PROJECT_ID"
set_secret_if_present "ExpoPublicWalletConnectChainId" "$WALLETCONNECT_CHAIN_ID"
set_secret_if_present "ExpoPublicApiBaseUrl" "$API_BASE_URL"

echo "Infra secrets sync completed for stage ${STAGE}."
