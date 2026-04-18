# Wordfall — Art Commission Brief

> Pass to your illustrator / 2D artist. Specifies every visual asset the game needs to shed the "asset-store look" and reach top-tier polish.
>
> **Code wire-up:** drop delivered files into `assets/images/` then run `scripts/optimize-assets.sh` to produce WebP, then register in `src/utils/localAssets.ts:5` `LOCAL_IMAGES` map.

---

## Brand & Style Reference

**Game:** Wordfall — gravity-based word puzzle. Letters fall, words clear, chains build.

**Existing visual language:**
- Neon + chrome aesthetic (gradients, glows, scan-line accents)
- Dark backgrounds with vibrant accent colors (gold, cyan, magenta, electric blue)
- Type-forward UI (game IS a word puzzle, so typography reads as primary)
- Existing icon set in `assets/images/optimized/` shows the established palette

**Inspiration / mood references:**
- **Wordscapes** — warm, painterly chapter art (high-end nature illustration)
- **Royal Match** — character-driven feature graphics, expressive pose-based hero shots
- **Toy Blast** — vivid color palette, exaggerated proportions
- **Monument Valley** — geometric, clean, magical-realist
- **Stranger Things title sequence** — neon + chrome typography vibe

**Avoid:**
- Generic "stock illustration" look (round-headed flat characters with no faces)
- Over-rendered AI-generated look (uncanny edges, melting hands)
- Disney / Pixar character cliché (we don't have characters; we have a puzzle world)

---

## Asset List — Tier 1 (Launch-Critical)

### 1. App Icon Refresh (1 file × multiple sizes)
- **Purpose:** Play Store listing + device home screen
- **Sizes:** 512×512 (Play Store), 1024×1024 (App Store reserve), Android adaptive icon foreground (108×108) + background (108×108)
- **Concept:** the letter "W" formed from falling tiles with one tile mid-fall — captures the gravity mechanic instantly. Or alternative: a stylized cascade of 4–5 tiles spelling fragments
- **Delivery format:** PNG with transparency for adaptive layers; SVG source if possible
- **Existing reference:** `assets/wordfalllogo.png` shows the wordmark style

### 2. Feature Graphic (1 file)
- **Purpose:** Play Store header banner
- **Size:** 1024×500
- **Concept:** dramatic hero shot of the game board mid-cascade — letters falling, chain explosion, word "WORDFALL" forming naturally from the fallen tiles. Background = neon city / abstract space
- **Delivery format:** PNG, 16-color-rich

### 3. Phone Screenshots (8 files)
- **Purpose:** Play Store listing carousel
- **Size:** 1080×1920 (portrait)
- **Concepts (in order):**
  1. **Hero shot** — gameplay mid-chain, screen-shake frame, big "3x CHAIN!" overlay; tagline "Find words. Watch them fall."
  2. **Mode variety** — collage of 4 modes (Classic, Time Pressure, Gravity Flip, Daily); tagline "10 ways to play."
  3. **Boosters** — wildcard tile mid-deploy with sparkle; tagline "Power-ups when you're stuck."
  4. **Chapters** — chapter-select map with theme-art previews; tagline "40 chapters. 600+ puzzles."
  5. **Clubs** — club leaderboard with crown emojis; tagline "Join a Club. Climb together."
  6. **Daily challenge** — daily puzzle screen with countdown timer; tagline "Same puzzle. Worldwide. Daily."
  7. **Battle pass** — season pass tier ladder UI (after Branch 6 lands); tagline "New rewards every season."
  8. **Friend leaderboard** — home screen widget with friend avatars; tagline "Beat your friends."

---

## Asset List — Tier 2 (Chapter Illustrations)

### 4. Chapter Theme Art (40 files)
- **Purpose:** background art for each of 40 chapters in `src/data/chapters.ts`
- **Size:** 1080×600 (16:9 wide format), illustrated panel
- **Style:** painterly, evocative, themed to chapter content
- **Theme groupings (see `src/data/chapters.ts` for current themes):**
  - Wing 1 (Nature): Forest, garden, meadow, mountain, ocean
  - Wing 2 (Animals): Forest creatures, sea life, birds, jungle, polar
  - Wing 3 (Food): Fruits, sweets, breakfast, dinner, world cuisine
  - Wing 4 (Travel): Cities, beaches, mountains, deserts, monuments
  - Wing 5 (Science): Space, atoms, oceans, climate, technology
  - Wing 6 (Sports): Team sports, individual, water sports, winter, extreme
  - Wing 7 (Art): Music, painting, dance, theater, literature
  - Wing 8 (Mystery): Detective, magic, enchanted, ancient, cosmos
- **Delivery format:** WebP at 80% quality (or PNG that we'll convert)

### 5. Profile Frames (12 variants)
- **Purpose:** VIP cosmetic track (Branch 4) + season pass cosmetic track (Branch 6)
- **Size:** 256×256 with 32-pixel safe-zone for the avatar inside
- **Variants:**
  - `vip_member` (week 1) — simple silver border
  - `vip_silver` (week 4) — engraved silver, subtle gradient
  - `vip_gold` (week 8) — ornate gold, gem accents
  - `vip_animated` (week 12) — gold with animated sparkle layer (deliver as image + sprite sheet for animation)
  - `vip_trophy` (week 26) — laurel-wreath ornament with trophy crest
  - `season_bronze`, `season_silver`, `season_gold` (season pass tiers 10, 25, 50 free track)
  - `season_premium_bronze`, `season_premium_silver`, `season_premium_gold` (premium tier 10, 25, 50)
  - `referral_champion` (10+ successful referrals)
- **Delivery format:** PNG with transparency

### 6. Booster Icons Refresh (3 files)
- **Purpose:** in-game booster bar icons (currently emoji-based)
- **Size:** 128×128
- **Variants:**
  - **Wildcard Tile** — magical glowing letter tile with rainbow refraction
  - **Spotlight** — beam-of-light icon over a letter cell
  - **Smart Shuffle** — cyclical arrows around letter tiles
- **Delivery format:** PNG with transparency, plus optional 256×256 high-res for ceremony reveals

### 7. Booster Combo Banners (3 files)
- **Purpose:** Branch 10 — full-width banners that appear when two boosters are active
- **Size:** 1080×200
- **Variants:** "Eagle Eye" (Wildcard + Spotlight), "Lucky Roll" (Wildcard + Shuffle), "Power Surge" (Shuffle + Spotlight)
- **Style:** dramatic background gradient, combo name in custom typography, hero icon featuring both boosters

---

## Asset List — Tier 3 (Polish)

### 8. Ceremony Backgrounds (8 files)
- **Purpose:** existing `*Ceremony.tsx` components currently use generic gradients
- **Size:** 1080×1920 (full-screen overlay)
- **Variants:** level-up, milestone, achievement, mode-unlock, feature-unlock, difficulty-transition, collection-complete, streak-milestone
- **Style:** unique mood per ceremony (level-up = bright/celebratory, milestone = epic/grand, achievement = trophy/gold, etc.)

### 9. Empty State Illustrations (4 files)
- **Purpose:** clubs (no club joined yet), friends (no friends yet), shop (network error), gifts (inbox empty)
- **Size:** 512×512
- **Style:** charming, slightly humorous, encouraging next action

### 10. Tile Treatments (5 files)
- **Purpose:** rare tile variants — currently we only have the base `tile-gem-texture.webp`
- **Size:** 256×256
- **Variants:** common, rare, epic, legendary, mythic (rarity tiers in `src/data/cosmetics.ts`)
- **Style:** progressively more elaborate — common is plain, mythic is animated/holographic

---

## Delivery Format Standards

- **Source files:** Provide layered PSD or AI source for icons + frames (we may need to recolor for variants)
- **Final delivery:**
  - PNG with transparency for icons / frames / characters
  - WebP 80% quality for backgrounds / illustrations (we run `scripts/optimize-assets.sh` if you deliver PNG)
  - 16:9 or square aspect ratios (no irregular crops)
- **Naming:** kebab-case, descriptive (e.g., `chapter-bg-forest-walk.png`, `profile-frame-vip-gold.png`)
- **Color profile:** sRGB
- **Bit depth:** 8-bit (no need for 16-bit on mobile)

---

## Total Asset Count

| Tier | Asset Class | Count |
|---|---|---|
| 1 | App Icon (multi-size) | 1 set |
| 1 | Feature Graphic | 1 |
| 1 | Phone Screenshots | 8 |
| 2 | Chapter Theme Art | 40 |
| 2 | Profile Frames | 12 |
| 2 | Booster Icons | 3 |
| 2 | Booster Combo Banners | 3 |
| 3 | Ceremony Backgrounds | 8 |
| 3 | Empty State Illustrations | 4 |
| 3 | Tile Treatments | 5 |
| **Total** | | **~85 assets** |

---

## Budget Reference

Industry rates for mobile game illustration (April 2026):
- **Icons (small, ~128px):** $50–$200 each
- **Frames / cosmetics:** $100–$300 each
- **Phone screenshots (with composition + copy):** $200–$600 each
- **Chapter illustrations / hero art:** $300–$1500 each
- **Feature graphic / app icon (premium):** $500–$2000 each

**Total mid-tier:** $20,000–$40,000 for all 85 assets
**Total premium (named studio):** $60,000–$120,000

**Pragmatic launch path:** Tier 1 only ($3,000–$8,000) — gets you a polished store listing without spending on 40 chapter backgrounds before product-market fit is proven. Tier 2 + 3 can land in v1.1 patches.

**AI-assisted alternative:** Midjourney + Photoshop touch-ups can produce Tier 2 assets at ~$50/each ($2,000 for all 40 chapter backgrounds + 12 frames). Quality varies; use for chapters but human-illustrate the icon + feature graphic + screenshots.

---

## Acceptance Criteria

When you receive deliverables:

1. Drop into `assets/images/` (and `assets/images/optimized/` after running optimization)
2. Update `src/utils/localAssets.ts:5` `LOCAL_IMAGES` map with new entries
3. Update referencing components (chapter cards in `src/screens/`, frame renderer in cosmetics UI)
4. Run `npm test` — no broken image refs
5. Verify on dev client: every chapter shows new art, profile frames render on player avatar, screenshots match the actual game state

---

## Lead Time

- **Tier 1 (8 screenshots + icon + feature graphic):** 2–4 weeks
- **Tier 2 (40 chapters + 12 frames + 6 booster):** 6–10 weeks
- **Tier 3 (8 ceremonies + 4 empty + 5 tiles):** 3–5 weeks

Tier 1 is the only blocker for store listing approval. Tier 2 + 3 can ship as v1.1 / v1.2 content updates.
