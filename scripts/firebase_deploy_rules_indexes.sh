#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: $0 [firebase deploy arguments]"
  echo "Deploys Firestore rules and indexes from the repo root."
  exit 0
fi

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI is required. Install it before running this script." >&2
  exit 1
fi

firebase deploy --only firestore:rules,firestore:indexes "$@"
