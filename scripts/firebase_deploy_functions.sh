#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  echo "Usage: $0 [commerce|social|all]"
  exit 0
}

TARGET="${1:-all}"

if [[ "${TARGET}" == "--help" || "${TARGET}" == "-h" ]]; then
  usage
fi

install_and_build() {
  local dir="$1"
  echo "==> Installing and building ${dir}"
  (cd "${ROOT_DIR}/${dir}" && npm install && npm run build)
}

case "${TARGET}" in
  commerce)
    install_and_build "functions"
    firebase deploy --only functions:commerce
    ;;
  social)
    install_and_build "cloud-functions"
    firebase deploy --only functions:social
    ;;
  all)
    install_and_build "functions"
    install_and_build "cloud-functions"
    firebase deploy --only functions
    ;;
  *)
    usage
    ;;
esac
