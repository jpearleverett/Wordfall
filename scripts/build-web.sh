#!/usr/bin/env bash
#
# Build a browser-playable Wordfall bundle and serve it on the LAN.
#
# WHY: the normal way to test is the dev-client APK, but that needs an EAS
# build. This path needs no install at all — build once, open the URL on any
# phone on the same Wi-Fi. Useful when the dev client is not installed, or for
# a quick look at a UI change.
#
# Caveats:
#   * Ads are stubbed on web (src/services/ads.web.ts) and IAP is unavailable,
#     so purchase and rewarded-ad flows cannot be exercised here.
#   * react-native-web does not render identically to native — treat this as a
#     functional check, not a visual sign-off, and never as a source of store
#     screenshots.
#
# Usage:  bash scripts/build-web.sh [port]
set -euo pipefail

PORT="${1:-8080}"
OUT_DIR="${OUT_DIR:-web-build}"

echo "==> Exporting web bundle to ${OUT_DIR}/ ..."
npx expo export --platform web --output-dir "${OUT_DIR}"

# Expo emits a classic <script> tag, but the bundle contains `import.meta`
# (zustand's devtools middleware reads import.meta.env). `import.meta` is a
# SyntaxError outside a module, so the whole bundle fails to parse and the page
# renders blank. Loading it as a module fixes it.
echo "==> Patching index.html to load the bundle as a module ..."
sed -i 's|<script src="\(/_expo[^"]*\)" defer></script>|<script type="module" src="\1"></script>|' \
  "${OUT_DIR}/index.html"

if ! grep -q 'type="module"' "${OUT_DIR}/index.html"; then
  echo "WARNING: could not patch the script tag — Expo may have changed its"
  echo "         index.html template. If the page is blank, check for"
  echo "         'Cannot use import.meta outside a module' in the console."
fi

LAN_IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' || true)"
echo
echo "==> Serving on port ${PORT}"
echo "    On this machine : http://localhost:${PORT}"
[ -n "${LAN_IP}" ] && echo "    On your phone   : http://${LAN_IP}:${PORT}   (same Wi-Fi)"
echo
npx serve -s "${OUT_DIR}" -l "${PORT}"
