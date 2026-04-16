#!/bin/bash
set -euo pipefail

validate_exported_auth_bundle() {
  node ./scripts/validate-exported-auth-bundle.cjs
}

# Generate changelog data file for the app
node ../../scripts/generate-changelog-data.mjs apps/mobile

pnpm --filter @alternun/auth build
pnpm --filter @alternun/update build
node ../../packages/update/scripts/export-assets.mjs --target-dir public
npx expo export -p web
validate_exported_auth_bundle
