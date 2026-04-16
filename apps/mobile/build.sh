#!/bin/bash
set -euo pipefail

validate_exported_auth_bundle() {
  node ./scripts/validate-exported-auth-bundle.cjs
}

load_env_file() {
  local env_file=$1

  [ -f "${env_file}" ] || return 0

  while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    # Remove any leading/trailing whitespace from key
    key=$(echo "$key" | xargs)
    # Skip if key is empty after trimming
    [[ -z "$key" ]] && continue
    # Keep deploy-provided env authoritative; file env is only a fallback.
    [[ -n "${!key+x}" ]] && continue
    # Export the variable (value might have quotes which is fine)
    export "$key=$value"
  done < "${env_file}"
}

seed_build_auth_env() {
  while IFS='=' read -r key value; do
    [[ -z "${key}" ]] && continue
    export "${key}=${value}"
  done < <(node ./scripts/mobile-env.cjs build-auth-env)
}

load_env_vars() {
  # Mirror Expo's local override order while keeping this script in control.
  load_env_file .env

  # Load stage-specific environment file if deploying
  # Priority: .env.testnet/.env.development/.env.production → .env.local → shell env
  if [ -n "${SST_STAGE:-}" ] || [ -n "${STACK:-}" ]; then
    local stage_file=""
    case "${SST_STAGE:-${STACK:-}}" in
      dev|api-dev|*testnet*)
        stage_file=".env.testnet"
        ;;
      prod|api-prod|production|*production*)
        stage_file=".env.production"
        ;;
    esac
    if [ -n "$stage_file" ] && [ -f "$stage_file" ]; then
      load_env_file "$stage_file"
    fi
  fi

  # Local overrides (highest priority)
  load_env_file .env.local
}

disable_expo_dotenv_if_needed() {
  local should_disable
  should_disable=$(node ./scripts/mobile-env.cjs should-disable-dotenv)

  # build.sh already loaded .env / .env.local above, so Expo should not load them again.
  export EXPO_NO_DOTENV=1

  if [ "${should_disable}" = "true" ]; then
    export EXPO_EXPORT_CLEAR_CACHE=1
  fi
}

clear_metro_cache_if_needed() {
  if [ "${EXPO_EXPORT_CLEAR_CACHE:-0}" = "1" ]; then
    rm -rf "${TMPDIR:-/tmp}/metro-cache"
  fi
}

# Generate changelog data file for the app
node ../../scripts/generate-changelog-data.mjs apps/mobile

# Resolve canonical auth env before local .env can backfill stale localhost values.
seed_build_auth_env

# Load remaining environment variables from .env
load_env_vars

pnpm --filter @alternun/auth build
pnpm --filter @alternun/update build

# Generate PWA icons (before export-assets so they're available in public/)
python3 scripts/generate-pwa-icons.py

node ../../packages/update/scripts/export-assets.mjs --target-dir public
disable_expo_dotenv_if_needed
clear_metro_cache_if_needed
if [ "${EXPO_EXPORT_CLEAR_CACHE:-0}" = "1" ]; then
  npx expo export -p web --clear
else
  npx expo export -p web
fi
validate_exported_auth_bundle
