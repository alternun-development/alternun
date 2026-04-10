#!/bin/bash
set -euo pipefail

# Generate changelog data file for the app
node ../../scripts/generate-changelog-data.mjs apps/mobile

pnpm --filter @alternun/auth build
pnpm --filter @alternun/update build
node ../../packages/update/scripts/export-assets.mjs --target-dir public
expo export -p web
