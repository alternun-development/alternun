#!/bin/bash
set -euo pipefail

# Resolve auth credentials from AWS Secrets Manager for pipeline builds that
# actually need server-side Google/Discord creds. Expo/mobile bundles do not
# need these values and should skip this helper.

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
elif [ "${INFRA_IDENTITY_ENABLED:-false}" != "true" ] && [ "${INFRA_ENABLE_BACKEND_API:-false}" != "true" ]; then
  echo "Skipped Secrets Manager auth env resolution for stage '${STACK}' because no backend or identity auth build is enabled." >&2
else
  backend_google_client_id=${INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_ID:-${GOOGLE_AUTH_CLIENT_ID:-}}
  backend_google_client_secret=${INFRA_BACKEND_API_GOOGLE_AUTH_CLIENT_SECRET:-${GOOGLE_AUTH_CLIENT_SECRET:-}}
  identity_google_client_id=${INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_ID:-}
  identity_google_client_secret=${INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_SECRET:-}
  backend_discord_client_id=${INFRA_BACKEND_API_DISCORD_AUTH_CLIENT_ID:-${DISCORD_AUTH_CLIENT_ID:-${DISCORD_CLIENT_ID:-}}}
  backend_discord_client_secret=${INFRA_BACKEND_API_DISCORD_AUTH_CLIENT_SECRET:-${DISCORD_AUTH_CLIENT_SECRET:-${DISCORD_CLIENT_SECRET:-}}}

  # Google and Discord are both optional. If configured directly, require a
  # complete credential pair before bypassing hydration; a half-configured
  # provider must still be resolved from the integration secret (or fail
  # clearly below).
  backend_google_credentials_complete=false
  identity_google_credentials_complete=false
  bootstrap_google_credentials_complete=false
  backend_discord_credentials_complete=false
  backend_discord_not_configured=false
  backend_google_not_configured=false
  [ -n "$backend_google_client_id" ] && [ -n "$backend_google_client_secret" ] && backend_google_credentials_complete=true
  [ -n "$identity_google_client_id" ] && [ -n "$identity_google_client_secret" ] && identity_google_credentials_complete=true
  { [ "$backend_google_credentials_complete" = "true" ] || [ "$identity_google_credentials_complete" = "true" ]; } && bootstrap_google_credentials_complete=true
  [ -n "$backend_discord_client_id" ] && [ -n "$backend_discord_client_secret" ] && backend_discord_credentials_complete=true
  [ -z "$backend_discord_client_id" ] && [ -z "$backend_discord_client_secret" ] && backend_discord_not_configured=true
  [ -z "$backend_google_client_id" ] && [ -z "$backend_google_client_secret" ] && backend_google_not_configured=true

  if [ "${INFRA_IDENTITY_ENABLED:-false}" != "true" ] && \
    { [ "$backend_google_credentials_complete" = "true" ] || [ "$backend_google_not_configured" = "true" ]; } && \
    { [ "$backend_discord_credentials_complete" = "true" ] || [ "$backend_discord_not_configured" = "true" ]; }; then
  # Better Auth owns backend social login. Once the Authentik stack is retired,
  # dashboard deployments must be able to use their independently configured
  # OAuth credentials without resolving the retired identity secret. An absent
  # Google or Discord pair intentionally leaves that optional provider disabled.
    if [ "$backend_google_credentials_complete" = "true" ] || [ "$backend_discord_credentials_complete" = "true" ]; then
      echo "Skipped retired identity secret resolution for backend stage '${STACK}'; configured backend OAuth credentials are complete." >&2
    else
      echo "Skipped retired identity secret resolution for backend stage '${STACK}'; Google and Discord OAuth are both unconfigured (optional)." >&2
    fi
    return 0 2>/dev/null || exit 0
  fi

  integration_config_secret_name=$(scope_secret_name "${INFRA_IDENTITY_SECRET_INTEGRATION_CONFIG_NAME:-${APP_NAME}/identity/integration-config}" "$identity_stage")
  if [ -z "$integration_config_secret_name" ]; then
    echo "ERROR: Could not resolve the identity integration-config secret name for stage '${STACK}'." >&2
    exit 1
  fi

  integration_config_secret_json=$(get_secret_json "$integration_config_secret_name" || true)
  if [ -z "$integration_config_secret_json" ] || [ "$integration_config_secret_json" = "None" ]; then
    if [ "${INFRA_IDENTITY_ENABLED:-false}" = "true" ] && \
      [ "$bootstrap_google_credentials_complete" = "true" ]; then
      # The first identity deployment creates this secret itself. Direct Google
      # credentials are sufficient to synthesize that initial secret version;
      # later deployments hydrate the generated OIDC and bootstrap values here.
      echo "Identity integration-config secret ${integration_config_secret_name} will be created by the identity stack." >&2
      return 0 2>/dev/null || exit 0
    fi

    echo "ERROR: Missing identity integration-config secret at ${integration_config_secret_name}." >&2
    echo "ERROR: Initial identity bootstrap requires configured Google OAuth credentials." >&2
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
