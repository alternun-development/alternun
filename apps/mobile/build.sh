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

  # Local overrides (only in local dev, skip in CI/CD and SST deployments)
  local is_deployment=false
  if [ -n "${CODEBUILD_BUILD_ID:-}" ] || [ "${CI:-}" = "true" ] || [ -n "${SST_STAGE:-}" ] || [ -n "${STACK:-}" ]; then
    is_deployment=true
  fi

  if [ "$is_deployment" = "false" ]; then
    load_env_file .env.local true
  fi
}

disable_expo_dotenv_if_needed() {
  local should_disable
  should_disable=$(node ./scripts/mobile-env.cjs should-disable-dotenv)

  # build.sh already loaded .env / .env.local above, so Expo should not load them again.
  export EXPO_NO_DOTENV=1

  if [ "${should_disable}" = "true" ]; then
    # Give every export a build-scoped temp dir so Metro never shares its cache
    # root across concurrent or back-to-back builds.
    export TMPDIR="${TMPDIR:-/tmp}/metro-cache-${STACK:-${SST_STAGE:-local}}-${CODEBUILD_BUILD_ID:-$$}"
    mkdir -p "${TMPDIR}"

    if [ -n "${CODEBUILD_BUILD_ID:-}" ] || [ "${CI:-}" = "true" ]; then
      export EXPO_EXPORT_CLEAR_CACHE=0
    else
      export EXPO_EXPORT_CLEAR_CACHE=1
    fi
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

# Ensure social login mode is set based on stage. Testnet/deploy stages should
# force Authentik even when the local env files still contain the dev default.
local_stage="${SST_STAGE:-${STACK:-${EXPO_PUBLIC_STAGE:-${EXPO_PUBLIC_ENV:-}}}}"
case "${local_stage}" in
  dev|api-dev|dashboard-dev|admin-dev|backend-dev|identity-dev|mobile|*testnet*|*development*|*preview*)
    export EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik
    ;;
  *)
    if [ -z "${EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE:-}" ]; then
      export EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik
    fi
    ;;
esac

pnpm --filter @alternun/auth build
pnpm --filter @alternun/update build

# Generate PWA icons (before export-assets so they're available in public/)
node scripts/generate-pwa-icons.mjs

node ../../packages/update/scripts/export-assets.mjs --target-dir public
disable_expo_dotenv_if_needed
clear_metro_cache_if_needed

# CRITICAL: Update .env files to ensure Expo reads correct URLs (Expo reads .env directly, not just process.env)
detected_stage="${SST_STAGE:-${STACK:-${EXPO_PUBLIC_STAGE:-${EXPO_PUBLIC_ENV:-}}}}"
if [ -n "$detected_stage" ]; then
  detected_stage_lower=$(echo "$detected_stage" | tr '[:upper:]' '[:lower:]')
  case "$detected_stage_lower" in
    dev|*testnet*|*development*|*preview*)
      # Update the .env.development file with guaranteed correct testnet URLs
      cat > .env.development << 'ENVFILE'
# Dev/testnet deployment environment
# Loaded during STACK=dev (testnet) deployments
# Generated by build.sh to ensure correct stage-specific URLs

EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=better-auth
AUTH_EXECUTION_PROVIDER=better-auth

# Better-auth URLs (testnet API)
EXPO_PUBLIC_BETTER_AUTH_URL=https://testnet.api.alternun.co/auth
AUTH_BETTER_AUTH_URL=https://testnet.api.alternun.co/auth
EXPO_PUBLIC_AUTH_EXCHANGE_URL=https://testnet.api.alternun.co/auth/exchange
AUTH_EXCHANGE_URL=https://testnet.api.alternun.co/auth/exchange

# Authentik OIDC (testnet)
EXPO_PUBLIC_AUTHENTIK_ISSUER=https://testnet.sso.alternun.co/application/o/alternun-mobile/
EXPO_PUBLIC_AUTHENTIK_CLIENT_ID=alternun-mobile
EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE=source
EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=supabase

# Supabase (testnet)
EXPO_PUBLIC_SUPABASE_URL=https://rjebeugdvwbjpaktrrbx.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_hPlMCyy51TS4c67V7WkkIw_p1Mv2Nze

# Release updates (testnet)
EXPO_PUBLIC_RELEASE_UPDATE_MODE=on
EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS=60000
ENVFILE
      ;;
    prod|*production*)
      # Update the .env.production file with guaranteed correct production URLs
      cat > .env.production << 'ENVFILE'
# Production deployment environment

EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=supabase
AUTH_EXECUTION_PROVIDER=supabase

# Better-auth URLs (production API)
EXPO_PUBLIC_BETTER_AUTH_URL=https://api.alternun.co/auth
AUTH_BETTER_AUTH_URL=https://api.alternun.co/auth
EXPO_PUBLIC_AUTH_EXCHANGE_URL=https://api.alternun.co/auth/exchange
AUTH_EXCHANGE_URL=https://api.alternun.co/auth/exchange

# Authentik OIDC (production)
EXPO_PUBLIC_AUTHENTIK_ISSUER=https://sso.alternun.co/application/o/alternun-mobile/
EXPO_PUBLIC_AUTHENTIK_CLIENT_ID=alternun-mobile
EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE=source
EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=supabase

# Supabase (production)
EXPO_PUBLIC_SUPABASE_URL=https://rjebeugdvwbjpaktrrbx.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_hPlMCyy51TS4c67V7WkkIw_p1Mv2Nze

# Release updates (production)
EXPO_PUBLIC_RELEASE_UPDATE_MODE=on
EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS=300000
ENVFILE
      ;;
  esac
fi

if [ "${EXPO_EXPORT_CLEAR_CACHE:-0}" = "1" ]; then
  npx expo export -p web --clear
else
  npx expo export -p web
fi
validate_exported_auth_bundle
