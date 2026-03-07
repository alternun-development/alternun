#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

STACK=${STACK:-${1:-${SST_STAGE:-production}}}
export STACK
export SST_STAGE="${SST_STAGE:-$STACK}"

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

remove_state_resources_by_prefix() {
  local prefix=$1
  local state_file=${2:-}

  if [ -z "$prefix" ] || [ -z "$state_file" ] || [ ! -f "$state_file" ]; then
    return 0
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "WARN: jq not found; cannot prune legacy state resources for ${prefix}." >&2
    return 0
  fi

  local urns
  urns=$(jq -r --arg prefix "$prefix" '
    .latest.resources[]?
    | .urn // empty
    | select(contains($prefix))
  ' "$state_file" | awk '{ print length($0) "\t" $0 }' | sort -rn | cut -f2-)

  if [ -z "$urns" ]; then
    return 0
  fi

  echo "Pruning legacy managed certificate state for ${prefix}..."

  while IFS= read -r urn; do
    [ -n "$urn" ] || continue
    SST_TELEMETRY_DISABLED=1 npx sst state remove --stage "$STACK" "$urn" >/dev/null
    echo "Removed state resource: ${urn}"
  done <<< "$urns"
}

prune_legacy_managed_certificate_state() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "WARN: jq not found; skipping legacy managed certificate state pruning." >&2
    return 0
  fi

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

  local state_file
  state_file=$(mktemp)

  if ! SST_TELEMETRY_DISABLED=1 npx sst state export --stage "$STACK" > "$state_file"; then
    echo "WARN: Failed to export SST state; skipping legacy managed certificate state pruning." >&2
    rm -f "$state_file"
    return 0
  fi

  local prefix
  for prefix in "${prefixes[@]}"; do
    remove_state_resources_by_prefix "$prefix" "$state_file"
  done

  rm -f "$state_file"
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

TARGET=$(bash "$SCRIPT_DIR/_resolve-infra-script.sh" "sst-deploy.sh")
exec bash "$TARGET" "$@"
