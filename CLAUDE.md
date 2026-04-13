# Wordfall — Agent Context

Gravity-based word puzzle (React Native + Expo). Find hidden words on a letter grid; cleared letters fall, creating chain opportunities. 10 modes, 40 authored chapters (~600 puzzles), clubs, VIP, prestige.

**Stack:** Expo SDK 55 (New Architecture only — bridgeless), RN 0.83.4, React 19.2, TypeScript ~5.8, Reanimated 4.2.1 + worklets 0.7.2, **zustand** (game state store with selectors), **React Compiler** (auto-memoization via babel-preset-expo), Firebase (optional, has offline fallback), Jest (**37 suites, 779 tests**).

For detailed architecture see `agent_docs/architecture.md`. For domain/gameplay detail see `agent_docs/domain.md` if it exists; otherwise read `src/constants.ts` and `src/data/`.

## Commands

```bash
npx expo start --dev-client            # Metro bundler (Expo Go NOT supported)
npm run typecheck                      # tsc --noEmit
npm test                               # jest (779 tests)
npm install --legacy-peer-deps         # .npmrc sets this by default
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android  # Rebuild dev client APK (Termux requires the env var)
```

## Critical Files

| File | Role |
|------|------|
| `App.tsx` | Entry. ErrorBoundary, provider nesting, navigation, deep links, 25+ ceremony switch |
| `src/hooks/useGame.ts` | Game store factory (zustand + redux middleware wrapping 24-action reducer). Returns store instance + stable action dispatchers. **No `state` return — consumers use selectors.** |
| `src/stores/gameStore.ts` | Zustand store factory, `GameStoreContext`, `useGameStore` selector hook, `useGameDispatch`, 25+ pre-built selectors (`selectStatus`, `selectScore`, etc.) |
| `src/screens/game/PlayField.tsx` | Grid + selection rendering. Subscribes to per-tap state (`selectedCells`) via zustand selectors so GameScreen doesn't re-render on taps. |
| `src/screens/game/ConnectedWordBank` | (exported from PlayField.tsx) WordBank with store-driven `currentWord`/`isValidWord`. Rendered above grid area. |
| `src/screens/game/GameFlashes.tsx` | Memoized subtree: chain popup, neon pulse, VHS glitch, valid/invalid flash, score popup, big-word label. Animated.Values passed by stable ref. |
| `src/screens/game/GameBanners.tsx` | Memoized subtree: 7 conditional banners (gravity, shrink, wildcard, idle hint, ad hint, stuck ×2). |
| `src/hooks/useRewardWiring.ts` | All post-puzzle rewards: coins/gems, rare tiles, ceremonies, mastery, quests |
| `src/contexts/PlayerContext.tsx` | Master player data. **Persistence is debounced** (300ms coalesce + AppState flush). |
| `src/contexts/EconomyContext.tsx` | Currency, VIP, IAP fulfillment. **Persistence is debounced** (1s coalesce + AppState flush). |
| `src/engine/boardGenerator.ts` | Seeded PRNG, 5s timeout, 4-tier fallback, mode-aware validation |
| `src/engine/solver.ts` | 8-dir DFS with step budget + wall-clock timeout |
| `src/screens/GameScreen.tsx` | Gameplay UI: offers, tutorials, post-loss modal. **Does NOT subscribe to `selectedCells`** — reads coarse state via ~20 zustand selectors. |
| `src/components/Grid.tsx` | Pan + tap gesture handler. O(1) column-indexed hit test. `.shouldCancelWhenOutside(true)`. **Uses `.runOnJS(true)` — see gotchas.** |
| `src/utils/hooks.ts` | `useStableCallback` — stable-identity callback wrapper (useEvent RFC polyfill). Used for all props passed to memoized children. |
| `src/types.ts` | ALL type definitions — edit here when adding data structures |
| `src/constants.ts` | COLORS, GRADIENTS, MODE_CONFIGS, ECONOMY, STREAK, FEATURE_UNLOCK_SCHEDULE |

15 screens live in `src/screens/`. Game sub-components live in `src/screens/game/` (PlayField, GameFlashes, GameBanners). Ceremonies, backdrops, effects live in `src/components/{,common,home,victory,effects,game,modes,events,navigation,economy}/`.

**Two cloud functions directories exist**: `cloud-functions/` (club goals, leaderboards, streak reminders, push) and `functions/` (validateReceipt, subscription renewals, club goal progress, inactive member cleanup). Don't confuse them.

## Things That Will Bite You

- **Reanimated gesture worklets.** `Gesture.Pan()/.Tap()` callbacks run as worklets on the UI thread by default. If your callback calls React state / reducers / `useRef.current`, add **`.runOnJS(true)`** immediately after the constructor. Without it: `Tried to synchronously call a non-worklet function 'X' on the UI thread` crash. See `Grid.tsx` for the pattern.
- **`react-native-iap` is removed** from `package.json`. The Gradle build fails on v14 (Nitro Modules peer dep) and v12 (amazon/play flavor ambiguity). `src/services/iap.ts` dynamically imports it with a variable package name and falls back to mock mode when missing. Re-adding requires a config plugin to patch `build.gradle`. Until then, all purchases succeed locally but nothing is charged.
- **`expo-av` is REMOVED in SDK 55.** Replaced by `expo-audio` (SFX/music) and `expo-video`. Don't reintroduce — the package is discontinued and won't autolink. `src/services/sound.ts` uses `expo-audio` only; the legacy fallback was deleted.
- **Babel config: React Compiler + worklets plugin.** `babel.config.js` enables React Compiler via `babel-preset-expo`'s `'react-compiler'` option (scoped to `src/`) AND has `react-native-worklets/plugin` as the **last plugin**. The worklets plugin MUST stay last or you get `_WORKLET is not defined` at runtime. Do not remove the compiler config — it auto-memoizes all components in `src/`.
- **`generateBoard(config, seed, mode)` REQUIRES the `mode` arg** for `shrinkingBoard` / `gravityFlip` / `noGravity`. Each uses a different solvability check.
- **`isDeadEnd` must run in a deferred `useEffect`**, never in render. It's an expensive DFS.
- **Tile gradients must be fully opaque hex** (not rgba). rgba causes background bleed-through on the New Architecture.
- **`LetterCell` has no `onPress` prop.** Input is handled by the grid-level gesture detector.
- **`--legacy-peer-deps` is the default** (via `.npmrc`). React 19 + RN 0.83 have peer conflicts. Don't remove.
- **`overrides: { expo-constants: ~55.0.13 }`** in `package.json` forces a single version tree-wide. Originally added in SDK 54 to fix a duplicate-dependency `expo doctor` blocker. Likely no longer strictly needed in SDK 55 (all expo packages share the major), but the dedupe is harmless — leave it unless `expo install --fix` complains.
- **`expo.install.exclude`** in `package.json` silences `@types/react` 18 vs 19 and `typescript` version warnings. Don't remove without thinking.
- **4 files still use the legacy `Animated` API** (intentional — imperative particle systems that don't map to hooks): `effects/ParticleSystem.tsx`, `WordBank.tsx`, `victory/GridDissolveEffect.tsx`, `game/GravityTrailEffect.tsx`. Leave them alone unless you have a measured perf reason.
- **Metro cache stickiness.** If imports look wrong after a pull: `npx expo start --dev-client --clear`.
- **`newArchEnabled` is FORBIDDEN in `app.json` for SDK 55.** New Arch is mandatory (Old Arch was deleted from RN 0.83) and the field is no longer in the schema. Leaving it in causes `expo doctor` to fail during EAS prebuild and produces an APK with a misconfigured TurboModule registry, which manifests at runtime as `TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found`.
- **Entry point is `index.js` at the repo root**, not `expo/AppEntry.js`. `package.json` `main` must be `"index.js"`. The root `index.js` imports `registerRootComponent` from **`'expo'`** (the package entry, NOT the deep path `expo/src/launch/registerRootComponent`). The deep import bypasses package-level init that's needed for core TurboModule registration in bridgeless mode. SDK 55's default template ships this way.
- **`expo-notifications` channel sound must NOT be `'default'`.** In SDK 55, `setNotificationChannelAsync`'s `sound` field treats any string as a custom filename to look up in the config plugin's sounds array — there's no magic `'default'` keyword (the magic still works in `scheduleNotificationAsync`'s content sound, only the channel changed). Omit the field for system default.
- **EAS builds in Termux: set `EAS_SKIP_AUTO_FINGERPRINT=1`.** `@expo/fingerprint` uses a worker pool sized from `os.cpus()`, which Termux's Android sandbox returns weirdly, producing `Expected concurrency to be a number from 1 and up`. The flag skips fingerprint computation only — it doesn't affect the actual build artifacts. Permanent fix: add `"env": { "EAS_SKIP_AUTO_FINGERPRINT": "1" }` to each profile in `eas.json`.
- **After a major SDK upgrade, NUKE local `node_modules` first.** Multiple `npm install` runs leave orphaned files from older react-native versions. Metro then bundles JS that references native modules from the OLD RN version, while your APK has the NEW one — exactly the symptom that produces phantom `'PlatformConstants' could not be found` errors at runtime even with a clean APK build. Always: `rm -rf node_modules .expo node_modules/.cache && npm install --legacy-peer-deps && npx expo start --dev-client --clear`. This is the FIRST thing to try after pulling a major bump, not the last.

## Code Patterns

- Screens use **default exports**. Components use named exports.
- All types go in **`src/types.ts`**.
- Reanimated: `useSharedValue` + `useAnimatedStyle` + `withTiming`/`withSpring`/`withRepeat`/`withSequence`/`withDelay`. No `useNativeDriver` flag.
- When adding a **new ceremony**: add to `CeremonyItem['type']` in `types.ts`, queue via `player.queueCeremony()`, render in `App.tsx` ceremony switch. For simple ribbon+icon+text, reuse `MilestoneCeremony`.
- When adding a **new game action**: add to `GameAction` union in `types.ts`, handle in `gameReducer` in `useGame.ts`. The reducer is wrapped by zustand's `redux` middleware — no separate zustand action needed.
- **Game state lives in a zustand store**, not `useReducer`. `useGame()` creates the store and returns it + action dispatchers. Consumers read state via `useStore(store, selector)` or `useGameStore(selector)` (from context). **Never return full `state` from `useGame`** — that defeats the selector-based optimization. Add new selectors in `src/stores/gameStore.ts`.
- **`useStableCallback`** (from `src/utils/hooks.ts`) is the standard way to pass callbacks to memoized children. It gives a stable identity across renders while always calling the latest closure. Use it instead of `useCallback` when deps would churn.
- When adding a **new mode**: add to `MODE_CONFIGS` in `constants.ts`, wire reducer logic in `useGame.ts`, add mode-specific validation in `boardGenerator.ts`, add tutorial to `modeTutorials.ts`.

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

## Needs External Setup

| Item | How | Fallback if missing |
|------|-----|---------------------|
| Firebase | `EXPO_PUBLIC_FIREBASE_*` env vars | App runs fully offline (AsyncStorage only) |
| Sentry | `EXPO_PUBLIC_SENTRY_DSN` | Console logging |
| AdMob | `EXPO_PUBLIC_ADMOB_REWARDED_ID` | `MockAdModal` component |
| IAP products | Register `wordfall_*` IDs in App Store Connect / Play Console | Production purchases are gated off until store products and server validation are configured |
| Firestore rules + indexes | `firebase.json` is in the repo root; run the helper script or `firebase deploy --only firestore:rules,firestore:indexes` | Rules file exists at `firestore.rules`, indexes at `firestore.indexes.json` — still requires deployment |
| Cloud Functions | `cd functions && firebase deploy` and `cd cloud-functions && firebase deploy` | Club goals, leaderboards, IAP validation don't run |
| Audio assets | Drop `.mp3` files in `assets/audio/` | Synthesized tones |

EAS project already configured (`projectId: b6dd187c-d46c-4331-bb15-5c7ffced89b3`, owner `jpearleverett`).

## Still Needs Work

- Deploy both `cloud-functions/` and `functions/` directories (or consolidate)
- iOS Universal Links (scheme works; HTTPS needs domain + apple-app-site-association)
- E2E tests (Detox/Maestro — unit coverage is strong with 779 tests)
- Professional audio assets to replace synthesized tones
- FCM credentials for Android push notifications
- Context selectors for PlayerContext/EconomyContext (narrow subscriptions via `useSyncExternalStore` — plan exists in `/.claude/plans/kind-weaving-hoare.md` Phase 4)
