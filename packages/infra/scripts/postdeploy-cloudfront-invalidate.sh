#!/usr/bin/env bash
# CloudFront cache invalidation — runs after successful deployment
# Clears CDN cache so latest code is served immediately to users

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
STAGE="${1:-${SST_STAGE:-dev}}"

# Normalize stage name (dev, prod, etc.)
stage_normalized=$(echo "${STAGE}" | tr '[:upper:]' '[:lower:]' | tr '_' '-')

# CloudFront distribution IDs per stage
# Map stages to their CloudFront distribution IDs
declare -A CLOUDFRONT_DISTROS=(
  ["dev"]="E2O74SRUWDYV1"          # testnet.airs.alternun.co
  ["production"]="E2O74SRUWDYV1"   # airs.alternun.co (update if different)
  ["dashboard-dev"]="E2HE57JERFFOXW"  # testnet.admin.alternun.co
  ["dashboard-prod"]="E2HE57JERFFOXW" # admin.alternun.co (update if different)
)

# Get distribution ID for this stage
DISTRO_ID="${CLOUDFRONT_DISTROS[$stage_normalized]:-}"

if [ -z "${DISTRO_ID}" ]; then
  echo "⚠️  WARNING: No CloudFront distribution configured for stage '${stage_normalized}'"
  echo "   Skipping CloudFront cache invalidation"
  exit 0
fi

echo "🔄 Invalidating CloudFront distribution ${DISTRO_ID} for stage ${stage_normalized}..."

# Create invalidation for all paths
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "${DISTRO_ID}" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ CloudFront invalidation created: ${INVALIDATION_ID}"
echo "   Status will be Completed in 30-60 seconds"
echo "   Next page load will serve fresh content from origin"
