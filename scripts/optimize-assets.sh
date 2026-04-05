#!/bin/bash
# Asset Optimization Script for Wordfall
# Converts PNG assets to WebP for ~60% size reduction
# Requires: cwebp (install via: brew install webp OR apt-get install webp)

echo "=== Wordfall Asset Optimization ==="

ASSETS_DIR="assets"
TOTAL_SAVED=0

# Convert PNG to WebP
for file in $(find "$ASSETS_DIR" -name "*.png" -not -name "icon.png" -not -name "adaptive-icon.png" -not -name "favicon.png"); do
  webp_file="${file%.png}.webp"
  if [ ! -f "$webp_file" ]; then
    original_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    cwebp -q 85 "$file" -o "$webp_file" 2>/dev/null
    if [ -f "$webp_file" ]; then
      new_size=$(stat -f%z "$webp_file" 2>/dev/null || stat -c%s "$webp_file" 2>/dev/null)
      saved=$((original_size - new_size))
      TOTAL_SAVED=$((TOTAL_SAVED + saved))
      echo "  Converted: $file (saved $(echo "scale=1; $saved/1024" | bc)KB)"
    fi
  fi
done

echo ""
echo "Total saved: $(echo "scale=2; $TOTAL_SAVED/1024/1024" | bc)MB"
echo "Run 'npx expo export' to see final bundle size"
