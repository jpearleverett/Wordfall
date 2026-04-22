# Wordfall — Architecture Index

> **NOTE:** This file is a deep-reference companion to `/CLAUDE.md`. CLAUDE.md is the authoritative agent briefing loaded into every session; this file just points at deeper docs.
>
> **Last major update:** April 2026 — Expo SDK 55 upgrade (RN 0.83.4, React 19.2, Reanimated 4.2.1, worklets 0.7.2), expo-av removed, entry point modernized to `index.js`, `newArchEnabled` removed from app.json.

## Project Overview

Wordfall is a **word-search-with-gravity** mobile game built with **React Native + Expo**. Each puzzle ships with a pre-authored list of words to find on a letter grid. Players trace letters to find those words; when a traced path matches a list word it auto-resolves (no submit button) and cleared cells leave permanent empty spaces — remaining letters fall via gravity into those spaces. Win by finding every listed word; lose by falling into an unwinnable stuck state. 10 modes, 40 chapters (~600 authored puzzles + procedural beyond), collections, social features, a library meta-game, and a full player experience layer (interactive tutorial, progressive disclosure, ceremony system, achievements, weekly goals, mastery track, shareable results). **Read `agent_docs/game_mechanics.md` before making design, audio, or UX assumptions — Wordfall does NOT share mechanics with Candy Crush, Wordscapes, or match-3 games.**

- **Framework:** React Native 0.83.4, Expo SDK 55 (New Architecture only — bridgeless mandatory), React 19.2, TypeScript ~5.8
- **Animations:** `react-native-reanimated 4.2.1` + `react-native-worklets 0.7.2` — 30 components on UI-thread animations; 4 legacy files intentionally remain on the `react-native` Animated API
- **Gestures:** `react-native-gesture-handler 2.30` — Grid uses `.runOnJS(true)` to run gesture callbacks on JS thread
- **Backend:** Firebase (Auth + Firestore + Functions) with offline fallback
- **State:** 4 context providers + 2 extracted sub-contexts + **zustand** for game state (wraps reducer via `redux` middleware for per-component selector subscriptions) + AsyncStorage persistence (debounced) + Firestore sync
- **Build plugins:** **React Compiler** via `babel-preset-expo` `'react-compiler'` option (scoped to `src/`), plus `react-native-worklets/plugin` (must remain last)
- **Testing:** Jest + ts-jest, 66 test suites
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
├── screens/          # 17 screens (Home, Game, Modes, Collections, Library, Profile, EditProfile, Settings, Shop, CosmeticStore, Club, Leaderboard, WeeklyLeaderboard, Event, Onboarding, Mastery, SeasonPass)
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
| **What the game actually is / isn't (rules, failure states, dopamine architecture)** | **`agent_docs/game_mechanics.md`** |
| Zustand, selectors, reducer, render isolation, persistence debounce | `agent_docs/architecture/state.md` |
| Board generation, solver, modes, scoring, rewards, ceremonies, difficulty curve | `agent_docs/architecture/engine.md` |
| Navigation tree, screen prop pattern, design system, colors, animations | `agent_docs/architecture/screens.md` |
| Firebase, analytics, IAP, Ads, push notifications, Sentry, deep linking | `agent_docs/architecture/cloud.md` |
| Build/runtime quirks (native modules, Babel plugin order, SDK 55 pitfalls) | `agent_docs/gotchas.md` |
| Code conventions (adding a screen/ceremony/action/mode, exports, selectors) | `agent_docs/patterns.md` |
| Launch-blocking gaps + path to 9/10 (Tier 1–5 punch list) | `agent_docs/launch_blockers.md` |
| Extended hot-path file list beyond the 6 in CLAUDE.md | `agent_docs/critical_files.md` |
| Remote Config event calendar + flash sale authoring | `agent_docs/live_ops.md` |
| Composer deliverable manifest (72 SFX + 10 BGM) | `agent_docs/audio_brief.md` |
| Art & visual polish brief | `agent_docs/art_brief.md` |
| Play Console Data Safety form draft | `agent_docs/data_safety.md` |
| Play Console store listing copy | `agent_docs/store_listing.md` |
