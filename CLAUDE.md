# Wordfall - AI Agent Context

## Project Overview

Wordfall is a gravity-based word puzzle mobile game (React Native + Expo). Players find hidden words on a letter grid; cleared letters fall via gravity, creating chain opportunities. 10 game modes, 40+ chapters, collections, social features, library meta-game, and full player experience layer.

- **Stack:** React Native 0.81.5, Expo ~54.0.0, TypeScript ~5.8.0
- **Backend:** Firebase (Auth + Firestore + Analytics) with graceful offline fallback
- **State:** React Context (4 providers + 2 extracted sub-contexts) + useReducer + AsyncStorage + Firestore sync
- **Testing:** Jest + ts-jest, 32 test files, 722+ tests (unit + integration)
- **Monetization:** 50+ IAP products via react-native-iap, rewarded + interstitial ads (AdMob/mock), contextual offers with FOMO timers, dynamic pricing, flash sales, coin sinks, VIP subscription with streak bonuses, prestige system
- **Navigation:** React Navigation (bottom tabs + nested stacks) with progressive tab unlocking

For detailed architecture, file descriptions, and implementation notes, see `agent_docs/architecture.md`.

## Commands

```bash
npm start                              # Start Expo dev server
npm run android / ios / web            # Start on platform
npx tsc --noEmit                       # Type-check (no output files)
npm test                               # Run 722+ tests (Jest)
npm install --legacy-peer-deps         # Install deps (legacy flag REQUIRED)
```

## Key Architecture

### Directory Structure
```
src/
  engine/        # Board generation (seeded PRNG, 5s timeout), gravity physics, solver (8-dir DFS)
  hooks/         # useGame (reducer), useRewardWiring (post-puzzle rewards), useCeremonyQueue, useExperiment
  services/      # sound, analytics, notifications, iap, ads, firestore, crashReporting, experiments
  contexts/      # AuthContext, EconomyContext, PlayerContext (+Progress/Social extracted), SettingsContext
  components/    # Grid, LetterCell, WordBank, ceremonies, ModeTutorialOverlay, SeasonalQuestCard, MysteryWheel, ContextualOffer
  screens/       # 14 screens: Home, Game, Modes, Collections, Library, Profile, Settings, Shop, CosmeticStore, Club, Leaderboard, Event, Onboarding, Mastery
  data/          # Static game data: chapters, achievements, shopProducts (50+ IAPs), coinShop (18 items), seasonalQuests, modeTutorials, vipBenefits, prestigeSystem, mysteryWheel, events, etc.
  utils/         # shareGenerator (deep link CTAs), deepLinking (URL parser), replayGenerator
  types.ts       # ALL type definitions — edit here when adding new data structures
  constants.ts   # COLORS, GRADIENTS, SHADOWS, difficulty configs, mode configs, economy, feature unlock schedule
```

### Critical Files
| File | Role |
|------|------|
| `App.tsx` | Entry point. ErrorBoundary, navigation, deep link handling, ceremony rendering, analytics cleanup |
| `src/hooks/useRewardWiring.ts` | ALL post-puzzle reward logic: coins/gems, rare tiles, ceremonies, mastery tier-ups, seasonal quest progress, friend notifications, share text |
| `src/hooks/useGame.ts` | Game state reducer (18+ actions), timer tick, boosters, undo history, dead-end detection |
| `src/contexts/PlayerContext.tsx` | Master player data: progress, collections, streaks, cosmetics, modes, seasonal quest, prestige state |
| `src/contexts/EconomyContext.tsx` | Currency, tokens, VIP status/streak, IAP fulfillment, ad rewards |
| `src/engine/boardGenerator.ts` | Seeded PRNG board gen with 5s timeout, mode-aware validation, 4-tier fallback |
| `src/screens/GameScreen.tsx` | Gameplay UI: selection, animations, offers, mode tutorials, boosters, coin sinks |

### State
- **Game state:** `useGame` reducer — SELECT_CELL, SUBMIT_WORD, USE_HINT, UNDO_MOVE, USE_BOOSTER, etc.
- **Player data:** `PlayerContext` — progress, collections, streaks, achievements, seasonalQuest, prestige, modeLevels, etc. AsyncStorage + Firestore
- **Economy:** `EconomyContext` — coins, gems, tokens, VIP streak, isAdFree. AsyncStorage persisted
- **Settings:** `SettingsContext` — volume, haptics, theme, parental controls. AsyncStorage persisted

## Essential Rules

### Code Patterns
- Screens use **default exports**, not named exports
- All types go in `src/types.ts` — edit there when adding new data structures
- Tile gradients must be **fully opaque hex** (not rgba) to prevent background bleed-through
- All animations use `useNativeDriver: true` — never animate layout-affecting properties via Animated
- No continuous animation loops on idle tiles — only one-shot animations
- `isDeadEnd` solver runs via deferred `useEffect`, never in render path
- Grid input handled by grid-level gesture detector — LetterCell has NO `onPress` prop
- `--legacy-peer-deps` required for all npm install commands

### Adding Features
- **New ceremony:** Add type to `CeremonyItem['type']` in types.ts, queue via `player.queueCeremony()`, render in App.tsx ceremony switch (use `MilestoneCeremony` for simple types)
- **New game action:** Add to `GameAction` union in types.ts, handle in `gameReducer` in useGame.ts
- **New screen:** Create in `src/screens/`, use default export, add to stack navigator in App.tsx
- **New IAP product:** Add to `SHOP_PRODUCTS` in shopProducts.ts, add ID to `IAPProductId` union in types.ts

### Game Mechanics
- 10 modes: classic, daily, noGravity, relax, timePressure, gravityFlip, shrinkingBoard, perfectSolve, weekly, expert
- Per-mode independent level progression via `player.modeLevels`
- Difficulty: smooth 12-phase per-level ramp, breather every 5th level, invisible adaptive adjustment (±1 step)
- Hints/undos/boosters use persistent economy inventory, NOT per-level allocation
- `generateBoard()` MUST receive `mode` param for shrinkingBoard/gravityFlip/noGravity
- Deep linking: `wordfall://referral/{code}`, `wordfall://challenge/{id}`, `wordfall://daily`
- 20 ceremony types processed sequentially via `useCeremonyQueue` with 300ms delays
- Energy system is soft (NOT a hard wall) — ethical F2P design

### Monetization
- 50+ IAP products ($0.99-$99.99), 18 coin shop items (4 categories incl. cosmetic_rental)
- Contextual offers: 6 types with 5-min FOMO countdown (`expiresInSeconds` prop)
- Flash sales: daily rotating via `getFlashSale(date)`, surfaced on ShopScreen + HomeScreen
- VIP: $4.99/week with streak bonuses at 2/4/8/12/26 weeks
- Prestige: 5 tiers (Bronze→Legendary), data + UI ready, reset logic needs PlayerContext wiring

## Needs External Setup
- **Firebase credentials** — `EXPO_PUBLIC_FIREBASE_*` env vars (falls back to local-only)
- **Sentry DSN** — `EXPO_PUBLIC_SENTRY_DSN` (falls back to console)
- **AdMob IDs** — `EXPO_PUBLIC_ADMOB_REWARDED_ID` (falls back to MockAdModal)
- **Store IAP products** — register 50+ `wordfall_` prefixed product IDs
- **EAS project ID** — run `eas init` (currently placeholder)
- **Audio assets** — place .mp3 in `assets/audio/` (synthesized tones as fallback)

## Still Needs Work
- Live club cooperative goal tracking (needs Cloud Functions)
- iOS Universal Links (custom scheme works, HTTPS needs domain setup)
- Prestige reset execution in PlayerContext (data + UI complete)
- Asset optimization (44MB → ~15MB via WebP, lazy-load video)
- E2E tests (Detox/Maestro — unit/integration coverage is strong)
- Professional audio assets to replace synthesized tones
- Partner events and club chat (schemas defined in FIRESTORE_SOCIAL_GUIDE.md)
