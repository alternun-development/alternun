#!/bin/bash
# Build script that ignores turbo filter arguments
node ../../scripts/sync-docs-changelog.mjs
docusaurus build
