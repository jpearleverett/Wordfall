# Wordfall - AI Agent Context

> **NOTE:** This file is a deep-reference companion to `/CLAUDE.md`. CLAUDE.md is the authoritative agent briefing loaded into every session; this file has much more file-by-file detail. Some sections below may be slightly behind current reality — when in conflict, trust CLAUDE.md and the code itself.
>
> **Last major update:** April 2026 — Expo SDK 55 upgrade (RN 0.83.4, React 19.2, Reanimated 4.2.1, worklets 0.7.2), expo-av removed, entry point modernized to `index.js`, `newArchEnabled` removed from app.json (now mandatory and forbidden in schema).

## Project Overview

Wordfall is a gravity-based strategic word puzzle mobile game built with **React Native + Expo**. Players find hidden words on a letter grid; when a word is cleared, letters above fall due to gravity, creating chain opportunities. The game features 10 modes, 40 chapters (~600 authored puzzles + procedural beyond), collections, social features, a library meta-game, and a full player experience layer (interactive tutorial, progressive disclosure, ceremony system, achievements, weekly goals, mastery track, shareable results).

- **Framework:** React Native 0.83.4, Expo SDK 55 (New Architecture only — bridgeless mode mandatory; Old Arch was deleted from RN 0.83), React 19.2, TypeScript ~5.8
- **Animations:** `react-native-reanimated 4.2.1` + `react-native-worklets 0.7.2` — 30 components migrated to UI-thread animations; 4 legacy files intentionally remain on the `react-native` Animated API (see Animation System section below). Babel plugin is `react-native-worklets/plugin` (must be last in `babel.config.js`)
- **Gestures:** `react-native-gesture-handler 2.30` — Grid uses `.runOnJS(true)` to run gesture callbacks on JS thread (see Gotchas)
- **Backend:** Firebase (Auth + Firestore + Functions) — social layer implemented with graceful offline fallback. Env vars needed for real connectivity
- **State:** React Context (4 providers + 2 extracted sub-contexts) + **zustand** store for game state (wraps existing reducer via `redux` middleware, enables per-component selector subscriptions so GameScreen doesn't re-render on every cell tap) + AsyncStorage persistence (debounced: 300ms for PlayerContext, 1s for EconomyContext, with AppState background/unmount flush) + Firestore sync when configured
- **Build plugins:** **React Compiler** enabled via `babel-preset-expo` `'react-compiler'` option (scoped to `src/`), auto-memoizes all components. `react-native-worklets/plugin` must remain **last** in plugins array
- **Testing:** Jest + ts-jest, **37 test suites with 779 tests** covering engine, data, services, utilities, hooks, and integration tests (puzzle lifecycle, economy flow, ceremony queue, difficulty curve, game modes)
- **Monetization:** ⚠️ `react-native-iap` is currently **removed from package.json** due to Gradle build issues (Nitro Modules on v14, amazon/play variant ambiguity on v12). `src/services/iap.ts` dynamically imports it and falls back to mock mode — all purchases succeed locally but nothing is charged. Shop catalogs still live in `shopProducts.ts` (50+ products $0.49-$99.99) and `dynamicPricing.ts` (3 mega bundles). Rewarded + interstitial ads via AdMob (mock fallback), gem-based contextual offers with 5-minute FOMO countdown timers, dynamic pricing by segment with daily flash sales, regional pricing, season pass, cosmetic store, coin sink rentals, **$0.49 first-purchase impulse offer for non-payers**
- **Audio:** `expo-audio` only (`createAudioPlayer` for SFX/music). `expo-av` was removed in SDK 55 — the legacy fallback path in `src/services/sound.ts` was deleted as part of the upgrade
- **Video:** `expo-video` (`useVideoPlayer` + `VideoView`) with error boundary fallback
- **Navigation:** React Navigation 7 (bottom tabs + nested stacks) with progressive tab unlocking
- **Dev build required:** Expo Go is NOT supported. Use `npx expo start --dev-client` against a custom APK built via `eas build --profile development --platform android`.

## Commands

```bash
npx expo start --dev-client    # Start Metro for the dev client (REQUIRED — Expo Go not supported)
npm run typecheck              # Type-check (tsc --noEmit, no emit)
npm test                       # Run 779 tests (Jest)
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report
npm install --legacy-peer-deps # Install deps (.npmrc sets this flag by default)
npm run optimize-assets        # Convert PNGs→WebP, compress video (already run; assets now ~24MB)
eas build --profile development --platform android  # Rebuild dev client APK (only needed when native deps change)
```

There is no linter script in package.json. TypeScript strict mode is enabled (`tsconfig.json`).

## Architecture

### Directory Structure

```
src/
├── engine/           # Core game logic (board generation, gravity physics, solver)
├── hooks/            # useGame (zustand store factory + actions), useStorage (AsyncStorage), useRewardWiring (extracted), useCeremonyQueue (extracted), useExperiment (A/B testing)
├── stores/           # gameStore.ts (zustand store, context, selectors for game state)
├── services/         # Singletons: sound, haptics, analytics, notifications, notificationTriggers, iap, ads, firestore, eventManager, playerSegmentation, crashReporting, receiptValidation, funnelTracker, experiments
├── navigation/       # MainNavigator.tsx (extracted tab/stack definitions)
├── contexts/         # AuthContext, EconomyContext, PlayerContext, SettingsContext + PlayerProgressContext, PlayerSocialContext (extracted)
├── components/       # UI components organized by domain
│   ├── Grid.tsx, LetterCell.tsx, WordBank.tsx  # Core gameplay
│   ├── GameHeader.tsx, PuzzleComplete.tsx      # Game UI + post-puzzle celebrations
│   ├── TutorialOverlay.tsx                     # Guided tutorial spotlight overlay
│   ├── FeatureUnlockCeremony.tsx               # Tab/feature unlock celebration modal
│   ├── ModeUnlockCeremony.tsx                  # Game mode unlock celebration modal
│   ├── AchievementCeremony.tsx                 # Achievement unlock celebration modal
│   ├── StreakMilestoneCeremony.tsx              # Streak milestone celebration modal
│   ├── CollectionCompleteCeremony.tsx           # Collection completion celebration modal
│   ├── DifficultyTransitionCeremony.tsx         # Difficulty tier transition (easy→medium etc.)
│   ├── LevelUpCeremony.tsx                      # Level-up celebration with gold badge
│   ├── MilestoneCeremony.tsx                    # Reusable ceremony for 10+ simple milestone types
│   ├── MysteryWheel.tsx                         # Gacha spin wheel with weighted segments (surfaced on HomeScreen + post-puzzle)
│   ├── ContextualOffer.tsx                      # Monetization pressure point modals (6 offer types, wired to triggers)
│   ├── MockAdModal.tsx                          # Development mock ad experience (5s countdown, claim reward)
│   ├── ModeTutorialOverlay.tsx                   # Interactive step-by-step tutorial for complex game modes (Gravity Flip, Shrinking Board, etc.)
│   ├── SeasonalQuestCard.tsx                    # Seasonal quest progress card with step dots, progress bar, claim button
│   ├── ReferralCard.tsx                         # Referral invite card with deep link sharing, milestone progress
│   ├── ClubGoalCard.tsx                         # Club cooperative goal progress with tier thresholds, contributors
│   ├── ClubLeaderboard.tsx                      # Weekly club rankings with tier badges, reward preview
│   ├── ChallengeCard.tsx                        # Friend challenge display with accept/result comparison
│   ├── ReplayViewer.tsx                         # Animated solve sequence step-through with share
│   ├── SessionEndReminder.tsx                   # Auto-dismissing daily/streak reminder
│   ├── ErrorBoundary.tsx                        # Root error boundary with crash screen and Restart button
│   ├── LoginCalendar.tsx                        # 7-day login calendar with escalating rewards, pulse animation
│   ├── DailyRewardTimers.tsx                    # 4 timed free reward cards with live countdown
│   ├── common/       # Button, Card, Modal, Badge, ProgressBar, AmbientBackdrop, VideoBackground (expo-video + error boundary), HeroIllustrations, Tooltip
│   ├── economy/      # CurrencyDisplay, ShopItem
│   ├── modes/        # TimerDisplay, MoveCounter
│   └── events/       # EventBanner, EventProgress
├── screens/          # 15 screens (Home, Game, Modes, Collections, Library, Profile, EditProfile, Settings, Shop, CosmeticStore, Club, Leaderboard, Event, Onboarding, Mastery)
│   └── game/         # PlayField.tsx (Grid+ConnectedWordBank), GameFlashes.tsx, GameBanners.tsx — extracted from GameScreen for render isolation
├── config/           # firebase.ts
├── data/             # Static game data
│   ├── chapters.ts, collections.ts, cosmetics.ts, events.ts, missions.ts  # Original data
│   ├── tutorialBoards.ts    # 3 progressive tutorial boards (A/B/C) + guided steps
│   ├── achievements.ts      # 20 achievements (14 standard + 6 hidden) with bronze/silver/gold tiers
│   ├── weeklyGoals.ts       # 24 weekly goal templates + generation logic
│   ├── masteryRewards.ts    # 30-tier season pass reward definitions
│   ├── sideObjectives.ts    # Par challenges, no-hint streaks, speed runs, theme master
│   ├── mysteryWheel.ts      # Mystery Wheel gacha: 11 weighted segments (common→legendary), pity system, mystery box, daily free spin
│   ├── eventLayers.ts       # Event layering: mini events, win streaks, partner events, weekend blitz
│   ├── dailyDeals.ts        # 5 rotating daily deals (deterministic by date)
│   ├── rotatingShop.ts      # 12 cosmetic items on 48-hour rotation windows
│   ├── shopProducts.ts      # 50+ IAP product definitions with rewards, categories, store IDs — full price ladder $0.99-$99.99 incl. VIP weekly, whale tiers, good/better/best consumable tiers
│   ├── modeTutorials.ts     # Interactive tutorial step data for 4 complex game modes (gravityFlip, shrinkingBoard, timePressure, perfectSolve)
│   ├── seasonalQuests.ts    # 4 seasonal quest lines (5 sequential steps each) for D30+ retention — Spring/Summer/Autumn/Winter themes
│   ├── vipBenefits.ts       # VIP subscription streak bonuses at 2/4/8/12/26 weeks with escalating gems, hints, exclusive cosmetics
│   ├── prestigeSystem.ts    # 5-tier prestige system (Bronze→Legendary Star) with XP multipliers, permanent bonuses, cosmetic rewards
│   ├── referralSystem.ts    # Referral code generation, rewards (1000 coins + 20 gems referrer, 400 coins + 10 gems + 5 hints referred), milestones (3/5/10/15/25 referrals)
│   ├── clubEvents.ts        # 8 club cooperative goal templates with tier rewards
│   ├── coinShop.ts          # 18 coin-purchasable items across 4 categories (boosters, consumables, temporary, cosmetic_rental) incl. theme/frame rentals, lucky boost, double coins, VIP experience
│   ├── loginCalendar.ts     # 7-day escalating login calendar rewards
│   ├── dailyRewardTimers.ts # 4 timed free rewards (coins/hints/spins/chest) on 4-12h intervals
│   ├── grandChallenges.ts   # 10 multi-day grand challenges (normal/hard/legendary)
│   ├── seasonPass.ts        # 50-tier season/battle pass with free + premium reward lanes, cosmetics at tiers 10/20/30/40/50
│   ├── seasonalWheels.ts    # 4 seasonal gacha wheel variants with exclusive cosmetics
│   ├── regionalPricing.ts   # Regional IAP pricing for 8 regions with locale detection
│   ├── dynamicPricing.ts    # Segment-based dynamic offers + 3 mega bundles ($14.99-$29.99)
│   └── wordCategories.ts    # 15 themed word categories (30-50 words each) for procedural puzzles
├── engine/
│   ├── difficultyAdjuster.ts # Adaptive difficulty based on rolling 20-puzzle performance metrics
│   └── puzzleGenerator.ts    # Higher-level puzzle gen: themed sets, procedural chapters beyond level 600
├── utils/
│   ├── shareGenerator.ts    # Wordle-style shareable emoji grid with deep link CTA + streak card + collection card
│   ├── replayGenerator.ts   # Solve sequence replay as text, emoji grid, and structured data
│   └── deepLinking.ts       # Deep link URL parser and builder for referral/challenge/daily routes (wordfall:// scheme)
├── types.ts          # All TypeScript interfaces and type unions
├── constants.ts      # Colors, gradients, shadows, configs, scoring, economy, feature unlock schedule
└── words.ts          # Word dictionary (~4900 curated 3-6 letter words)
```

### Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Entry point. Wrapped in `ErrorBoundary`. Progressive tab unlocking, nested stack navigators, provider wrappers. Reward wiring delegated to `useRewardWiring` hook, ceremony queue to `useCeremonyQueue` hook. Deep link handling via `Linking` API (referral/challenge/daily routes). Analytics cleanup on unmount. Still contains: welcome-back modal, GameScreenWrapper, navigation definitions, feature unlock detection |
| `src/types.ts` | ALL type definitions including `FeatureUnlockId`, `WeeklyGoal`, `WeeklyGoalsState`, `CeremonyItem`, `ReferralState`, `ReferralMilestone`. Edit here when adding new data structures |
| `src/constants.ts` | Colors, `GRADIENTS`, `SHADOWS`, difficulty configs, mode configs, scoring, economy, `FEATURE_UNLOCK_SCHEDULE`, `getBreatherConfig()`, `STREAK` milestones, `MILESTONE_DECORATIONS`, `STAR_MILESTONES`, `PERFECT_MILESTONES`, `COLLECTION`, `CLUB`, `COMEBACK`, `ANIM` timing |
| `src/contexts/PlayerContext.tsx` | Master player data hub (~1,346 lines, decomposed from 1,797). Progress methods delegated to `PlayerProgressContext`, social methods to `PlayerSocialContext`. Core state: progress, collections, missions, streaks, cosmetics, library, modes, comebacks, `featuresUnlocked`, `weeklyGoals`, `pendingCeremonies`, `tooltipsShown`, `failCountByLevel`, `consecutiveFailures`, `mysteryWheel`, `winStreak`, `modeLevels`, `referralCode`, `referralCount`, `clubGoal`. API surface unchanged — `usePlayer()` still returns all methods |
| `src/contexts/PlayerProgressContext.tsx` | Extracted from PlayerContext: 22 progress methods using factory function pattern. Achievement checking, weekly goals, missions, streaks, ceremonies, difficulty pacing, feature unlocks, tooltips, comebacks, performance metrics |
| `src/contexts/PlayerSocialContext.tsx` | Extracted from PlayerContext: 4 social methods — `sendHintGift`, `sendTileGift`, `sendChallenge`, `respondToChallenge`. Uses factory function with Firestore delivery |
| `src/hooks/useRewardWiring.ts` | Extracted from App.tsx: hook containing ALL post-puzzle reward logic (handleComplete). Coin/gem awards, rare tile drops, atlas collection, mission/weekly goal progress, level-up detection, difficulty transitions, feature unlocks, achievement checks, mode unlocks, milestone ceremonies, mystery wheel, win streak, share text with deep link + referral code, mastery tier-up detection, late-game milestones (every 25 levels past 50), seasonal quest progress tracking, friend beat score notifications |
| `src/hooks/useCeremonyQueue.ts` | Extracted from App.tsx: ceremony queue processing with sequential modal display, analytics tracking, 300ms delays between ceremonies, cleanup on unmount. Returns `{ activeCeremony, handleDismissCeremony }` |
| `src/hooks/useExperiment.ts` | React hook for A/B testing: `useExperiment(experimentId)` returns memoized `{ variant, config, trackExposure }`. Uses AuthContext for deterministic user assignment |
| `src/navigation/MainNavigator.tsx` | Extracted from App.tsx: tab navigator, stack navigator definitions, TabIcon component, screen registrations. Contains wrapper components for ProfileScreen (wires settings/edit navigation) and EventScreen (wires play/shop navigation) |
| `src/hooks/useGame.ts` | Core game state reducer - handles 18+ game actions including boosters, `GRANT_BOOSTER`, `USE_PREMIUM_HINT`, `ACTIVATE_SCORE_DOUBLER`, `ACTIVATE_BOARD_FREEZE`. State includes `scoreDoubler` (2x next word), `boardFreezeActive` (skip shrink), `premiumHintUsed`. Timer tick for timePressure mode runs here. Computed values (`currentWord`, `remainingWords`, `isValidWord`) cached with `useMemo`. `isDeadEnd` computed via deferred `useEffect` (not in render path) — mode-aware: shrinkingBoard uses `isDeadEndShrinkingBoard` with `wordsUntilShrink`, hints use `getHintShrinkingBoard` for shrink-aware ordering |
| `src/engine/boardGenerator.ts` | Puzzle generation with seeded PRNG, freeform path placement (8-directional), heuristic-first solvability validation, and 5-second absolute timeout protection. Mode-aware: shrinkingBoard adds +2 buffer (1 filler ring), enforces min 3 words and 5×5 grid, places words in interior, uses shrink-aware solver for validation. `generateBoard` accepts optional `mode` parameter — callers MUST pass mode for shrinkingBoard/gravityFlip/noGravity to get correct validation. Timeout triggers fallback to minimal board config |
| `src/engine/gravity.ts` | Column-based gravity physics supporting all 4 directions (down/up/left/right via `applyGravityInDirection`), frozen column support |
| `src/engine/solver.ts` | 8-directional DFS word finder, recursive backtracking solver, dead-end detection, hint generation. Mode-aware variants: `isSolvable` (standard gravity), `isSolvableGravityFlip` (rotating gravity), `areAllWordsIndependentlyFindable` (noGravity), `isSolvableShrinkingBoard`/`getHintShrinkingBoard`/`isDeadEndShrinkingBoard` (shrinkingBoard — simulates outer ring removal every 2 words, validates ordering survives all shrink phases). `findWordInGrid` supports optional `limit` parameter for early termination. `getHint` uses solution ordering directly without redundant re-solve |
| `src/components/PuzzleComplete.tsx` | Victory screen with confetti, animated score counter, staggered reveals, 10-second auto-countdown to next level (cancels on any button tap). **Plus**: `isFirstWin` welcome, `leveledUp` badge, `shareText` with Share API, friend comparison (Firestore when available), "Watch Ad to DOUBLE Rewards" button. Action buttons: Primary "NEXT LEVEL (Xs)" with countdown + secondary row (Home \| Share \| Challenge via `onChallengeFriend`) |
| `src/components/Grid.tsx` | Column-based grid renderer with gravity-direction-aware layout (`flex-end` for down, `flex-start` for up, with spacer repositioned accordingly), responsive sizing via `maxHeight` prop, drag-to-select via react-native-gesture-handler with drag interpolation and nearest-center hit testing (gesture objects memoized with `useMemo`, callbacks via refs), frozen column styling, post-gravity moved-cell highlighting. Passes `cellBounds` to `SelectionTrailOverlay`. LetterCell receives no `onPress` — all input handled by grid-level gesture detector |
| `src/screens/GameScreen.tsx` | Main gameplay screen: green flash, chain popup, score popup, dynamic idle hint, mode intro overlay, boosters, near-miss encouragement. **Plus**: gem-based contextual offers wired (hint_rescue 5 gems, close_finish 3 gems, booster_pack 15 gems, post_puzzle 10 gems), coin sink items on booster shelf (Premium Hint 250 coins, Board Freeze 300 coins for shrinkingBoard, Score Doubler 500 coins) with active-state indicators, skip level button (200 coins after 3+ failures), rewarded ad triggers (post-fail hint, post-complete double), MockAdModal overlay. Stable layout with absolute-positioned overlays |
| `src/components/GameHeader.tsx` | Chrome card header with back button, battery-style progress indicator (auto-sizes to content), cyan score display with animated pop, undo/hint glass buttons with count badges. Progress bar at bottom with glow dot (hidden at 0%). Battery shell is an image asset that stretches to fit the label text |
| `src/screens/HomeScreen.tsx` | Dynamic home screen with `VideoBackground`, image-based UI, progressive section visibility based on `playerStage` AND `playerSegmentation`. Sections: hero card, streak, daily rewards, Mystery Wheel button, flash sale teaser card, event banners, seasonal quest card, weekly goals, referral card, missions, recommendations, quick play, pending challenge cards, pending gift banner. Section visibility driven by segment-aware `segmentHomeContent` when available |
| `src/screens/OnboardingScreen.tsx` | 4-phase interactive tutorial: welcome → guided tutorial puzzle (real GameGrid + TutorialOverlay) → celebration → ready screen with tips |
| `src/screens/ProfileScreen.tsx` | Player profile with stats grid, achievements grid (15 achievements × 3 tiers with colored dots), collection progress, cosmetics, prestige badge display + prestige button (gold gradient, confirmation dialog) for eligible players |
| `src/screens/MasteryScreen.tsx` | Season pass / mastery track with 50 tiers, free + premium reward lanes, exclusive cosmetics every 10 tiers, XP progress |
| `src/screens/ModesScreen.tsx` | Game mode grid with first-visit tooltip via `Tooltip` component |
| `src/screens/CollectionsScreen.tsx` | Atlas/Tiles/Stamps tabs with first-visit tooltip. Rare tiles derived from `collections.rareTiles` (Record<string, number>) — keys with count > 0 are "collected" |
| `src/screens/LibraryScreen.tsx` | Library wings with first-visit tooltip |
| `src/data/tutorialBoards.ts` | 3 progressive tutorial boards: A (4×4, GO/HI), B (5×4, CAT/DOG + gravity), C (5×5, SUN/RED/ANT + gravity dependency). `TUTORIAL_STEPS` with highlight positions and guided actions per board |
| `src/data/sideObjectives.ts` | Par challenges (3 tiers), no-hint streaks (5/10/25), speed runs, theme master objectives with rewards |
| `src/data/achievements.ts` | 21 `AchievementDef` entries (15 standard + 6 hidden) across 5 categories (puzzle, collection, streak, mode, mastery), each with bronze/silver/gold tiers. Hidden achievements have `hidden: true` flag |
| `src/data/weeklyGoals.ts` | 24 goal templates covering 7 tracking keys, `generateWeeklyGoals()` picks 3 per week, `isNewWeek()` utility |
| `src/data/masteryRewards.ts` | 30 `MasteryReward` tiers with free/premium lanes, `getMasteryTierForXP()`, `getXPProgressInTier()` |
| `src/utils/localAssets.ts` | `LOCAL_IMAGES` and `LOCAL_VIDEOS` asset registries — all image/video `require()` calls centralized here. Includes HomeScreen assets (playButton, statsCard, shopButton, bgHomescreen), gameplay icons, screen backgrounds |
| `src/utils/shareGenerator.ts` | `generateShareText()` for Wordle-style emoji grid with deep link CTA (`wordfall://referral/{code}` or `wordfall://daily`), `generateChallengeShareText()` for competitive challenge sharing with `wordfall://challenge/{id}` link, `generateStreakCard()` for shareable streak display, `generateCollectionCard()` for collection progress sharing. Accepts optional `referralCode` param to include in all shares |
| `src/utils/deepLinking.ts` | Deep link URL parser and builder. `parseDeepLink(url)` handles `wordfall://referral/{code}`, `wordfall://challenge/{id}`, `wordfall://daily`, and query param fallbacks. Builder functions: `buildReferralLink()`, `buildChallengeLink()`, `buildDailyLink()`. All parsing wrapped in try/catch for safety |
| `src/data/seasonalQuests.ts` | 4 seasonal quest lines (Spring "Lexicon Awakening", Summer "Solar Expedition", Autumn "Harvest Chronicle", Winter "Frost Legacy") with 5 sequential steps each. Steps use same tracking keys as weekly goals. Escalating rewards (200-750 coins, 5-25 gems per step) + final reward (2000 coins + 50 gems + exclusive frame). Functions: `getCurrentSeasonalQuest()`, `getQuestProgress()`, `advanceQuestStep()` |
| `src/data/modeTutorials.ts` | Tutorial step data for 4 complex modes: gravityFlip (3 steps), shrinkingBoard (3 steps), timePressure (2 steps), perfectSolve (2 steps). `ModeTutorialStep` interface with title, description, icon, optional highlight. `getModeTutorial(modeId)` returns steps or null |
| `src/data/vipBenefits.ts` | VIP subscription streak bonuses at 2/4/8/12/26 consecutive weeks. Rewards: 25-250 bonus gems, 2-25 bonus hints, exclusive cosmetics (frames, title, decoration). Functions: `getVipStreakBonus()`, `getNextVipStreakMilestone()`, `getVipStreakProgress()` |
| `src/data/prestigeSystem.ts` | 5 prestige levels (Bronze→Silver→Gold→Diamond→Legendary Star). Each requires level 100, grants XP multiplier (1.5x-3.0x), permanent bonuses (hint/coin/rare tile/gem/all), and exclusive cosmetic. Functions: `canPrestige()`, `getPrestigeRewards()`, `getPrestigeMultiplier()`, `getPrestigeSummary()` |
| `src/components/common/Tooltip.tsx` | Reusable contextual tooltip with glassmorphism styling, arrow, auto-dismiss persistence via `player.markTooltipShown()` |
| `src/components/MilestoneCeremony.tsx` | Reusable celebration modal for simple milestone types — configurable ribbon, icon, title, description, accent color, reward label, button text. Used for 10+ ceremony types (star/perfect/decoration/first_rare_tile/first_booster/wing_complete/word_mastery_gold/first_mode_clear/wildcard_earned/win_streak/mystery_wheel_jackpot) |
| `src/components/MysteryWheel.tsx` | Animated gacha wheel overlay — spin animation with easing, 11 weighted segments (common→legendary), result display with rarity, mystery box secondary reveal, daily free spin support, buy-spin buttons (15 gems / 60 gems for 5-pack) |
| `src/components/ContextualOffer.tsx` | Monetization pressure point modal — 6 gem-based offer types (hint_rescue 5 gems, life_refill 10 gems, streak_shield 30 gems, close_finish 3 gems, post_puzzle 10 gems, booster_pack 15 gems) with `expiresInSeconds` FOMO countdown timer (default 300s/5min, auto-dismisses at 0 with `offer_expired` analytics event, coral pulse animation under 60s), template variable replacement, and always-dismissible design |
| `src/data/mysteryWheel.ts` | Mystery Wheel system: 11 weighted segments (common→legendary incl. 500-gem jackpot at 1%), pity system (guaranteed rare+ within 25 spins), mystery box secondary rewards, free spin every 8 puzzles + daily free spin via `checkDailyFreeSpin()`, `SPIN_COST_GEMS=15`, `SPIN_BUNDLE_COST_GEMS=60` for 5-pack. Functions: `spinWheel()`, `openMysteryBox()`, `checkFreeSpin()`, `checkDailyFreeSpin()` |
| `src/data/eventLayers.ts` | Event layering system enabling multiple simultaneous events: 5 mini event templates (24-48hr overlays), Royal Match-style win streak with 7 tiers (2→20 wins), weekend blitz detection, partner event scaffold (Firestore-ready). Functions: `getMiniEventForDate()`, `isWeekendBlitz()`, `getActiveEventLayers()`, `updateWinStreak()` |
| `src/services/notifications.ts` | Local + remote push notification service using `expo-notifications`. 9 categories with template interpolation. Permission handling with graceful denial. Android notification channel. Convenience schedulers: `scheduleStreakReminder()` (8 PM), `scheduleDailyChallenge()` (9 AM), `scheduleComebackReminder()` (3 days). Segment-aware scheduling. Remote push: `registerForRemotePush()` gets Expo + device tokens, `sendTokenToServer()` syncs to Firestore, `handleRemoteNotification()` routes incoming payloads |
| `src/services/notificationTriggers.ts` | Gameplay-event trigger wiring for notifications. 8 trigger functions: `triggerStreakReminder` (wired in App.tsx after streak update), `triggerEnergyFullNotification` (wired in PlayerContext when energy spent), `triggerEventNotification` (wired at app open), `triggerDailyChallengeReminder` (wired at app open), `triggerWinStreakMilestoneNotification` (wired in handleComplete at milestones 3/5/7/10/15/20), `triggerComebackReminder` (wired in AppState handler on background), `triggerStreakAtRiskNotification` (wired in AppState background handler — fires when streak >= 1 day and not played today), `triggerFriendBeatScoreNotification` (immediate notification when friend beats score). All scheduling is idempotent (cancels previous before scheduling new) |
| `src/services/experiments.ts` | A/B testing experiment engine with 6 pre-configured experiments: `onboarding_flow` (4-phase vs 3-phase), `energy_cap` (25/30/35), `hint_rescue_price` (30/50/75 coins), `first_purchase_offer` ($0.99/$1.99/none), `daily_reward_generosity` (1x/1.5x/2x), `mystery_wheel_free_frequency` (5/8/12 puzzles). Deterministic weighted multi-variant assignment via hash. Functions: `getExperiment()`, `getAssignedVariant()`, `getExperimentConfig()`, `isInExperiment()`, `trackExperimentExposure()`. Backward-compatible with existing `analytics.getVariant()` |
| `src/services/analytics.ts` | Dual-mode analytics: Firebase Analytics when configured, AsyncStorage fallback otherwise. 32+ typed events including `iap_revenue`, `ad_revenue`, `retention_check`, `funnel_step`, `cohort_event`. Methods: `trackRevenue()`, `trackAdRevenue()`, `trackRetention()`, `trackFunnel()`, `trackCohort()`, `getUserProperties()`. User properties, 7-day local event retention, A/B testing via deterministic variant assignment |
| `src/services/iap.ts` | IAP service. **`react-native-iap` is currently removed from package.json** — service uses dynamic `import()` with a variable package name so TypeScript/Metro don't try to resolve it at build time. On init, `NativeModules.RNIapModule` check fails, the outer try/catch runs, and the service falls back to **mock mode** (all `purchase()` calls resolve with a local receipt, `Economy` grants rewards, no money changes hands). Products are still listed in `shopProducts.ts` (50+) and `dynamicPricing.ts` (mega bundles). To re-enable real purchases: add `react-native-iap` back with a config plugin that patches `android/app/build.gradle` to resolve the amazon/play product flavor ambiguity |
| `src/services/ads.ts` | Rewarded + interstitial ads service with AdMob integration + mock fallback. 5 reward types (hint, undo, spin, coins, double). Rewarded: daily cap 10, cooldown 30s. Interstitial: daily cap 5, 90s interval. `showInterstitialAd()`, `canShowInterstitial()`, `interstitialsRemaining()`. Wired into GameScreen (post-fail, post-complete) and ShopScreen |
| `src/services/firestore.ts` | Firestore social layer: leaderboards (daily/weekly/all-time), friend system (codes, requests), real gifting, player profile sync. Graceful offline fallback — all methods return defaults when Firebase unavailable |
| `src/services/eventManager.ts` | Live event coordination: active event detection, multiplier calculation (coins/xp/rareTile), progress tracking, reward claiming. Wired into handleComplete for reward multipliers. Persisted via PlayerContext.eventProgress |
| `src/services/playerSegmentation.ts` | Player segmentation across 4 dimensions: engagement (7 segments), skill (4), spending (4), motivation (5). `computeSegments()` called on every app open via PlayerContext. Personalization hooks for offer timing, difficulty, home content, notifications, mode recommendations |
| `src/services/crashReporting.ts` | Crash reporting with Sentry integration (dynamic import). Falls back to console-only when Sentry unavailable. Global error handler via `ErrorUtils`. Breadcrumb buffer (50 max) + Sentry forwarding. DSN via `EXPO_PUBLIC_SENTRY_DSN` env var |
| `src/services/receiptValidation.ts` | Server-side receipt validation via Firebase Cloud Function endpoint. Fraud detection via receipt hash tracking (prevents replay attacks). Falls back to client-side validation when server unavailable. Endpoint URL via `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL` |
| `src/data/coinShop.ts` | 18 coin-purchasable items across 4 categories (boosters, consumables, temporary, cosmetic_rental). Original items: hints, undos, spotlight, shuffle, wildcard, 2x XP, lucky charm, theme rental, premium hint, board freeze, score doubler. Cosmetic rentals: premium theme (800 coins/24h), golden frame (1000 coins/24h), lucky boost (500 coins/1h), double coins (600 coins/30min), VIP experience (1500 coins/2h). Daily purchase limits. `canPurchaseCoinItem()`, `getCoinShopByCategory()` |
| `src/data/grandChallenges.ts` | 10 multi-day grand challenges (7-30 days) at 3 difficulty tiers (normal/hard/legendary). Rewards include coins, gems, and exclusive cosmetics. `generateActiveGrandChallenges(playerLevel)` returns 2-3 level-appropriate challenges |
| `src/data/seasonPass.ts` | 50-tier season/battle pass. Free lane: coins/hints/boosters. Premium lane ($4.99/500 gems): gems/cosmetics/rare tiles with exclusive cosmetics at tiers 10/20/30/40/50. XP from puzzles (100), stars (50), dailies (200), perfects (150). 30-day seasons. Tier 50 premium: legendary frame + title + decoration set |
| `src/data/seasonalWheels.ts` | 4 seasonal gacha wheel variants (spring/summer/autumn/winter) with exclusive cosmetic rewards. Slightly more generous odds (15% rare+ vs 12% standard). `getActiveWheel(date)` returns seasonal or standard segments based on calendar |
| `src/data/regionalPricing.ts` | IAP pricing for 8 regions (US, EU, IN, BR, SEA, JP, KR, default). `detectRegion()` uses device locale. `getRegionalPrice(basePriceUSD)` returns formatted price with currency symbol |
| `src/data/dynamicPricing.ts` | Segment-based offer personalization. `getDynamicOffers(spending, engagement, playerLevel)` returns 1-3 offers with discounts/badges/expiry. Strategies: non-payer (50% off starter), minnow ($1.99-$2.99), dolphin ($4.99-$9.99), whale ($49.99-$99.99 whale bundles), lapsed (70% off win-back). `getFlashSale(date)` returns rotating daily deal with 40-60% discount and countdown timer. 3 `MEGA_BUNDLES` at $14.99/$19.99/$29.99 |
| `src/engine/difficultyAdjuster.ts` | Invisible adaptive difficulty. Analyzes rolling 20-puzzle performance. Makes easier when struggling (avgStars < 1.5), harder when cruising (consecutiveThreeStars > 5). Adjustments capped at ±1 step from base config |
| `src/engine/puzzleGenerator.ts` | Higher-level puzzle generation: themed puzzle sets via word categories, procedural chapter generation beyond level 600 with difficulty scaling. `getProceduralChapterName(chapterNumber)` generates deterministic themed names from 20×20 prefix/suffix combinations (400 unique names like "Crystal Archives", "Twilight Lexicon") |
| `src/data/shopProducts.ts` | 50+ IAP product definitions with store IDs, rewards, categories — full price ladder from $0.99 to $99.99. Includes good/better/best tiers for gems, hints, undos; themed bundles ($3.99-$19.99); whale packs ($29.99 Diamond, $49.99 Royal, $74.99 Platinum, $99.99 Ultimate); VIP weekly subscription. Ultimate Whale gives 3.75x value of Royal Collection. Helpers: `getProductById()`, `getProductRewards()`, `getProductsByCategory()` |
| `src/data/referralSystem.ts` | Referral code generation (6-char alphanumeric from user ID hash), reward definitions (referrer: 1000 coins + 20 gems, referred: 400 coins + 10 gems + 5 hints), milestone rewards at 3/5/10/15/25 referrals (coins, exclusive frames, titles). Functions: `generateReferralCode()`, `getReferralRewards()`, `getClaimableMilestones()`, `getNextMilestone()`, `getNextMilestoneProgress()` |
| `src/data/clubEvents.ts` | 8 club cooperative goal templates: Word Hunt, Star Chasers, Perfect Together, Chain Masters, Puzzle Marathon, Score Surge, No-Hint Heroes, Combo Frenzy. Each with bronze/silver/gold reward tiers scaled by club tier + member count. Functions: `generateClubGoal()`, `getClubGoalProgress()`, `getReachedTiers()`, `getClubGoalTimeRemaining()`. Club leaderboard types and rank-based reward definitions |
| `src/screens/CosmeticStoreScreen.tsx` | Cosmetic store with 4 tabs (Themes/Frames/Titles/Decorations). 2-column scrollable grid per tab. Item cards show rarity badge, preview, coin/gem price with formatted numbers or "Earn in-game". Detail modal with buy/equip flow. Coin-purchasable items have "Can't Afford" disabled state when player lacks funds. Purchase checks `canAfford`, spends via economy context, unlocks via player context. Navigable from HomeStack |
| `src/components/ReferralCard.tsx` | HomeScreen-ready glassmorphism card showing referral code with copy button (expo-clipboard), Share API integration, progress bar toward next milestone, milestone dots row with press-to-claim |
| `src/components/ClubGoalCard.tsx` | Club goal progress card: gradient surface, progress bar with tier threshold markers, live countdown timer, top 3 contributors, personal contribution bar |
| `src/components/ClubLeaderboard.tsx` | Weekly club leaderboard: ranked list with trophy/medal emojis, current club highlighted with accent + "YOU" badge, tier badges, reward preview section |
| `src/data/wordCategories.ts` | 15 themed word categories (nature, food, science, sports, music, etc.) with 30-50 words each for themed puzzle generation |
| `FIRESTORE_SOCIAL_GUIDE.md` | Implementation guide for real-time social features: Firestore schemas, security rules, Cloud Functions, friend system, gift delivery, club chat, leaderboards, partner events, community goals. Includes 4-phase migration plan and cost estimates |
| `GAME_DESIGN_DOCUMENT.md` | Full 48KB GDD with 17 sections - the source of truth for features |

### State Management

- **Game state:** `useGame` hook creates a **zustand store** via `createGameStore()` (in `src/stores/gameStore.ts`) which wraps the existing `gameReducer` using zustand's `redux` middleware. The reducer is unchanged and battle-tested (37 tests). `useGame` returns `{ store, ...actionDispatchers, isStuck, stars, foundWords, totalWords, remainingWords }` — **it does NOT return `state`**. Consumers read state via `useStore(store, selector)` for narrow subscriptions. Actions: SELECT_CELL, SELECT_CELLS (batched), CLEAR_SELECTION, SUBMIT_WORD, USE_HINT, UNDO_MOVE, NEW_GAME, RESET_COMBO, TICK_TIMER, USE_BOOSTER, GRANT_HINT, GRANT_UNDO, GRANT_BOOSTER, USE_PREMIUM_HINT, ACTIVATE_SCORE_DOUBLER, ACTIVATE_BOARD_FREEZE. GameScreen subscribes to ~20 coarse selectors (status, score, combo, etc.) that change per-word, NOT per-tap. PlayField subscribes to `selectedCells` (per-tap). This separation is the primary latency optimization.
- **Store context:** `GameStoreContext` in `src/stores/gameStore.ts` passes the store down the tree. `useGameStore(selector)` is the convenience hook for child components. `useGameDispatch()` returns the stable dispatch function. Pre-built selectors (`selectStatus`, `selectScore`, etc.) are exported for reuse.
- **Stable callbacks:** `useStableCallback` (from `src/utils/hooks.ts`) wraps callbacks whose deps churn frequently (e.g. `handleHint` depends on `economy`). It returns a function with stable identity that always calls the latest closure. Used for all props passed to memoized children (Grid, BoosterBarMemo, GameBanners, GameFlashes).
- **Player data:** `PlayerContext` - progress, collections (atlas/tiles/stamps), missions, streaks, cosmetics, library wings, mode stats, achievements, comebacks, **plus**: `featuresUnlocked`, `weeklyGoals`, `pendingCeremonies`, `tooltipsShown`, `failCountByLevel`, `consecutiveFailures`, `mysteryWheel`, `winStreak`, `puzzleEnergy` (session scarcity), `performanceMetrics` (adaptive difficulty), `segments` (player segmentation), `eventProgress` (live event tracking), `friendChallenges` (sent/received challenges), `modeLevels` (per-mode independent level progression), `seasonalQuest` (seasonal quest line state), `prestige` (prestige level/bonuses). Methods include `useEnergy`, `refillEnergy`, `recomputeSegments`, `updateEventProgress`, `sendChallenge`, `respondToChallenge`, `recordPerformanceMetrics`, `advanceModeLevel`, `getModeLevel`, `updateSeasonalQuest`. **Persisted to AsyncStorage with 300ms debounce** (coalesces rapid reward-wiring bursts) + AppState background/unmount flush for crash safety + Firestore sync when configured.
- **Economy:** `EconomyContext` - coins, gems, hintTokens, undoTokens, `boosterTokens` (`{ wildcardTile, spotlight, smartShuffle }`), eventStars, libraryPoints, `isAdFree`, `isPremiumPass`, `isVip` (VIP subscription), `starterPackAvailable`, `dailyValuePackExpiry`, `vipExpiresAt`, `vipStreakWeeks`, `vipStreakBonusClaimed`. Methods: add/spend/check + `addLives(count)` for lives refill + `addBoosterToken(type)`/`spendBoosterToken(type)` for persistent booster inventory + `processPurchase(productId)` for IAP fulfillment + `processAdReward(rewardType)` for ad rewards + `claimVipDailyRewards()` for VIP daily gem/hint drip. VIP subscribers get: ad-free, 50 daily gems, 3 daily hints, exclusive frame, streak bonuses at 2/4/8/12/26 weeks. **Persisted to AsyncStorage with 1s debounce** + AppState flush.
- **Settings:** `SettingsContext` - volume (SFX + music), haptics, notifications, theme (5 themes), **plus**: parental controls (`spendingLimitEnabled`, `monthlySpendingLimit`, `requirePurchasePin`, `purchasePin`, `monthlySpent`). Persisted to AsyncStorage.
- **Auth:** `AuthContext` - Firebase anonymous auth with loading state.

### Navigation Structure

```
App.tsx (RootStack)
├── MainTabs (Bottom Tab Navigator) — tabs progressively unlocked
│   ├── Home 🏠 (HomeStack) → HomeMain, Shop, CosmeticStore, Settings, Game  [always visible]
│   ├── Play 🎮 (PlayStack) → Modes, Game, Event, Leaderboard       [always visible]
│   ├── Collections 💎 (CollectionsStack) → CollectionsMain          [unlocks at level 5]
│   ├── Library 📚 (LibraryStack) → LibraryMain                     [unlocks at level 8]
│   └── Profile 👤 (ProfileStack) → ProfileMain, Settings, Club     [always visible]
└── Onboarding (shown once — interactive tutorial with guided puzzle)
```

Tab visibility is controlled by `player.featuresUnlocked` array checked against `FEATURE_UNLOCK_SCHEDULE` in constants. When a tab unlocks, a `FeatureUnlockCeremony` modal fires.

### Screen Props Pattern

All screens are registered as navigation components and receive no custom props. They use **optional props with context-based defaults**:
```typescript
interface SomeScreenProps {
  data?: SomeType;  // Optional - falls back to context
}
const SomeScreen: React.FC<SomeScreenProps> = ({ data: dataProp }) => {
  const player = usePlayer();
  const data = dataProp ?? player.someData;  // Context fallback
};
```

## Game Mechanics

### Core Loop
1. Player sees a grid of letters with target words listed in the WordBank
2. Tap or drag across letters in any direction (horizontal, vertical, diagonal, or zigzag — all 8-directional adjacency) to spell words
3. Non-adjacent taps start a new selection from the tapped cell (adjacency validated in the reducer)
4. When a valid word is selected, cells turn green with checkmarks and auto-submit after 250ms
5. Cleared letters disappear; letters above fall due to gravity (with LayoutAnimation)
6. Post-gravity: cells that shifted position glow briefly with cyan trail (400ms fade)
7. Score popup floats up showing points earned (with combo multiplier display)
8. Chain celebrations ("2x CHAIN!") appear with screen shake on consecutive word finds
9. Find all words to trigger victory screen with confetti, animated score counter, and star reveals

### Visual Feedback System
- **Green flash overlay**: 200ms on valid word match, before auto-submit (250ms delay)
- **Chain popup**: Spring-scaled "Nx CHAIN!" with screen shake (3px oscillation)
- **Score popup**: "+150 (2x!)" springs in, holds 600ms, floats up and fades out
- **Post-gravity highlight**: Moved cells get a cyan border overlay that fades via opacity over 400ms
- **Idle hint prompt**: Dynamic timer based on fail count (20s default → 15s after 1 failure → 10s after 2+), floats as absolute overlay on grid
- **Mode intro banner**: 2.5-second absolute overlay on game start for non-classic modes (e.g. "No mistakes allowed!")
- **Near-miss encouragement**: On failure, shows "SO CLOSE!" (1 word away) or "KEEP GOING!" with progress bar and word count, plus prominent retry button

### Boosters
Three booster types use **persistent inventory** stored in `economy.boosterTokens` (like hints/undos). New players start with 2 of each. Earned through puzzle rewards, events, coin shop (200 coins each), and the booster_pack contextual offer. First-ever use triggers `first_booster` ceremony:
- **Wildcard Tile** (★): Places a wildcard letter that matches any word. Can be placed on empty cells — useful in noGravity/shrinkingBoard after words are cleared
- **Spotlight** (💡): Highlights letters belonging to remaining words on the board
- **Smart Shuffle** (🔀): Randomizes non-word filler letters on the board, validates with mode-appropriate solver (`areAllWordsIndependentlyFindable` for noGravity/shrinkingBoard, `isSolvableGravityFlip` for gravityFlip, `isSolvable` for standard modes)

GameScreen spends from `economy.spendBoosterToken()` and grants into game state via `GRANT_BOOSTER` action. Game state `boosterCounts` initializes at 0 (economy is the source of truth). Booster shelf on GameScreen shows/hides based on economy token counts.

### Board Generation
- Uses Mulberry32 seeded PRNG for reproducible puzzles
- Words placed along random adjacent paths (any direction: horizontal, vertical, diagonal, zigzag) via DFS with randomized neighbor order
- Each letter in a word must be 8-directionally adjacent to the previous letter, but the path can change direction freely (e.g., right → diagonal-down-left → down → diagonal-up-right)
- Solvability validated using heuristic-first approach: checks each word is individually findable in the grid (fast DFS) before running the expensive full recursive solver only when needed. shrinkingBoard uses a dedicated shrink-aware solver (`isSolvableShrinkingBoard`) that simulates the full shrink sequence — after every 2 words cleared the outer ring is removed, and the solver validates at least one word-clearing order exists where all words survive until cleared. Board generation adds +2 rows/cols buffer (1 filler ring) and enforces minimum 3 words so the shrink mechanic is always experienced
- Filler letters use vowel-balanced distribution (35% vowels)
- 3-tier fallback: standard → simplified → minimal generation on failure
- Board generation timeout protection prevents UI hangs on difficult configurations

### 10 Game Modes
| Mode | Key Rule | Unlock Level |
|------|----------|-------------|
| `classic` | Standard play | 1 |
| `daily` | Same puzzle for all players (date-seeded) | 1 |
| `noGravity` | Cleared cells stay as holes, no gravity | 3 |
| `relax` | Unlimited hints/undos, gentle puzzles | 3 |
| `timePressure` | Countdown timer (auto-tick in useGame) | 8 |
| `gravityFlip` | Gravity direction rotates after each word (down→right→up→left) | 10 |
| `shrinkingBoard` | No gravity; outer ring removed every 2 words, words placed in interior | 10 |
| `perfectSolve` | Zero mistakes, no hints/undos | 12 |
| `weekly` | Harder curated puzzle, 7-day window | 10 |
| `expert` | No hints, no undo, harder boards | 30 |

Modes auto-unlock in `App.tsx` `handleComplete` based on player level.

### Scoring
- Word found: 100 + (20 * letter count)
- Combo multiplier: +50% per consecutive word
- Cascade mode: multiplier grows by 0.25 per word
- Perfect clear: 500 bonus
- No hints bonus: 200
- Time bonus: 10 points/second remaining

### Sound & Haptics
Sound manager calls are wired at every interaction point in `GameScreen.tsx` and `App.tsx`:
- Cell tap → `tap` sound + light haptic
- Valid word → `wordFound` sound + medium haptic
- Invalid tap → `wordInvalid` sound + error haptic
- Combo/chain → `combo` sound + heavy haptic
- Puzzle complete → `puzzleComplete` sound + success haptic
- Hint/undo → `hintUsed`/`undoUsed` sound
- Boosters → `buttonPress` sound

**Audio is synthesized at runtime with caching** — `SoundManager` (`src/services/sound.ts`) generates tones and chords programmatically (sine waves via WAV data URIs). DSP and WAV encoding are separated: `synthesizeToneSamples()` returns raw `Int16Array` buffers cached in `synthesisCache: Map<string, Int16Array>`, and `createWavDataUri()` wraps them in WAV headers. `preWarmAll()` synthesizes all sounds + music tracks asynchronously on init (yields to event loop between each to avoid blocking). `playSound()` never triggers synthesis — if a sound isn't cached, it skips silently. Uses `expo-audio` (`createAudioPlayer`), lazy-loaded via `require()`. (`expo-av` fallback was removed in the SDK 55 upgrade.) Sound effects use `ToneSpec` definitions (frequency arrays + ADSR + harmonics + reverb), background music uses `ProgressionSpec` (chord progressions with chorus detuning). Replace with real assets by swapping `createAudioPlayer(require('./path.mp3'))` calls.

## Reward & Progression Wiring

`useRewardWiring` hook (extracted from App.tsx, `src/hooks/useRewardWiring.ts`, 503 lines) provides `handleComplete()` for all post-puzzle rewards:
- Awards coins by difficulty (easy: 50, medium: 100, hard: 200, expert: 400) + star bonuses
- Awards gems on perfect clear
- Awards library points (stars * 5)
- Daily completion: bonus coins + gems + streak update
- Rare tile drops with difficulty/perfect bonuses and pity timer
- Atlas word collection checks ALL 12 atlas pages (not just one)
- Mission progress updates (puzzles solved, score, perfect, daily, hints-free)
- Auto-unlocks game modes based on new level
- **Level-up detection**: Compares new level to `highestLevel`, passes `leveledUp` + `newLevel` to PuzzleComplete
- **Difficulty transition detection**: Fires "New Challenge Tier!" when crossing easy→medium (level 6), medium→hard (level 16), hard→expert (level 31)
- **Feature unlock checks**: Calls `player.checkFeatureUnlocks(newLevel)` which queues `FeatureUnlockCeremony` for newly unlocked tabs/features
- **Achievement checks**: Calls `player.checkAchievements()` which compares player stats against all 15 achievement thresholds, queues `AchievementCeremony` for newly earned tiers
- **Weekly goal progress**: Updates tracking keys (`puzzles_solved`, `total_score`, `stars_earned`, `perfect_solves`, `daily_completed`)
- **Mode unlock ceremonies**: Detects newly unlockable modes, queues `ModeUnlockCeremony` for each
- **Collection completion**: Checks if puzzle words completed an Atlas page using local state projection (avoids stale React batched state), queues `CollectionCompleteCeremony`
- **Star milestones**: Checks actual `player.totalStars` against `STAR_MILESTONES` (50/100/250/500), queues `star_milestone` ceremony with cosmetic reward
- **Perfect solve milestones**: Checks exact perfect count against `PERFECT_MILESTONES` (10/25/50), queues `perfect_milestone` ceremony with badge
- **Milestone decorations**: On level-up, checks against `MILESTONE_DECORATIONS` (every 5 levels, 10 total), queues `decoration_unlock` ceremony
- **First rare tile**: Detects when player's first-ever rare tile drops, queues `first_rare_tile` ceremony
- **First mode clear**: Captures `prevModePlayed` before `recordModePlay()`, fires `first_mode_clear` for first win in any non-classic mode
- **Mystery wheel progress**: Calls `player.awardFreeSpin()` — awards a free spin every 8 puzzle completions
- **Win streak**: Calls `player.updateWinStreak(true)` — increments consecutive win counter, milestones at 3/5/7/10/15/20 queue `win_streak_milestone` ceremony
- **Seasonal stamp progress**: Awards stamps from the active season album at puzzle milestones (1, 3, 5, 10, 15, 20, 30, 40, 50, 60, 75, 90, 100, 120, 150, 175, 200, 250, 300, 500 puzzles solved) via `player.collectStamp()`
- **Share text generation**: Generates Wordle-style emoji grid via `generateShareText()`
- **Friend comparison**: Generates mock friend score data (Firestore-ready structure)
- **Failure tracking**: Records failures via `player.recordFailure()` for breather level and dynamic hint support

### Ceremony Queue System

Ceremonies (modals) are queued via `player.queueCeremony()` and processed sequentially in `HomeMainScreen`. **18 ceremony types** with two rendering patterns:

**Bespoke components** (6 types with dedicated files):
- `feature_unlock` → `FeatureUnlockCeremony`
- `mode_unlock` → `ModeUnlockCeremony`
- `achievement` → `AchievementCeremony`
- `streak_milestone` → `StreakMilestoneCeremony`
- `collection_complete` → `CollectionCompleteCeremony`
- `difficulty_transition` → `DifficultyTransitionCeremony`
- `level_up` → `LevelUpCeremony`

**MilestoneCeremony** (reusable component for 11 simpler types):
- `star_milestone`, `perfect_milestone`, `decoration_unlock`, `first_rare_tile`, `first_booster`, `wing_complete`, `word_mastery_gold`, `first_mode_clear`, `wildcard_earned`, `win_streak_milestone`, `mystery_wheel_jackpot`

Each ceremony renders with animations, rewards display, and dismiss/action buttons. When one is dismissed, the next in the queue fires after 300ms.

**Ceremony trigger locations:**
- `useRewardWiring.handleComplete()` (extracted from App.tsx): level_up, difficulty_transition, feature_unlock, achievement, mode_unlock, collection_complete, star_milestone, perfect_milestone, decoration_unlock, first_rare_tile, first_mode_clear
- `PlayerProgressContext.recordPuzzleComplete()`: wing_complete (auto-detected when all chapters in a wing are completed)
- `PlayerContext.updateStreak()`: streak_milestone
- `PlayerContext.updateWinStreak()`: win_streak_milestone
- `PlayerContext.collectAtlasWord()`: word_mastery_gold
- `PlayerContext.addRareTile()`: wildcard_earned
- `GameScreen` booster handlers: first_booster (tracked via `tooltipsShown`)

### Difficulty Curve

Difficulty uses a **smooth per-level ramp** (not a staircase). Every 5th level is a breather (sawtooth pattern). `getLevelConfig(level)` in constants.ts returns per-level `BoardConfig`:

| Phase | Levels | Grid | Words | Word Length | Difficulty Label |
|-------|--------|------|-------|-------------|-----------------|
| Tutorial | 1-3 | 5×4 | 2 | 3 | easy |
| Early | 4-5 | 5×5 | 3 | 3-4 | easy |
| Ramp 1 | 6-7 | 6×5 | 3 | 3-4 | easy |
| Ramp 2 | 8-10 | 6×5 | 4 | 3-4 | medium |
| Ramp 3 | 11-12 | 6×6 | 4 | 3-5 | medium |
| Midgame | 13-15 | 7×6 | 5 | 3-5 | medium |
| Hard 1 | 16-18 | 7×6 | 5 | 3-5 | hard |
| Hard 2 | 19-22 | 7×7 | 5 | 3-6 | hard |
| Hard 3 | 23-30 | 8×7 | 6 | 3-6 | hard |
| Expert 1 | 31-35 | 8×7 | 7 | 3-6 | expert |
| Expert 2 | 36-40 | 9×7 | 7 | 4-6 | expert |
| Endgame | 41+ | 9×7 | 8 | 4-6 | expert |

`getDifficultyTier(level)` returns the broad tier label (easy/medium/hard/expert) for rewards and UI.

### Breather Level System

After 2+ consecutive failures or a 1-star clear, `player.needsBreather()` returns true. `App.tsx` `startGame()` and `handleNextLevel()` check this and use `getBreatherConfig(level)` to serve a board ~4 levels easier than the current level. Additionally, every 5th level is inherently a breather in the normal difficulty curve.

Welcome-back modal in `HomeMainScreen` awards tiered comeback rewards (3-day/7-day/30-day absence) with animated card UI instead of basic alert.

## Design System

### Colors (dark theme only)
- Background: `#0a0e27` / Surface: `#1a1f45` / BgLight: `#111638`
- Accent (cyan): `#00d4ff` / Gold: `#ffd700`
- Green (success): `#4caf50` / Coral (danger): `#ff6b6b`
- Purple: `#a855f7` / Orange: `#ff9f43` / Teal: `#2ed8a3`
- Glow variants: `accentGlow`, `greenGlow`, `coralGlow` for text shadows
- Rarity colors: common, rare, epic, legendary
- All colors defined in `COLORS` object in `src/constants.ts`

### Visual Design Language
The UI uses a premium mobile game aesthetic with these patterns applied consistently across all screens:
- **Gradient surfaces**: All cards and panels use `LinearGradient` with `GRADIENTS.surfaceCard` instead of flat `backgroundColor`. Import from `expo-linear-gradient`
- **Shadow presets**: Use `SHADOWS.soft`, `SHADOWS.medium`, `SHADOWS.strong` from constants. `SHADOWS.glow(color)` for colored glow effects
- **Glassmorphism cards**: Cards use gradient backgrounds + subtle border + shadow for depth
- **Letter tiles**: Clean architecture — opaque base gradient (`GRADIENTS.tile.default/selected/valid/hint/frozen`) + bottom shadow gradient for 3D depth. No inner glow, specular highlight, or shimmer overlays (these were removed for visual clarity). Tile gradients must be **fully opaque** hex colors (not rgba) to prevent background bleed-through artifacts
- **Ambient backdrops**: Most screens use `<AmbientBackdrop variant="library|game|..." />` for floating animated orb backgrounds (12 twinkling stars + 3 nebula orbs via Reanimated UI-thread loops). HomeScreen uses `<SynthwaveHomeBackdrop>` with BandedSun + FlowingPerspectiveGrid + stars (also Reanimated). `SynthwaveBackdrop` (game screen) uses NeonSun + PerspectiveGridFloor + stars
- **Home screen image assets**: HomeScreen hero card uses image-based UI — `playbutton.png`, `statscard.png` (×3, one per stat), `shopbutton.png` — each with text overlaid via absolute-positioned Views. Hero card container is a plain `View` (no LinearGradient, no border, no glow orbs)
- **Hero illustrations**: Library screen has decorative `<LibraryHeroIllustration />` component built from Views + gradients (no image assets)
- **Screen top padding**: All screens use `paddingTop: 60` in their `content` style to clear the status bar / safe area consistently
- **Section layout**: Screens follow a pattern of hero card → section panels, each with `borderRadius: 20-28`, gradient fill, and `SHADOWS.medium`
- **Accent borders**: Highlighted/active items use thin accent-colored borders with matching glow shadow via `SHADOWS.glow(COLORS.accent)`

### Grid Layout
- Gravity-direction-aware columns: `flex-end` for down (default), `flex-start` for up (with spacer below cells), `noGravityLayout` prop renders cells at their actual row positions with empty placeholders for null cells (noGravity/shrinkingBoard modes). Left/right gravity directions show an arrow indicator but use the same column layout
- Cell touch targets: 44pt minimum
- Grid padding: 12px, cell gap: 4px
- Cell size computed dynamically based on column count, screen width, and available height (`Math.min(widthBased, heightBased)` when `maxHeight` prop is provided via `onLayout` measurement)
- Grid has gradient background (`GRADIENTS.grid`), 16px border radius, accent gradient border

### Animations & Visual Feedback

**System:** Migrated to **react-native-reanimated 4.2.1** + **react-native-worklets 0.7.2** for UI-thread animations. 30 components use `useSharedValue` + `useAnimatedStyle` + `withTiming`/`withSpring`/`withRepeat`/`withSequence`/`withDelay`/`interpolate`. The 4 exceptions below still use the legacy `Animated` API from `react-native` and are intentionally left alone (imperative particle systems that don't map cleanly to hooks):

- `src/components/effects/ParticleSystem.tsx`
- `src/components/WordBank.tsx`
- `src/components/victory/GridDissolveEffect.tsx`
- `src/components/game/GravityTrailEffect.tsx`

**Gesture rule:** In Reanimated 4, `Gesture.Pan/.Tap()` callbacks auto-run as worklets on the UI thread. `Grid.tsx` uses `.runOnJS(true)` on both `panGesture` and `tapGesture` so callbacks can mutate refs and dispatch to the `useGame` reducer. Without this the app crashes with `Tried to synchronously call a non-worklet function` on the first tile tap.

No continuous animation loops run on idle tiles.

- **Cell selection**: Scale down 0.86 → spring to 1.08 with animated glow border (60ms down, spring up)
- **Valid word detection**: Cells turn green with checkmarks, green flash overlay (200ms)
- **Post-gravity cells**: Cyan border overlay fading via opacity over 400ms
- **Score popup**: Springs in, holds 600ms, floats up and fades out. Shows combo multiplier
- **Chain celebration**: "Nx CHAIN!" popup with spring scale + screen shake (3px, 200ms)
- **WordBank chips**: Found words scale up 1.22x with spring then settle; `WordChip` wrapped in `React.memo`. No shimmer loop on found chips
- **Puzzle complete**: 16 confetti particles (8 colors), 12 sparkles, 10 celebration burst particles. Stars pop in with staggered springs. Score counts up from 0 over 800ms. Card anchored to bottom with `maxHeight: 85%` + `ScrollView` for overflow
- **AmbientBackdrop / SynthwaveHomeBackdrop**: 10-12 twinkling stars + nebula orbs or banded sun + flowing perspective grid, all migrated to Reanimated `withRepeat`/`withSequence` loops running on UI thread
- **Ceremonies** (Achievement, LevelUp, Milestone, Streak, FeatureUnlock, ModeUnlock, DifficultyTransition, CollectionComplete): all migrated to Reanimated — fade overlays + crisp spring card entrances (damping 14-15, stiffness 180-220) + icon scale pops with `withDelay(200)` for fast stagger. Decoration infinite loops capped to finite repeats (3-6 iterations). `useDeferredMount(280)` defers sparkles/particles until after card commits
- **Button press**: All Pressable buttons scale to 0.92-0.97x on press with opacity change (native Pressable `pressed` state, not Reanimated)
- **Screen transitions**: Title springs in, buttons slide up with spring physics

## Implementation Status

### Complete
- Core gameplay engine (board gen, gravity, solver, word selection)
- All 10 game mode support with correct mode IDs and auto-unlock
- Progressive tab navigation: 5 tabs with Collections (level 5) and Library (level 8) gated by `featuresUnlocked`
- 15 screens (Home, Game, Modes, Collections, Library, Profile, EditProfile, Settings, Shop, CosmeticStore, Club, Leaderboard, Event, Onboarding, Mastery) — all fully functional
- 4 context providers with AsyncStorage persistence
- Synthesized audio engine with runtime tone generation (SFX + looping background music)
- Sound manager wired at all interaction points (haptics fully functional)
- 40 chapters across 8 library wings with themed words
- 12 Word Atlas pages, 6 rare tile sets, 4 seasonal albums
- 12-week rotating event calendar (10 event types + Weekend Blitz)
- 22 daily mission templates with progress tracking wired
- Side objectives: par challenges, no-hint streaks, speed runs, theme master
- 107 cosmetic items (21 themes, 25 frames, 26 titles, 35 decorations) — many coin-purchasable as coin sinks
- Economy system with full reward wiring (coins, gems, library points, rare tiles on puzzle complete)
- Atlas word collection against all 12 pages (10 words each) with per-word mastery counter (duplicates increment mastery, max 5 = gold border)
- Booster system (Wildcard Tile, Spotlight, Smart Shuffle) with persistent economy inventory, UI, and reducer support
- Visual polish: score popups, confetti, chain celebration with screen shake, button press feedback
- Invalid word red flash + error haptic on non-adjacent taps
- Post-gravity cell highlight (cyan trail on shifted cells)
- Dynamic idle hint prompt (10-20s based on fail count for current level)
- Mode intro banner for non-classic modes
- Animated WordBank with celebration, glow, and valid-word states
- Valid word green flash + auto-submit (250ms)
- Daily login reward UI (7-day cycle on HomeScreen) with reward claiming wired to EconomyContext (coins, gems, hints, rare tiles)
- Welcome-back animated modal with tiered comeback rewards
- Perfect Solve undo recovery (undo from failed state)
- Performance-optimized: all tile animations use native driver, no continuous animation loops on idle tiles, expensive solver computations deferred out of render path, gesture objects memoized, computed game values cached with `useMemo`
- Visual polish pass: clean tile rendering (opaque gradients, no overlay artifacts), auto-sizing battery header, centered booster shelf, booster count badges visible (not clipped)
- TypeScript compiles with zero errors (`npx tsc --noEmit` exits clean)

#### Player Experience Systems (all complete)
- **Interactive tutorial**: 4-phase onboarding with 3 progressive tutorial boards: A (4×4, tap to find GO/HI), B (5×4, gravity intro with CAT/DOG), C (5×5, order matters with SUN/RED/ANT gravity dependency). Players learn through guided puzzle play on real GameGrid + TutorialOverlay
- **Progressive disclosure**: Dynamic HomeScreen sections based on `playerStage` (new/early/established/veteran). Streak hidden until 3 puzzles, quick play until established, weekly goals/missions for established+
- **Ceremony queue**: Sequential modal system with 20 ceremony types across 7 bespoke components + 1 reusable `MilestoneCeremony` component. Includes `mastery_tier_up` (purple ribbon, fires on mastery XP tier change) and `quest_step_complete` (seasonal quest step completion). Queued in PlayerContext, processed in HomeMainScreen
- **First-win celebration**: Special "WELCOME TO WORDFALL!" badge on PuzzleComplete for `puzzlesSolved === 0`
- **Level-up ceremony**: Full-screen `LevelUpCeremony` with gold badge animation on every level-up
- **Difficulty transition ceremony**: `DifficultyTransitionCeremony` with from→to tier badges when crossing easy→medium→hard→expert
- **Mode unlock ceremonies**: Animated modal when modes unlock via level progression
- **Feature unlock ceremonies**: Full-screen modal when tabs/features unlock
- **Achievement system**: 20 achievements (14 standard + 6 hidden) × 3 tiers (bronze/silver/gold) with ceremony modals, profile grid display with colored tier dots. Hidden achievements (`hidden: true`): speed_solver, no_hint_master, combo_king, night_owl, collector_supreme, marathon_player — discoverable through play
- **Weekly goals**: 3 goals per week from 24 templates (7 tracking keys), progress tracking, reward tiers, panel on HomeScreen
- **Streak milestone ceremonies**: Fires at 7/14/30/60/100 day milestones with rewards from `STREAK.milestoneRewards`
- **Collection completion ceremonies**: Modal when Atlas page or rare tile set completed
- **Star milestone ceremonies**: Fires at 50/100/250/500 total stars with cosmetic frame/title rewards
- **Perfect solve milestone ceremonies**: Fires at 10/25/50 perfects with badge rewards
- **Decoration unlock ceremonies**: Fires every 5 levels (10 total library decorations)
- **First rare tile ceremony**: Fires on first-ever rare tile drop, teaches collection mechanic
- **First booster ceremony**: Fires on first-ever booster use, tracked via `tooltipsShown`
- **First mode clear ceremony**: Fires on first win in each non-classic mode
- **Wing completion ceremony**: Fires when a library wing is restored
- **Word mastery gold ceremony**: Fires when atlas word mastery reaches 5/5 (gold border)
- **Wildcard earned ceremony**: Fires when 5 duplicate rare tiles convert to a wildcard
- **Win streak milestone ceremonies**: Fires at 3/5/7/10/15/20 consecutive wins with escalating labels
- **Shareable results**: Wordle-style emoji grid via `Share` API on PuzzleComplete, plus shareable streak cards and collection completion cards
- **Friend score comparison**: "You beat X of Y friends!" display on PuzzleComplete (real Firestore data when configured, local fallback otherwise)
- **Near-miss encouragement**: On failure, "SO CLOSE!" or "KEEP GOING!" with progress bar and prominent retry
- **Breather levels**: After 2+ consecutive failures, serves easier board via `getBreatherConfig()`
- **Dynamic hint generosity**: Idle hint timer adjusts by fail count (20s → 15s → 10s)
- **Personalized recommendations**: "Recommended for You" card on HomeScreen suggesting untried modes, daily challenge, or harder difficulty
- **Contextual tooltips**: First-visit tooltips on Modes, Collections, Library screens via `Tooltip` component + `tooltipsShown` tracking
- **Session end reminders**: Auto-dismissing banner when navigating home with incomplete daily
- **Mastery track**: 50-tier season pass with free/premium reward lanes, exclusive cosmetics at tiers 10/20/30/40/50, XP-based progression
- **Gifting system**: Send 1 hint gift/day + 3 tile gifts/day to friends, tracked via `sendHintGift`/`sendTileGift`
- **Milestone rewards**: Library decoration every 5 levels (10 decorations with ceremonies), star milestones (50/100/250/500 with ceremonies), perfect solve badges (10/25/50 with ceremonies) — all fully wired with celebration modals
- **Parental controls**: Spending limit toggle, monthly cap ($0-500), purchase PIN requirement on SettingsScreen
- **Weekend Blitz event**: Saturday-Sunday with double XP and increased rare tile drop rates
- **Stuck detection**: Red banner prompting undo when dead-end state detected during gameplay. If player has no undos remaining, purple "No moves left — tap to retry" banner appears instead
- **Star rating system**: 3 stars (no hints + efficient moves), 2 stars (≤1 hint), 1 star (any other win)
- **Club auto-kick config**: `CLUB.autoKickInactiveDays = 14` for removing inactive members
- **Mystery Wheel (gacha)**: 11 weighted segments (common→legendary) including 500-gem jackpot at 1% weight, pity system guaranteeing rare+ within 25 spins, mystery box secondary rewards, free spin every 8 puzzles + daily free spin, gem-purchasable spins (`SPIN_COST_GEMS=15`, `SPIN_BUNDLE_COST_GEMS=60` for 5-pack). State persisted in PlayerContext (`mysteryWheel`). `MysteryWheel` component has animated spin, result display, buy buttons
- **Event layering**: 5 simultaneous event layers: (1) main weekly event from 12-week rotation, (2) mini events every ~3 days (Coin Rush, Star Shower, Hint Frenzy, Rare Hunt, XP Surge — 24-48hr overlays), (3) automatic weekend blitz (Sat/Sun), (4) Royal Match-style win streak with 7 escalating tiers (3→20 consecutive wins), (5) partner events scaffolded for Firestore
- **Push notifications (local + remote)**: 9 notification categories using real `expo-notifications`. Local: permission handling, Android channels, segment-aware scheduling, streak reminder (8 PM), daily challenge (9 AM), comeback (3 days). Remote: `registerForRemotePush()` gets Expo + FCM/APNs device tokens, `sendTokenToServer()` syncs to Firestore `users/{uid}/tokens`, `handleRemoteNotification()` routes incoming payloads by category
- **Contextual offers (wired)**: 6 dismissible offer types wired to real triggers in GameScreen and HomeScreen. hint_rescue (2+ fails), streak_shield (expiring streak), close_finish (1 word away + stuck), post_puzzle (hints depleted), booster_pack (entering hard/expert). Max 1 offer per level
- **Analytics service (real)**: Tri-mode dispatch — on iOS/Android uses native `@react-native-firebase/analytics` (v24+); on web uses the JS SDK `firebase/analytics` guarded by `isSupported()`; everywhere also mirrors events to the Firestore `analytics_events` collection (every 60s flush) and to AsyncStorage as the offline buffer. The web-only `firebase/analytics` was the source of `Cannot read property 'getElementsByTagName' of undefined` errors on RN before the native module was added. 32+ typed events tracked across app lifecycle. Revenue tracking (`trackRevenue`, `trackAdRevenue`), retention metrics (`trackRetention` for D1/D7/D30), conversion funnels (`trackFunnel`), cohort analysis (`trackCohort`). User properties (level, stage, payer status). A/B testing via deterministic hash variant assignment
- **IAP service**: ✅ `react-native-iap@^15.0.0` is installed and wired via the `react-native-iap` config plugin in `app.json`. v15 fixed the Gradle issues that plagued v12 (amazon/play flavor ambiguity) and v14 (Nitro Modules peer dep). `src/services/iap.ts` implements the full purchase flow: init → fetchProducts → requestPurchase → purchaseUpdatedListener → server-side receipt validation → finishTransaction (iOS) / acknowledgePurchaseAndroid + consumePurchaseAndroid (Android) → entitlement persistence. Mock mode is now `__DEV__`-only (production rejects purchases when the native module isn't linked). Receipt replay protection via hash dedupe in AsyncStorage. 50+ products defined in `shopProducts.ts` + 3 mega bundles in `dynamicPricing.ts`. To enable real purchases on a production device, register the matching `wordfall_*` SKUs in Play Console / App Store Connect
- **Rewarded + interstitial ads**: `src/services/ads.ts` is fully wired with reward types, daily caps (10 rewarded / 5 interstitial), cooldowns (30s / 90s), and reward dispatch via EconomyContext. The native ad SDK (`react-native-google-mobile-ads`) is dynamically imported — currently NOT installed in `package.json`, so MockAdModal handles the UI in all builds. To go live: `npm i react-native-google-mobile-ads`, add the config plugin to `app.json` with the AdMob app ID, set `EXPO_PUBLIC_ADMOB_REWARDED_ID` + `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID` in `.env`, then rebuild. Wired into GameScreen (post-fail hint, post-complete double rewards) and ShopScreen (coins, mystery spin)
- **Firestore social layer**: Real leaderboards (daily/weekly/all-time), friend system with codes, real gift delivery, player profile sync. LeaderboardScreen wired to Firestore. All methods gracefully fallback when offline
- **Mystery Wheel (surfaced)**: Prominent button on HomeScreen for early+ players (3+ puzzles solved) with free spin pulse animation. Post-puzzle spin prompt when free spins available. Full overlay with reward granting via economy context
- **Puzzle energy system**: 30 energy/day, regenerates 1 per 15 min. Daily/endless/relax modes are free. 3 bonus plays after zero. Ad refill (+5) and gem refill (full). NOT a hard wall per GDD ethics
- **Adaptive difficulty**: Invisible per-player difficulty adjustment. Analyzes rolling 20-puzzle metrics. Makes easier when struggling (avgStars < 1.5), harder when cruising (5+ consecutive 3-stars). Capped at ±1 step. Wired into all board generation points
- **Live event manager**: Runtime event coordination with multiplier calculation. Coin/XP/rare-tile multipliers applied in handleComplete. Progress tracking and reward claiming. EventScreen shows active events with timers and reward tiers
- **Content pipeline**: 15 themed word categories (30-50 words each). Procedural chapter generation beyond level 600 with difficulty scaling. Themed puzzle sets for events
- **Player segmentation (wired)**: 7 engagement + 4 skill + 4 spending + 5 motivation segments. `computeSegments()` called on every app open via PlayerContext `useEffect`. Drives personalized offer timing, difficulty, home content, notification scheduling, mode recommendations. Segments persisted in PlayerContext
- **Error boundary**: Root `ErrorBoundary` wraps entire app tree inside `GestureHandlerRootView`. Catches JS errors, shows synthwave-themed crash screen with Restart button, reports to Sentry via `crashReporter.captureException()`
- **Crash reporting (Sentry)**: `crashReporting.ts` dynamically imports `@sentry/react-native`. When available + DSN configured (`EXPO_PUBLIC_SENTRY_DSN`), forwards exceptions, messages, breadcrumbs, and user context to Sentry. Falls back to console-only mode gracefully. Global `ErrorUtils` handler captures uncaught errors
- **Receipt validation**: `receiptValidation.ts` validates IAP receipts server-side via Firebase Cloud Function (`EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL/validateReceipt`). Fraud detection via receipt hash tracking in AsyncStorage (prevents replay attacks). Falls back to client-side trust when server unavailable
- **Coin shop (coin sinks)**: 13 coin-purchasable consumables in `coinShop.ts` — hints, undos, boosters, 2x XP (30 min), lucky charm (+10% rare tile, 1hr), theme rental (24h), premium hint (250 coins), board freeze (300 coins), score doubler (500 coins). Daily purchase limits per item. 3 new items also usable in-game via coin sink buttons on GameScreen booster shelf. Skip level costs 200 coins (available after 3+ failures)
- **Login calendar**: 7-day escalating rewards in `loginCalendar.ts` (100 coins → 500 coins + 15 gems + rare tile on day 7). Claim button on HomeScreen calls `handleClaimLoginReward` in App.tsx which grants rewards via EconomyContext and advances `loginCycleDay`. `LoginCalendar.tsx` component also available as standalone with horizontal day circles and pulse animation
- **Daily free reward timers**: 4 timed rewards in `dailyRewardTimers.ts` — free coins (4h), free hint (6h), free spin (8h), bonus chest (12h, random coins/gems). `DailyRewardTimers.tsx` component: 2×2 grid with live countdowns, "READY!" glow pulse, proper interval cleanup
- **Grand challenges**: 10 multi-day challenges in `grandChallenges.ts` (7-30 days, normal/hard/legendary). Examples: "Century Solver" (100 puzzles in 7d), "Unbreakable" (30-day streak), "Pure Mind" (50 no-hint puzzles). Level-gated: normal=all, hard=15+, legendary=30+
- **Season/battle pass**: 50-tier pass in `seasonPass.ts`. Free lane: coins/hints/boosters. Premium lane (500 gems / ~$4.99): gems/cosmetics/rare tiles with exclusive cosmetics at tiers 10/20/30/40/50. XP from puzzles/stars/dailies/perfects. 30-day seasons. Tier 50 premium: legendary frame + title + decoration set
- **Seasonal gacha wheels**: 4 seasonal variants in `seasonalWheels.ts` (spring/summer/autumn/winter) with exclusive cosmetic rewards in rare/epic slots. ~15% rare+ odds (vs 12% standard). `getActiveWheel(date)` auto-selects based on calendar month
- **Regional pricing**: 8 region tiers in `regionalPricing.ts`. India/Brazil at 0.40-0.45x, SEA at 0.50x, EU/UK at 0.95x. `detectRegion()` via device locale, `getRegionalPrice()` formats with currency symbols
- **Dynamic pricing by segment**: `dynamicPricing.ts` personalizes offers per spending/engagement segment. Non-payers see $0.99 starters, whales see $29.99 VIP mega bundles, lapsed players get 70% off win-back deals. 3 `MEGA_BUNDLES` ($14.99/$19.99/$29.99) with generous rewards
- **Friend challenges**: Create/send/respond to async puzzle challenges. ChallengeCard on HomeScreen. Side-by-side result comparison. Share via React Native Share API
- **Solve replay**: Move recording in useGame (solveSequence with grid snapshots). ReplayViewer component exists with animated playback, play/pause/step controls. Emoji grid sharing via replayGenerator. Not currently surfaced on PuzzleComplete (buttons removed for cleaner victory flow); ReplayViewer could be surfaced from Profile/history if desired
- **Audio asset infrastructure**: `expo-audio` (`createAudioPlayer`) lazy-loaded via `require()`. Loads real .mp3 files from assets/audio/ when present, falls back to synthesized WAV data URIs. LOCAL_AUDIO registry in localAssets.ts. (Pre-SDK-55 had an `expo-av` fallback; that path was deleted when SDK 55 dropped expo-av.)
- **Smooth difficulty curve**: Per-level ramp across 12 phases (not a staircase). Every 5th level is a breather. Breather config drops difficulty ~4 levels back
- **VIP weekly subscription**: $4.99/week subscription product in `shopProducts.ts`. Benefits: ad-free, 50 daily gems, 3 daily hints, exclusive VIP frame, 2x XP. Economy integration with `isVipSubscriber`, `vipExpiresAt`, `claimVipDailyRewards()`. Prominent VIP card at top of ShopScreen with ACTIVE/SUBSCRIBE states and daily claim button. VIP streak retention bonuses at 2/4/8/12/26 weeks with escalating gems/hints/exclusive cosmetics via `vipBenefits.ts`. Purple-themed streak card on ShopScreen with progress bar and claim button
- **Cosmetic store**: Full browse/purchase UI in `CosmeticStoreScreen.tsx` (886 lines). 4 tabs for themes/frames/titles/decorations. Item cards with rarity badges, previews, price/status. Detail modal with buy/equip flow. Purchases deduct from economy, unlocks tracked in player context. Navigable from HomeStack
- **Referral system**: 6-char referral codes generated from user ID hash. Referrer rewards: 1000 coins + 20 gems per referral. Referred rewards: 400 coins + 10 gems + 5 hints. Milestones: 3/5/10/15/25 referrals with escalating rewards (coins, exclusive frames, titles). `ReferralCard.tsx` glassmorphism component surfaced on HomeScreen (established+ players) with code copy, deep link sharing (`wordfall://referral/{code}`), milestone progress. Referral code included in all share text via `generateShareText()`
- **Club cooperative events**: 8 goal templates (Club Word Hunt, Star Chasers, Perfect Together, Chain Masters, etc.) with bronze/silver/gold reward tiers. Goals scaled by club tier + member count. `ClubGoalCard.tsx` with progress bar, tier markers, live countdown, top 3 contributors. `ClubLeaderboard.tsx` with weekly rankings. ClubScreen enhanced with goal section, contribution stats, rankings
- **A/B testing experiments**: 6 pre-configured experiments in `experiments.ts`: onboarding flow, energy cap, hint rescue price, first purchase offer, daily reward generosity, mystery wheel frequency. Weighted multi-variant assignment with deterministic hash. `useExperiment()` hook for React components. Exposure tracking via analytics
- **Push notification triggers (wired)**: 8 gameplay-event triggers in `notificationTriggers.ts`: streak reminder (8 PM after streak update), energy full (scheduled on energy spend), event ending (on app open), daily challenge (9 AM on app open), win streak milestone (immediate at 3/5/7/10/15/20), comeback reminder (3 days after app background), streak-at-risk (fires when streak >= 1 day and not played today), friend-beat-score (immediate notification when friend beats score). All idempotent scheduling
- **Contextual offer analytics**: All 6 offer types fire `offer_shown`, `offer_accepted`, `offer_dismissed` analytics events with offerType, level, mode, difficulty properties. `hint_rescue` also checks persistent `player.failCountByLevel` in addition to session fails. `life_refill` triggers when lives=0 on failure. `streak_shield` triggers during gameplay when streak >= 3 and approaching daily reset
- **Audio caching**: DSP separated from WAV encoding. Raw `Int16Array` sample buffers cached in `synthesisCache` Map. Async `preWarmAll()` synthesizes all sounds + music in background on init, yielding between each. `playSound()` never triggers synthesis — skips silently if uncached
- **God file decomposition**: App.tsx, PlayerContext decomposed into 5 extracted modules: `useRewardWiring` (post-puzzle rewards), `useCeremonyQueue` (ceremony processing), `MainNavigator` (tab/stack definitions with screen wrappers), `PlayerProgressContext` (22 progress methods), `PlayerSocialContext` (4 social methods). All using factory function pattern to preserve `usePlayer()` API surface
- **Test suite**: 37 test suites with 779 tests. Coverage: data layer (achievements, weekly goals, mystery wheel, shop products, event layers, coin shop, referrals, daily deals, rotating shop, mastery rewards, season pass, club events, grand challenges, dynamic pricing, login calendar, word categories, daily reward timers), engine (difficulty adjuster, board generator, gravity, solver), services (analytics, player segmentation, experiments), utilities (share generator, replay generator), components (profanity filter, haptics, prestige system, logger, loading tips), hooks (useGame). Integration tests: puzzle lifecycle, economy flow, ceremony queue, difficulty curve, game modes. Run via `npm test`
- **Deep linking**: `wordfall://` scheme configured in app.json with Android intent filters and iOS associated domains placeholder. `deepLinking.ts` parses referral/challenge/daily URLs. App.tsx handles cold-start and warm-start deep links via `Linking` API. Referral links auto-apply codes, challenge links store IDs, daily links navigate to daily mode. All share text includes deep link CTAs
- **Interactive mode tutorials**: `ModeTutorialOverlay.tsx` shows step-by-step animated tutorial on first play of complex modes (Gravity Flip, Shrinking Board, Time Pressure, Perfect Solve). Persisted via `tooltipsShown` so it shows once per mode. Tutorial data in `modeTutorials.ts`
- **Seasonal quest lines**: 4 seasonal quests (Spring/Summer/Autumn/Winter) with 5 sequential steps each in `seasonalQuests.ts`. Steps use weekly goal tracking keys (puzzles_solved, stars_earned, etc.). Escalating rewards per step + final reward with exclusive frame. `SeasonalQuestCard.tsx` on HomeScreen for established+ players. Progress tracked in `useRewardWiring` alongside weekly goals
- **Mastery tier-up ceremonies**: `mastery_tier_up` ceremony fires when player crosses a mastery XP tier boundary. Rendered via `MilestoneCeremony` with purple "MASTERY" ribbon
- **Late-game milestone ceremonies**: Every 25 levels past level 50 (50, 75, 100, 125...) awards 500 coins + 25 gems and queues a celebration ceremony
- **Procedural chapter naming**: `getProceduralChapterName()` in puzzleGenerator.ts generates deterministic themed names from 400 prefix/suffix combinations (e.g., "Chapter 42: Crystal Archives")
- **Flash sale UI**: Daily rotating flash sale banner at top of ShopScreen with live countdown timer, discount badge, crossed-out original price, gold "BUY NOW" button. Flash sale teaser card on HomeScreen for established+ players
- **Coin sink rental UI**: "Limited Rentals" section on ShopScreen displaying cosmetic_rental items with duration badges, coin prices, and rent/can't-afford button states
- **Prestige system**: 5-tier prestige system in `prestigeSystem.ts` (Bronze→Legendary Star). Each prestige resets to level 1 but keeps cosmetics and grants permanent XP multiplier (1.5x-3.0x) + bonuses. Gold prestige button on ProfileScreen with confirmation dialog. Prestige badge displays for prestiged players
- **Friend beat score notifications wired**: `triggerFriendBeatScoreNotification()` now called in `useRewardWiring` when player beats friends, sending actual push notifications
- **Challenge buttons on Leaderboard**: Each non-self entry in LeaderboardScreen has a "Challenge" button that calls `player.sendChallenge()` with current level data
- **Analytics cleanup**: `analytics.destroy()` called on app unmount to clear flush timer and flush remaining events
- **Board generation timeout**: 5-second absolute timeout in `generateBoard()` prevents UI hangs on difficult configurations. Timeout falls through to minimal board fallback. Callers show "Trying an easier one..." message on timeout

### Needs External Setup
- **Firebase credentials** — set `EXPO_PUBLIC_FIREBASE_*` env vars to enable Analytics, Firestore social, leaderboards. Without them, all services gracefully fall back to local-only mode
- **Firebase Cloud Functions URL** — set `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL` for server-side receipt validation. Without it, receipts are validated client-side only in development and fail closed in production
- **Sentry DSN** — set `EXPO_PUBLIC_SENTRY_DSN` for production crash reporting. Without it, crash reporter uses console-only mode
- **AdMob ad unit IDs** — set `EXPO_PUBLIC_ADMOB_REWARDED_ID` env var. Without it, MockAdModal (simulated 5s countdown) is used for rewarded, instant-resolve for interstitials
- **App Store / Play Store IAP products** — register 50+ product IDs (in `shopProducts.ts`, incl. VIP weekly + whale tiers + 3 mega bundles, prefixed `wordfall_`) in store consoles. Without store config, IAP remains unavailable in production builds
- **Professional audio assets** — place .mp3 files in `assets/audio/` per the README there. Synthesized tones remain as fallback

### Scaffolded / Needs Work
- **Assets optimized** — already run; `assets/` is now ~24MB (down from 44MB). PNGs converted to WebP, video compressed
- **Firestore rules + indexes deployed** — root `firebase.json` references `firestore.rules` and `firestore.indexes.json`; both have been pushed to the `wordfall-mobile-game` project
- **Cloud Functions deployed** — both directories now wired as codebases in `firebase.json` (`commerce` → `functions/`, `social` → `cloud-functions/`) and deployed to the `wordfall-mobile-game` project on Node 22. 10 functions live: `validateReceipt`, `onSubscriptionRenew`, `clubGoalProgress`, `autoKickInactiveMembers` (commerce); `onPuzzleComplete`, `updateClubLeaderboard`, `sendPushNotification`, `processStreakReminders`, `rotateClubGoals` (social). `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL` is set in `.env`. Future cleanup: consider consolidating into one directory
- **AdMob native SDK not installed** — `src/services/ads.ts` ready to dispatch to `react-native-google-mobile-ads` via dynamic import, but the package is not in `package.json` yet. MockAdModal handles all ad UI today. See AdMob bullet under "Rewarded + interstitial ads" above for the install steps
- **FCM remote push setup** — `expo-notifications` handles local notifications and registers device tokens (`registerForRemotePush()`). Sending remote pushes from Cloud Functions still needs FCM credentials uploaded to Firebase Console → Cloud Messaging
- **iOS build pending** — `app.json` references `./GoogleService-Info.plist` but it's not yet committed; download from Firebase Console when ready to ship iOS. Also needs Mac (or EAS macOS minutes) for first iOS build. iOS Universal Links: `associatedDomains: applinks:wordfall.app` is configured but needs real domain ownership + apple-app-site-association file
- **Play Console & App Store Connect** — register `wordfall_*` IAP product IDs (matches `src/data/shopProducts.ts`), create Google Play API service account for `validateReceipt` to call Play Developer API, upload service account JSON for the Cloud Function
- **Club chat real-time messaging + auto-kick enforcement** — basic chat works; multi-member real-time aggregation runs on the deployed Cloud Functions but needs end-to-end testing
- **Partner events** — cooperative 2-player events. Schema defined in `FIRESTORE_SOCIAL_GUIDE.md`
- **End-to-end testing** (37 test suites with 779 tests including integration tests, but no Detox/Maestro E2E)
- **Smart Solve Replay as animated GIF/video** — text + emoji replay is implemented; video generation is not
- **Professional audio assets** — synthesized tones are functional but artificial. Place .mp3 files in `assets/audio/` for premium feel
- **Ad mediation SDK** — once AdMob is wired, no ironSource/MAX mediation yet
- **Dev client rebuild required for native dep changes** — Expo Go is not supported. `EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android` from Termux (see CLAUDE.md for the full dev client workflow and Termux notes)

## Common Patterns

### Adding a new screen
1. Create `src/screens/NewScreen.tsx` with optional props + context defaults
2. Add to appropriate stack navigator in `App.tsx`
3. Use `export default` (not named export)

### Adding a new game action
1. Add to `GameAction` union in `src/types.ts`
2. Handle in `gameReducer` switch in `src/hooks/useGame.ts`
3. Expose via callback in `useGame` return value

### Adding new data
1. Add types to `src/types.ts`
2. Add constants to `src/constants.ts` or create file in `src/data/`
3. Wire into `PlayerContext` if it needs persistence

### Adding a ceremony (celebration modal)
**For simple milestones** (preferred — uses reusable component):
1. Add ceremony type string to `CeremonyItem['type']` union in `src/types.ts`
2. Queue it via `player.queueCeremony({ type: 'my_milestone', data: { icon, title, description } })` from the trigger point
3. Render it in App.tsx ceremony switch block using `MilestoneCeremony`: `{activeCeremony?.type === 'my_milestone' && <MilestoneCeremony ribbon="RIBBON" icon={data.icon} title={data.title} description={data.description} accentColor={COLORS.gold} onDismiss={handleDismissCeremony} />}`

**For complex celebrations** (custom component):
1. Create `src/components/MyCeremony.tsx` — full-screen animated modal with glassmorphism card, icon, title, rewards, dismiss button
2. Add ceremony type string to `CeremonyItem['type']` union in `src/types.ts`
3. Queue it via `player.queueCeremony({ type: 'my_ceremony', data: {...} })`
4. Render it in App.tsx ceremony switch: `{activeCeremony?.type === 'my_ceremony' && <MyCeremony ... onDismiss={handleDismissCeremony} />}`

**Trigger location options:**
- `App.tsx handleComplete()` — for post-puzzle milestones (most common)
- Inside `PlayerContext` `setData()` callbacks — for state-mutation-triggered ceremonies (streak milestones, win streaks, collection completions). Queue directly in the returned state: `pendingCeremonies: [...prev.pendingCeremonies, { type: '...', data: {...} }]`
- `GameScreen` callbacks — for in-game events (first booster use)

### Adding a tooltip to a screen
1. Import `Tooltip` from `../components/common/Tooltip` and `usePlayer` from `../contexts/PlayerContext`
2. Add state: `const [showTooltip, setShowTooltip] = useState(!player.tooltipsShown.includes('screen_id'))`
3. Render: `<Tooltip message="..." visible={showTooltip} onDismiss={() => { setShowTooltip(false); player.markTooltipShown('screen_id'); }} position="top" />`

### Adding an achievement
1. Add entry to `ACHIEVEMENTS` array in `src/data/achievements.ts` with `id`, `name`, `description`, `icon`, `category`, `tiers` (bronze/silver/gold thresholds + rewards)
2. Add the tracking key mapping in `PlayerContext.checkAchievements()` — map the achievement ID to a player stat value
3. Achievement ceremonies auto-fire via the existing `checkAchievements()` → `queueCeremony()` pipeline

### Adding a weekly goal template
1. Add entry to `WEEKLY_GOAL_TEMPLATES` in `src/data/weeklyGoals.ts` with `trackingKey`, `targetBase`, `description`, `icon`
2. Ensure `trackingKey` is updated via `player.updateWeeklyGoalProgress(key, value)` in `handleComplete`

### Adding an A/B test experiment
1. Add experiment to `EXPERIMENTS` array in `src/services/experiments.ts` with `id`, `name`, `variants` (each with weight + config)
2. In a React component: `const { variant, config, trackExposure } = useExperiment('my_experiment')`
3. Call `trackExposure()` when the variant is actually shown to the user
4. Read config values: `const price = config.price ?? 50`

### Adding a referral milestone
1. Add entry to `REFERRAL_MILESTONES` in `src/data/referralSystem.ts` with `count`, `label`, `icon`, `rewards`
2. Milestones auto-surface in `ReferralCard.tsx` via `getClaimableMilestones()`
3. Claim handled by `player.claimReferralMilestone(count)` in PlayerContext

### Adding a club cooperative goal
1. Add template to `CLUB_GOAL_TEMPLATES` in `src/data/clubEvents.ts` with `id`, `name`, `description`, `icon`, `trackingKey`, `baseTarget`, `duration`, `rewardTiers`
2. Goal auto-selects via `generateClubGoal()` deterministic rotation
3. Progress tracked via `getClubGoalProgress(contributions)`

### Adding sound effects
- **Synthesized (current approach):** Add a `ToneSpec` entry to `SOUND_DEFS` in `src/services/sound.ts` with frequency array + duration, then add the key to the `SoundName` type
- **Asset-based (upgrade path):** Replace the WAV-generation logic in `SoundManager.init()` with `createAudioPlayer(require('./path.mp3'))` — all callsites use the same `SoundName` keys and will work immediately

## Important Notes

- **No energy walls** on core play - ethical F2P design
- **Hints/undos use persistent inventory** (industry standard like Candy Crush/Royal Match). Tokens come from `economy.hintTokens`/`economy.undoTokens`, NOT per-level allocation. New players start with 5 of each. Earned through puzzle completion, events, daily login, ad watching, shop purchases. GameScreen's `handleHint`/`handleUndo` spend from economy via `GRANT_HINT`/`GRANT_UNDO` reducer actions. Relax mode is exempt (unlimited). Expert/perfectSolve modes disable hints/undos entirely. `hintsUsed` counter in game state tracks per-puzzle usage for star rating
- **Boosters** (wildcardTile, spotlight, smartShuffle) use **persistent inventory** stored in `economy.boosterTokens` (like hints/undos). New players start with 2 of each. GameScreen spends from `economy.spendBoosterToken()` and grants into game state via `GRANT_BOOSTER` action. Game state `boosterCounts` initializes at 0 (economy is the source of truth). Booster shelf on GameScreen shows/hides based on economy token counts. `booster_pack` contextual offer grants 1 of each to economy for 15 gems. First-ever booster use triggers a `first_booster` ceremony (tracked via `tooltipsShown`)
- **Portrait orientation only** (set in app.json). App configured with deep linking scheme `wordfall://` (with Android intent filters and iOS associated domains), iOS privacy manifests (UserDefaults + DiskSpace), Android permissions (INTERNET, VIBRATE, RECEIVE_BOOT_COMPLETED, SCHEDULE_EXACT_ALARM), OTA updates via expo-updates, auto-increment build numbers for store submissions
- **Deep linking** is handled in App.tsx via `Linking.getInitialURL()` (cold start) and `Linking.addEventListener('url')` (warm start). Routes: `wordfall://referral/{code}`, `wordfall://challenge/{id}`, `wordfall://daily`. All share text includes deep link CTAs. Parser in `src/utils/deepLinking.ts` with try/catch safety
- **Dark mode only** - no light theme (5 dark theme variants in cosmetics)
- **`--legacy-peer-deps` required** for npm install due to React Navigation peer dep conflicts
- **Screens use default exports**, not named exports
- **`AppNavigator.tsx`** was removed — `App.tsx` handles all navigation directly
- **Firebase env vars** must be set as `EXPO_PUBLIC_FIREBASE_*` for the app to connect (currently placeholders)
- **Word database** in `src/words.ts` contains ~4,891 curated English words (3-6 letters)
- **Seeded PRNG** ensures daily puzzles are identical for all players on the same day
- **Timer tick** for timePressure mode runs inside `useGame` hook, not in the screen
- **Adjacency validation** uses 8-directional adjacency (horizontal, vertical, diagonal) with no direction locking — paths can zigzag freely. Adjacency is checked in the `SELECT_CELL` reducer action; non-adjacent taps start a new selection from the tapped cell
- **Drag selection** is handled by `react-native-gesture-handler` PanGesture on the Grid — players can drag across tiles to select them. Gesture interpolates between motion samples at half-cell-size intervals for reliable diagonal selection. Hit testing uses nearest-center tiebreaking for precise boundary detection. Gesture objects are memoized with `useMemo` and use refs for callbacks to avoid reattachment on re-renders. `GestureHandlerRootView` wraps the app in `App.tsx`
- **LetterCell has no `onPress` prop** — all touch input is handled by the grid-level gesture detector via hit testing with nearest-center tiebreaking for boundary precision. LetterCell is purely presentational (wrapped in `React.memo`). Tile rendering is intentionally minimal: base gradient + bottom shadow only. Do NOT add semi-transparent overlay layers (innerGlow, specular, shimmer) as these create visible lighter rectangles
- **Tile gradients must be fully opaque** — `GRADIENTS.tile.*` uses hex colors, not `rgba()`. Semi-transparent tile gradients cause the AmbientBackdrop to bleed through unevenly, creating visible artifacts
- **GameHeader battery auto-sizes** — the battery container width is driven by its text content (mode label + word count), not a fixed pixel width. The battery shell image stretches to fit via `resizeMode="stretch"`
- **Booster buttons use `overflow: 'visible'`** — the count badges are positioned at `top: -5, right: -5` outside the button bounds; `overflow: 'hidden'` would clip them
- **Per-mode level progression**: Each non-classic mode has its own independent level starting at 1, stored in `player.modeLevels: Record<string, number>`. When a player wins in a mode, `advanceModeLevel(mode)` increments that mode's level. `handleSelectMode` uses `getModeLevel(mode)` to get the config via `getLevelConfig(modeLevel)`, giving the same smooth 12-phase difficulty ramp as classic. A level-50 classic player trying shrinkingBoard for the first time starts at shrinkingBoard level 1. Classic mode still uses the global `player.currentLevel`. Daily/weekly have fixed difficulty configs
- **Mode auto-unlock** happens in `App.tsx` `handleComplete` based on `MODE_CONFIGS[mode].unlockLevel`, with `ModeUnlockCeremony` modal. Key unlock levels per GDD: Cascade=10, Expert=30
- **Progressive tab unlocking** is controlled by `FEATURE_UNLOCK_SCHEDULE` in constants.ts and `player.featuresUnlocked` array — Collections at level 5, Library at level 8
- **Ceremony queue** (`player.pendingCeremonies`) is processed via `useCeremonyQueue` hook (extracted from App.tsx, `src/hooks/useCeremonyQueue.ts`). Watches `player.pendingCeremonies.length` — fires first ceremony immediately, chains subsequent ones via `handleDismissCeremony` with 300ms delay. 18 ceremony types fire one at a time. Returns `{ activeCeremony, handleDismissCeremony }`. Some ceremonies queued in `useRewardWiring.handleComplete()`, others in `PlayerContext` `setData()` callbacks
- **Player stage** (`new`/`early`/`established`/`veteran`) is computed from `puzzlesSolved` (0-2/3-10/11-30/31+) and controls HomeScreen section visibility
- **Breather levels** activate after 2+ consecutive failures via `player.needsBreather()` — `getBreatherConfig(level)` drops difficulty back ~4 levels. Additionally, every 5th level in the normal curve is inherently easier
- **Tooltips** are tracked in `player.tooltipsShown: string[]` and persist across sessions — each screen checks its ID on mount. Also used for one-time event tracking (e.g. `'first_booster_used'`)
- **Weekly goals** reset on Monday — `isNewWeek()` in weeklyGoals.ts detects week boundaries, `initWeeklyGoals()` generates 3 new goals
- **Friend comparison** on PuzzleComplete uses mock random data — the `{ beaten: number; total: number }` structure is ready for Firestore integration
- **Mastery track** uses `puzzlesSolved * 100` as XP proxy — replace with real XP tracking when needed
- **Chapters have 15 puzzles each** — 40 chapters × 15 puzzles = 600 total puzzles per GDD
- **Atlas pages have 10 words each** — within GDD's 8-12 range; duplicates increment per-word mastery counter (max 5 = gold border)
- **Seasonal stamp albums have 20 stamps each** — 4 seasons per GDD. Stamps earned at puzzle milestones (1, 3, 5, 10, 15, 20, 30... puzzles solved) during the active season via `player.collectStamp()` in `useRewardWiring`. `getCurrentSeasonAlbum()` returns the active album by date range
- **Rare tile drop rates** tuned for long-term retention: 4% base, +3% hard/expert, +5% perfect (max ~12%). Pity timer guarantees a drop within 25 puzzles (`COLLECTION.rareTilePityTimer`). Event multipliers can increase the chance further
- **Rare tile recycling** — 5 duplicate tiles = 1 wildcard tile (`COLLECTION.duplicatesForWildcard`). Crossing the threshold triggers a `wildcard_earned` ceremony
- **Grace days** limited to 1 per streak, auto-applied in `updateStreak` when exactly 1 day is missed (`diffDays === 2`). `graceDaysUsed` resets to 0 when streak breaks (missed 2+ consecutive days). GDD: "Missing one day doesn't break streak, missing 2 consecutive days resets"
- **Comeback rewards** at 3/7/30 day absence thresholds (was 3/7/14, fixed to match GDD)
- **Club settings** — `CLUB.autoKickInactiveDays = 14`, `CLUB.maxMembers = 30`
- **Gifting limits** — 1 hint gift/day, 3 tile gifts/day, tracked with daily reset
- **Daily Value Pack** gated to `availableAfterDay: 3` per GDD; `autoEnds: true`
- **Starter Pack** includes exclusive decoration (`starter_bookend`) per GDD
- **Chapter Bundle** includes 1 Board Preview booster per GDD
- **Star rating** uses `hintsUsed` counter + move efficiency: 3★ = no hints + moves ≤ wordCount, 2★ = ≤1 hint + moves ≤ wordCount+1, 1★ = otherwise
- **`.env.example`** documents all required env vars (Firebase, Sentry DSN, AdMob ad unit IDs, Firebase Functions URL); `.env` files are gitignored
- **`eas.json`** provides development/preview/production build profiles
- **Difficulty curve is smooth, not a staircase** — `getLevelConfig(level)` returns per-level `BoardConfig` across 12 phases. Every 5th level is a breather (drops back ~2 levels). The old 4-tier staircase (cliff at level 6/16/31) has been replaced. `DIFFICULTY_CONFIGS` still exists for reference but is no longer used by `getLevelConfig`
- **Mystery Wheel state** persisted in `PlayerContext.mysteryWheel` — tracks `spinsAvailable`, `puzzlesSinceLastSpin`, `totalSpins`, `lastJackpotSpin`, `jackpotPity` (25). Free spin awarded every 8 puzzles via `awardFreeSpin()`. Post-puzzle spin prompt only fires when a NEW spin is earned during that puzzle completion (not for old unused spins). HomeScreen wheel button visible for all non-new players (moved out of regular/hardcore-only segment gate). Wheel logic in `src/data/mysteryWheel.ts`, UI in `src/components/MysteryWheel.tsx`
- **Win streak state** persisted in `PlayerContext.winStreak` — tracks `currentStreak`, `bestStreak`, `lastWinDate`, `rewardsClaimed`. Updated via `updateWinStreak(won)`. Milestone ceremonies at 3/5/7/10/15/20 queued directly in `setData`
- **Event layering** enables multiple simultaneous events — main weekly event + mini events (every ~3 days) + weekend blitz (auto Sat/Sun) + win streak + partner events (Firestore scaffold). Data in `src/data/eventLayers.ts`
- **Notification service** in `src/services/notifications.ts` is real (not scaffold). Uses `expo-notifications` with permission handling, Android channels, and segment-aware scheduling
- **Contextual offers** are fully wired to ALL 6 triggers with analytics: hint_rescue (2+ session/persistent fails), life_refill (lives=0 on fail), streak_shield (streak >= 3 + approaching reset), close_finish (1 word left + stuck/idle 15s), post_puzzle (hints depleted on win), booster_pack (hard/expert first entry). Each fires `offer_shown`/`offer_accepted`/`offer_dismissed` analytics events. Max 1 offer per level
- **Analytics** in `src/services/analytics.ts` is real (not no-op). Dual-mode: Firebase when configured, local AsyncStorage fallback. Includes A/B testing via `getVariant()` with deterministic hash
- **IAP** in `src/services/iap.ts`: `react-native-iap` is currently removed. Service falls back to mock mode. 50+ products still defined in `shopProducts.ts` + 3 mega bundles in `dynamicPricing.ts`. Re-adding requires a config plugin to fix the Gradle amazon/play product flavor ambiguity. Parental controls enforced before every purchase via SettingsContext
- **VIP subscription** handles `vip_weekly` purchase by setting `isVipSubscriber: true`, `vipExpiresAt` to 7 days from now, resetting daily claim. `isAdFree` includes VIP status. Daily rewards (50 gems + 3 hints) claimed via `claimVipDailyRewards()` with date-based tracking
- **Ads** in `src/services/ads.ts` supports rewarded + interstitial. AdMob when available, otherwise MockAdModal (5s countdown) for rewarded and instant-resolve for interstitials. `isAdFree` flag in EconomyContext disables all ads. Interstitials have separate daily cap (5) and minimum interval (90s). `AD_CONFIG` in constants.ts has `MAX_INTERSTITIALS_PER_DAY` and `INTERSTITIAL_INTERVAL_MS`
- **Firestore** in `src/services/firestore.ts` handles all social operations. Every method has try/catch returning defaults on failure. App works identically offline
- **Puzzle energy** is a soft system (NOT a hard wall). Daily/endless/relax modes are always free. 3 bonus plays after zero energy. Energy display in UI when relevant
- **Adaptive difficulty** in `src/engine/difficultyAdjuster.ts` is invisible to the player. Never shows "we made this easier." Requires 5+ recent results before activating
- **Player segmentation** recomputes on every app open (wired via `useEffect` on `loaded` in PlayerContext, builds full `SegmentationInput` from player data). Drives offer timing, difficulty, home content, notifications. Segments persisted in PlayerContext
- **Solve replay** records every SUBMIT_WORD in `solveSequence` with grid snapshots. ReplayViewer has animated playback. Emoji grid generated via `replayGenerator.ts`
- **Friend challenges** stored locally in PlayerContext.friendChallenges. Shared via Share API with challenge codes. Will upgrade to Firestore delivery when backend is configured
- **Event multipliers** from eventManager are applied to coin/xp/rare-tile rewards in handleComplete. Only the highest multiplier per type is used (not stacked multiplicatively). Active multiplier labels shown in UI
- **`FIRESTORE_SOCIAL_GUIDE.md`** contains complete Firestore implementation plan — schemas for users/friendships/gifts/clubs/leaderboards/partnerEvents/globalEvents, security rules, Cloud Functions, 4-phase migration plan, cost estimates ($15-20/month at 10K DAU)
- **Error boundary** wraps the app tree inside `GestureHandlerRootView` → `ErrorBoundary` → `SafeAreaProvider` → providers. Shows synthwave crash screen in prod, error details in dev. Calls `crashReporter.captureException()`. Restart button uses `expo-updates` `reloadAsync()` with fallback to state reset
- **Crash reporting** uses dynamic `require('@sentry/react-native')` — if Sentry SDK is installed and DSN is set, forwards all exceptions/messages/breadcrumbs/user context. Otherwise console-only. Global `ErrorUtils` handler catches uncaught JS errors
- **Receipt validation** sends `{ receipt, productId, platform }` to `${FIREBASE_FUNCTIONS_URL}/validateReceipt`. Tracks receipt hashes in AsyncStorage (last 500) to detect replay attacks. Falls back to client-side trust on network failure
- **Orphaned timer cleanup** — all `setTimeout` calls in App.tsx (mystery wheel open, free spin toast, ceremony chain) store IDs in `useRef` and clear in `useEffect` cleanup functions
- **Console.log guards** — bare `console.log` calls in `difficultyAdjuster.ts` wrapped in `if (__DEV__)`. Services already used `__DEV__` guards
- **Login calendar** — 7-day cycle tracked in `player.loginCycleDay`. Day 7 is jackpot (500 coins + 15 gems + rare tile). Claim button on HomeScreen calls `handleClaimLoginReward` in App.tsx which uses `getLoginCalendarDay()` to look up rewards, grants via economy, and advances `loginCycleDay`. `getNextLoginRewardPreview()` shows tomorrow's reward as retention hook
- **Daily reward timers** — 4 independent timers with different intervals (4h/6h/8h/12h). Timer states stored as `Record<string, number>` (last claimed timestamps). Bonus chest uses weighted random roll (50% coins, 30% gems, 20% combo)
- **Coin shop** surfaced in ShopScreen "Spend Coins" section — players can spend hoarded coins on hints (100 coins), undos (250 for 3), and more. Full data layer in `coinShop.ts` defines 13 items including boosters (200 coins), 2x XP (500 coins), lucky charm (750 coins), theme rental (1000 coins), premium hint (250 coins), board freeze (300 coins), score doubler (500 coins) with daily purchase limits. Skip level: 200 coins after 3+ failures
- **Grand challenges** are level-gated multi-day objectives. `generateActiveGrandChallenges(playerLevel)` returns 2 below level 30, 3 at level 30+. Legendary challenges reward exclusive cosmetics
- **Season pass** rotates every 30 days. `getCurrentSeason()` deterministically computes season ID from date. XP earned passively through play. Premium unlock stored in `SeasonPassState.isPremium`
- **Seasonal wheels** override standard gacha during season months (Mar-May spring, Jun-Aug summer, etc.). 1-2 exclusive cosmetic rewards per seasonal wheel. `getActiveWheel()` checks current date
- **Regional pricing** uses `detectRegion()` via device locale → `NativeModules`. Falls back to 0.75x "Rest of World" multiplier. Store-side pricing ultimately controlled by App Store/Play Store, but this provides display price formatting
- **Dynamic pricing** is the monetization personalization layer. `getDynamicOffers()` consulted when showing offers. Lapsed players see 70% off, at-risk see 50% off, whales see VIP mega bundles. Each offer has expiry (24-72h) and priority sorting
- **Hidden achievements** have `hidden?: boolean` on `AchievementDef`. ProfileScreen should filter these from the visible grid until earned. Discovery through play is the engagement hook
- **Referral system** — codes are deterministic 6-char alphanumeric from user ID hash (excludes I/O/0/1 for clarity). `applyReferralCode()` prevents self-referral and double-referral. State persisted in PlayerContext: `referralCode`, `referralCount`, `referredBy`, `referredPlayerIds`, `referralMilestonesClaimed`. ReferralCard uses `expo-clipboard` for copy
- **Club cooperative events** — 8 goal templates with 3/7-day durations. Goals scale by club tier (bronze→diamond multiplier) and member count (10+ adds +50% etc.). Progress aggregated from per-member contributions. Top 3 contributors highlighted. Gold tier rewards include exclusive club frames. `ClubGoalCard` has live countdown timer updating every 60s
- **A/B testing** — `experiments.ts` uses same `simpleHash` algorithm as `analytics.getVariant()` for consistent hash distribution. Experiments support `targetSegments` filter and `startDate`/`endDate` windows. `useExperiment()` hook memoizes variant assignment per userId. Exposure tracking is separate from assignment for proper intent-to-treat analysis
- **Notification triggers are idempotent** — each trigger function cancels previous scheduled notifications before scheduling new ones. Streak reminder re-schedules on every streak update. Comeback reminder cancels on app foreground and re-schedules on background. Energy full notification calculated from current energy + regen rate
- **Cosmetic store** reads data from 4 existing arrays (`COSMETIC_THEMES`, `PROFILE_FRAMES`, `PROFILE_TITLES`, `LIBRARY_DECORATIONS`) cross-referenced with `player.unlockedCosmetics` and equipped state. Items without `cost` show "Earn in-game" instead of buy button. Equipped items show accent glow border
- **God file decomposition** preserves API surfaces — extracted contexts use factory function pattern (`createProgressMethods(setData, getData)` returns method object). Components calling `usePlayer()` see the identical interface. `useRewardWiring` takes player/economy as parameters and returns a stable `handleComplete` callback via `useCallback`. `MainNavigator` contains wrapper components (ProfileMainScreen, EventScreenWrapper) that wire navigation props

### Performance Architecture

**Render isolation (zustand):**
- **GameScreen does NOT subscribe to `selectedCells`** — it reads ~20 coarse zustand selectors (status, score, combo, moves, etc.) that change per-word, not per-tap. When a cell is tapped, only PlayField + ConnectedWordBank re-render (~15-30ms), not the full 2500-line GameScreen.
- **PlayField** (`src/screens/game/PlayField.tsx`) subscribes to per-tap state (`selectedCells`, `board.grid`, `board.words`, `wildcardCells`, `gravityDirection`) and renders Grid. ~50 lines, re-renders on every tap — that's correct and expected.
- **ConnectedWordBank** (exported from PlayField.tsx) subscribes to `selectedCells`, `board.grid`, `board.words` and renders WordBank above the grid area. Re-renders per-tap for the forming-word display.
- **GameFlashes** (`src/screens/game/GameFlashes.tsx`) — 7 overlay blocks (chain popup, neon pulse, VHS glitch, valid/invalid flash, score popup, big-word label) extracted as `React.memo`. Receives Animated.Values by stable ref + primitive props. Memo bails out on every tap.
- **GameBanners** (`src/screens/game/GameBanners.tsx`) — 7 conditional banners extracted as `React.memo`. All callbacks via `useStableCallback`.
- **`useStableCallback`** (`src/utils/hooks.ts`) — stable-identity callback wrapper (useEvent RFC polyfill). Used for ALL props passed to memoized children so their memo compare succeeds.

**React Compiler:**
- Enabled via `babel-preset-expo` `'react-compiler'` option in `babel.config.js`, scoped to `src/`. Auto-memoizes all components and hooks, reducing manual `React.memo`/`useMemo`/`useCallback` burden. Works alongside explicit memoization — they're complementary.

**Persistence debounce:**
- **PlayerContext** debounces AsyncStorage writes with a 300ms coalesce window. `useRewardWiring` fires 15+ setter calls on puzzle complete — without debounce, each would trigger a synchronous `JSON.stringify` + `AsyncStorage.setItem` of the full PlayerData blob. AppState listener flushes pending writes on background/inactive.
- **EconomyContext** debounces at 1s (same pattern).

**Grid gesture & hit-test:**
- **O(1) column-indexed hit test** — precomputed per-column sorted bounds arrays, stride-based row slot lookup. Was O(49) linear scan per pointer sample.
- **`.shouldCancelWhenOutside(true)`** on the pan gesture — stops pointer events when finger leaves grid.
- **Gesture built once on mount** — `useMemo(() => ..., [])` with callback refs so changing the grid doesn't tear down the native handler.
- **`.runOnJS(true)` required** on gestures whose callbacks call JS (refs, dispatch). Without it: crash on first interaction.

**Ceremony animations:**
- All 8 ceremony components use **Reanimated 4 springs with high damping** (damping 14-15, stiffness 180-220) for crisp pop, not wobbly settle. Cascade delays at 200ms.
- **PuzzleComplete** entrance is a parallel staggered sequence (card spring friction 12 + ribbon/stats/actions with timing fades at 150/220/300ms delays). Settles in ~500ms total.
- **Decoration infinite loops capped** — sparkle `Animated.loop({ iterations: 3 })`, glow `withRepeat(n, 3-6)`, star pulse `withRepeat(n, 6)`. No truly infinite animation drivers.
- **Deferred decoration mounting** — all ceremonies use `useDeferredMount(280)` so the card commits first, decorations (sparkles, confetti, burst particles) mount 280ms later.

**Remaining architecture (unchanged):**
- **Reanimated 4 animations run on UI thread by default** — `useSharedValue` + `useAnimatedStyle` don't need `useNativeDriver`
- **No continuous animation loops on idle tiles** — only selected/moved tiles run short one-shot animations
- **`isDeadEnd` solver is deferred** — debounced 500ms via `setTimeout` in `useEffect`, never in render
- **`findWordInGrid` supports a `limit` parameter** — pass `limit=1` when only existence matters
- **Gesture objects memoized** — `useMemo` with callback refs
- **Computed game values cached** — `currentWord`, `remainingWords`, `isValidWord` use `useMemo` in PlayField (selection-derived) and `useGame` (word-derived)
- **Timer interval stable** — depends on `mode` and `status`, not `timeRemaining`
- **Grid sizing is dual-dimension** — `cellSize` uses `Math.min(widthBased, heightBased)` via `maxHeight` prop
- **Stable layout architecture** — absolute-positioned overlays for banners, fixed-height WordArea, reserved boosterBar space
- **Board generation uses heuristic-first validation**
- **Audio synthesis is cached and pre-warmed**
- **FlatLists** use `removeClippedSubviews`, `initialNumToRender`, etc.
- **When adding new animations**: use Reanimated, prefer `withSpring`/`withTiming` over `withRepeat`, use **high damping (14+)** for ceremonies
- **When modifying tiles**: do NOT add semi-transparent overlay Views
