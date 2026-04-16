#!/bin/bash
set -euo pipefail

validate_exported_auth_bundle() {
  node ./scripts/validate-exported-auth-bundle.cjs
}

disable_expo_dotenv_if_needed() {
  local should_disable
  should_disable=$(node ./scripts/mobile-env.cjs should-disable-dotenv)

  if [ "${should_disable}" = "true" ]; then
    export EXPO_NO_DOTENV=1
    export EXPO_EXPORT_CLEAR_CACHE=1
  fi
}

# Generate changelog data file for the app
node ../../scripts/generate-changelog-data.mjs apps/mobile

pnpm --filter @alternun/auth build
pnpm --filter @alternun/update build
node ../../packages/update/scripts/export-assets.mjs --target-dir public
disable_expo_dotenv_if_needed
if [ "${EXPO_EXPORT_CLEAR_CACHE:-0}" = "1" ]; then
  npx expo export -p web --clear
else
  npx expo export -p web
fi
validate_exported_auth_bundle
