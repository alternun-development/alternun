#!/bin/bash
set -euo pipefail

tsc
mkdir -p dist/catalogs
cp -R src/catalogs/. dist/catalogs/
