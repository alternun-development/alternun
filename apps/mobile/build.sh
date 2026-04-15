#!/bin/bash
set -euo pipefail

validate_exported_auth_bundle() {
  local execution_provider
  execution_provider="$(node ./scripts/mobile-env.cjs auth-execution-provider)"

  if [ "$execution_provider" = "better-auth" ]; then
    return 0
  fi
  
  local drift_matches
  drift_matches="$(
    rg -n \
      -e '/auth/sign-in/social' \
      -e '/auth/sign-in/email' \
      -e 'localhost:9083/auth' \
      -e '127.0.0.1:9083/auth' \
      -e 'testnet.api.alternun.co/better-auth' \
      -e 'authExecutionProvider:"better-auth"' \
      dist/_expo/static/js/web 2>/dev/null || true
  )"

  if [ -n "$drift_matches" ]; then
    echo "ERROR: Exported AIRS web bundle still contains stale Better Auth web auth paths." >&2
    echo "$drift_matches" >&2
    exit 1
  fi
}

# Generate changelog data file for the app
node ../../scripts/generate-changelog-data.mjs apps/mobile

pnpm --filter @alternun/auth build
pnpm --filter @alternun/update build
node ../../packages/update/scripts/export-assets.mjs --target-dir public
npx expo export -p web
validate_exported_auth_bundle
