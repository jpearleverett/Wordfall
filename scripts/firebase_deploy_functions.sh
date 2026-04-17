#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Installing and building functions/"
(cd "${ROOT_DIR}/functions" && npm install && npm run build)

echo "==> Deploying Firebase Functions"
firebase deploy --only functions
