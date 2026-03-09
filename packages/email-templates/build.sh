#!/bin/bash
set -euo pipefail

tsc
mkdir -p dist/locales
cp -R src/locales/. dist/locales/
