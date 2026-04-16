# Wordfall — Agent Context

Gravity-based word puzzle (React Native + Expo). Find hidden words on a letter grid; cleared letters fall, creating chain opportunities. 10 modes, 40 authored chapters (~600 puzzles), clubs, VIP, prestige.

**Stack:** Expo SDK 55 (New Architecture only — bridgeless), RN 0.83.4, React 19.2, TypeScript ~5.8, Reanimated 4.2.1 + worklets 0.7.2, **zustand** (game state store with selectors), **React Compiler** (auto-memoization via babel-preset-expo), Firebase (optional, has offline fallback), Jest (**39 suites, 791 tests**).

For detailed architecture see `agent_docs/architecture.md` — it's a short **index** that routes you to per-domain slices (state, engine, screens, cloud) so you only read what the current question needs.

## Commands

```bash
npx expo start --dev-client            # Metro bundler (Expo Go NOT supported)
npm run typecheck                      # tsc --noEmit
npm test                               # jest (791 tests)
npm install --legacy-peer-deps         # .npmrc sets this by default
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android  # Rebuild dev client APK (Termux requires the env var)
```

## Critical Files

| File | Role |
|------|------|
| `App.tsx` | Entry. ErrorBoundary, provider nesting, navigation, deep links, 25+ ceremony switch |
| `src/hooks/useGame.ts` | Game store factory (zustand + redux middleware wrapping 24-action reducer). Returns store instance + stable action dispatchers. **No `state` return — consumers use selectors.** |
| `src/stores/gameStore.ts` | Zustand store factory, `GameStoreContext`, `useGameStore` selector hook, `useGameDispatch`, 25+ pre-built selectors. |
| `src/screens/game/PlayField.tsx` | Grid + selection rendering. Subscribes to per-tap state (`selectedCells`) via zustand selectors so GameScreen doesn't re-render on taps. |
| `src/screens/GameScreen.tsx` | Gameplay UI: offers, tutorials, post-loss modal. **Does NOT subscribe to `selectedCells`** — reads coarse state via ~20 zustand selectors. |
| `src/types.ts` | ALL type definitions — edit here when adding data structures |

Extended list (grid gestures, game sub-components, contexts, engine, utility hooks): **`agent_docs/critical_files.md`**.

## Gotchas

Build, native-module, and runtime quirks (`Reanimated` worklet pitfalls, SDK 55 native deps, Babel plugin order, Firebase hybrid SDK, Termux EAS quirks, etc.) live in **`agent_docs/gotchas.md`**. Consult that file when a build or runtime issue surfaces.

## Code Patterns

See `agent_docs/patterns.md` — conventions for exports, types, Reanimated, adding a new ceremony / action / mode, and the zustand + selector pattern.

## Dev Client (REQUIRED)

Expo Go is not supported. You need the dev client APK.

```bash
# Daily: start Metro
npx expo start --dev-client
# Open the "Wordfall" custom app on device; press `r` in terminal to reload JS

# Rarely: rebuild native APK (only when adding/removing native deps)
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android
# Download APK from the URL EAS prints, install on device

# JS-only changes do NOT need a new APK — just reload Metro.
# Native dep changes (adding/removing/upgrading anything in node_modules
# with native code) DO need a fresh APK.
```

**Termux note:** Local Android builds are impossible in Termux (NDK has no ARM64 host tools). Always use EAS cloud builds. Free tier = 30 builds/month, ~1 per week is enough. The `EAS_SKIP_AUTO_FINGERPRINT=1` env var is required in Termux — see Gotchas.

## Branch Strategy

**Never push directly to `main`.** Work on feature branches named `claude/<slug>`:

```bash
git checkout main && git pull origin main
git checkout -b claude/<slug>
# ... edit, test, commit ...
git push -u origin claude/<slug>
```

User reviews and merges via GitHub PR. Exception: tiny config-only fixes (package.json, eas.json, .gitignore) that unblock a broken build can go direct to main **only if the user explicitly says so**.

## External Setup & Open Items

Firebase / Sentry / AdMob env vars, IAP/Firestore/Cloud Functions deploy steps, launch-prep to-do list — see **`agent_docs/setup.md`**.

EAS project already configured (`projectId: b6dd187c-d46c-4331-bb15-5c7ffced89b3`, owner `jpearleverett`).
