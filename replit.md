# Wordfall

A gravity-based strategic word puzzle game built with React Native and Expo.

## Visual Theme: Synthwave / Miami Vice — 3D & Depth

The entire UI uses a synthwave/vaporwave/Miami aesthetic with real depth and 3D effects:
- **Primary accent:** Hot pink (#ff2d95) with neon glow effects
- **Secondary:** Electric purple (#c84dff) and cyan (#00e5ff)
- **Background:** Deep purple-black (#0a0015) with nebula orbs
- **Tiles:** 3D crystal gems with 5-stop body gradient, top specular highlight strip, wide reflection bar, diagonal facet overlay, deep bottom shadow zone (10% height), inner border ring on selection, gem texture at 12% opacity
- **Grid:** Neon gradient border frame (pink→purple→cyan) with amplified outer glow (40px radius), darker inner backdrop
- **Backdrop:** Synthwave perspective grid floor with converging lines, neon sun with horizontal stripe slicing, horizon glow line, twinkling stars
- **Buttons:** Pink-to-purple gradients with glow shadows, inner white border highlight
- **Cards:** Glass morphism with purple-tinted borders, deep shadows (28px radius), ambient glow orbs
- **Popups:** Chain/score popups with white neon text glow, 2.5px borders, 30px shadow radius
- **Header:** Enhanced glass chrome with 3-stop top edge highlight, deeper shadow (28px), neon battery fill glow, progress dot with border ring
- **WordBank:** Purple-tinted text shadow on current word, wider underline, letter count badges with purple accent, enhanced word chip borders and shadows
- **Victory:** Larger hero glow orbs (280px/240px), golden ribbon with neon border, 38px score with stronger gold glow, enlarged star glow rings

Key files for the visual system:
- `src/constants.ts` — COLORS, GRADIENTS, and SHADOWS definitions
- `src/components/common/SynthwaveBackdrop.tsx` — Perspective grid floor, neon sun, twinkling stars
- `src/components/common/AmbientBackdrop.tsx` — Menu/home backgrounds with nebula orbs
- `src/components/LetterCell.tsx` — 3D gem tile visuals with multi-layer shading
- `src/components/Grid.tsx` — Neon-bordered game grid frame
- `src/components/GameHeader.tsx` — Glass chrome header with deep shadows
- `src/components/WordBank.tsx` — Word chips with shadow depth
- `src/utils/assetUrls.ts` — CDN-hosted background images and textures (legacy fallback)
- `src/utils/localAssets.ts` — Local PNG assets (icons, backgrounds, AI-generated synthwave art)

### Custom AI-Generated Image Assets (assets/images/)
All key screens now use custom AI-generated synthwave imagery:
- `bg-synthwave-gameplay.png` — Gameplay backdrop: perspective grid, neon sun, palm silhouettes, mountains
- `bg-home-neon.png` — Home screen: neon cyberpunk cityscape at night
- `bg-onboarding.png` — Welcome screen: crystal aurora landscape with grid floor
- `bg-victory.png` — Victory overlay: purple energy burst with crystal shards
- `tile-gem-texture.png` — Amethyst crystal texture overlay for idle letter tiles (8% opacity)
- `neon-sun-element.png` — Stripe-sliced neon sun (replaces procedural sun in SynthwaveBackdrop)
- `neon-frame-border.png` — Ornate neon tube frame overlay behind the game grid
- `crystal-gems-collection.png` — Five colored gem icons for future booster/collectible use

## Architecture

- **Framework:** React Native + Expo (~54.0.0)
- **Language:** TypeScript
- **Navigation:** React Navigation (Stack + Bottom Tabs)
- **State:** React Context + useReducer
- **Storage:** AsyncStorage
- **Audio:** expo-av (procedurally generated tones)
- **Auth/Cloud:** Firebase (optional, requires env vars)

## Project Structure

```
App.tsx                     # Entry point, screen navigation
src/
  types.ts                  # TypeScript type definitions
  constants.ts              # Colors, dimensions, game config
  words.ts                  # Word database (~1500 words)
  engine/
    boardGenerator.ts       # Puzzle generation with solvability check
    gravity.ts              # Column-based gravity physics
    solver.ts               # Recursive backtracking solver
  hooks/
    useGame.ts              # Core game state (useReducer)
    useStorage.ts           # AsyncStorage persistence
  components/               # UI components
  screens/                  # App screens
  contexts/                 # React contexts (Auth, Economy, Player, Settings)
  services/                 # Sound, haptics, analytics, crash reporting
  data/                     # Collections, word packs
  utils/                    # Share generator, etc.
```

## Running in Replit (Web)

The workflow builds a static web bundle and serves it on port 5000:

```
Workflow: "Start application"
Command:  npx expo export --platform web --output-dir dist && npx serve dist -l 5000 --single
Port:     5000
```

**Important:** The Metro dev server (`expo start --web`) does not work with Replit's proxy. Instead, this project builds a static web export (`dist/`) and serves it via `serve`. Restarting the workflow will rebuild the static bundle.

## Web Dependencies Added for Replit

- `react-dom` — Required for Expo web
- `react-native-web` — React Native web renderer
- `@expo/metro-runtime` — Metro bundler web runtime
- `serve` — Static file server for the built output

## Deployment

Configured as a static site:
- **Build:** `npx expo export --platform web`
- **Output directory:** `dist/`

## Environment Variables

Firebase configuration (optional, required for auth and cloud features):
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
