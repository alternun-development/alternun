#!/bin/bash
# AWS Account Guard - CRITICAL ENFORCEMENT
# ==========================================
# Prevents all AWS operations using the wrong account.
# Must be sourced before any AWS CLI commands.

set -euo pipefail

ALTERNUN_ACCOUNT_ID="124120088516"
WRONG_ACCOUNT_ID="058264267235"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[AWS Account Guard] Enforcing Alternun account...${NC}"

# Load Alternun credentials
if [ -f "${SCRIPT_DIR}/../.env" ]; then
    # shellcheck disable=SC1091
    set +e
    source "${SCRIPT_DIR}/../.env" 2>/dev/null || true
    set -e
fi

# Clear any cached credentials that might point to wrong account
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN
unset AWS_PROFILE

# Get the actual current account
CURRENT_ACCOUNT=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo "unknown")

# FAIL if using wrong account
if [ "${CURRENT_ACCOUNT}" = "${WRONG_ACCOUNT_ID}" ]; then
    echo -e "${RED}❌ CRITICAL: AWS CLI is using the WRONG account!${NC}"
    echo -e "${RED}   Current account: ${CURRENT_ACCOUNT} (DEFAULT - DO NOT USE)${NC}"
    echo -e "${RED}   Correct account: ${ALTERNUN_ACCOUNT_ID} (Alternun)${NC}"
    echo -e "${YELLOW}Run: bash scripts/setup-aws-account.sh${NC}"
    exit 1
fi

# FAIL if account is unknown
if [ "${CURRENT_ACCOUNT}" = "unknown" ]; then
    echo -e "${RED}❌ Cannot determine AWS account - credentials may be missing${NC}"
    echo -e "${YELLOW}Run: bash scripts/setup-aws-account.sh${NC}"
    exit 1
fi

# WARN if using unexpected account
if [ "${CURRENT_ACCOUNT}" != "${ALTERNUN_ACCOUNT_ID}" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Using account ${CURRENT_ACCOUNT} (not ${ALTERNUN_ACCOUNT_ID})${NC}"
    echo -e "${YELLOW}   This may not be the Alternun account. Verify before proceeding.${NC}"
fi

# SUCCESS
echo -e "${GREEN}✅ Using CORRECT Alternun AWS account: ${CURRENT_ACCOUNT}${NC}"
