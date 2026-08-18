# Play Store listing assets

Generated per the briefs in `agent_docs/store_listing.md` (§G–§I) from the
shipped art in `assets/`. These are the upload-ready files for Google Play
Console → Store presence → Main store listing.

| File | Spec | Status |
|---|---|---|
| `play-icon-1024.png` | §I — 1024×1024, opaque RGB, square-edged (Play applies its own mask) | ✅ ready to upload |
| `feature-graphic-1024x500.png` | §H — logo centered-left, falling WORD/FALL tiles with motion streaks, grid horizon, "GRAVITY WORD PUZZLE" tagline | ✅ ready to upload |
| `captions/01.png` … `08.png` | §G — 1080×96 caption pills (neon-cyan → black gradient, white bold text) for overlay on screenshots | ✅ ready to composite |

## How the icon was produced

`assets/icon.png` is 500×500 RGBA with baked rounded corners — both store
rules require 1024×1024 opaque with square edges. The listing icon keeps the
full art (Lanczos upscale) and fills the transparent corner arcs with a
blurred, slightly zoomed continuation of the art itself, so the square
version has no visible seams. The in-app / launcher icon path
(`assets/icon.png` via `app.json`) is untouched.

## Remaining screenshot work (device-side)

Real gameplay screenshots cannot be synthesized — capture them on a device
(1080×1920 or taller, portrait), then composite the matching caption pill
from `captions/` onto the top third of each shot.

**Rendering the app headlessly to automate this does not work, and was
tried:** `npx expo export --platform web` fails because
`react-native-google-mobile-ads` imports React Native internals that have
no web implementation (`src/services/ads.ts` is imported at App.tsx top
level, so the chain is unavoidable without restructuring the ads module).
Making the web target build would mean surgery on the monetization path
for a platform we do not ship — not worth it. Even if it built,
react-native-web renders fonts, shadows, and gradients differently from
native, so the result would not honestly represent the shipped game on a
store listing. Capture on the real device. The 8 shots and their
captions are specified in `agent_docs/store_listing.md` §G:

1. Mid-puzzle trace → `captions/01.png`
2. Mid-gravity fall → `captions/02.png`
3. Mode selector → `captions/03.png`
4. Library meta-screen → `captions/04.png`
5. Daily Challenge + leaderboard → `captions/05.png`
6. Collections → `captions/06.png`
7. Club chat + leaderboard → `captions/07.png`
8. Shop / Welcome Gift → `captions/08.png`

Compositing (any tool works):
`magick screenshot.png captions/01.png -geometry +0+120 -composite out/01.png`

Regeneration: `python3 scripts/gen_store_assets.py` (needs Pillow —
`pip install pillow`); it reads `assets/icon.png` + `assets/wordfalllogo.png`
and rewrites everything in this directory.
