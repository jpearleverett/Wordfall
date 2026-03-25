#!/usr/bin/env python3
# Wordfall Synthwave Asset Generator - Gemini AI
#
# Run locally (not in sandbox):
#   pip install google-genai Pillow
#   export GEMINI_API_KEY="your-key-here"
#   python3 scripts/generate-assets-gemini.py
#
# This script generates all game assets for Wordfall using Google's Gemini 2.0
# Flash model with image generation capabilities. Assets follow a synthwave /
# vaporwave / Miami Vice aesthetic with neon magenta and cyan color palette.
#
# Assets generated:
#   - 2 app assets (icon.png, splash.png)
#   - 17 background images (1080x1920)
#   - 11 icon assets (512x512)
#   - 11 decorative assets (various sizes)
#
# Total: 41 assets
#
# The script processes assets in batches with 2-second delays between requests
# to respect rate limits, retries once on failure, and prints progress.

import os
import sys
import time
import base64
from pathlib import Path

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Error: google-genai package not installed.")
    print("Install it with: pip install google-genai")
    sys.exit(1)

try:
    from PIL import Image
    import io
except ImportError:
    print("Error: Pillow package not installed.")
    print("Install it with: pip install Pillow")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GEMINI_MODEL = "gemini-2.0-flash-exp"
DELAY_BETWEEN_REQUESTS = 2  # seconds
MAX_RETRIES = 1

# Base project directory (script lives in scripts/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = PROJECT_ROOT / "assets"
IMAGES_DIR = ASSETS_DIR / "images"

# Style suffix appended to every prompt
STYLE_SUFFIX = (
    "synthwave vaporwave aesthetic, neon magenta (#ff2d95) and cyan (#00e5ff) "
    "color palette, dark purple-black background, chrome reflections, "
    "Miami vice retrowave, 1980s retro-futurism, premium game art quality, "
    "no watermark, no text unless specified"
)

# ---------------------------------------------------------------------------
# Asset definitions
# ---------------------------------------------------------------------------
# Each tuple: (output_path_relative_to_PROJECT_ROOT, width, height, prompt)

APP_ASSETS = [
    (
        "assets/icon.png",
        1024, 1024,
        "App icon for a word puzzle game called Wordfall. A bold chrome letter W "
        "centered on a dark purple background with intense neon magenta and cyan "
        "glow emanating from behind. Synthwave perspective grid receding below the "
        "letter. Silhouetted palm trees flanking the sides. The W has mirror-like "
        "chrome reflections and a subtle magenta-to-cyan gradient. Rounded square "
        "icon format suitable for mobile app stores."
    ),
    (
        "assets/splash.png",
        1080, 1920,
        "Mobile splash screen for a word puzzle game called Wordfall. The word "
        "'WORDFALL' rendered in large chrome metallic 3D letters with neon magenta "
        "and cyan edge glow, centered vertically. Below the text, a synthwave "
        "landscape with neon grid floor stretching to the horizon. A large retro "
        "sun with horizontal scan line cuts sits on the horizon, glowing magenta "
        "and orange. Small letter tiles (A, B, C, W, O, R, D) are falling from "
        "above like rain, each tile glowing cyan. Portrait orientation 1080x1920."
    ),
]

BACKGROUND_ASSETS = [
    (
        "assets/images/bg-home-neon.png",
        1080, 1920,
        "Mobile game background. Miami cityscape at night viewed from a wet "
        "reflective street. Neon art deco buildings line both sides with glowing "
        "magenta and cyan signage. Tall palm trees silhouetted against a dark "
        "purple sky with a gradient sunset. Wet pavement reflects all the neon "
        "lights creating streaks of color. Portrait orientation, atmospheric fog."
    ),
    (
        "assets/images/bg-gameplay.png",
        1080, 1920,
        "Mobile game background. Deep space void environment with a neon cyan "
        "grid floor extending into darkness. Floating holographic letter cubes "
        "scattered in mid-air, each glowing softly with different neon colors. "
        "Aurora borealis ribbons of magenta and cyan flow across the top of the "
        "scene. Distant stars and nebula. Dark, atmospheric, portrait orientation."
    ),
    (
        "assets/images/bg-synthwave-gameplay.png",
        1080, 1920,
        "Mobile game background. Classic synthwave wireframe landscape. Neon "
        "magenta grid stretching to infinity point on the horizon. A retro sun "
        "with horizontal line cuts glows on the horizon in magenta, orange, and "
        "yellow bands. Mountains made of wireframe lines on both sides. Dark "
        "purple sky with scattered stars. Pure retrowave aesthetic, portrait."
    ),
    (
        "assets/images/bg-library-archive.png",
        1080, 1920,
        "Mobile game background. Ancient grand library reimagined in synthwave "
        "style. Towering chrome bookshelves stretching upward with books whose "
        "spines glow in neon magenta, cyan, and purple. Floating holographic "
        "book pages drift in the air. Arched ceiling with neon tube lighting. "
        "Polished chrome floor reflecting the glow. Mysterious, atmospheric."
    ),
    (
        "assets/images/bg-collections.png",
        1080, 1920,
        "Mobile game background. Treasure vault interior with holographic gems "
        "and crystals displayed in glass cases on chrome pedestals. Each gem "
        "emits a different color glow - magenta, cyan, gold, purple. Chrome "
        "walls with neon accent strips. Spotlights from above creating dramatic "
        "beams. Luxurious and premium feeling, portrait orientation."
    ),
    (
        "assets/images/bg-profile.png",
        1080, 1920,
        "Mobile game background. Personal command center / workspace in "
        "synthwave style. Holographic data screens floating in mid-air showing "
        "graphs and stats. Chrome desk with neon underglow. Large window "
        "looking out at a neon cityscape. Ambient magenta and cyan lighting. "
        "Futuristic and personal, portrait orientation."
    ),
    (
        "assets/images/bg-shop-neon.png",
        1080, 1920,
        "Mobile game background. Neon marketplace at night. Chrome shelving "
        "units displaying glowing items. Holographic price tags floating next "
        "to products. Neon signs overhead in magenta and cyan. Wet floor "
        "reflecting all the lights. Shopping arcade atmosphere with synthwave "
        "aesthetic. Premium boutique feel, portrait orientation."
    ),
    (
        "assets/images/bg-leaderboard.png",
        1080, 1920,
        "Mobile game background. Grand stadium with a massive holographic "
        "scoreboard floating in the center. Golden trophy on a chrome podium "
        "in the foreground with positions 1, 2, 3. Neon magenta and cyan "
        "spotlights sweeping across. Crowd silhouettes in the stands. "
        "Competitive and epic atmosphere, portrait orientation."
    ),
    (
        "assets/images/bg-event-neon.png",
        1080, 1920,
        "Mobile game background. Carnival festival scene in synthwave style. "
        "A neon ferris wheel glowing with magenta and cyan lights. Fireworks "
        "exploding in magenta and cyan bursts across a dark purple sky. Chrome "
        "carnival booths with neon signage. Festive and exciting atmosphere, "
        "palm trees, portrait orientation."
    ),
    (
        "assets/images/bg-mastery-cosmic.png",
        1080, 1920,
        "Mobile game background. Cosmic nebula scene with swirling magenta and "
        "cyan gas clouds. A chrome space station in the mid-ground with neon "
        "light strips. Crystalline asteroids floating nearby, each facet "
        "reflecting neon light. Distant stars and a galaxy spiral. Majestic "
        "and awe-inspiring, portrait orientation."
    ),
    (
        "assets/images/bg-modes-arcade.png",
        1080, 1920,
        "Mobile game background. Retro arcade room interior. Rows of glowing "
        "arcade cabinets with neon magenta and cyan screens. Classic checkered "
        "black and purple floor. Neon tube lighting on the ceiling. Hazy "
        "atmospheric fog catching the light. Nostalgic 1980s arcade feel, "
        "portrait orientation."
    ),
    (
        "assets/images/bg-settings-control.png",
        1080, 1920,
        "Mobile game background. Control room with chrome panels covered in "
        "neon dials, sliders, and toggle switches. Multiple screens showing "
        "waveforms and data. Ambient magenta and cyan backlighting behind "
        "panels. Industrial synthwave aesthetic. Clean and technical, "
        "portrait orientation."
    ),
    (
        "assets/images/bg-club-arena.png",
        1080, 1920,
        "Mobile game background. VIP lounge interior with chrome and dark "
        "velvet furnishings. A holographic dance floor with neon grid pattern "
        "in the center. Curved chrome bar with neon underglow. Magenta and "
        "cyan ambient lighting. Exclusive and luxurious nightclub atmosphere, "
        "portrait orientation."
    ),
    (
        "assets/images/bg-game-over.png",
        1080, 1920,
        "Mobile game background. A neon grid floor crumbling and dissolving "
        "into fragments. Scattered letter tiles fading and falling into a dark "
        "void below. The neon glow is dimming from magenta to dark red. "
        "Atmospheric particles floating upward. Moody and dramatic, a sense "
        "of ending, portrait orientation."
    ),
    (
        "assets/images/bg-victory.png",
        1080, 1920,
        "Mobile game background. A golden chrome trophy in the center emitting "
        "brilliant light. Magenta and cyan fireworks exploding behind it. "
        "Holographic confetti particles raining down in neon colors. Spotlight "
        "beams crossing in the background. Celebratory and triumphant energy, "
        "portrait orientation."
    ),
    (
        "assets/images/bg-loading-splash.png",
        1080, 1920,
        "Mobile game background. A circular chrome portal or ring in the center "
        "of the frame with neon energy swirling inside it - magenta and cyan "
        "spiraling currents. Dark void surrounding the portal. Energy particles "
        "streaming outward. Mysterious and anticipatory, portrait orientation."
    ),
    (
        "assets/images/bg-onboarding.png",
        1080, 1920,
        "Mobile game background. Synthwave beach boardwalk scene. Wooden "
        "boardwalk with neon strip lights along the rails. Palm trees "
        "silhouetted against a retro sun setting over a calm ocean. The sun "
        "has horizontal scan line cuts. Cyan and magenta sky gradient. Peaceful "
        "and inviting, welcoming atmosphere, portrait orientation."
    ),
]

ICON_ASSETS = [
    (
        "assets/images/icon-coin-gold.png",
        512, 512,
        "Game icon on transparent background. A golden chrome coin viewed at a "
        "slight angle. Embossed letter W in the center. Intense neon gold glow "
        "radiating outward. Chrome reflections on the coin surface. Small "
        "sparkle effects around it. Clean icon style, centered."
    ),
    (
        "assets/images/icon-gem-diamond.png",
        512, 512,
        "Game icon on transparent background. A faceted crystal diamond gemstone "
        "with internal glow shifting between cyan and magenta. Chrome-like "
        "reflective facets catching light. Brilliant sparkles at the edges. "
        "Floating with a subtle shadow below. Clean icon style, centered."
    ),
    (
        "assets/images/icon-hint.png",
        512, 512,
        "Game icon on transparent background. A chrome metallic lightbulb with "
        "a glowing cyan neon filament inside. Small electric sparks and arcs "
        "emanating from the bulb. Magenta glow at the base. Clean, modern "
        "icon style, centered composition."
    ),
    (
        "assets/images/icon-undo.png",
        512, 512,
        "Game icon on transparent background. A chrome circular rewind arrow "
        "(counter-clockwise) with a glowing magenta motion trail behind it. "
        "The arrow head has a cyan glow. Sleek and metallic. Clean icon style, "
        "centered composition."
    ),
    (
        "assets/images/icon-freeze.png",
        512, 512,
        "Game icon on transparent background. A chrome metallic snowflake with "
        "six detailed branches. Glowing cyan from within. Small ice crystal "
        "particles floating around it. Frost effect on the edges. Clean icon "
        "style, centered composition."
    ),
    (
        "assets/images/icon-preview.png",
        512, 512,
        "Game icon on transparent background. A chrome metallic eye symbol. "
        "The iris is glowing cyan and the pupil is magenta. Sleek futuristic "
        "design with subtle scan lines across the eye. Small light rays "
        "emanating outward. Clean icon style, centered."
    ),
    (
        "assets/images/icon-shuffle.png",
        512, 512,
        "Game icon on transparent background. Two chrome arrows crossing each "
        "other in a shuffle/swap pattern. The arrows have a gradient from "
        "magenta at one end to cyan at the other. Motion blur trails. Sleek "
        "metallic finish. Clean icon style, centered."
    ),
    (
        "assets/images/icon-back.png",
        512, 512,
        "Game icon on transparent background. A sleek chrome chevron arrow "
        "pointing left. Cyan motion trail streaming behind it to the right. "
        "Minimalist and clean. Slight magenta glow on the arrow tip. "
        "Clean icon style, centered."
    ),
    (
        "assets/images/icon-battery.png",
        512, 512,
        "Game icon on transparent background. A chrome metallic battery outline "
        "viewed from the side. The shell is empty inside showing the dark "
        "interior. Small positive terminal nub on the right. Subtle cyan edge "
        "glow. Clean minimal icon style, centered."
    ),
    (
        "assets/images/icon-battery-fill.png",
        512, 512,
        "Game icon on transparent background. A horizontal rectangular bar of "
        "glowing neon cyan energy. The bar has an internal pulse effect and "
        "small energy particles. Bright in the center fading slightly at edges. "
        "This is a fill element for a battery icon. Clean style, centered."
    ),
]

DECORATIVE_ASSETS = [
    (
        "assets/images/achievement-badge-frame.png",
        512, 512,
        "Game UI element on transparent background. An ornate circular frame "
        "made of chrome metal with a laurel wreath border. Neon magenta and "
        "cyan accent lights at cardinal points. Small gem studs around the "
        "ring. Empty center for badge content. Premium and prestigious."
    ),
    (
        "assets/images/neon-frame-border.png",
        1024, 1024,
        "Game UI element on transparent background. A rectangular chrome frame "
        "border with neon tube lights running along all four sides. The tubes "
        "glow alternating magenta and cyan. Chrome corner brackets with rivets. "
        "Empty center. Suitable as a card or panel border."
    ),
    (
        "assets/images/trophy-crown-element.png",
        512, 512,
        "Game UI element on transparent background. A chrome metallic crown "
        "with five points. Each point tipped with a different colored neon gem "
        "(magenta, cyan, gold, purple, green). Chrome reflections on the body. "
        "Royal and prestigious, centered composition."
    ),
    (
        "assets/images/neon-sun-element.png",
        512, 512,
        "Game UI element on transparent background. A retro synthwave sun - a "
        "perfect circle with horizontal scan line cuts dividing it into bands. "
        "Color gradient from magenta at top through orange to yellow at bottom. "
        "Neon glow radiating outward. Classic retrowave sun icon, centered."
    ),
    (
        "assets/images/tile-holographic-texture.png",
        512, 512,
        "Seamless texture tile. Iridescent chrome holographic surface with "
        "rainbow oil-slick reflections shifting between magenta, cyan, purple, "
        "and gold. Smooth metallic finish. Suitable as a repeating texture for "
        "game tile surfaces. No distinct objects, just the material texture."
    ),
    (
        "assets/images/tile-gem-texture.png",
        512, 512,
        "Seamless texture tile. Amethyst crystal facet pattern with deep purple "
        "base color. Faceted geometric surfaces catching neon magenta and cyan "
        "light. Internal glow effect. Suitable as a repeating texture for "
        "premium game tiles. No distinct objects, just the crystal texture."
    ),
    (
        "assets/images/sparkle-sprites.png",
        1024, 1024,
        "Sprite sheet on transparent/black background. A 4x4 grid (16 cells) "
        "of different neon sparkle and starburst effects. Each cell contains "
        "one unique sparkle: lens flares, cross stars, circular bursts, diamond "
        "glints. Colors alternate between magenta, cyan, gold, and white. "
        "Clean separation between each sprite cell."
    ),
    (
        "assets/images/particle-starburst.png",
        512, 512,
        "Game effect element on transparent background. A radial neon starburst "
        "explosion. Rays of light emanating from center in all directions. "
        "Core is bright white fading to magenta and cyan at the ray tips. "
        "Small particles scattered along the rays. Energetic and dynamic."
    ),
    (
        "assets/images/energy-ring-element.png",
        512, 512,
        "Game UI element on transparent background. A chrome metallic torus "
        "(ring/donut shape) viewed at a slight angle. Neon energy flowing "
        "along its surface in cyan and magenta currents. Small lightning arcs "
        "between sections. Glowing and dynamic, centered composition."
    ),
    (
        "assets/images/crystal-gems-collection.png",
        1024, 512,
        "Game UI element on transparent background. A horizontal row of 6 "
        "different faceted crystal gems evenly spaced. From left to right: "
        "magenta ruby, cyan diamond, gold topaz, purple amethyst, green "
        "emerald, orange fire opal. Each gem glows with its respective neon "
        "color. Chrome-like reflective facets."
    ),
    (
        "assets/images/shelf-booster.png",
        512, 256,
        "Game UI element on transparent background. A chrome metallic shelf "
        "bracket viewed from the front. Sleek curved chrome support with a "
        "flat top surface. Neon cyan underglow strip along the bottom edge. "
        "Small magenta accent lights at the bracket joints. Minimalist, clean."
    ),
]

# Combine all asset groups
ALL_ASSETS = (
    [("App Assets", APP_ASSETS)]
    + [("Backgrounds", BACKGROUND_ASSETS)]
    + [("Icons", ICON_ASSETS)]
    + [("Decorative", DECORATIVE_ASSETS)]
)

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def get_api_key() -> str:
    """Get API key from environment variable or command line argument."""
    # Check command line args first
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg in ("--api-key", "-k") and i < len(sys.argv) - 1:
            return sys.argv[i + 1]
        if arg.startswith("--api-key="):
            return arg.split("=", 1)[1]

    # Fall back to environment variable
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        print("Error: No API key provided.")
        print("Set GEMINI_API_KEY environment variable or pass --api-key <key>")
        sys.exit(1)
    return key


def ensure_directories():
    """Create output directories if they don't exist."""
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    print(f"  Output directories ready: {ASSETS_DIR}")
    print(f"  Output directories ready: {IMAGES_DIR}")


def build_prompt(description: str, width: int, height: int) -> str:
    """Build a full prompt with style suffix and size specification."""
    orientation = "portrait" if height > width else "square" if height == width else "landscape"
    size_note = f"Image dimensions: {width}x{height} pixels, {orientation} orientation. "
    return f"{size_note}{description} {STYLE_SUFFIX}"


def resize_image(image_data: bytes, target_width: int, target_height: int) -> bytes:
    """Resize image to target dimensions using Pillow."""
    img = Image.open(io.BytesIO(image_data))
    if img.size != (target_width, target_height):
        img = img.resize((target_width, target_height), Image.LANCZOS)
    output = io.BytesIO()
    img.save(output, format="PNG")
    return output.getvalue()


def generate_single_asset(
    client: genai.Client,
    output_path: str,
    width: int,
    height: int,
    description: str,
) -> bool:
    """
    Generate a single asset image via Gemini and save it.
    Returns True on success, False on failure.
    """
    full_path = PROJECT_ROOT / output_path
    prompt = build_prompt(description, width, height)

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )

        # Extract image from response
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    image_data = part.inline_data.data
                    # Resize to exact target dimensions
                    image_data = resize_image(image_data, width, height)
                    # Save the image
                    full_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(full_path, "wb") as f:
                        f.write(image_data)
                    return True

        print(f"    Warning: No image data in response for {output_path}")
        return False

    except Exception as e:
        print(f"    Error generating {output_path}: {e}")
        return False


# ---------------------------------------------------------------------------
# Main execution
# ---------------------------------------------------------------------------


def main():
    print("=" * 60)
    print("  WORDFALL SYNTHWAVE ASSET GENERATOR")
    print("  Using Google Gemini 2.0 Flash (Image Generation)")
    print("=" * 60)
    print()

    # Setup
    api_key = get_api_key()
    client = genai.Client(api_key=api_key)
    ensure_directories()

    # Count total assets
    total_assets = sum(len(assets) for _, assets in ALL_ASSETS)
    print(f"\n  Total assets to generate: {total_assets}")
    print(f"  Estimated time: ~{total_assets * (DELAY_BETWEEN_REQUESTS + 5)} seconds")
    print()

    generated = 0
    failed = 0
    skipped = 0

    for group_name, assets in ALL_ASSETS:
        print(f"\n{'─' * 50}")
        print(f"  {group_name} ({len(assets)} assets)")
        print(f"{'─' * 50}")

        for i, (output_path, width, height, description) in enumerate(assets):
            full_path = PROJECT_ROOT / output_path
            filename = Path(output_path).name
            progress = f"[{generated + failed + skipped + 1}/{total_assets}]"

            # Check if asset already exists
            if full_path.exists():
                print(f"  {progress} ⏭  {filename} (already exists, skipping)")
                skipped += 1
                continue

            print(f"  {progress} ⏳ Generating {filename} ({width}x{height})...")

            # Attempt generation with retry
            success = generate_single_asset(
                client, output_path, width, height, description
            )

            if not success:
                print(f"         Retrying {filename}...")
                time.sleep(DELAY_BETWEEN_REQUESTS)
                success = generate_single_asset(
                    client, output_path, width, height, description
                )

            if success:
                file_size = full_path.stat().st_size
                size_kb = file_size / 1024
                print(f"         ✅ Saved {filename} ({size_kb:.0f} KB)")
                generated += 1
            else:
                print(f"         ❌ Failed to generate {filename}")
                failed += 1

            # Delay between requests to avoid rate limiting
            if i < len(assets) - 1 or group_name != ALL_ASSETS[-1][0]:
                time.sleep(DELAY_BETWEEN_REQUESTS)

    # Summary
    print(f"\n{'=' * 60}")
    print(f"  GENERATION COMPLETE")
    print(f"{'=' * 60}")
    print(f"  ✅ Generated: {generated}")
    print(f"  ⏭  Skipped:   {skipped}")
    print(f"  ❌ Failed:    {failed}")
    print(f"  📁 Output:    {ASSETS_DIR}")
    print()

    if failed > 0:
        print("  Tip: Re-run the script to retry failed assets.")
        print("  Already-generated assets will be skipped automatically.")
        print()

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
