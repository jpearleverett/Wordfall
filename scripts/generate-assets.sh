#!/bin/bash
# ============================================================================
# WORDFALL - Synthwave/Vaporwave Miami Asset Generation Pipeline
# ============================================================================
# Uses inference.sh CLI (infsh) to generate premium game assets
# Model: Seedream 4.5 for 4K cinematic quality, FLUX for icons
#
# Usage:
#   infsh login --key YOUR_API_KEY
#   chmod +x scripts/generate-assets.sh
#   ./scripts/generate-assets.sh
# ============================================================================

set -e

ASSETS_DIR="$(cd "$(dirname "$0")/../assets" && pwd)"
IMAGES_DIR="$ASSETS_DIR/images"
VIDEOS_DIR="$ASSETS_DIR/videos"

mkdir -p "$IMAGES_DIR" "$VIDEOS_DIR"

# Shared style suffixes for consistency
SYNTHWAVE_STYLE="synthwave aesthetic, vaporwave, retrowave, neon magenta and cyan and purple color palette, dark background, chrome reflections, Miami vice vibes, 1980s retro-futurism, glowing neon lights, volumetric fog, cinematic lighting, ultra detailed, 4K quality"
ICON_STYLE="synthwave aesthetic, neon glow, magenta and cyan, dark purple background, clean vector-style, game UI icon, glossy chrome finish, centered composition, no text"
BG_STYLE="synthwave vaporwave aesthetic, dark purple-black background (#0a0015), neon magenta (#ff2d95) and cyan (#00e5ff) accents, retrowave Miami vibes, volumetric neon fog, chrome reflections, ultra wide composition, no text, no UI elements, atmospheric depth, 4K cinematic"

echo "============================================"
echo "  WORDFALL Asset Generation Pipeline"
echo "  Synthwave / Vaporwave / Miami Aesthetic"
echo "============================================"
echo ""

# ============================================================================
# 1. APP ICON (1024x1024)
# ============================================================================
echo ">>> [1/6] Generating App Icon..."

infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Game app icon for word puzzle game called WORDFALL. A stylized letter W made of chrome metal with neon magenta and cyan glow, falling through a grid of glowing letter tiles. Synthwave retrowave aesthetic, dark purple background, neon light trails, holographic chrome reflections, palm tree silhouettes in the background, Miami sunset gradient sky (magenta to purple to dark blue). Square composition, centered, premium mobile game icon quality, ultra detailed, no text except the W\",
  \"negative_prompt\": \"blurry, low quality, text, watermark, flat, boring, realistic photo\",
  \"width\": 1024,
  \"height\": 1024
}" --output "$ASSETS_DIR/icon.png"

echo "    ✓ icon.png"

# ============================================================================
# 2. SPLASH SCREEN (1284x2778 - iPhone 14 Pro Max)
# ============================================================================
echo ">>> [2/6] Generating Splash Screen..."

infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Mobile game splash loading screen, portrait orientation. Massive chrome WORDFALL logo floating above a synthwave landscape. Neon grid floor stretching to horizon, giant retro sun (magenta to cyan gradient with horizontal scan lines) setting behind Miami skyline silhouette. Palm trees with neon magenta leaves. Falling glowing letter tiles cascading down like digital rain. Chrome reflections, volumetric purple and magenta fog, star field in dark sky. Premium AAA mobile game quality, ultra cinematic, $SYNTHWAVE_STYLE\",
  \"negative_prompt\": \"blurry, low quality, amateur, flat design, boring\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$ASSETS_DIR/splash.png"

echo "    ✓ splash.png"

# ============================================================================
# 3. SCREEN BACKGROUNDS (17 variants)
# ============================================================================
echo ">>> [3/6] Generating Screen Backgrounds..."

# --- Home Screen ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave Miami cityscape at night, neon-lit art deco buildings, palm tree boulevard, glowing magenta and cyan neon signs, reflective wet streets, retro sun low on horizon with scan lines, volumetric purple fog rising from streets, chrome surfaces reflecting neon, starfield sky with nebula clouds. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-home-neon.png" &

# --- Gameplay ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Deep space synthwave void, infinite neon grid floor in magenta perspective vanishing to horizon, floating holographic letter cubes scattered in space, subtle aurora borealis in cyan and purple, dark atmospheric fog, minimal and focused composition for game overlay. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-gameplay.png" &

# --- Synthwave Gameplay variant ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave wireframe landscape, glowing neon magenta grid floor stretching to infinity, retro sun on horizon with horizontal line cuts, mountain silhouettes made of purple wireframe, digital particles floating upward, deep space backdrop with stars, volumetric cyan fog at ground level. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-synthwave-gameplay.png" &

# --- Library/Archive ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Ancient library reimagined in synthwave aesthetic, towering chrome bookshelves with neon-lit spines in magenta and cyan, holographic floating books with glowing pages, art deco arched ceiling with neon trim, mosaic floor reflecting neon lights, mystical purple fog between shelves, volumetric light rays. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-library-archive.png" &

wait
echo "    ✓ 4/17 backgrounds..."

# --- Collections ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave treasure vault, glass display cases with holographic gems and crystals glowing in magenta cyan and gold, chrome pedestals, neon strip lighting along walls, reflective black marble floor, laser security beams in cyan, art deco vault door in background, premium museum aesthetic. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-collections.png" &

# --- Profile ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave personal command center, holographic data screens floating in semicircle, neon magenta and cyan interface elements, chrome desk with glowing controls, city skyline visible through large window, volumetric purple ambient light, achievement trophies on chrome shelves with neon glow. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-profile.png" &

# --- Shop ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave neon marketplace, chrome display shelves with glowing products, holographic price tags, neon magenta SALE signs, art deco storefront aesthetic, reflective floor tiles, golden accent lighting mixed with cyan neon tubes, premium luxury shopping atmosphere, velvet and chrome. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-shop-neon.png" &

# --- Leaderboard ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave stadium scoreboard, massive holographic leaderboard display floating above chrome arena, neon magenta and cyan ranking numbers, crowd of glowing silhouettes, spotlights cutting through purple fog, golden trophy podium in foreground, retro sports aesthetic with neon. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-leaderboard.png" &

wait
echo "    ✓ 8/17 backgrounds..."

# --- Event ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave carnival festival, neon ferris wheel and roller coaster silhouettes, magenta and cyan fireworks exploding in night sky, chrome carnival booths with holographic prizes, confetti made of light particles, electric energy arcs between structures, party atmosphere. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-event-neon.png" &

# --- Mastery/Cosmic ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Cosmic synthwave nebula, massive spiral galaxy in magenta and purple, chrome space station pathway leading to glowing portal, crystalline asteroids reflecting neon light, energy streams in cyan connecting star clusters, deep space mysticism with retro-futuristic architecture. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-mastery-cosmic.png" &

# --- Modes/Arcade ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave retro arcade room, rows of glowing arcade cabinets with neon magenta and cyan screens, checkered floor reflecting neon, chrome joysticks and buttons, pixel art decorations on walls, fog machine effect on floor, retro gaming paradise aesthetic. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-modes-arcade.png" &

# --- Settings ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave control room, chrome panels with glowing neon dials and sliders, holographic equalizer displays in cyan, circular magenta control knobs, dark console desk, subtle grid pattern on walls with neon accent lines, technical but aesthetic, minimal and clean. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-settings-control.png" &

wait
echo "    ✓ 12/17 backgrounds..."

# --- Club/Arena ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave VIP lounge club, chrome and velvet interior, neon magenta bottle service area, holographic dance floor with grid pattern, DJ booth with cyan neon equipment, palm tree neon signs on walls, mirrored ceiling reflecting lights, exclusive nightclub atmosphere. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-club-arena.png" &

# --- Game Over ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave sunset aftermath, crumbling neon grid floor dissolving into void, scattered glowing letter tiles fading out, dimmed retro sun barely visible through heavy purple fog, melancholic but beautiful atmosphere, particles floating upward like embers, dark and moody. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-game-over.png" &

# --- Victory ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave celebration explosion, massive golden trophy made of chrome and neon on pedestal, fireworks of magenta and cyan light bursting in sky, confetti of holographic particles, neon VICTORY energy radiating outward, triumphant epic atmosphere, gold and chrome everywhere. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-victory.png" &

# --- Loading/Splash ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave loading portal, circular chrome ring gate with neon magenta energy swirling inside, digital data streams flowing inward, dark void background with distant stars, subtle grid floor, cyberpunk loading dock aesthetic, focused centered composition. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-loading-splash.png" &

wait

# --- Onboarding ---
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Welcoming synthwave beach boardwalk at twilight, palm trees with magenta neon leaf outlines, wooden boardwalk leading to glowing retro sun on ocean horizon, gentle cyan waves with bioluminescent glow, warm inviting atmosphere, first steps into a neon paradise. $BG_STYLE\",
  \"width\": 1024,
  \"height\": 2048
}" --output "$IMAGES_DIR/bg-onboarding.png"

echo "    ✓ 17/17 backgrounds complete!"

# ============================================================================
# 4. UI ICONS (game action icons)
# ============================================================================
echo ">>> [4/6] Generating UI Icons..."

# Coin icon
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Game coin icon, golden chrome coin with embossed W letter, neon magenta and gold glow, synthwave aesthetic, dark purple background, shiny metallic reflections, centered, square composition, game UI asset, $ICON_STYLE\"
}" --output "$IMAGES_DIR/icon-coin-gold.png" &

# Gem/Diamond icon
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Game gem diamond icon, faceted crystal diamond with cyan and magenta neon internal glow, chrome edges reflecting light, synthwave aesthetic, dark purple background, holographic prismatic light, centered, square composition, game UI asset, $ICON_STYLE\"
}" --output "$IMAGES_DIR/icon-gem-diamond.png" &

# Hint lightbulb icon
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Game hint lightbulb icon, chrome lightbulb with glowing cyan neon filament, electric energy sparks, synthwave aesthetic, dark purple background, volumetric light rays, centered, square composition, game UI asset, $ICON_STYLE\"
}" --output "$IMAGES_DIR/icon-hint.png" &

# Undo/rewind icon
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Game undo rewind icon, chrome circular arrow curving backward, neon magenta trail glow, time reversal effect, synthwave aesthetic, dark purple background, centered, square composition, game UI asset, $ICON_STYLE\"
}" --output "$IMAGES_DIR/icon-undo.png" &

wait

# Freeze/snowflake icon
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Game freeze ice icon, chrome snowflake crystal with cyan neon glow and ice particles, frozen energy effect, synthwave aesthetic, dark purple background, centered, square composition, game UI asset, $ICON_STYLE\"
}" --output "$IMAGES_DIR/icon-freeze.png" &

# Preview/eye icon
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Game preview eye icon, chrome stylized eye with glowing cyan iris and magenta pupil, digital scan lines through eye, synthwave aesthetic, dark purple background, holographic vision effect, centered, square composition, game UI asset, $ICON_STYLE\"
}" --output "$IMAGES_DIR/icon-preview.png" &

# Shuffle icon
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Game shuffle randomize icon, chrome crossing arrows with neon magenta and cyan gradient glow, energy particles at intersection, synthwave aesthetic, dark purple background, centered, square composition, game UI asset, $ICON_STYLE\"
}" --output "$IMAGES_DIR/icon-shuffle.png" &

# Back arrow icon
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Game back arrow icon, sleek chrome chevron pointing left with neon cyan trail, synthwave aesthetic, dark purple background, minimal clean design, centered, square composition, game UI asset, $ICON_STYLE\"
}" --output "$IMAGES_DIR/icon-back.png" &

wait
echo "    ✓ UI icons complete!"

# ============================================================================
# 5. DECORATIVE & TEXTURE ASSETS
# ============================================================================
echo ">>> [5/6] Generating Decorative Assets..."

# Achievement badge frame
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Game achievement badge frame, ornate chrome circular frame with laurel wreath, neon magenta and gold accents, synthwave aesthetic, transparent center for badge content, holographic chrome finish, dark background, game UI element, premium quality\",
  \"width\": 512,
  \"height\": 512
}" --output "$IMAGES_DIR/achievement-badge-frame.png" &

# Neon frame border
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Neon picture frame border, rectangular chrome frame with neon magenta and cyan light tubes along edges, corner decorations with art deco flourishes, synthwave aesthetic, dark background, glowing edges, game UI card border element\",
  \"width\": 1024,
  \"height\": 1024
}" --output "$IMAGES_DIR/neon-frame-border.png" &

# Trophy/crown element
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Game trophy crown icon, chrome royal crown with neon magenta gems and cyan jewels, golden metallic finish with synthwave neon glow, dark purple background, premium game reward element, detailed ornate design\",
  \"width\": 512,
  \"height\": 512
}" --output "$IMAGES_DIR/trophy-crown-element.png" &

# Neon sun element
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Synthwave retro sun, large circle with horizontal scan line cuts through it, gradient from magenta top to cyan bottom, chrome edge ring, neon glow radiating outward, dark background, iconic retrowave sun element\",
  \"width\": 512,
  \"height\": 512
}" --output "$IMAGES_DIR/neon-sun-element.png" &

wait

# Tile holographic texture
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Holographic chrome texture seamless tile, iridescent rainbow reflections on dark metallic surface, synthwave prismatic colors (magenta cyan purple gold), smooth chrome finish, tileable pattern, game tile texture overlay\",
  \"width\": 512,
  \"height\": 512
}" --output "$IMAGES_DIR/tile-holographic-texture.png" &

# Tile gem texture
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Gemstone crystal texture seamless tile, deep purple amethyst crystal facets with neon magenta internal glow, translucent depth, light refraction, synthwave gem aesthetic, game tile texture overlay\",
  \"width\": 512,
  \"height\": 512
}" --output "$IMAGES_DIR/tile-gem-texture.png" &

# Sparkle sprites
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Game sparkle sprite sheet, 4x4 grid of different neon sparkle and star burst effects, magenta cyan gold and white glowing particles, dark transparent background, synthwave aesthetic, clean game VFX elements, pixel-perfect sparkle variations\"
}" --output "$IMAGES_DIR/sparkle-sprites.png" &

# Particle starburst
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Neon starburst explosion effect, radial light rays bursting from center in magenta and cyan, chrome ring shockwave, particle debris of light, synthwave aesthetic, dark background, game celebration VFX element\",
  \"width\": 512,
  \"height\": 512
}" --output "$IMAGES_DIR/particle-starburst.png" &

wait

# Energy ring
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Neon energy ring circle, chrome torus with flowing magenta and cyan energy, electric arcs and plasma effects, synthwave aesthetic, dark background, game power-up VFX element, holographic glow\",
  \"width\": 512,
  \"height\": 512
}" --output "$IMAGES_DIR/energy-ring-element.png" &

# Crystal gems collection
infsh app run bytedance/seedream-4-5 --input "{
  \"prompt\": \"Collection of 6 different neon crystals and gems arranged in a row, each a different synthwave color (magenta, cyan, purple, gold, green, orange), chrome settings, dark background, holographic glow, game collectible gems, premium quality\",
  \"width\": 1024,
  \"height\": 512
}" --output "$IMAGES_DIR/crystal-gems-collection.png" &

# Shelf booster
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Synthwave chrome shelf bracket, metallic chrome shelf support with neon magenta underglow LED strip, dark purple background, clean game UI furniture element, minimal, $ICON_STYLE\"
}" --output "$IMAGES_DIR/shelf-booster.png" &

# Battery icon
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Game battery icon, chrome battery outline with neon cyan energy fill level, magenta terminal cap, synthwave aesthetic, dark purple background, game UI progress indicator, clean minimal design, $ICON_STYLE\"
}" --output "$IMAGES_DIR/icon-battery.png" &

wait

# Battery fill
infsh app run falai/flux-dev-lora --input "{
  \"prompt\": \"Neon cyan energy fill bar, horizontal gradient bar from cyan to magenta, glowing inner light, chrome edges, synthwave aesthetic, dark background, game UI fill element, minimal clean, $ICON_STYLE\"
}" --output "$IMAGES_DIR/icon-battery-fill.png"

echo "    ✓ Decorative assets complete!"

# ============================================================================
# 6. VIDEO ASSETS (promotional / animated backgrounds)
# ============================================================================
echo ">>> [6/6] Generating Video Assets..."

# Animated home background
infsh app run google/veo-3-1-fast --input "{
  \"prompt\": \"Slow camera push forward through synthwave Miami cityscape at night, neon magenta and cyan lights reflecting off wet streets, palm trees gently swaying, retro sun pulsing on horizon with scan lines, volumetric purple fog drifting, chrome buildings gleaming, stars twinkling, loopable ambient background, cinematic 4K quality, vaporwave aesthetic\"
}" --output "$VIDEOS_DIR/bg-home-animated.mp4" &

# Animated gameplay background
infsh app run google/veo-3-1-fast --input "{
  \"prompt\": \"Slow forward movement over infinite synthwave neon grid floor, magenta grid lines glowing and pulsing, retro sun on horizon, subtle floating holographic particles, deep space with stars above, volumetric cyan fog at ground level, hypnotic and meditative, loopable background, vaporwave retrowave aesthetic\"
}" --output "$VIDEOS_DIR/bg-gameplay-animated.mp4" &

# Victory celebration
infsh app run google/veo-3-1-fast --input "{
  \"prompt\": \"Synthwave celebration explosion, golden chrome trophy rising into frame from below, neon magenta and cyan fireworks bursting in night sky, holographic confetti raining down, camera slowly zooming out revealing Miami skyline, dramatic lighting, epic victory moment, premium game cutscene quality\"
}" --output "$VIDEOS_DIR/victory-celebration.mp4" &

# Loading animation
infsh app run google/veo-3-1-fast --input "{
  \"prompt\": \"Synthwave portal charging up, circular chrome ring with neon energy spiraling inward, magenta and cyan light streams converging to center, dark void background, pulsing glow intensifying, data stream particles flowing, futuristic loading sequence, smooth loopable animation\"
}" --output "$VIDEOS_DIR/loading-animation.mp4" &

wait
echo "    ✓ Video assets complete!"

echo ""
echo "============================================"
echo "  ✓ ALL ASSETS GENERATED SUCCESSFULLY!"
echo "============================================"
echo ""
echo "Generated files:"
echo "  - assets/icon.png (app icon)"
echo "  - assets/splash.png (splash screen)"
echo "  - assets/images/ (17 backgrounds + icons + decorative)"
echo "  - assets/videos/ (4 animated backgrounds/videos)"
echo ""
echo "Next steps:"
echo "  1. Review generated assets"
echo "  2. Run: npx tsc --noEmit (verify no type errors)"
echo "  3. Run: npm start (preview in Expo)"
