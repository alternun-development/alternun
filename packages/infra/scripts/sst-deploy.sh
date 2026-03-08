#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
INFRA_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

STACK=${STACK:-${1:-${SST_STAGE:-production}}}
export STACK
export SST_STAGE="${SST_STAGE:-$STACK}"

stage_normalized=$(echo "$STACK" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
is_identity_stage=false
if [ "$stage_normalized" = "identity-dev" ] || \
  [ "$stage_normalized" = "identity-prod" ] || \
  [ "$stage_normalized" = "identity-production" ] || \
  [ "$stage_normalized" = "auth-dev" ] || \
  [ "$stage_normalized" = "auth-prod" ] || \
  [ "$stage_normalized" = "authentik-dev" ] || \
  [ "$stage_normalized" = "authentik-prod" ]; then
  is_identity_stage=true
fi

if [ "${INFRA_ENABLE_EXPO_SITE:-true}" = "false" ] && \
  [ "$is_identity_stage" != "true" ]; then
  echo "ERROR: INFRA_ENABLE_EXPO_SITE=false is only allowed on identity stack stages." >&2
  echo "ERROR: Use STACK=identity-dev or STACK=identity-prod for identity-only deployments." >&2
  exit 1
fi

if [ "$is_identity_stage" = "true" ] && \
  [ "${INFRA_IDENTITY_ENABLED:-false}" != "true" ] && \
  [ "${INFRA_ALLOW_IDENTITY_DISABLE:-false}" != "true" ]; then
  echo "ERROR: Refusing to deploy identity stack ${STACK} with INFRA_IDENTITY_ENABLED=${INFRA_IDENTITY_ENABLED:-false}." >&2
  echo "ERROR: Set INFRA_IDENTITY_ENABLED=true for identity stack deploys." >&2
  echo "ERROR: If you intentionally need a destructive identity disable, set INFRA_ALLOW_IDENTITY_DISABLE=true." >&2
  exit 1
fi

if [ -z "${DOMAIN:-}" ]; then
  case "$STACK" in
    production)
      export DOMAIN="${DOMAIN_PRODUCTION:-${DOMAIN_ROOT:-}}"
      ;;
    dev)
      export DOMAIN="${DOMAIN_DEV:-dev.${DOMAIN_ROOT:-}}"
      ;;
    mobile)
      export DOMAIN="${DOMAIN_MOBILE:-mobile.${DOMAIN_ROOT:-}}"
      ;;
    *)
      export DOMAIN="${DOMAIN_CUSTOM:-${STACK}.${DOMAIN_ROOT:-}}"
      ;;
  esac
fi

is_truthy() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES | on | ON) return 0 ;;
    *) return 1 ;;
  esac
}

remove_state_resource() {
  local target=$1

  if [ -z "$target" ]; then
    return 0
  fi

  echo "Pruning legacy managed certificate state for ${target}..."

  local remove_output
  if remove_output=$(
    printf 'y\n' | (
      cd "$INFRA_DIR" &&
        SST_TELEMETRY_DISABLED=1 npx sst state remove --stage "$STACK" "$target"
    ) 2>&1
  ); then
    echo "Removed state resource: ${target}"
    return 0
  fi

  if printf '%s' "$remove_output" | grep -q "No changes made"; then
    echo "No legacy state changes required for ${target}."
    return 0
  fi

  echo "WARN: Failed to remove state resource ${target}; continuing. Output: ${remove_output}" >&2
  return 0
}

prune_legacy_managed_certificate_state() {
  local prefixes=()

  if [ -n "${INFRA_EXPO_CERT_ARN_PRODUCTION:-}" ] && [ "$STACK" = "production" ]; then
    prefixes+=("expo-web-${STACK}CdnSsl")
  fi

  if [ -n "${INFRA_EXPO_CERT_ARN_DEV:-}" ] && [ "$STACK" = "dev" ]; then
    prefixes+=("expo-web-${STACK}CdnSsl")
  fi

  if [ -n "${INFRA_EXPO_CERT_ARN_MOBILE:-}" ] && [ "$STACK" = "mobile" ]; then
    prefixes+=("expo-web-${STACK}CdnSsl")
  fi

  if [ "$STACK" = "dev" ]; then
    if is_truthy "${INFRA_REDIRECT_AIRS_TO_DEV:-true}" && [ -n "${INFRA_REDIRECT_AIRS_TO_DEV_CERT_ARN:-}" ]; then
      prefixes+=("airs-domain-redirect-${STACK}CdnSsl")
    fi

    if is_truthy "${INFRA_REDIRECT_DEV_TO_TESTNET:-true}" && [ -n "${INFRA_REDIRECT_DEV_TO_TESTNET_CERT_ARN:-}" ]; then
      prefixes+=("dev-domain-redirect-${STACK}CdnSsl")
    fi

    if is_truthy "${INFRA_REDIRECT_ROOT_DOMAIN:-true}" && [ -n "${INFRA_REDIRECT_ROOT_CERT_ARN:-}" ]; then
      prefixes+=("root-domain-redirect-${STACK}CdnSsl")
    fi
  fi

  if [ "${#prefixes[@]}" -eq 0 ]; then
    return 0
  fi

  local prefix
  for prefix in "${prefixes[@]}"; do
    remove_state_resource "$prefix"
  done
}

remove_cloudfront_alias() {
  local alias_domain=$1

  if [ -z "$alias_domain" ]; then
    return 0
  fi

  if ! command -v aws >/dev/null 2>&1; then
    echo "WARN: aws CLI not found; cannot clean CloudFront alias ${alias_domain}." >&2
    return 0
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "WARN: jq not found; cannot clean CloudFront alias ${alias_domain}." >&2
    return 0
  fi

  local dist_ids
  dist_ids=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items!=null && contains(Aliases.Items, '${alias_domain}')].Id" --output text 2>/dev/null || true)

  if [ -z "$dist_ids" ] || [ "$dist_ids" = "None" ]; then
    echo "No existing CloudFront distribution found for alias ${alias_domain}."
    return 0
  fi

  for dist_id in $dist_ids; do
    echo "Removing alias ${alias_domain} from CloudFront distribution ${dist_id}..."
    local cfg_json cfg_mod etag
    cfg_json=$(mktemp)
    cfg_mod=$(mktemp)

    if ! aws cloudfront get-distribution-config --id "$dist_id" --output json > "$cfg_json" 2>/dev/null; then
      echo "WARN: Failed to fetch CloudFront config for distribution ${dist_id}." >&2
      rm -f "$cfg_json" "$cfg_mod"
      continue
    fi

    etag=$(jq -r '.ETag // empty' "$cfg_json")
    if [ -z "$etag" ]; then
      echo "WARN: Missing ETag for distribution ${dist_id}; skipping alias cleanup." >&2
      rm -f "$cfg_json" "$cfg_mod"
      continue
    fi

    jq --arg alias "$alias_domain" '
      .DistributionConfig
      | .Aliases.Items = ((.Aliases.Items // []) | map(select(. != $alias)))
      | .Aliases.Quantity = (.Aliases.Items | length)
      | if .Aliases.Quantity == 0 then
          .ViewerCertificate = { "CloudFrontDefaultCertificate": true }
        else
          .
        end
    ' "$cfg_json" > "$cfg_mod"

    if aws cloudfront update-distribution --id "$dist_id" --if-match "$etag" --distribution-config "file://${cfg_mod}" >/dev/null 2>&1; then
      echo "Removed alias ${alias_domain} from distribution ${dist_id}."
    else
      echo "WARN: Failed to remove alias ${alias_domain} from distribution ${dist_id}." >&2
    fi

    rm -f "$cfg_json" "$cfg_mod"
  done
}

cleanup_deploy_aliases() {
  if ! is_truthy "${APPROVE:-false}"; then
    return 0
  fi

  local aliases=()
  aliases+=("${DOMAIN}")

  if [ "$STACK" = "dev" ]; then
    if is_truthy "${INFRA_REDIRECT_AIRS_TO_DEV:-true}"; then
      aliases+=("${INFRA_REDIRECT_AIRS_TO_DEV_SOURCE:-${INFRA_EXPO_DOMAIN_PRODUCTION:-${DOMAIN_PRODUCTION:-}}}")
    fi

    if is_truthy "${INFRA_REDIRECT_DEV_TO_TESTNET:-true}"; then
      aliases+=("${INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:-}")
    fi

    if is_truthy "${INFRA_REDIRECT_ROOT_DOMAIN:-true}"; then
      aliases+=("${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-}}")
    fi
  fi

  declare -A seen=()
  local alias_domain
  for alias_domain in "${aliases[@]}"; do
    if [ -z "$alias_domain" ] || [ -n "${seen[$alias_domain]:-}" ]; then
      continue
    fi
    seen[$alias_domain]=1
    remove_cloudfront_alias "$alias_domain"
  done
}

bash "$SCRIPT_DIR/validate-deploy-context.sh" "$STACK"

if [ "${RUN_PREDEPLOY_CHECKS:-true}" != "false" ]; then
  SKIP_CONTEXT_VALIDATION=true bash "$SCRIPT_DIR/predeploy-checks.sh" "$STACK"
fi

if is_truthy "${INFRA_ENABLE_ALIAS_CLEANUP:-false}"; then
  cleanup_deploy_aliases
else
  echo "Skipping CloudFront alias cleanup (INFRA_ENABLE_ALIAS_CLEANUP=${INFRA_ENABLE_ALIAS_CLEANUP:-false})"
fi

prune_legacy_managed_certificate_state

echo "Using SST stack/stage: ${STACK} (cwd: ${INFRA_DIR})"

if is_truthy "${INFRA_ENABLE_SST_DIFF:-false}"; then
  echo "Running SST diff (preview of infra changes)"
  (cd "$INFRA_DIR" && SST_TELEMETRY_DISABLED=1 npx sst diff --stage "$STACK") || true
else
  echo "Skipping sst diff (INFRA_ENABLE_SST_DIFF=${INFRA_ENABLE_SST_DIFF:-false})"
fi

if ! is_truthy "${APPROVE:-false}"; then
  echo "Preview completed. Re-run with APPROVE=true to apply changes."
  exit 0
fi

echo "APPROVE=true detected — running sst deploy"
echo "Attempting to clear any stale SST lock for stage ${STACK} (no-op if none)"
(cd "$INFRA_DIR" && SST_TELEMETRY_DISABLED=1 npx sst unlock --stage "$STACK") || true

run_sst_deploy() {
  local log_file=$1
  local exit_code=0

  set +e
  (
    cd "$INFRA_DIR"
    env SST_TELEMETRY_DISABLED=1 npx sst deploy --stage "$STACK" --yes
  ) 2>&1 | tee "$log_file"
  exit_code=${PIPESTATUS[0]}
  set -e

  return "$exit_code"
}

should_attempt_bucket_drift_recovery() {
  local log_file=$1

  if ! is_truthy "${INFRA_ENABLE_BUCKET_DRIFT_RECOVERY:-true}"; then
    return 1
  fi

  if [ "${INFRA_ENABLE_EXPO_SITE:-true}" != "true" ]; then
    return 1
  fi

  if grep -q "NoSuchBucket" "$log_file"; then
    return 0
  fi

  if grep -q "The specified bucket does not exist" "$log_file"; then
    return 0
  fi

  return 1
}

DEPLOY_LOG=$(mktemp)
echo "Running sst deploy"
if run_sst_deploy "$DEPLOY_LOG"; then
  rm -f "$DEPLOY_LOG"
  exit 0
fi

if should_attempt_bucket_drift_recovery "$DEPLOY_LOG"; then
  echo "Detected missing S3 bucket during deploy. Running sst refresh once before retry..."
  (
    cd "$INFRA_DIR"
    env SST_TELEMETRY_DISABLED=1 npx sst refresh --stage "$STACK"
  )

  echo "Retrying sst deploy after refresh"
  if run_sst_deploy "$DEPLOY_LOG"; then
    rm -f "$DEPLOY_LOG"
    exit 0
  fi
fi

echo "sst deploy failed. See logs above." >&2
rm -f "$DEPLOY_LOG"
exit 1
