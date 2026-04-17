#!/bin/bash
set -euo pipefail

# Resolve environment variables from AWS Systems Manager Parameter Store.
# Called by CI/CD pipeline and CodeBuild when .env files are not available.
# Priority: shell env → SSM params → defaults

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Ensure AWS CLI is available
if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI is required to resolve SSM parameters." >&2
  exit 1
fi

# Stage/prefix from env
APP_NAME="${INFRA_APP_NAME:-alternun-infra}"
STAGE="${STACK:-${SST_STAGE:-dev}}"
REGION="${AWS_REGION:-us-east-1}"

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

# SSM parameter name builder: /{app}/{stage}/{param_key}
# e.g. /alternun-infra/dev/expo-public-authentik-social-login-mode
build_param_name() {
  local key=$1
  local prefix="${2:-${APP_NAME}}"
  local stage="${3:-${STAGE}}"
  echo "/${prefix}/${stage}/${key}"
}

# Get a single param; echo empty string if not found (don't error)
get_ssm_param() {
  local key=$1
  local param_name=$(build_param_name "$key")

  aws ssm get-parameter \
    --name "$param_name" \
    --region "$REGION" \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo ""
}

# Resolve with priority: shell env → SSM → default
resolve_env() {
  local var_name=$1
  local ssm_key=$2
  local default_value="${3:-}"

  # Already in shell env: keep it
  if [ -n "${!var_name+x}" ] && [ -n "${!var_name}" ]; then
    echo "${!var_name}"
    return 0
  fi

  # Try SSM
  local ssm_value=$(get_ssm_param "$ssm_key")
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

  local resolved=$(resolve_env "$var_name" "$ssm_key" "$default_value")
  if [ -n "$resolved" ]; then
    export "$var_name=$resolved"
  fi
}

# Common Expo public auth env vars that aren't in pipeline .env
# These should be stored in SSM for CI/CD safety
export_env_from_ssm "EXPO_PUBLIC_SUPABASE_URL" "expo-public-supabase-url"
export_env_from_ssm "EXPO_PUBLIC_SUPABASE_KEY" "expo-public-supabase-key"
export_env_from_ssm "EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID" "expo-public-walletconnect-project-id"
export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_ISSUER" "expo-public-authentik-issuer"
export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_CLIENT_ID" "expo-public-authentik-client-id"
export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE" "expo-public-authentik-login-entry-mode" "source"

# Auth provider config (stage-specific)
case "$STAGE" in
  dev|*testnet*|*development*)
    # Testnet: Use Better Auth execution with Authentik social buttons visible.
    export_env_from_ssm "EXPO_PUBLIC_BETTER_AUTH_URL" "expo-public-better-auth-url-dev" "https://testnet.api.alternun.co/auth"
    export_env_from_ssm "EXPO_PUBLIC_AUTH_EXCHANGE_URL" "expo-public-auth-exchange-url-dev" "https://testnet.api.alternun.co/auth/exchange"
    export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE" "expo-public-authentik-social-login-mode-dev" "authentik"
    ;;
  prod|production|*production*)
    # Production: Use Authentik social buttons with the current execution path.
    export_env_from_ssm "EXPO_PUBLIC_BETTER_AUTH_URL" "expo-public-better-auth-url-prod" "https://api.alternun.co/auth"
    export_env_from_ssm "EXPO_PUBLIC_AUTH_EXCHANGE_URL" "expo-public-auth-exchange-url-prod" "https://api.alternun.co/auth/exchange"
    export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE" "expo-public-authentik-social-login-mode-prod" "authentik"
    ;;
  *)
    export_env_from_ssm "EXPO_PUBLIC_BETTER_AUTH_URL" "expo-public-better-auth-url" ""
    export_env_from_ssm "EXPO_PUBLIC_AUTH_EXCHANGE_URL" "expo-public-auth-exchange-url" ""
    export_env_from_ssm "EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE" "expo-public-authentik-social-login-mode" ""
    ;;
esac

# List resolved values (for debugging)
echo "Resolved SSM parameters for stage '${STAGE}':" >&2
env | grep "EXPO_PUBLIC_" | sort >&2
