#!/usr/bin/env bash
# Asset Optimization Script for Wordfall
# Converts PNG images to WebP and compresses video assets.
# Does NOT delete originals — safe to run multiple times.
#
# Usage: bash scripts/optimize-assets.sh
# Or:    npm run optimize-assets

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

IMAGES_DIR="$PROJECT_ROOT/assets/images"
OPTIMIZED_DIR="$IMAGES_DIR/optimized"
VIDEO_SRC="$PROJECT_ROOT/assets/videos/bg-homescreen.mp4"
VIDEO_OUT="$PROJECT_ROOT/assets/videos/bg-homescreen-optimized.mp4"

WEBP_QUALITY=80

# ---------- Tool checks ----------

MISSING_TOOLS=()

if ! command -v cwebp &>/dev/null; then
  MISSING_TOOLS+=("cwebp")
fi

if ! command -v ffmpeg &>/dev/null; then
  MISSING_TOOLS+=("ffmpeg")
fi

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
  echo "ERROR: The following required tools are missing:"
  for tool in "${MISSING_TOOLS[@]}"; do
    echo "  - $tool"
  done
  echo ""
  echo "Install instructions:"
  echo "  macOS (Homebrew):"
  echo "    brew install webp ffmpeg"
  echo "  Ubuntu / Debian:"
  echo "    sudo apt-get install -y webp ffmpeg"
  echo "  Fedora:"
  echo "    sudo dnf install libwebp-tools ffmpeg"
  echo "  Windows (Chocolatey):"
  echo "    choco install webp ffmpeg"
  exit 1
fi

echo "=== Wordfall Asset Optimization ==="
echo ""

# ---------- PNG -> WebP ----------

echo "--- PNG to WebP conversion (quality $WEBP_QUALITY) ---"
echo ""

mkdir -p "$OPTIMIZED_DIR"

TOTAL_ORIGINAL=0
TOTAL_WEBP=0
FILE_COUNT=0

for png_file in "$IMAGES_DIR"/*.png; do
  [ -f "$png_file" ] || continue

  filename="$(basename "$png_file" .png)"
  webp_file="$OPTIMIZED_DIR/${filename}.webp"

  original_size=$(stat -c%s "$png_file" 2>/dev/null || stat -f%z "$png_file" 2>/dev/null)
  TOTAL_ORIGINAL=$((TOTAL_ORIGINAL + original_size))

  cwebp -q "$WEBP_QUALITY" "$png_file" -o "$webp_file" -quiet 2>/dev/null

  if [ -f "$webp_file" ]; then
    new_size=$(stat -c%s "$webp_file" 2>/dev/null || stat -f%z "$webp_file" 2>/dev/null)
    TOTAL_WEBP=$((TOTAL_WEBP + new_size))
    FILE_COUNT=$((FILE_COUNT + 1))

    orig_kb=$(awk "BEGIN {printf \"%.1f\", $original_size/1024}")
    new_kb=$(awk "BEGIN {printf \"%.1f\", $new_size/1024}")
    saved_pct=$(awk "BEGIN {printf \"%.0f\", (1 - $new_size/$original_size) * 100}")
    echo "  $filename.png  ${orig_kb}KB -> ${new_kb}KB  (-${saved_pct}%)"
  else
    echo "  WARNING: Failed to convert $filename.png"
  fi
done

if [ "$FILE_COUNT" -eq 0 ]; then
  echo "  No PNG files found in $IMAGES_DIR"
else
  echo ""
  total_orig_mb=$(awk "BEGIN {printf \"%.2f\", $TOTAL_ORIGINAL/1024/1024}")
  total_new_mb=$(awk "BEGIN {printf \"%.2f\", $TOTAL_WEBP/1024/1024}")
  total_saved=$((TOTAL_ORIGINAL - TOTAL_WEBP))
  total_saved_mb=$(awk "BEGIN {printf \"%.2f\", $total_saved/1024/1024}")
  echo "  Images: $FILE_COUNT files converted"
  echo "  Before: ${total_orig_mb}MB  After: ${total_new_mb}MB  Saved: ${total_saved_mb}MB"
fi

echo ""

# ---------- Video compression ----------

echo "--- Video compression (target <2MB) ---"
echo ""

if [ -f "$VIDEO_SRC" ]; then
  video_orig_size=$(stat -c%s "$VIDEO_SRC" 2>/dev/null || stat -f%z "$VIDEO_SRC" 2>/dev/null)
  video_orig_mb=$(awk "BEGIN {printf \"%.2f\", $video_orig_size/1024/1024}")
  echo "  Source: bg-homescreen.mp4 (${video_orig_mb}MB)"

  # Target ~1.5MB with h264, scale down to 720p max, low bitrate
  ffmpeg -y -i "$VIDEO_SRC" \
    -c:v libx264 \
    -preset slow \
    -crf 28 \
    -vf "scale='min(720,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease" \
    -an \
    -movflags +faststart \
    "$VIDEO_OUT" 2>/dev/null

  if [ -f "$VIDEO_OUT" ]; then
    video_new_size=$(stat -c%s "$VIDEO_OUT" 2>/dev/null || stat -f%z "$VIDEO_OUT" 2>/dev/null)
    video_new_mb=$(awk "BEGIN {printf \"%.2f\", $video_new_size/1024/1024}")
    video_saved=$((video_orig_size - video_new_size))
    video_saved_mb=$(awk "BEGIN {printf \"%.2f\", $video_saved/1024/1024}")
    echo "  Output: bg-homescreen-optimized.mp4 (${video_new_mb}MB)"
    echo "  Saved: ${video_saved_mb}MB"

    # Warn if still over 2MB
    if awk "BEGIN {exit !($video_new_size > 2*1024*1024)}"; then
      echo "  WARNING: Output exceeds 2MB target. Consider shorter clip or lower CRF."
    fi
  else
    echo "  WARNING: Video compression failed."
  fi
else
  echo "  Skipped: $VIDEO_SRC not found."
fi

echo ""
echo "=== Optimization complete ==="
echo "Originals are preserved. Optimized images are in assets/images/optimized/"
echo "To use optimized video, replace bg-homescreen.mp4 with bg-homescreen-optimized.mp4"
