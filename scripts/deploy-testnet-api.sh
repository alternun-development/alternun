#!/bin/bash
set -euo pipefail

# Deploy the live testnet API/auth runtime via the owning dashboard stack.
# Usage: ./scripts/deploy-testnet-api.sh
# Or: ./scripts/deploy-testnet-api.sh [--no-prompt]

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

NO_PROMPT=${1:-}

echo -e "${YELLOW}Deploying API to testnet (dashboard-dev stack)...${NC}"
echo "This updates the live testnet API/auth runtime on the owning dashboard stack"
echo ""

if [ "$NO_PROMPT" != "--no-prompt" ]; then
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 1
  fi
fi

# Load AWS credentials
bash scripts/validate-aws-account.sh enforce

# Deploy with the owning dashboard stack for the live testnet API/admin runtime.
echo -e "${GREEN}Running: APPROVE=true STACK=dashboard-dev packages/infra/scripts/sst-deploy.sh${NC}"
APPROVE=true STACK=dashboard-dev packages/infra/scripts/sst-deploy.sh

# Verify deployment
echo ""
echo -e "${YELLOW}Verifying deployment...${NC}"
sleep 5

VERSION=$(curl -s https://testnet.api.alternun.co/health 2>/dev/null | jq -r '.version // "unknown"')
echo "Testnet API version: $VERSION"

if [ "$VERSION" != "unknown" ]; then
  echo -e "${GREEN}✓ Deployment successful!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠ Could not verify version, but deployment may still be in progress${NC}"
  exit 0
fi
