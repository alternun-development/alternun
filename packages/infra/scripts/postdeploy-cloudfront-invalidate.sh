#!/usr/bin/env bash
# CloudFront cache invalidation — runs after successful deployment
# Clears CDN cache so latest code is served immediately to users

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
STAGE="${1:-${SST_STAGE:-dev}}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

normalize_domain() {
  local value=${1:-}
  value=${value#https://}
  value=${value#http://}
  value=${value%/}
  value=${value%/}
  echo "$value"
}

resolve_discovery_alias() {
  local normalized_stage=${1:-}

  case "$normalized_stage" in
    dev)
      normalize_domain "${INFRA_EXPO_DOMAIN_DEV:-${DOMAIN_DEV:-}}"
      ;;
    prod | production)
      normalize_domain "${INFRA_EXPO_DOMAIN_PRODUCTION:-${DOMAIN_PRODUCTION:-}}"
      ;;
    dashboard-dev)
      normalize_domain "${INFRA_ADMIN_DOMAIN_DEV:-}"
      ;;
    dashboard-prod | dashboard-production)
      normalize_domain "${INFRA_ADMIN_DOMAIN_PRODUCTION:-}"
      ;;
    mobile)
      normalize_domain "${INFRA_EXPO_DOMAIN_MOBILE:-${DOMAIN_MOBILE:-}}"
      ;;
    *)
      echo ""
      ;;
  esac
}

discover_distribution_for_alias() {
  local alias=$1
  local normalized_alias dist_row dist_id dist_domain dist_status

  normalized_alias=$(normalize_domain "$alias" | tr '[:upper:]' '[:lower:]')

  dist_row=$(
    aws cloudfront list-distributions --output json 2>/dev/null | jq -r --arg alias "$normalized_alias" '
      .DistributionList.Items[]?
      | select((.Aliases.Items // []) | index($alias))
      | [.Id, .DomainName, .Status] | @tsv
    ' | head -n1
  )

  if [ -n "$dist_row" ]; then
    IFS=$'\t' read -r dist_id dist_domain dist_status <<<"$dist_row"
    if [ -n "$dist_id" ] && [ "$dist_status" = "Deployed" ]; then
      echo "${dist_id}|${dist_domain}"
      return 0
    fi
  fi

  return 1
}

# Normalize stage name (dev, prod, etc.)
stage_normalized=$(echo "${STAGE}" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
discovery_alias=$(resolve_discovery_alias "$stage_normalized")

if [ -z "${discovery_alias}" ]; then
  echo "⚠️  WARNING: No CloudFront alias configured for stage '${stage_normalized}'"
  echo "   Skipping CloudFront cache invalidation"
  exit 0
fi

if ! dist_info=$(discover_distribution_for_alias "$discovery_alias"); then
  echo "⚠️  WARNING: No deployed CloudFront distribution found for alias '${discovery_alias}'"
  echo "   Skipping CloudFront cache invalidation"
  exit 0
fi

DISTRO_ID=${dist_info%%|*}
DISTRO_DOMAIN=${dist_info#*|}

echo "🔄 Invalidating CloudFront distribution ${DISTRO_ID} (${DISTRO_DOMAIN}) for stage ${stage_normalized}..."

INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "${DISTRO_ID}" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ CloudFront invalidation created: ${INVALIDATION_ID}"
echo "   Status will be Completed in 30-60 seconds"
echo "   Next page load will serve fresh content from origin"
