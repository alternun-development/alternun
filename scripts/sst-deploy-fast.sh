#!/bin/bash
set -e

# Fast SST deployment with caching and parallelization
# Targets: ~6-8 minutes (vs 15 minutes for full build + deploy)

STACK="${STACK:-dev}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-false}"

echo "⚡ Fast SST Deploy Pipeline"
echo "   Stack: $STACK"
echo "   Run Migrations: $RUN_MIGRATIONS"
echo ""

# 1. Load AWS credentials (30 sec)
echo "🔐 Step 1/4: Loading AWS credentials..."
source scripts/setup-aws-account.sh
start_time=$(date +%s)

# 2. Build only changed packages with Turbo caching (2-3 min)
echo "📦 Step 2/4: Building changed packages..."
# Only build packages that actually changed
pnpm build --filter '[HEAD^]...' 2>/dev/null || pnpm build --verbose

# 3. Prepare environment variables (30 sec)
echo "🔧 Step 3/4: Configuring environment..."

# Get DATABASE_URL from Secrets Manager
export INFRA_BACKEND_API_DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id alternun/api/database-url \
  --query SecretString \
  --output text 2>/dev/null) || true

# Set migrations flag (default: false - opt-in)
export INFRA_BACKEND_API_MIGRATIONS_ENABLED="$RUN_MIGRATIONS"

# 4. Deploy with SST (10-12 min)
echo "🚀 Step 4/4: Deploying to AWS..."
cd packages/infra

# Use SST with optimization flags
env SST_TELEMETRY_DISABLED=1 \
  STACK="$STACK" \
  SST_STAGE="$STACK" \
  npx sst deploy --stage "$STACK" --yes

# Summary
end_time=$(date +%s)
elapsed=$((end_time - start_time))
minutes=$((elapsed / 60))
seconds=$((elapsed % 60))

echo ""
echo "✨ Deploy complete in ${minutes}m ${seconds}s"
if [ "$RUN_MIGRATIONS" = "false" ]; then
  echo "ℹ️  Migrations disabled (opt-in). To run migrations, use:"
  echo "   RUN_MIGRATIONS=true bash scripts/sst-deploy-fast.sh"
fi
