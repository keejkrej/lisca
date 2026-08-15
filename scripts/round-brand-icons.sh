#!/usr/bin/env bash
# Compatibility wrapper. App icons are generated from the per-product SVGs.
set -euo pipefail
exec "$(cd "$(dirname "$0")" && pwd)/generate-app-icons.sh"
