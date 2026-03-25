# Wordfall

A gravity-based strategic word puzzle game built with React Native and Expo.

## Visual Theme: Synthwave / Miami Vice — 3D & Depth

The entire UI uses a synthwave/vaporwave/Miami aesthetic with real depth and 3D effects:
- **Primary accent:** Hot pink (#ff2d95) with neon glow effects
- **Secondary:** Electric purple (#c84dff) and cyan (#00e5ff)
- **Background:** Deep purple-black (#0a0015) with nebula orbs
- **Tiles:** 3D crystal gems with 4-stop body gradient, top specular highlight strip, white reflection bar, bottom shadow edge, inner border ring on selection
- **Grid:** Neon gradient border frame (pink→purple→cyan) with ambient outer glow
- **Backdrop:** Synthwave perspective grid floor with converging lines, neon sun with horizontal stripe slicing, horizon glow line, twinkling stars
- **Buttons:** Pink-to-purple gradients with glow shadows
- **Cards:** Glass morphism with purple-tinted borders, deep shadows, ambient glow orbs

Key files for the visual system:
- `src/constants.ts` — COLORS, GRADIENTS, and SHADOWS definitions
- `src/components/common/SynthwaveBackdrop.tsx` — Perspective grid floor, neon sun, twinkling stars
- `src/components/common/AmbientBackdrop.tsx` — Menu/home backgrounds with nebula orbs
- `src/components/LetterCell.tsx` — 3D gem tile visuals with multi-layer shading
- `src/components/Grid.tsx` — Neon-bordered game grid frame
- `src/components/GameHeader.tsx` — Glass chrome header with deep shadows
- `src/components/WordBank.tsx` — Word chips with shadow depth
- `src/utils/assetUrls.ts` — CDN-hosted background images and textures
- `src/utils/localAssets.ts` — Local PNG assets (icons, backgrounds)

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
