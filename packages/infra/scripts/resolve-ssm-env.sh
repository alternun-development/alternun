#!/bin/bash
set -euo pipefail

# Resolve environment variables from AWS Systems Manager Parameter Store.
# Called by CI/CD pipeline and CodeBuild when .env files are not available.
# Priority: shell env -> SSM params -> defaults

# Ensure AWS CLI is available
if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI is required to resolve SSM parameters." >&2
  exit 1
fi

# Stage/prefix from env
APP_NAME="${INFRA_APP_NAME:-alternun-infra}"
STAGE="${STACK:-${SST_STAGE:-dev}}"
REGION="${AWS_REGION:-us-east-1}"
CACHE_DIR="${INFRA_SSM_ENV_CACHE_DIR:-${TMPDIR:-/tmp}/alternun-infra}"
CACHE_FILE="${INFRA_SSM_ENV_CACHE_FILE:-${CACHE_DIR}/ssm-env-${STAGE}-${REGION}.sh}"

declare -A SSM_PARAM_CACHE=()
declare -a CACHE_EXPORT_VARS=(
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_KEY
  EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID
  EXPO_PUBLIC_AUTHENTIK_ISSUER
  EXPO_PUBLIC_AUTHENTIK_CLIENT_ID
  EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE
  EXPO_PUBLIC_BETTER_AUTH_URL
  EXPO_PUBLIC_AUTH_EXCHANGE_URL
  EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE
  INFRA_BACKEND_API_AUTH_BETTER_AUTH_URL
  INFRA_BACKEND_API_DATABASE_URL
  AUTH_BETTER_AUTH_URL
  BETTER_AUTH_URL
  AUTH_EXCHANGE_URL
  ALTERNUN_TESTNET_MODE
  AUTH_EXECUTION_PROVIDER
  EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER
  DATABASE_URL
)

# CI shells can inherit stale auth values from the CodeBuild project.
# Clear the auth contract vars so SSM/default stage resolution wins.
if [ "${CODEBUILD_BUILD_ID:-}" != "" ] || [ "${CI:-}" = "true" ]; then
  unset \
    AUTH_EXECUTION_PROVIDER \
    EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER \
    AUTH_BETTER_AUTH_URL \
    EXPO_PUBLIC_BETTER_AUTH_URL \
    AUTH_EXCHANGE_URL \
    EXPO_PUBLIC_AUTH_EXCHANGE_URL \
    EXPO_PUBLIC_AUTHENTIK_ISSUER \
    EXPO_PUBLIC_AUTHENTIK_CLIENT_ID \
    EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE \
    EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE
fi

resolve_auth_execution_provider() {
  if [ -n "${AUTH_BETTER_AUTH_URL:-}" ] || [ -n "${EXPO_PUBLIC_BETTER_AUTH_URL:-}" ] || \
    [ -n "${AUTH_EXCHANGE_URL:-}" ] || [ -n "${EXPO_PUBLIC_AUTH_EXCHANGE_URL:-}" ] || \
    [ -n "${BETTER_AUTH_URL:-}" ]; then
    echo "better-auth"
    return 0
  fi

  echo "supabase"
}

# SSM parameter name builder: /{app}/{stage}/{param_key}
# e.g. /alternun-infra/dev/expo-public-authentik-social-login-mode
build_param_name() {
  local key=$1
  local prefix="${2:-${APP_NAME}}"
  local stage="${3:-${STAGE}}"
  echo "/${prefix}/${stage}/${key}"
}

fetch_ssm_params_batch() {
  local -a names=("$@")
  local name value

  if [ "${#names[@]}" -eq 0 ]; then
    return 0
  fi

  while IFS=$'\t' read -r name value; do
    if [ -n "$name" ]; then
      SSM_PARAM_CACHE["$name"]="$value"
    fi
  done < <(
    aws ssm get-parameters \
      --names "${names[@]}" \
      --region "$REGION" \
      --query 'Parameters[].[Name,Value]' \
      --output text 2>/dev/null || true
  )
}

prime_ssm_param_cache() {
  local -a names=("$@")
  local -a batch=()
  local name

  for name in "${names[@]}"; do
    if [ -z "$name" ]; then
      continue
    fi

    if [ -n "${SSM_PARAM_CACHE[$name]+x}" ]; then
      continue
    fi

    batch+=("$name")
    if [ "${#batch[@]}" -eq 10 ]; then
      fetch_ssm_params_batch "${batch[@]}"
      batch=()
    fi
  done

  if [ "${#batch[@]}" -gt 0 ]; then
    fetch_ssm_params_batch "${batch[@]}"
  fi
}

# Get a single param; echo empty string if not found (don't error)
get_ssm_param() {
  local key=$1
  local param_name=$(build_param_name "$key")

  if [ -n "${SSM_PARAM_CACHE[$key]+x}" ]; then
    printf '%s\n' "${SSM_PARAM_CACHE[$key]}"
    return 0
  fi

  aws ssm get-parameter \
    --name "$param_name" \
    --region "$REGION" \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo ""
}

# Resolve with priority: shell env -> SSM -> default
resolve_env() {
  local var_name=$1
  local ssm_key=$2
  local default_value="${3:-}"
  local ssm_cached_value

  # Already in shell env: keep it
  if [ -n "${!var_name+x}" ] && [ -n "${!var_name}" ]; then
    echo "${!var_name}"
    return 0
  fi

  ssm_cached_value="${SSM_PARAM_CACHE[$ssm_key]-}"
  if [ -n "$ssm_cached_value" ]; then
    echo "$ssm_cached_value"
    return 0
  fi

  # Try SSM
  local ssm_value
  ssm_value=$(get_ssm_param "$ssm_key")
  if [ -n "$ssm_value" ]; then
    echo "$ssm_value"
    return 0
  fi

  # Fall back to default
  echo "$default_value"
}

# Export a variable from SSM or env
export_env_from_ssm() {
  local var_name=$1
  local ssm_key=$2
  local default_value="${3:-}"

  local resolved
  resolved=$(resolve_env "$var_name" "$ssm_key" "$default_value")
  if [ -n "$resolved" ]; then
    export "$var_name=$resolved"
  fi
}

print_resolved_values() {
  echo "Resolved SSM parameters for stage '${STAGE}':" >&2
  env | awk '/^EXPO_PUBLIC_/ { print }' | sort >&2
}

load_cached_env() {
  if [ ! -f "$CACHE_FILE" ]; then
    return 1
  fi

  # shellcheck disable=SC1090
  source "$CACHE_FILE"
  echo "Loaded cached SSM parameters for stage '${STAGE}' from ${CACHE_FILE}." >&2
  return 0
}

write_cached_env() {
  local tmp_file

  mkdir -p "$CACHE_DIR"
  tmp_file=$(mktemp "${CACHE_DIR}/ssm-env-${STAGE}-${REGION}.XXXXXX")

  {
    printf '# cached by resolve-ssm-env.sh for stage %s region %s\n' "$STAGE" "$REGION"
    local var_name
    for var_name in "${CACHE_EXPORT_VARS[@]}"; do
      if [ -n "${!var_name:-}" ]; then
        printf 'export %s=%q\n' "$var_name" "${!var_name}"
      fi
    done
  } >"$tmp_file"

  mv "$tmp_file" "$CACHE_FILE"
}

main() {
  if load_cached_env; then
    print_resolved_values
    return 0
  fi

  local -a ssm_param_names=(
    expo-public-supabase-url
    expo-public-supabase-key
    expo-public-walletconnect-project-id
    expo-public-authentik-issuer
    expo-public-authentik-client-id
    expo-public-authentik-login-entry-mode
    database-url
  )

  # Auth provider config (stage-specific)
  # Dedicated pipeline stages (dashboard-dev, backend-dev, api-dev, identity-dev) must map to
  # the dev/testnet branch so Better Auth defaults fire. Prior wildcard fall-through wired
  # testnet releases to Authentik with empty defaults.
  case "$STAGE" in
    dev|*testnet*|*development*|dashboard-dev|backend-dev|backend-api-dev|api-dev|identity-dev|auth-dev|authentik-dev|admin-dev|backoffice-dev|backoffice-admin-dev)
      ssm_param_names+=(
        expo-public-better-auth-url-dev
        expo-public-auth-exchange-url-dev
        expo-public-authentik-social-login-mode-dev
        infra-backend-api-auth-better-auth-url-dev
        infra-backend-api-database-url-dev
        auth-better-auth-url-dev
        better-auth-url-dev
        alternun-testnet-mode-dev
        database-url-dev
      )
      ;;
    prod|production|*production*|dashboard-prod|dashboard-production|backend-prod|backend-api-prod|api-prod|api-production|identity-prod|identity-production|auth-prod|authentik-prod|admin-prod|admin-production|backoffice-prod|backoffice-admin-prod)
      # Production still resolves the stage-specific Better Auth URLs; the execution provider
      # is derived from those resolved URLs below so the deploy contract stays consistent.
      ssm_param_names+=(
        infra-backend-api-auth-better-auth-url-prod
        infra-backend-api-database-url-prod
        expo-public-better-auth-url-prod
        expo-public-auth-exchange-url-prod
        expo-public-authentik-social-login-mode-prod
        database-url-prod
      )
      ;;
    *)
      ssm_param_names+=(
        expo-public-better-auth-url
        expo-public-auth-exchange-url
        expo-public-authentik-social-login-mode
        database-url
      )
      ;;
  esac

  prime_ssm_param_cache "${ssm_param_names[@]}"

  export_env_from_ssm "EXPO_PUBLIC_SUPABASE_URL" "expo-public-supabase-url"
  export_env_from_ssm "EXPO_PUBLIC_SUPABASE_KEY" "expo-public-supabase-key"
  export_env_from_ssm "EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID" "expo-public-walletconnect-project-id"
  export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_ISSUER" "expo-public-authentik-issuer"
  export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_CLIENT_ID" "expo-public-authentik-client-id"
  export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE" "expo-public-authentik-login-entry-mode" "source"
  export_env_from_ssm "DATABASE_URL" "database-url"

  case "$STAGE" in
    dev|*testnet*|*development*|dashboard-dev|backend-dev|backend-api-dev|api-dev|identity-dev|auth-dev|authentik-dev|admin-dev|backoffice-dev|backoffice-admin-dev)
      export_env_from_ssm "EXPO_PUBLIC_BETTER_AUTH_URL" "expo-public-better-auth-url-dev" "https://testnet.api.alternun.co/auth"
      export_env_from_ssm "EXPO_PUBLIC_AUTH_EXCHANGE_URL" "expo-public-auth-exchange-url-dev" "https://testnet.api.alternun.co/auth/exchange"
      export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE" "expo-public-authentik-social-login-mode-dev" "better-auth"
      # Lambda-side vars: mode detection in better-auth-runtime.ts needs AUTH_BETTER_AUTH_URL
      # to enter embedded mode. Without these the Lambda silently falls back to Authentik.
      export_env_from_ssm "INFRA_BACKEND_API_AUTH_BETTER_AUTH_URL" "infra-backend-api-auth-better-auth-url-dev" "https://testnet.api.alternun.co"
      export_env_from_ssm "INFRA_BACKEND_API_DATABASE_URL" "infra-backend-api-database-url-dev"
      export_env_from_ssm "AUTH_BETTER_AUTH_URL" "auth-better-auth-url-dev" "https://testnet.api.alternun.co"
      export_env_from_ssm "BETTER_AUTH_URL" "better-auth-url-dev" "https://testnet.api.alternun.co"
      export_env_from_ssm "ALTERNUN_TESTNET_MODE" "alternun-testnet-mode-dev" "on"
      export_env_from_ssm "DATABASE_URL" "database-url-dev"
      ;;
    prod|production|*production*|dashboard-prod|dashboard-production|backend-prod|backend-api-prod|api-prod|api-production|identity-prod|identity-production|auth-prod|authentik-prod|admin-prod|admin-production|backoffice-prod|backoffice-admin-prod)
      # Production still resolves the stage-specific Better Auth URLs; the execution provider
      # is derived from those resolved URLs below so the deploy contract stays consistent.
      export_env_from_ssm "INFRA_BACKEND_API_AUTH_BETTER_AUTH_URL" "infra-backend-api-auth-better-auth-url-prod" "https://api.alternun.co"
      export_env_from_ssm "INFRA_BACKEND_API_DATABASE_URL" "infra-backend-api-database-url-prod"
      export_env_from_ssm "EXPO_PUBLIC_BETTER_AUTH_URL" "expo-public-better-auth-url-prod" "https://api.alternun.co/auth"
      export_env_from_ssm "EXPO_PUBLIC_AUTH_EXCHANGE_URL" "expo-public-auth-exchange-url-prod" "https://api.alternun.co/auth/exchange"
      export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE" "expo-public-authentik-social-login-mode-prod" "authentik"
      export_env_from_ssm "DATABASE_URL" "database-url-prod"
      ;;
    *)
      export_env_from_ssm "EXPO_PUBLIC_BETTER_AUTH_URL" "expo-public-better-auth-url" ""
      export_env_from_ssm "EXPO_PUBLIC_AUTH_EXCHANGE_URL" "expo-public-auth-exchange-url" ""
      export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE" "expo-public-authentik-social-login-mode" ""
      export_env_from_ssm "DATABASE_URL" "database-url" ""
      ;;
  esac

  if [ -n "${EXPO_PUBLIC_BETTER_AUTH_URL:-}" ]; then
    export AUTH_BETTER_AUTH_URL="${EXPO_PUBLIC_BETTER_AUTH_URL}"
  fi

  if [ -n "${EXPO_PUBLIC_AUTH_EXCHANGE_URL:-}" ]; then
    export AUTH_EXCHANGE_URL="${EXPO_PUBLIC_AUTH_EXCHANGE_URL}"
  fi

  export_env_from_ssm "INFRA_BACKEND_API_DATABASE_URL" "infra-backend-api-database-url"

  AUTH_EXECUTION_PROVIDER=$(resolve_auth_execution_provider)
  export AUTH_EXECUTION_PROVIDER
  export EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER="${AUTH_EXECUTION_PROVIDER}"

  if ! write_cached_env; then
    echo "WARN: Unable to write cached SSM env file at ${CACHE_FILE}; continuing without cache." >&2
  fi

  print_resolved_values
}

main "$@"
