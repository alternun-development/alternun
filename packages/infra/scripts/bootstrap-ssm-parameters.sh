#!/bin/bash
set -euo pipefail

# Bootstrap SSM Parameter Store with Expo public environment variables.
# Run once per AWS account/stage before CI/CD pipelines.
# Usage: ./bootstrap-ssm-parameters.sh [stage]

STAGE="${1:-${STACK:-${SST_STAGE:-dev}}}"
APP_NAME="${INFRA_APP_NAME:-alternun-infra}"
REGION="${AWS_REGION:-us-east-1}"

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI is required." >&2
  exit 1
fi

stage_normalized=$(printf '%s' "$STAGE" | tr '[:upper:]' '[:lower:]' | tr '_' '-')

case "$stage_normalized" in
  prod|api-prod|production|*production*)
    SUPABASE_URL="https://rjebeugdvwbjpaktrrbx.supabase.co"
    SUPABASE_KEY="${EXPO_PUBLIC_SUPABASE_KEY_PROD:-${SUPABASE_KEY_PROD:-${EXPO_PUBLIC_SUPABASE_KEY:-${SUPABASE_KEY:-}}}}"
    AUTHENTIK_ISSUER="https://sso.alternun.co/application/o/alternun-mobile/"
    BETTER_AUTH_URL="https://api.alternun.co/auth"
    AUTH_EXCHANGE_URL="https://api.alternun.co/auth/exchange"
    ;;
  dev|api-dev|*testnet*|*development*)
    SUPABASE_URL="https://rjebeugdvwbjpaktrrbx.supabase.co"
    SUPABASE_KEY="${EXPO_PUBLIC_SUPABASE_KEY_DEV:-${SUPABASE_KEY_DEV:-${EXPO_PUBLIC_SUPABASE_KEY:-${SUPABASE_KEY:-}}}}"
    AUTHENTIK_ISSUER="https://testnet.sso.alternun.co/application/o/alternun-mobile/"
    BETTER_AUTH_URL="https://testnet.api.alternun.co/auth"
    AUTH_EXCHANGE_URL="https://testnet.api.alternun.co/auth/exchange"
    ;;
  *)
    SUPABASE_URL="https://rjebeugdvwbjpaktrrbx.supabase.co"
    SUPABASE_KEY="${EXPO_PUBLIC_SUPABASE_KEY_PROD:-${SUPABASE_KEY_PROD:-${EXPO_PUBLIC_SUPABASE_KEY:-${SUPABASE_KEY:-}}}}"
    AUTHENTIK_ISSUER="https://testnet.sso.alternun.co/application/o/alternun-mobile/"
    BETTER_AUTH_URL="https://testnet.api.alternun.co/auth"
    AUTH_EXCHANGE_URL="https://testnet.api.alternun.co/auth/exchange"
    ;;
esac

if [ -z "${SUPABASE_KEY:-}" ]; then
  echo "ERROR: Missing Supabase publishable key for stage '${STAGE}'." >&2
  echo "Set EXPO_PUBLIC_SUPABASE_KEY_${stage_normalized^^} or SUPABASE_KEY_${stage_normalized^^} before bootstrapping SSM." >&2
  exit 1
fi

# Parameter definitions: key → (value, description, tier)
# tier: Standard (4KB) or Advanced (8KB)
declare -A PARAMS=(
  ["expo-public-supabase-url"]="${SUPABASE_URL}|Supabase API URL for Expo public auth|Standard"
  ["expo-public-supabase-key"]="${SUPABASE_KEY}|Supabase publishable key for Expo public auth|Standard"
  ["expo-public-walletconnect-project-id"]="d40ba2687be51a76e84b2c1d27235bb7|WalletConnect project ID for Expo web3|Standard"
  ["expo-public-authentik-issuer"]="${AUTHENTIK_ISSUER}|Authentik OIDC issuer URL|Standard"
  ["expo-public-authentik-client-id"]="alternun-mobile|Authentik OIDC client ID|Standard"
  ["expo-public-authentik-login-entry-mode"]="source|Authentik login entry mode|Standard"
  ["expo-public-better-auth-url-dev"]="https://testnet.api.alternun.co/auth|Better-auth base URL for dev stage|Standard"
  ["expo-public-auth-exchange-url-dev"]="https://testnet.api.alternun.co/auth/exchange|Better-auth exchange URL for dev stage|Standard"
  ["expo-public-better-auth-url-prod"]="https://api.alternun.co/auth|Better-auth base URL for prod stage|Standard"
  ["expo-public-auth-exchange-url-prod"]="https://api.alternun.co/auth/exchange|Better-auth exchange URL for prod stage|Standard"
)

put_param() {
  local key=$1
  local value=$2
  local description=$3
  local tier=$4
  local param_name="/${APP_NAME}/${STAGE}/${key}"

  echo "Putting SSM parameter: ${param_name}"

  aws ssm put-parameter \
    --name "$param_name" \
    --value "$value" \
    --description "$description" \
    --type "String" \
    --tier "$tier" \
    --region "$REGION" \
    --overwrite \
    2>&1 | grep -E "Version|Tier" || true
}

echo "Bootstrapping SSM parameters for stage '${STAGE}' in region '${REGION}'..."
echo "App: ${APP_NAME}"
echo

for key in "${!PARAMS[@]}"; do
  IFS='|' read -r value description tier <<<"${PARAMS[$key]}"
  put_param "$key" "$value" "$description" "$tier"
done

echo
echo "Bootstrap complete. Verify with:"
echo "  aws ssm describe-parameters --region ${REGION} --filters 'Key=Name,Values=/${APP_NAME}/${STAGE}/*' --query 'Parameters[].Name'"
