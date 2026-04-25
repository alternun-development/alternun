#!/bin/bash
set -euo pipefail

# Bootstrap SSM Parameter Store with Expo public environment variables.
# Run once per AWS account/stage before CI/CD pipelines.
# Usage: ./bootstrap-ssm-parameters.sh [stage]

STAGE="${1:-${STACK:-${SST_STAGE:-dev}}}"
APP_NAME="${INFRA_APP_NAME:-alternun-infra}"
REGION="${AWS_REGION:-us-east-1}"
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../../.." && pwd)

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI is required." >&2
  exit 1
fi

load_env_file() {
  local env_file=$1
  local line key value

  [ -f "$env_file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"

    case "$line" in
      '' | \#*) continue ;;
      export\ *) line="${line#export }" ;;
    esac

    key=${line%%=*}
    value=${line#*=}

    key=$(echo "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    value=$(echo "$value" | sed -e 's/^[[:space:]]*//')

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value=${value:1:${#value}-2}
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value=${value:1:${#value}-2}
    fi

    if [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      if [[ -n "${!key+x}" ]]; then
        continue
      fi
      export "$key=$value"
    fi
  done < "$env_file"
}

resolve_publishable_key_stage_suffix() {
  case "${1:-}" in
    prod|api-prod|production|*production*)
      printf '%s\n' 'PROD'
      ;;
    dev|api-dev|*testnet*|*development*)
      printf '%s\n' 'DEV'
      ;;
    *)
      printf '%s\n' "$(printf '%s' "${1:-}" | tr '[:lower:]-' '[:upper:]_')"
      ;;
  esac
}

resolve_publishable_key() {
  local stage_suffix=$1
  local candidate

  for candidate in \
    "SUPABASE_PUBLISHABLE_KEY_${stage_suffix}" \
    "EXPO_PUBLIC_SUPABASE_KEY_${stage_suffix}" \
    "SUPABASE_KEY_${stage_suffix}" \
    "SUPABASE_PUBLISHABLE_KEY" \
    "EXPO_PUBLIC_SUPABASE_KEY" \
    "SUPABASE_KEY" \
    "EXPO_PUBLIC_SUPABASE_ANON_KEY" \
    "SUPABASE_ANON_KEY"
  do
    if [ -n "${!candidate:-}" ]; then
      printf '%s\n' "${!candidate}"
      return 0
    fi
  done
}

first_non_empty() {
  local value
  for value in "$@"; do
    if [ -n "${value:-}" ]; then
      printf '%s\n' "$value"
      return 0
    fi
  done

  printf '\n'
}

load_env_file "$REPO_ROOT/.env"

require_expected_account() {
  local expected_account_id=${INFRA_AWS_ACCOUNT_ID:-}
  local current_account_id

  if [ -z "$expected_account_id" ]; then
    echo "ERROR: INFRA_AWS_ACCOUNT_ID is not set. Refusing to write AWS resources." >&2
    echo "Set INFRA_AWS_ACCOUNT_ID in packages/infra/.env before bootstrapping SSM." >&2
    exit 1
  fi

  current_account_id=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || true)
  if [ -z "$current_account_id" ] || [ "$current_account_id" = "None" ]; then
    echo "ERROR: Unable to resolve AWS account via STS. Check credentials before bootstrapping SSM." >&2
    exit 1
  fi

  if [ "$current_account_id" != "$expected_account_id" ]; then
    echo "ERROR: AWS account mismatch. Expected ${expected_account_id}, got ${current_account_id}." >&2
    echo "Refusing to seed SSM in the wrong account." >&2
    exit 1
  fi
}

require_expected_account

stage_normalized=$(printf '%s' "$STAGE" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
stage_key_suffix=$(resolve_publishable_key_stage_suffix "$stage_normalized")

case "$stage_normalized" in
  prod|api-prod|production|*production*)
    SUPABASE_URL="https://rjebeugdvwbjpaktrrbx.supabase.co"
    AUTHENTIK_ISSUER="https://sso.alternun.co/application/o/alternun-mobile/"
    BETTER_AUTH_URL="https://api.alternun.co/auth"
    AUTH_EXCHANGE_URL="https://api.alternun.co/auth/exchange"
    ;;
  dev|api-dev|*testnet*|*development*)
    SUPABASE_URL="https://aznfyazjndfniwsocdka.supabase.co"
    AUTHENTIK_ISSUER="https://testnet.sso.alternun.co/application/o/alternun-mobile/"
    BETTER_AUTH_URL="https://testnet.api.alternun.co/auth"
    AUTH_EXCHANGE_URL="https://testnet.api.alternun.co/auth/exchange"
    ;;
  *)
    SUPABASE_URL="https://rjebeugdvwbjpaktrrbx.supabase.co"
    AUTHENTIK_ISSUER="https://testnet.sso.alternun.co/application/o/alternun-mobile/"
    BETTER_AUTH_URL="https://testnet.api.alternun.co/auth"
    AUTH_EXCHANGE_URL="https://testnet.api.alternun.co/auth/exchange"
    ;;
esac

SUPABASE_KEY=$(resolve_publishable_key "$stage_key_suffix")
POSTMARK_SMTP_SERVER_VALUE=$(first_non_empty "${POSTMARK_SMTP_SERVER:-}" "smtp.postmarkapp.com")
POSTMARK_SMTP_PORT_VALUE=$(first_non_empty "${POSTMARK_SMTP_PORT:-}" "587")
POSTMARK_SMTP_USERNAME_VALUE=$(first_non_empty \
  "${POSTMARK_SMTP_USERNAME:-}" \
  "${POSTMARK_SMTP_ACCESS_KEY:-}" \
  "${POSTMARK_SERVER_TOKEN:-}" \
  "${POSTMARK_SERVER_API_TOKEN:-}" \
  "${POSTMARK_API_TOKEN:-}")
POSTMARK_SMTP_PASSWORD_VALUE=$(first_non_empty \
  "${POSTMARK_SMTP_PASSWORD:-}" \
  "${POSTMARK_SMTP_SECRET_KEY:-}" \
  "${POSTMARK_SERVER_TOKEN:-}" \
  "${POSTMARK_SERVER_API_TOKEN:-}" \
  "${POSTMARK_API_TOKEN:-}")
POSTMARK_SMTP_ACCESS_KEY_VALUE=$(first_non_empty "${POSTMARK_SMTP_ACCESS_KEY:-}" "${POSTMARK_SMTP_USERNAME:-}")
POSTMARK_SMTP_SECRET_KEY_VALUE=$(first_non_empty "${POSTMARK_SMTP_SECRET_KEY:-}" "${POSTMARK_SMTP_PASSWORD:-}")
POSTMARK_SERVER_TOKEN_VALUE=$(first_non_empty \
  "${POSTMARK_SERVER_TOKEN:-}" \
  "${POSTMARK_SERVER_API_TOKEN:-}" \
  "${POSTMARK_API_TOKEN:-}")
postmark_api_token_value=$(first_non_empty \
  "${POSTMARK_API_TOKEN:-}" \
  "${POSTMARK_SERVER_TOKEN:-}" \
  "${POSTMARK_SERVER_API_TOKEN:-}")
EMAIL_SENDER_NAME_VALUE=$(first_non_empty "${EMAIL_SENDER_NAME:-}" "Alternun")
EMAIL_FROM_VALUE=$(first_non_empty "${EMAIL_FROM:-}" "noreply@alternun.co")

if [ -z "${SUPABASE_KEY:-}" ]; then
  echo "ERROR: Missing Supabase publishable key for stage '${STAGE}'." >&2
  echo "Set SUPABASE_PUBLISHABLE_KEY_${stage_key_suffix}, EXPO_PUBLIC_SUPABASE_KEY_${stage_key_suffix}, or the legacy EXPO_PUBLIC_SUPABASE_KEY / SUPABASE_KEY aliases before bootstrapping SSM." >&2
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
  ["expo-public-enable-social-auth"]="false|Enable social auth (Google, Discord) for mobile app|Standard"
  ["postmark-api-token"]="${postmark_api_token_value}|Postmark API token for transactional emails|Standard"
  ["postmark-smtp-server"]="${POSTMARK_SMTP_SERVER_VALUE}|Postmark SMTP server address|Standard"
  ["postmark-smtp-port"]="${POSTMARK_SMTP_PORT_VALUE}|Postmark SMTP server port|Standard"
  ["postmark-smtp-username"]="${POSTMARK_SMTP_USERNAME_VALUE}|Postmark SMTP username|Standard"
  ["postmark-smtp-password"]="${POSTMARK_SMTP_PASSWORD_VALUE}|Postmark SMTP password|Standard"
  ["postmark-smtp-access-key"]="${POSTMARK_SMTP_ACCESS_KEY_VALUE}|Postmark SMTP access key alias|Standard"
  ["postmark-smtp-secret-key"]="${POSTMARK_SMTP_SECRET_KEY_VALUE}|Postmark SMTP secret key alias|Standard"
  ["postmark-server-token"]="${POSTMARK_SERVER_TOKEN_VALUE}|Postmark server token alias|Standard"
  ["postmark-server-api-token"]="${POSTMARK_SERVER_TOKEN_VALUE}|Postmark server API token alias|Standard"
  ["email-sender-name"]="${EMAIL_SENDER_NAME_VALUE}|Default sender name for transactional emails|Standard"
  ["email-from"]="${EMAIL_FROM_VALUE}|Default from email address|Standard"
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
