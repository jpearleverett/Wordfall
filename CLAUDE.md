# Wordfall — Agent Context

Gravity-based word puzzle (React Native + Expo). Find hidden words on a letter grid; cleared letters fall, creating chain opportunities. 10 modes, 40 authored chapters (~600 puzzles), clubs, VIP, prestige.

**Stack:** Expo SDK 54 (New Architecture), RN 0.81.5, React 19, TypeScript ~5.8, Reanimated 4.1.1 + worklets 0.5.1, Firebase (optional, has offline fallback), Jest (**37 suites, 774 tests**).

For detailed architecture see `agent_docs/architecture.md`. For domain/gameplay detail see `agent_docs/domain.md` if it exists; otherwise read `src/constants.ts` and `src/data/`.

## Commands

```bash
npx expo start --dev-client            # Metro bundler (Expo Go NOT supported)
npm run typecheck                      # tsc --noEmit
npm test                               # jest (774 tests)
npm install --legacy-peer-deps         # .npmrc sets this by default
eas build --profile development --platform android  # Rebuild dev client APK (only when native deps change)
```

## Critical Files

| File | Role |
|------|------|
| `App.tsx` | Entry. ErrorBoundary, provider nesting, navigation, deep links, 25+ ceremony switch |
| `src/hooks/useGame.ts` | Game reducer (24 actions): selection, submit, hint, undo, boosters, gravity, shrink |
| `src/hooks/useRewardWiring.ts` | All post-puzzle rewards: coins/gems, rare tiles, ceremonies, mastery, quests |
| `src/contexts/PlayerContext.tsx` | Master player data (progress, streaks, cosmetics, prestige — fully wired) |
| `src/contexts/EconomyContext.tsx` | Currency, VIP, IAP fulfillment, ad rewards |
| `src/engine/boardGenerator.ts` | Seeded PRNG, 5s timeout, 4-tier fallback, mode-aware validation |
| `src/engine/solver.ts` | 8-dir DFS with step budget + wall-clock timeout |
| `src/screens/GameScreen.tsx` | Gameplay UI: selection, offers, tutorials, post-loss modal |
| `src/components/Grid.tsx` | Pan + tap gesture handler. **Uses `.runOnJS(true)` — see gotchas** |
| `src/types.ts` | ALL type definitions — edit here when adding data structures |
| `src/constants.ts` | COLORS, GRADIENTS, MODE_CONFIGS, ECONOMY, STREAK, FEATURE_UNLOCK_SCHEDULE |

15 screens live in `src/screens/`. Ceremonies, backdrops, effects live in `src/components/{,common,home,victory,effects,game,modes,events,navigation,economy}/`.

**Two cloud functions directories exist**: `cloud-functions/` (club goals, leaderboards, streak reminders, push) and `functions/` (validateReceipt, subscription renewals, club goal progress, inactive member cleanup). Don't confuse them.

## Things That Will Bite You

- **Reanimated gesture worklets.** `Gesture.Pan()/.Tap()` callbacks run as worklets on the UI thread by default. If your callback calls React state / reducers / `useRef.current`, add **`.runOnJS(true)`** immediately after the constructor. Without it: `Tried to synchronously call a non-worklet function 'X' on the UI thread` crash. See `Grid.tsx` for the pattern.
- **`react-native-iap` is removed** from `package.json`. The Gradle build fails on v14 (Nitro Modules peer dep) and v12 (amazon/play flavor ambiguity). `src/services/iap.ts` dynamically imports it with a variable package name and falls back to mock mode when missing. Re-adding requires a config plugin to patch `build.gradle`. Until then, all purchases succeed locally but nothing is charged.
- **`generateBoard(config, seed, mode)` REQUIRES the `mode` arg** for `shrinkingBoard` / `gravityFlip` / `noGravity`. Each uses a different solvability check.
- **`isDeadEnd` must run in a deferred `useEffect`**, never in render. It's an expensive DFS.
- **Tile gradients must be fully opaque hex** (not rgba). rgba causes background bleed-through on the New Architecture.
- **`LetterCell` has no `onPress` prop.** Input is handled by the grid-level gesture detector.
- **`--legacy-peer-deps` is the default** (via `.npmrc`). React 19 + RN 0.81 have peer conflicts. Don't remove.
- **`overrides: { expo-constants: ~18.0.13 }`** in `package.json` forces a single version tree-wide. Removing this brings back the duplicate-dependency `expo doctor` blocker.
- **`expo.install.exclude`** in `package.json` silences `@types/react` 18 vs 19 and `typescript` version warnings. Don't remove without thinking.
- **4 files still use the legacy `Animated` API** (intentional — imperative particle systems that don't map to hooks): `effects/ParticleSystem.tsx`, `WordBank.tsx`, `victory/GridDissolveEffect.tsx`, `game/GravityTrailEffect.tsx`. Leave them alone unless you have a measured perf reason.
- **Metro cache stickiness.** If imports look wrong after a pull: `npx expo start --dev-client --clear`.
- **`newArchEnabled: true`.** Some old patterns are no-ops (e.g., `setLayoutAnimationEnabledExperimental`). Check before touching view hierarchy code.

## Code Patterns

- Screens use **default exports**. Components use named exports.
- All types go in **`src/types.ts`**.
- Reanimated: `useSharedValue` + `useAnimatedStyle` + `withTiming`/`withSpring`/`withRepeat`/`withSequence`/`withDelay`. No `useNativeDriver` flag.
- When adding a **new ceremony**: add to `CeremonyItem['type']` in `types.ts`, queue via `player.queueCeremony()`, render in `App.tsx` ceremony switch. For simple ribbon+icon+text, reuse `MilestoneCeremony`.
- When adding a **new game action**: add to `GameAction` union in `types.ts`, handle in `gameReducer` in `useGame.ts`.
- When adding a **new mode**: add to `MODE_CONFIGS` in `constants.ts`, wire reducer logic in `useGame.ts`, add mode-specific validation in `boardGenerator.ts`, add tutorial to `modeTutorials.ts`.

## Dev Client (REQUIRED)

Expo Go is not supported. You need the dev client APK.

```bash
# Daily: start Metro
npx expo start --dev-client
# Open the "Wordfall" custom app on device; press `r` in terminal to reload JS

# Rarely: rebuild native APK (only when adding/removing native deps)
eas build --profile development --platform android
# Download APK from the URL EAS prints, install on device
```

**Termux note:** Local Android builds are impossible in Termux (NDK has no ARM64 host tools). Always use EAS cloud builds. Free tier = 30 builds/month, ~1 per week is enough.

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
| IAP products | Register `wordfall_*` IDs in App Store Connect / Play Console | Mock mode (grants rewards locally, no charge) |
| Firestore rules + indexes | Create `firebase.json`, then `firebase deploy --only firestore:rules,firestore:indexes` | Rules file exists at `firestore.rules`, indexes at `firestore.indexes.json` — NOT deployed |
| Cloud Functions | `cd functions && firebase deploy` and `cd cloud-functions && firebase deploy` | Club goals, leaderboards, IAP validation don't run |
| Audio assets | Drop `.mp3` files in `assets/audio/` | Synthesized tones |

EAS project already configured (`projectId: b6dd187c-d46c-4331-bb15-5c7ffced89b3`, owner `jpearleverett`).

## Still Needs Work

- Re-add `react-native-iap` via config plugin (Gradle variant fix)
- Create `firebase.json` and deploy Firestore rules + indexes
- Deploy both `cloud-functions/` and `functions/` directories (or consolidate)
- iOS Universal Links (scheme works; HTTPS needs domain + apple-app-site-association)
- E2E tests (Detox/Maestro — unit coverage is strong with 774 tests)
- Professional audio assets to replace synthesized tones
- FCM credentials for Android push notifications
