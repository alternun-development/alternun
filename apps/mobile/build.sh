#!/bin/bash
set -euo pipefail

# Ensure STACK/SST_STAGE are available from any stage indicator that SST provides.
# SST StaticSite passes EXPO_PUBLIC_STAGE but not STACK/SST_STAGE directly.
: "${STACK:=${SST_STAGE:-${EXPO_PUBLIC_STAGE:-${EXPO_PUBLIC_ENV:-}}}}"
: "${SST_STAGE:=${STACK:-}}"
export STACK SST_STAGE

validate_exported_auth_bundle() {
  node ./scripts/validate-exported-auth-bundle.cjs
}

load_env_file() {
  local env_file=$1
  local allow_override=${2:-false}

  [ -f "${env_file}" ] || return 0

  while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    # Remove any leading/trailing whitespace from key
    key=$(echo "$key" | xargs)
    # Skip if key is empty after trimming
    [[ -z "$key" ]] && continue
    # Keep deploy-provided env authoritative (from SST); file env is only a fallback.
    # But allow stage-specific files to override .env values.
    if [ "$allow_override" = "false" ]; then
      [[ -n "${!key+x}" ]] && continue
    fi
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
  load_env_file .env false

  # Load stage-specific environment file if deploying
  # Priority: .env.development/.env.production → .env.local → shell env
  # SST StaticSite passes EXPO_PUBLIC_STAGE as env var; also check STACK/SST_STAGE
  local detected_stage="${SST_STAGE:-${STACK:-${EXPO_PUBLIC_STAGE:-${EXPO_PUBLIC_ENV:-}}}}"
  if [ -n "$detected_stage" ]; then
    local stage_file=""
    case "${detected_stage}" in
      dev|api-dev|dashboard-dev|admin-dev|backend-dev|identity-dev|mobile|*testnet*|*development*|*preview*)
        stage_file=".env.development"
        ;;
      prod|api-prod|dashboard-prod|admin-prod|backend-prod|identity-prod|production|*production*)
        stage_file=".env.production"
        ;;
    esac
    if [ -n "$stage_file" ] && [ -f "$stage_file" ]; then
      # Stage-specific files can override .env values (allow_override=true)
      load_env_file "$stage_file" true
    fi
  fi

  # Local overrides (highest priority, can override everything)
  load_env_file .env.local true
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

# In CI/CD (CodeBuild), resolve from SSM Parameter Store instead of .env files
# Local dev uses .env/.env.local; CI/CD uses SSM for safety (secrets not in git)
if [ "${CODEBUILD_BUILD_ID:-}" != "" ] || [ "${CI:-}" = "true" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "../../packages/infra/scripts/resolve-ssm-env.sh" ]; then
    echo "CI/CD detected: resolving Expo env from SSM Parameter Store..."
    # shellcheck source=/dev/null
    source "../../packages/infra/scripts/resolve-ssm-env.sh"
  fi
fi

# Resolve canonical auth env before local .env can backfill stale localhost values.
seed_build_auth_env

# Load remaining environment variables from .env
load_env_vars

# Ensure social login mode is set based on stage (gitignored .env.development/.env.production
# may not exist during SST deploys; the auth package defaults to 'authentik' when unset).
if [ -z "${EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE:-}" ]; then
  local_stage="${SST_STAGE:-${STACK:-${EXPO_PUBLIC_STAGE:-${EXPO_PUBLIC_ENV:-}}}}"
  case "${local_stage}" in
    prod|production|*production*)
      export EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik
      ;;
    *)
      export EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik
      ;;
  esac
fi

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
