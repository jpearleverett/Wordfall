#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  echo "Usage: $0 [commerce|social|all]"
  exit 0
}

TARGET="${1:-all}"

if [[ "${TARGET}" == "--help" || "${TARGET}" == "-h" ]]; then
  usage
fi

deploy_dir() {
  local dir="$1"
  echo "==> Deploying Firebase Functions from ${dir}"
  (
    cd "${ROOT_DIR}/${dir}"
    npm install
    npm run build
    npm run deploy
  )
}

case "${TARGET}" in
  commerce)
    deploy_dir "functions"
    ;;
  social)
    deploy_dir "cloud-functions"
    ;;
  all)
    deploy_dir "functions"
    deploy_dir "cloud-functions"
    ;;
  *)
    usage
    ;;
esac
