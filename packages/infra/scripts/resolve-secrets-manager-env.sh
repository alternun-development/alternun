#!/bin/bash
set -euo pipefail

# Resolve auth credentials from AWS Secrets Manager for pipeline builds.
# Called by CI/CD before infra synthesis so dashboard/backend specs can read
# the Google/Discord client IDs and secrets from the identity integration-config secret.

APP_NAME="${INFRA_APP_NAME:-alternun-infra}"
STACK="${STACK:-${SST_STAGE:-dev}}"
REGION="${AWS_REGION:-us-east-1}"

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI is required to resolve Secrets Manager auth env." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required to resolve Secrets Manager auth env." >&2
  exit 1
fi

sanitize_secret_name() {
  local raw=${1:-}
  raw="${raw#/}"
  raw="${raw%/}"
  printf '%s\n' "$raw"
}

scope_secret_name() {
  local secret_name stage_name normalized
  secret_name=${1:-}
  stage_name=${2:-}
  normalized=$(sanitize_secret_name "$secret_name")

  if [ -z "$normalized" ]; then
    printf '%s\n' ""
    return 0
  fi

  if [[ "$normalized" == */"$stage_name" ]] || [[ "$normalized" == *-"$stage_name" ]]; then
    printf '%s\n' "$normalized"
    return 0
  fi

  printf '%s\n' "${normalized}/${stage_name}"
}

resolve_identity_secret_stage() {
  case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]' | tr '_' '-')" in
    identity-dev|identitydev|auth-dev|authentik-dev|dashboard-dev|dashboardapi-dev|dashboard-admin-dev|backend-dev|backend-api-dev|api-dev|admin-dev|backoffice-dev|backoffice-admin-dev|*testnet*|*development*)
      printf '%s\n' 'identity-dev'
      ;;
    identity-prod|identityprod|identity-production|auth-prod|authentik-prod|dashboard-prod|dashboard-production|dashboardapi-prod|dashboard-admin-prod|backend-prod|backend-api-prod|api-prod|api-production|admin-prod|admin-production|backoffice-prod|backoffice-admin-prod)
      printf '%s\n' 'identity-prod'
      ;;
    mobile|preview|identity-mobile|auth-mobile|authentik-mobile)
      printf '%s\n' 'identity-mobile'
      ;;
    *)
      printf '%s\n' ''
      ;;
  esac
}

get_secret_json() {
  aws --region "${REGION}" secretsmanager get-secret-value --secret-id "$1" --query SecretString --output text 2>/dev/null
}

export_if_empty() {
  local var_name=$1 value=${2:-}

  if [ -n "${!var_name+x}" ] && [ -n "${!var_name}" ]; then
    return 0
  fi

  if [ -n "$value" ] && [ "$value" != "null" ]; then
    export "${var_name}=${value}"
  fi
}

identity_stage=$(resolve_identity_secret_stage "$STACK")
if [ -z "$identity_stage" ]; then
  echo "Skipped Secrets Manager auth env resolution for stage '${STACK}'." >&2
else
  integration_config_secret_name=$(scope_secret_name "${INFRA_IDENTITY_SECRET_INTEGRATION_CONFIG_NAME:-${APP_NAME}/identity/integration-config}" "$identity_stage")
  if [ -z "$integration_config_secret_name" ]; then
    echo "ERROR: Could not resolve the identity integration-config secret name for stage '${STACK}'." >&2
    exit 1
  fi

  integration_config_secret_json=$(get_secret_json "$integration_config_secret_name" || true)
  if [ -z "$integration_config_secret_json" ] || [ "$integration_config_secret_json" = "None" ]; then
    echo "ERROR: Missing identity integration-config secret at ${integration_config_secret_name}." >&2
    exit 1
  fi

  google_client_id=$(printf '%s' "$integration_config_secret_json" | jq -r '.googleClientId // empty')
  google_client_secret=$(printf '%s' "$integration_config_secret_json" | jq -r '.googleClientSecret // empty')
  discord_client_id=$(printf '%s' "$integration_config_secret_json" | jq -r '.discordClientId // empty')
  discord_client_secret=$(printf '%s' "$integration_config_secret_json" | jq -r '.discordClientSecret // empty')

  if [ -z "$google_client_id" ] || [ -z "$google_client_secret" ]; then
    echo "ERROR: Secret ${integration_config_secret_name} does not contain Google OAuth credentials." >&2
    exit 1
  fi

  export_if_empty INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_ID "$google_client_id"
  export_if_empty INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_SECRET "$google_client_secret"
  export_if_empty INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_ID "$google_client_id"
  export_if_empty INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_SECRET "$google_client_secret"
  export_if_empty GOOGLE_AUTH_CLIENT_ID "$google_client_id"
  export_if_empty GOOGLE_AUTH_CLIENT_SECRET "$google_client_secret"
  export_if_empty GOOGLEA_AUTH_CLIENT_SECRET "$google_client_secret"

  export_if_empty INFRA_IDENTITY_DISCORD_AUTH_CLIENT_ID "$discord_client_id"
  export_if_empty INFRA_IDENTITY_DISCORD_AUTH_CLIENT_SECRET "$discord_client_secret"
  export_if_empty INFRA_BACKEND_API_DISCORD_AUTH_CLIENT_ID "$discord_client_id"
  export_if_empty INFRA_BACKEND_API_DISCORD_AUTH_CLIENT_SECRET "$discord_client_secret"
  export_if_empty DISCORD_AUTH_CLIENT_ID "$discord_client_id"
  export_if_empty DISCORD_AUTH_CLIENT_SECRET "$discord_client_secret"
  export_if_empty DISCORD_CLIENT_ID "$discord_client_id"
  export_if_empty DISCORD_CLIENT_SECRET "$discord_client_secret"

  echo "Resolved Secrets Manager auth env from ${integration_config_secret_name} for stage '${STACK}'." >&2
fi
