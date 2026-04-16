# Wordfall — Architecture Index

> **NOTE:** This file is a deep-reference companion to `/CLAUDE.md`. CLAUDE.md is the authoritative agent briefing loaded into every session; this file just points at deeper docs.
>
> **Last major update:** April 2026 — Expo SDK 55 upgrade (RN 0.83.4, React 19.2, Reanimated 4.2.1, worklets 0.7.2), expo-av removed, entry point modernized to `index.js`, `newArchEnabled` removed from app.json.

## Project Overview

Wordfall is a gravity-based strategic word puzzle mobile game built with **React Native + Expo**. Players find hidden words on a letter grid; when a word is cleared, letters above fall due to gravity, creating chain opportunities. 10 modes, 40 chapters (~600 authored puzzles + procedural beyond), collections, social features, a library meta-game, and a full player experience layer (interactive tutorial, progressive disclosure, ceremony system, achievements, weekly goals, mastery track, shareable results).

- **Framework:** React Native 0.83.4, Expo SDK 55 (New Architecture only — bridgeless mandatory), React 19.2, TypeScript ~5.8
- **Animations:** `react-native-reanimated 4.2.1` + `react-native-worklets 0.7.2` — 30 components on UI-thread animations; 4 legacy files intentionally remain on the `react-native` Animated API
- **Gestures:** `react-native-gesture-handler 2.30` — Grid uses `.runOnJS(true)` to run gesture callbacks on JS thread
- **Backend:** Firebase (Auth + Firestore + Functions) with offline fallback
- **State:** 4 context providers + 2 extracted sub-contexts + **zustand** for game state (wraps reducer via `redux` middleware for per-component selector subscriptions) + AsyncStorage persistence (debounced) + Firestore sync
- **Build plugins:** **React Compiler** via `babel-preset-expo` `'react-compiler'` option (scoped to `src/`), plus `react-native-worklets/plugin` (must remain last)
- **Testing:** Jest + ts-jest, 39 test suites with 791 tests
- **Monetization:** `react-native-iap@^15.0.0` wired with full purchase flow + fraud detection; `react-native-google-mobile-ads@^16` autolinked with test IDs; segment-based dynamic offers with flash sales; $0.49 first-purchase impulse offer for non-payers
- **Audio:** `expo-audio` only (`createAudioPlayer`). `expo-av` removed in SDK 55.
- **Video:** `expo-video` (`useVideoPlayer` + `VideoView`) with error boundary fallback
- **Navigation:** React Navigation 7 (bottom tabs + nested stacks) with progressive tab unlocking
- **Dev build required:** Expo Go is NOT supported. Use `npx expo start --dev-client` against a custom APK built via `eas build --profile development --platform android`.

## Directory Structure

```
src/
├── engine/           # Core game logic (board generation, gravity physics, solver, difficulty adjuster, puzzle generator)
├── hooks/            # useGame (zustand store factory), useStorage, useRewardWiring, useCeremonyQueue, useExperiment
├── stores/           # gameStore.ts (zustand store, context, selectors)
├── services/         # sound, haptics, analytics, notifications, notificationTriggers, iap, ads, firestore, eventManager, playerSegmentation, crashReporting, receiptValidation, funnelTracker, experiments
├── navigation/       # MainNavigator.tsx (tab/stack definitions)
├── contexts/         # AuthContext, EconomyContext, PlayerContext, SettingsContext + PlayerProgressContext, PlayerSocialContext
├── components/       # UI organized by domain (common, home, victory, effects, game, modes, events, navigation, economy)
├── screens/          # 15 screens (Home, Game, Modes, Collections, Library, Profile, EditProfile, Settings, Shop, CosmeticStore, Club, Leaderboard, Event, Onboarding, Mastery)
│   └── game/         # PlayField.tsx (Grid+ConnectedWordBank), GameFlashes.tsx, GameBanners.tsx — extracted for render isolation
├── config/           # firebase.ts
├── data/             # Static game data (chapters, collections, cosmetics, events, missions, tutorial boards, achievements, weekly goals, mastery rewards, mystery wheel, event layers, shop products, seasonal quests, VIP, prestige, referrals, club events, coin shop, login calendar, daily rewards, grand challenges, season pass, seasonal wheels, regional pricing, dynamic pricing, word categories)
├── utils/            # shareGenerator, replayGenerator, deepLinking, hooks (useStableCallback)
├── types.ts          # All TypeScript interfaces and type unions
├── constants.ts      # Colors, gradients, shadows, configs, scoring, economy, feature unlock schedule
└── words.ts          # Word dictionary (~4900 curated 3-6 letter words)
```

## Deep Reference — per-domain slices

Ask-me-about questions route to the relevant slice instead of the full architecture doc:

| I need to know about... | Read |
|------|------|
| Zustand, selectors, reducer, render isolation, persistence debounce | `agent_docs/architecture/state.md` |
| Board generation, solver, modes, scoring, rewards, ceremonies, difficulty curve | `agent_docs/architecture/engine.md` |
| Navigation tree, screen prop pattern, design system, colors, animations | `agent_docs/architecture/screens.md` |
| Firebase, analytics, IAP, Ads, push notifications, Sentry, deep linking | `agent_docs/architecture/cloud.md` |
| Build/runtime quirks (native modules, Babel plugin order, SDK 55 pitfalls) | `agent_docs/gotchas.md` |
| Code conventions (adding a screen/ceremony/action/mode, exports, selectors) | `agent_docs/patterns.md` |
| Environment setup, Firebase config, IAP products, open launch items | `agent_docs/setup.md` |
| Extended hot-path file list beyond the 6 in CLAUDE.md | `agent_docs/critical_files.md` |

See also: `FIRESTORE_SOCIAL_GUIDE.md` (Firestore schemas, security rules, migration plan), `GAME_DESIGN_DOCUMENT.md` (full GDD, 17 sections).
