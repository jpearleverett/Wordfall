# Wordfall - AI Agent Context

## Project Overview

Wordfall is a gravity-based strategic word puzzle mobile game built with **React Native + Expo**. Players find hidden words on a letter grid; when a word is cleared, letters above fall due to gravity, creating chain opportunities. The game features 10 modes, 40 chapters, collections, social features, a library meta-game, and a full player experience layer (interactive tutorial, progressive disclosure, ceremony system, achievements, weekly goals, mastery track, shareable results).

- **Framework:** React Native 0.81.5, Expo ~54.0.0, TypeScript ~5.8.0
- **Backend:** Firebase (Auth + Firestore + Analytics) — Firestore social layer implemented with graceful offline fallback. Env vars needed for real connectivity
- **State:** React Context (4 providers) + useReducer for game state + AsyncStorage persistence + Firestore sync when configured
- **Monetization:** IAP via react-native-iap (14 products), rewarded ads via AdMob (mock fallback), contextual offers wired to triggers
- **Audio:** `expo-audio` (SDK 54 compatible, `createAudioPlayer` for SFX/music) with `expo-av` fallback
- **Video:** `expo-video` (SDK 54 compatible, `useVideoPlayer` + `VideoView`) with error boundary fallback
- **Navigation:** React Navigation (bottom tabs + nested stacks) with progressive tab unlocking

## Commands

```bash
npm start              # Start Expo dev server
npm run android        # Start on Android
npm run ios            # Start on iOS
npm run web            # Start on web
npx tsc --noEmit       # Type-check (no output files)
npm install --legacy-peer-deps  # Install deps (legacy flag required for peer dep conflicts)
```

There are no test scripts configured yet. There is no linter script in package.json.

## Architecture

### Directory Structure

```
src/
├── engine/           # Core game logic (board generation, gravity physics, solver)
├── hooks/            # useGame (game reducer), useStorage (AsyncStorage)
├── services/         # Singletons: sound, haptics, analytics, notifications, iap, ads, firestore, eventManager, playerSegmentation
├── contexts/         # AuthContext, EconomyContext, PlayerContext, SettingsContext
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
│   ├── ChallengeCard.tsx                        # Friend challenge display with accept/result comparison
│   ├── ReplayViewer.tsx                         # Animated solve sequence step-through with share
│   ├── SessionEndReminder.tsx                   # Auto-dismissing daily/streak reminder
│   ├── common/       # Button, Card, Modal, Badge, ProgressBar, AmbientBackdrop, VideoBackground (expo-video + error boundary), HeroIllustrations, Tooltip
│   ├── economy/      # CurrencyDisplay, ShopItem
│   ├── modes/        # TimerDisplay, MoveCounter
│   └── events/       # EventBanner, EventProgress
├── screens/          # 13 screens (Home, Game, Modes, Collections, Library, Profile, Settings, Shop, Club, Leaderboard, Event, Onboarding, Mastery)
├── config/           # firebase.ts
├── data/             # Static game data
│   ├── chapters.ts, collections.ts, cosmetics.ts, events.ts, missions.ts  # Original data
│   ├── tutorialBoards.ts    # 3 progressive tutorial boards (A/B/C) + guided steps
│   ├── achievements.ts      # 15 achievements with bronze/silver/gold tiers
│   ├── weeklyGoals.ts       # Weekly goal templates + generation logic
│   ├── masteryRewards.ts    # 30-tier season pass reward definitions
│   ├── sideObjectives.ts    # Par challenges, no-hint streaks, speed runs, theme master
│   ├── mysteryWheel.ts      # Mystery Wheel gacha: weighted segments, pity system, mystery box
│   ├── eventLayers.ts       # Event layering: mini events, win streaks, partner events, weekend blitz
│   ├── dailyDeals.ts        # 5 rotating daily deals (deterministic by date)
│   ├── rotatingShop.ts      # 12 cosmetic items on 48-hour rotation windows
│   ├── shopProducts.ts      # 14 IAP product definitions with rewards, categories, store IDs
│   └── wordCategories.ts    # 15 themed word categories (30-50 words each) for procedural puzzles
├── engine/
│   ├── difficultyAdjuster.ts # Adaptive difficulty based on rolling 20-puzzle performance metrics
│   └── puzzleGenerator.ts    # Higher-level puzzle gen: themed sets, procedural chapters beyond level 600
├── utils/
│   ├── shareGenerator.ts    # Wordle-style shareable emoji grid + streak card + collection card
│   └── replayGenerator.ts   # Solve sequence replay as text, emoji grid, and structured data
├── types.ts          # All TypeScript interfaces and type unions
├── constants.ts      # Colors, gradients, shadows, configs, scoring, economy, feature unlock schedule
└── words.ts          # Word dictionary (~4900 curated 3-6 letter words)
```

### Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Entry point. Progressive tab unlocking, nested stack navigators, provider wrappers, full reward/progression/mission wiring, ceremony queue processing (`useEffect` watches `player.pendingCeremonies.length` to fire ceremonies after `handleComplete`), welcome-back modal, feature unlock detection, achievement/weekly goal progress, breather level support, personalized recommendations |
| `src/types.ts` | ALL type definitions including `FeatureUnlockId`, `WeeklyGoal`, `WeeklyGoalsState`, `CeremonyItem`. Edit here when adding new data structures |
| `src/constants.ts` | Colors, `GRADIENTS`, `SHADOWS`, difficulty configs, mode configs, scoring, economy, `FEATURE_UNLOCK_SCHEDULE`, `getBreatherConfig()`, `STREAK` milestones, `MILESTONE_DECORATIONS`, `STAR_MILESTONES`, `PERFECT_MILESTONES`, `COLLECTION`, `CLUB`, `COMEBACK`, `ANIM` timing |
| `src/contexts/PlayerContext.tsx` | Master player data hub: progress, collections (with atlas word mastery + wildcard ceremony), missions, streaks, cosmetics, library (wing completion ceremony), modes, comebacks, **plus**: `featuresUnlocked`, `weeklyGoals`, `pendingCeremonies`, `tooltipsShown`, `failCountByLevel`, `consecutiveFailures`, `wordsFoundTotal`, `modesPlayedThisWeek`, gifting, `mysteryWheel` state, `winStreak` state, `modeLevels` (per-mode level progression). Methods: `unlockFeature`, `checkFeatureUnlocks`, `markTooltipShown`, `initWeeklyGoals`, `updateWeeklyGoalProgress`, `queueCeremony`, `popCeremony`, `recordFailure`, `needsBreather`, `checkAchievements`, `sendHintGift`, `sendTileGift`, `updateMysteryWheel`, `awardFreeSpin`, `updateWinStreak`, `advanceModeLevel`, `getModeLevel`. Ceremonies are queued directly in `setData` callbacks for streak milestones, win streak milestones, word mastery gold, wildcard earned, and wing completion |
| `src/hooks/useGame.ts` | Core game state reducer - handles 15+ game actions including boosters and `GRANT_BOOSTER`. Timer tick for timePressure mode runs here. Computed values (`currentWord`, `remainingWords`, `isValidWord`) cached with `useMemo`. `isDeadEnd` computed via deferred `useEffect` (not in render path) — mode-aware: shrinkingBoard uses `isDeadEndShrinkingBoard` with `wordsUntilShrink`, hints use `getHintShrinkingBoard` for shrink-aware ordering |
| `src/engine/boardGenerator.ts` | Puzzle generation with seeded PRNG, freeform path placement (8-directional), and heuristic-first solvability validation (avoids exponential solver calls). Mode-aware: shrinkingBoard adds +2 buffer (1 filler ring), enforces min 3 words and 5×5 grid, places words in interior, uses shrink-aware solver for validation. `generateBoard` accepts optional `mode` parameter — callers MUST pass mode for shrinkingBoard/gravityFlip/noGravity to get correct validation |
| `src/engine/gravity.ts` | Column-based gravity physics (letters fall down), frozen column support |
| `src/engine/solver.ts` | 8-directional DFS word finder, recursive backtracking solver, dead-end detection, hint generation. Mode-aware variants: `isSolvable` (standard gravity), `isSolvableGravityFlip` (rotating gravity), `areAllWordsIndependentlyFindable` (noGravity), `isSolvableShrinkingBoard`/`getHintShrinkingBoard`/`isDeadEndShrinkingBoard` (shrinkingBoard — simulates outer ring removal every 2 words, validates ordering survives all shrink phases). `findWordInGrid` supports optional `limit` parameter for early termination. `getHint` uses solution ordering directly without redundant re-solve |
| `src/components/PuzzleComplete.tsx` | Victory screen with confetti, animated score counter, staggered reveals. **Plus**: `isFirstWin` welcome, `leveledUp` badge, `shareText` with Share API, friend comparison (Firestore when available), "Watch Ad to DOUBLE Rewards" button. Action buttons: Primary "NEXT LEVEL" + secondary row (Home \| Share \| Challenge via `onChallengeFriend`) |
| `src/components/Grid.tsx` | Column-based grid renderer with gravity layout, responsive sizing via `maxHeight` prop (cell size constrained by both width and available height), drag-to-select via react-native-gesture-handler with drag interpolation for reliable diagonal selection and nearest-center hit testing (gesture objects memoized with `useMemo`, callbacks via refs), frozen column styling, post-gravity moved-cell highlighting. Passes `cellBounds` to `SelectionTrailOverlay` for gravity-aware trail positioning. LetterCell receives no `onPress` — all input handled by grid-level gesture detector |
| `src/screens/GameScreen.tsx` | Main gameplay screen: green flash, chain popup, score popup, dynamic idle hint, mode intro overlay, boosters, near-miss encouragement. **Plus**: contextual offers wired (hint_rescue after 2+ fails, close_finish at 1 word left, booster_pack on hard/expert entry, post_puzzle when hints depleted), rewarded ad triggers (post-fail hint, post-complete double), MockAdModal overlay. Stable layout with absolute-positioned overlays |
| `src/components/GameHeader.tsx` | Chrome card header with back button, battery-style progress indicator (auto-sizes to content), cyan score display with animated pop, undo/hint glass buttons with count badges. Progress bar at bottom with glow dot (hidden at 0%). Battery shell is an image asset that stretches to fit the label text |
| `src/screens/HomeScreen.tsx` | Dynamic home screen with `VideoBackground`, image-based UI, progressive section visibility based on `playerStage` AND `playerSegmentation`. Sections: hero card, streak, daily rewards, Mystery Wheel button (with free spin badge/pulse animation), event banners, weekly goals, missions, recommendations, quick play, pending challenge cards, pending gift banner. Section visibility driven by segment-aware `segmentHomeContent` when available |
| `src/screens/OnboardingScreen.tsx` | 4-phase interactive tutorial: welcome → guided tutorial puzzle (real GameGrid + TutorialOverlay) → celebration → ready screen with tips |
| `src/screens/ProfileScreen.tsx` | Player profile with stats grid, achievements grid (15 achievements × 3 tiers with colored dots), collection progress, cosmetics |
| `src/screens/MasteryScreen.tsx` | Season pass / mastery track with 30 tiers, free + premium reward lanes, XP progress |
| `src/screens/ModesScreen.tsx` | Game mode grid with first-visit tooltip via `Tooltip` component |
| `src/screens/CollectionsScreen.tsx` | Atlas/Tiles/Stamps tabs with first-visit tooltip. Rare tiles derived from `collections.rareTiles` (Record<string, number>) — keys with count > 0 are "collected" |
| `src/screens/LibraryScreen.tsx` | Library wings with first-visit tooltip |
| `src/data/tutorialBoards.ts` | 3 progressive tutorial boards: A (4×4, GO/HI), B (5×4, CAT/DOG + gravity), C (5×5, SUN/RED/ANT + gravity dependency). `TUTORIAL_STEPS` with highlight positions and guided actions per board |
| `src/data/sideObjectives.ts` | Par challenges (3 tiers), no-hint streaks (5/10/25), speed runs, theme master objectives with rewards |
| `src/data/achievements.ts` | 15 `AchievementDef` entries across 5 categories (puzzle, collection, streak, mode, mastery), each with bronze/silver/gold tiers |
| `src/data/weeklyGoals.ts` | 8 goal templates, `generateWeeklyGoals()` picks 3 per week, `isNewWeek()` utility |
| `src/data/masteryRewards.ts` | 30 `MasteryReward` tiers with free/premium lanes, `getMasteryTierForXP()`, `getXPProgressInTier()` |
| `src/utils/localAssets.ts` | `LOCAL_IMAGES` and `LOCAL_VIDEOS` asset registries — all image/video `require()` calls centralized here. Includes HomeScreen assets (playButton, statsCard, shopButton, bgHomescreen), gameplay icons, screen backgrounds |
| `src/utils/shareGenerator.ts` | `generateShareText()` for Wordle-style emoji grid, `generateStreakCard()` for shareable streak display, `generateCollectionCard()` for collection progress sharing |
| `src/components/common/Tooltip.tsx` | Reusable contextual tooltip with glassmorphism styling, arrow, auto-dismiss persistence via `player.markTooltipShown()` |
| `src/components/MilestoneCeremony.tsx` | Reusable celebration modal for simple milestone types — configurable ribbon, icon, title, description, accent color, reward label, button text. Used for 10+ ceremony types (star/perfect/decoration/first_rare_tile/first_booster/wing_complete/word_mastery_gold/first_mode_clear/wildcard_earned/win_streak/mystery_wheel_jackpot) |
| `src/components/MysteryWheel.tsx` | Animated gacha wheel overlay — spin animation with easing, 10 weighted segments, result display with rarity, mystery box secondary reveal, buy-spin buttons |
| `src/components/ContextualOffer.tsx` | Monetization pressure point modal — 6 offer types (hint_rescue, life_refill, streak_shield, close_finish, post_puzzle, booster_pack) with template variable replacement and always-dismissible design |
| `src/data/mysteryWheel.ts` | Mystery Wheel system: 10 weighted segments (common→epic), pity system (guaranteed rare+ within 25 spins), mystery box secondary rewards, free spin every 3 puzzles, `SPIN_COST_GEMS=10`, `SPIN_BUNDLE_COST_GEMS=40` for 5-pack. Functions: `spinWheel()`, `openMysteryBox()`, `checkFreeSpin()` |
| `src/data/eventLayers.ts` | Event layering system enabling multiple simultaneous events: 5 mini event templates (24-48hr overlays), Royal Match-style win streak with 7 tiers (2→20 wins), weekend blitz detection, partner event scaffold (Firestore-ready). Functions: `getMiniEventForDate()`, `isWeekendBlitz()`, `getActiveEventLayers()`, `updateWinStreak()` |
| `src/services/notifications.ts` | Real push notification service using `expo-notifications`. 9 categories with template interpolation. Permission handling with graceful denial. Android notification channel. Convenience schedulers: `scheduleStreakReminder()` (8 PM), `scheduleDailyChallenge()` (9 AM), `scheduleComebackReminder()` (3 days). Segment-aware scheduling via playerSegmentation |
| `src/services/analytics.ts` | Dual-mode analytics: Firebase Analytics when configured, AsyncStorage fallback otherwise. 27+ typed events (puzzle_complete, offer_shown, mystery_wheel_spin, etc.), user properties, 7-day local event retention, A/B testing via deterministic variant assignment, retention metrics (D1/D7/D30) |
| `src/services/iap.ts` | IAP service via `react-native-iap`. 14 products across bundles/consumables/currency/premium. Mock mode for dev/Expo Go. NativeModules check on init prevents EventEmitter crash when native module isn't linked. Receipt storage, restore purchases, parental control integration. Wire to ShopScreen for real purchase flow |
| `src/services/ads.ts` | Rewarded ads service with AdMob integration + mock fallback (MockAdModal with 5s countdown). 5 reward types (hint, undo, spin, coins, double). Daily caps (10 ads/day), cooldown (30s). Wired into GameScreen (post-fail, post-complete) and ShopScreen |
| `src/services/firestore.ts` | Firestore social layer: leaderboards (daily/weekly/all-time), friend system (codes, requests), real gifting, player profile sync. Graceful offline fallback — all methods return defaults when Firebase unavailable |
| `src/services/eventManager.ts` | Live event coordination: active event detection, multiplier calculation (coins/xp/rareTile), progress tracking, reward claiming. Wired into handleComplete for reward multipliers. Persisted via PlayerContext.eventProgress |
| `src/services/playerSegmentation.ts` | Player segmentation across 4 dimensions: engagement (7 segments), skill (4), spending (4), motivation (5). Personalization hooks for offer timing, difficulty, home content, notifications, mode recommendations |
| `src/engine/difficultyAdjuster.ts` | Invisible adaptive difficulty. Analyzes rolling 20-puzzle performance. Makes easier when struggling (avgStars < 1.5), harder when cruising (consecutiveThreeStars > 5). Adjustments capped at ±1 step from base config |
| `src/engine/puzzleGenerator.ts` | Higher-level puzzle generation: themed puzzle sets via word categories, procedural chapter generation beyond level 600 with difficulty scaling |
| `src/data/shopProducts.ts` | 14 IAP product definitions with store IDs, rewards, categories. Helpers: `getProductById()`, `getProductRewards()`, `getProductsByCategory()` |
| `src/data/wordCategories.ts` | 15 themed word categories (nature, food, science, sports, music, etc.) with 30-50 words each for themed puzzle generation |
| `FIRESTORE_SOCIAL_GUIDE.md` | Implementation guide for real-time social features: Firestore schemas, security rules, Cloud Functions, friend system, gift delivery, club chat, leaderboards, partner events, community goals. Includes 4-phase migration plan and cost estimates |
| `GAME_DESIGN_DOCUMENT.md` | Full 48KB GDD with 17 sections - the source of truth for features |

### State Management

- **Game state:** `useGame` hook with `useReducer` in `GameScreen`. Actions: SELECT_CELL, CLEAR_SELECTION, SUBMIT_WORD, USE_HINT, UNDO_MOVE, NEW_GAME, RESET_COMBO, TICK_TIMER, SHUFFLE_FILLER, FREEZE_COLUMN, PREVIEW_MOVE, USE_BOOSTER, GRANT_HINT, GRANT_UNDO, GRANT_BOOSTER. State includes `frozenColumns`, `previewGrid`, `boosterCounts`, `cascadeMultiplier`, `perfectRun`, `maxCombo`, `history` (for undo — stores `{ grid, words, wordsUntilShrink?, shrinkCount? }`, undo also removes last `solveSequence` entry), `solveSequence` (for replay recording).
- **Player data:** `PlayerContext` - progress, collections (atlas/tiles/stamps), missions, streaks, cosmetics, library wings, mode stats, achievements, comebacks, **plus**: `featuresUnlocked`, `weeklyGoals`, `pendingCeremonies`, `tooltipsShown`, `failCountByLevel`, `consecutiveFailures`, `mysteryWheel`, `winStreak`, `puzzleEnergy` (session scarcity), `performanceMetrics` (adaptive difficulty), `segments` (player segmentation), `eventProgress` (live event tracking), `friendChallenges` (sent/received challenges), `modeLevels` (per-mode independent level progression, `Record<string, number>`). Methods include `useEnergy`, `refillEnergy`, `recomputeSegments`, `updateEventProgress`, `sendChallenge`, `respondToChallenge`, `recordPerformanceMetrics`, `advanceModeLevel`, `getModeLevel`. Persisted to AsyncStorage + Firestore sync when configured.
- **Economy:** `EconomyContext` - coins, gems, hintTokens, undoTokens, eventStars, libraryPoints, `isAdFree`, `isPremiumPass`, `starterPackAvailable`, `dailyValuePackExpiry`. Methods: add/spend/check + `processPurchase(productId)` for IAP fulfillment + `processAdReward(rewardType)` for ad rewards. Persisted to AsyncStorage.
- **Settings:** `SettingsContext` - volume (SFX + music), haptics, notifications, theme (5 themes), **plus**: parental controls (`spendingLimitEnabled`, `monthlySpendingLimit`, `requirePurchasePin`, `purchasePin`, `monthlySpent`). Persisted to AsyncStorage.
- **Auth:** `AuthContext` - Firebase anonymous auth with loading state.

### Navigation Structure

```
App.tsx (RootStack)
├── MainTabs (Bottom Tab Navigator) — tabs progressively unlocked
│   ├── Home 🏠 (HomeStack) → HomeMain, Shop, Settings, Game        [always visible]
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
- **Post-gravity highlight**: Moved cells get a cyan border overlay that fades via opacity over 400ms (uses `useNativeDriver: true`)
- **Idle hint prompt**: Dynamic timer based on fail count (20s default → 15s after 1 failure → 10s after 2+), floats as absolute overlay on grid
- **Mode intro banner**: 2.5-second absolute overlay on game start for non-classic modes (e.g. "No mistakes allowed!")
- **Near-miss encouragement**: On failure, shows "SO CLOSE!" (1 word away) or "KEEP GOING!" with progress bar and word count, plus prominent retry button

### Boosters
Three booster types available during gameplay (first use triggers `first_booster` ceremony):
- **Spotlight** (👁️): Highlights a word on the board
- **Wildcard Tile**: Places a wildcard letter that matches any word. Can be placed on empty cells (creates a placeholder cell) — useful in noGravity/shrinkingBoard after words are cleared. Renders as ★ symbol
- **Spotlight** (👁️): Highlights a word on the board
- **Smart Shuffle** (🔀): Randomizes non-word filler letters on the board, validates with mode-appropriate solver (`areAllWordsIndependentlyFindable` for noGravity/shrinkingBoard, `isSolvableGravityFlip` for gravityFlip, `isSolvable` for standard modes)

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

**Audio is synthesized at runtime** — `SoundManager` (`src/services/sound.ts`) generates tones and chords programmatically (sine waves via WAV data URIs). Uses `expo-audio` (`createAudioPlayer`) with `expo-av` as fallback, both lazy-loaded via `require()` to avoid deprecation warnings. No `.mp3`/`.wav` asset files needed. Sound effects use `ToneSpec` definitions (frequency arrays + duration), background music uses `ProgressionSpec` (chord progressions looped). All sounds are functional — replace with real assets by swapping `createAudioPlayer(require('./path.mp3'))` calls.

## Reward & Progression Wiring

`App.tsx` `GameScreenWrapper.handleComplete()` handles all post-puzzle rewards:
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
- `App.tsx handleComplete()`: level_up, difficulty_transition, feature_unlock, achievement, mode_unlock, collection_complete, star_milestone, perfect_milestone, decoration_unlock, first_rare_tile, first_mode_clear
- `PlayerContext.updateStreak()`: streak_milestone
- `PlayerContext.updateWinStreak()`: win_streak_milestone
- `PlayerContext.collectAtlasWord()`: word_mastery_gold
- `PlayerContext.addRareTile()`: wildcard_earned
- `PlayerContext.restoreWing()`: wing_complete
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
- **Ambient backdrops**: Most screens use `<AmbientBackdrop variant="library|game|..." />` for floating animated orb backgrounds (10 twinkling stars + 2 nebula orbs, all `useNativeDriver: true`). HomeScreen uses `<VideoBackground>` with `bg-homescreen.mp4` instead
- **Home screen image assets**: HomeScreen hero card uses image-based UI — `playbutton.png`, `statscard.png` (×3, one per stat), `shopbutton.png` — each with text overlaid via absolute-positioned Views. Hero card container is a plain `View` (no LinearGradient, no border, no glow orbs)
- **Hero illustrations**: Library screen has decorative `<LibraryHeroIllustration />` component built from Views + gradients (no image assets)
- **Screen top padding**: All screens use `paddingTop: 60` in their `content` style to clear the status bar / safe area consistently
- **Section layout**: Screens follow a pattern of hero card → section panels, each with `borderRadius: 20-28`, gradient fill, and `SHADOWS.medium`
- **Accent borders**: Highlighted/active items use thin accent-colored borders with matching glow shadow via `SHADOWS.glow(COLORS.accent)`

### Grid Layout
- Flex-end columns for gravity visualization (standard modes); `noGravityLayout` prop renders cells at their actual row positions with empty placeholders for null cells (noGravity/shrinkingBoard modes)
- Cell touch targets: 44pt minimum
- Grid padding: 12px, cell gap: 4px
- Cell size computed dynamically based on column count, screen width, and available height (`Math.min(widthBased, heightBased)` when `maxHeight` prop is provided via `onLayout` measurement)
- Grid has gradient background (`GRADIENTS.grid`), 16px border radius, accent gradient border

### Animations & Visual Feedback
All tile animations use `useNativeDriver: true` for native-thread execution. No continuous animation loops run on idle tiles.
- **Cell selection**: Scale down 0.86 → spring to 1.08 with animated glow border (60ms down, spring up). All native driver
- **Valid word detection**: Cells turn green with checkmarks, green flash overlay (200ms)
- **Post-gravity cells**: Cyan border overlay fading via opacity over 400ms (native driver)
- **Score popup**: Springs in, holds 600ms, floats up and fades out. Shows combo multiplier
- **Chain celebration**: "Nx CHAIN!" popup with spring scale + screen shake (3px, 200ms)
- **WordBank chips**: Found words scale up 1.22x with spring then settle; `WordChip` wrapped in `React.memo`. No shimmer loop on found chips
- **Puzzle complete**: 16 confetti particles (8 colors), 12 sparkles, 10 celebration burst particles. Stars pop in with staggered springs, centered via explicit `lineHeight`/`width`/`height` styling. Score counts up from 0 over 800ms (20 steps). Card anchored to bottom of screen (`justifyContent: 'flex-end'`) with `maxHeight: 85%` screen constraint and `ScrollView` for overflow
- **AmbientBackdrop**: 10 twinkling stars + 2 nebula orbs (all `useNativeDriver: true`). No aurora wave animations
- **Button press**: All Pressable buttons scale to 0.92-0.97x on press with opacity change
- **Screen transitions**: Title springs in, buttons slide up with spring physics

## Implementation Status

### Complete
- Core gameplay engine (board gen, gravity, solver, word selection)
- All 10 game mode support with correct mode IDs and auto-unlock
- Progressive tab navigation: 5 tabs with Collections (level 5) and Library (level 8) gated by `featuresUnlocked`
- 13 screens (Home, Game, Modes, Collections, Library, Profile, Settings, Shop, Club, Leaderboard, Event, Onboarding, Mastery) — all fully functional
- 4 context providers with AsyncStorage persistence
- Synthesized audio engine with runtime tone generation (SFX + looping background music)
- Sound manager wired at all interaction points (haptics fully functional)
- 40 chapters across 8 library wings with themed words
- 12 Word Atlas pages, 6 rare tile sets, 4 seasonal albums
- 12-week rotating event calendar (10 event types + Weekend Blitz)
- 22 daily mission templates with progress tracking wired
- Side objectives: par challenges, no-hint streaks, speed runs, theme master
- 50+ cosmetic items (12 themes, 15 frames, 18 titles, 24 decorations)
- Economy system with full reward wiring (coins, gems, library points, rare tiles on puzzle complete)
- Atlas word collection against all 12 pages (10 words each) with per-word mastery counter (duplicates increment mastery, max 5 = gold border)
- Booster system (Freeze Column, Board Preview, Shuffle Filler) with UI and reducer support
- Visual polish: score popups, confetti, chain celebration with screen shake, button press feedback
- Invalid word red flash + error haptic on non-adjacent taps
- Post-gravity cell highlight (cyan trail on shifted cells)
- Dynamic idle hint prompt (10-20s based on fail count for current level)
- Mode intro banner for non-classic modes
- Animated WordBank with celebration, glow, and valid-word states
- Valid word green flash + auto-submit (250ms)
- Daily login reward UI (7-day cycle on HomeScreen)
- Welcome-back animated modal with tiered comeback rewards
- Perfect Solve undo recovery (undo from failed state)
- Performance-optimized: all tile animations use native driver, no continuous animation loops on idle tiles, expensive solver computations deferred out of render path, gesture objects memoized, computed game values cached with `useMemo`
- Visual polish pass: clean tile rendering (opaque gradients, no overlay artifacts), auto-sizing battery header, centered booster shelf, booster count badges visible (not clipped)
- TypeScript compiles with only 2 pre-existing errors in NeonTabBar.tsx

#### Player Experience Systems (all complete)
- **Interactive tutorial**: 4-phase onboarding with 3 progressive tutorial boards: A (4×4, tap to find GO/HI), B (5×4, gravity intro with CAT/DOG), C (5×5, order matters with SUN/RED/ANT gravity dependency). Players learn through guided puzzle play on real GameGrid + TutorialOverlay
- **Progressive disclosure**: Dynamic HomeScreen sections based on `playerStage` (new/early/established/veteran). Streak hidden until 3 puzzles, quick play until established, weekly goals/missions for established+
- **Ceremony queue**: Sequential modal system with 18 ceremony types across 7 bespoke components + 1 reusable `MilestoneCeremony` component. Queued in PlayerContext, processed in HomeMainScreen
- **First-win celebration**: Special "WELCOME TO WORDFALL!" badge on PuzzleComplete for `puzzlesSolved === 0`
- **Level-up ceremony**: Full-screen `LevelUpCeremony` with gold badge animation on every level-up
- **Difficulty transition ceremony**: `DifficultyTransitionCeremony` with from→to tier badges when crossing easy→medium→hard→expert
- **Mode unlock ceremonies**: Animated modal when modes unlock via level progression
- **Feature unlock ceremonies**: Full-screen modal when tabs/features unlock
- **Achievement system**: 15 achievements × 3 tiers (bronze/silver/gold) with ceremony modals, profile grid display with colored tier dots
- **Weekly goals**: 3 goals per week from 8 templates, progress tracking, reward tiers, panel on HomeScreen
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
- **Mastery track**: 30-tier season pass with free/premium reward lanes, XP-based progression
- **Gifting system**: Send 1 hint gift/day + 3 tile gifts/day to friends, tracked via `sendHintGift`/`sendTileGift`
- **Milestone rewards**: Library decoration every 5 levels (10 decorations with ceremonies), star milestones (50/100/250/500 with ceremonies), perfect solve badges (10/25/50 with ceremonies) — all fully wired with celebration modals
- **Parental controls**: Spending limit toggle, monthly cap ($0-500), purchase PIN requirement on SettingsScreen
- **Weekend Blitz event**: Saturday-Sunday with double XP and increased rare tile drop rates
- **Stuck detection**: Red banner prompting undo when dead-end state detected during gameplay. If player has no undos remaining, purple "No moves left — tap to retry" banner appears instead
- **Star rating system**: 3 stars (no hints + efficient moves), 2 stars (≤1 hint), 1 star (any other win)
- **Club auto-kick config**: `CLUB.autoKickInactiveDays = 14` for removing inactive members
- **Mystery Wheel (gacha)**: 10 weighted segments (common→epic) with pity system guaranteeing rare+ within 25 spins, mystery box secondary rewards, free spin every 8 puzzles, gem-purchasable spins (10 gems each, 40 gems for 5-pack). State persisted in PlayerContext (`mysteryWheel`). `MysteryWheel` component has animated spin, result display, buy buttons
- **Event layering**: 5 simultaneous event layers: (1) main weekly event from 12-week rotation, (2) mini events every ~3 days (Coin Rush, Star Shower, Hint Frenzy, Rare Hunt, XP Surge — 24-48hr overlays), (3) automatic weekend blitz (Sat/Sun), (4) Royal Match-style win streak with 7 escalating tiers (3→20 consecutive wins), (5) partner events scaffolded for Firestore
- **Push notifications (real)**: 9 notification categories using real `expo-notifications`. Permission handling, Android channels, segment-aware scheduling. Streak reminder (8 PM), daily challenge (9 AM), comeback (3 days)
- **Contextual offers (wired)**: 6 dismissible offer types wired to real triggers in GameScreen and HomeScreen. hint_rescue (2+ fails), streak_shield (expiring streak), close_finish (1 word away + stuck), post_puzzle (hints depleted), booster_pack (entering hard/expert). Max 1 offer per level
- **Analytics service (real)**: Dual-mode — Firebase Analytics when configured, AsyncStorage fallback. 27+ typed events tracked across app lifecycle. User properties (level, stage, payer status). Local retention metrics (D1/D7/D30). A/B testing via deterministic hash variant assignment
- **IAP service**: Full `react-native-iap` integration with 14 products. Mock mode for development. NativeModules check on init prevents EventEmitter crash in Expo Go. Receipt storage, restore purchases, parental control enforcement. Wired into ShopScreen for real purchase flow
- **Rewarded ads**: AdMob integration with MockAdModal fallback for dev. 5 reward types. Wired into GameScreen (post-fail hint, post-complete double rewards) and ShopScreen (coins, mystery spin). Daily caps and cooldown
- **Firestore social layer**: Real leaderboards (daily/weekly/all-time), friend system with codes, real gift delivery, player profile sync. LeaderboardScreen wired to Firestore. All methods gracefully fallback when offline
- **Mystery Wheel (surfaced)**: Prominent button on HomeScreen for early+ players (3+ puzzles solved) with free spin pulse animation. Post-puzzle spin prompt when free spins available. Full overlay with reward granting via economy context
- **Puzzle energy system**: 30 energy/day, regenerates 1 per 15 min. Daily/endless/relax modes are free. 3 bonus plays after zero. Ad refill (+5) and gem refill (full). NOT a hard wall per GDD ethics
- **Adaptive difficulty**: Invisible per-player difficulty adjustment. Analyzes rolling 20-puzzle metrics. Makes easier when struggling (avgStars < 1.5), harder when cruising (5+ consecutive 3-stars). Capped at ±1 step. Wired into all board generation points
- **Live event manager**: Runtime event coordination with multiplier calculation. Coin/XP/rare-tile multipliers applied in handleComplete. Progress tracking and reward claiming. EventScreen shows active events with timers and reward tiers
- **Content pipeline**: 15 themed word categories (30-50 words each). Procedural chapter generation beyond level 600 with difficulty scaling. Themed puzzle sets for events
- **Player segmentation**: 7 engagement + 4 skill + 4 spending + 5 motivation segments. Drives personalized offer timing, difficulty, home content, notification scheduling, mode recommendations. Recomputed on each session start
- **Friend challenges**: Create/send/respond to async puzzle challenges. ChallengeCard on HomeScreen. Side-by-side result comparison. Share via React Native Share API
- **Solve replay**: Move recording in useGame (solveSequence with grid snapshots). ReplayViewer component exists with animated playback, play/pause/step controls. Emoji grid sharing via replayGenerator. Not currently surfaced on PuzzleComplete (buttons removed for cleaner victory flow); ReplayViewer could be surfaced from Profile/history if desired
- **Audio asset infrastructure**: Dual-mode sound system — uses `expo-audio` (`createAudioPlayer`) with `expo-av` fallback, both lazy-loaded via `require()`. Loads real .mp3 files from assets/audio/ when present, falls back to synthesized WAV data URIs. LOCAL_AUDIO registry in localAssets.ts
- **Smooth difficulty curve**: Per-level ramp across 12 phases (not a staircase). Every 5th level is a breather. Breather config drops difficulty ~4 levels back

### Needs External Setup
- **Firebase credentials** — set `EXPO_PUBLIC_FIREBASE_*` env vars to enable Analytics, Firestore social, leaderboards. Without them, all services gracefully fall back to local-only mode
- **AdMob ad unit ID** — set `EXPO_PUBLIC_ADMOB_REWARDED_ID` env var. Without it, MockAdModal (simulated 5s countdown) is used instead
- **App Store / Play Store IAP products** — register 14 product IDs (prefixed `wordfall_`) in store consoles. Without store config, IAP runs in mock mode
- **Professional audio assets** — place .mp3 files in `assets/audio/` per the README there. Synthesized tones remain as fallback

### Scaffolded / Needs Work
- Image assets — app icon and splash screen are placeholder PNGs; HomeScreen JPEGs renamed as .png (no alpha channel)
- Firebase Cloud Functions (server-side scheduled tasks) — see `FIRESTORE_SOCIAL_GUIDE.md`
- Club chat real-time messaging + auto-kick enforcement (club creation exists in Firestore service, chat needs Cloud Functions)
- Partner events — cooperative 2-player events. Schema defined in `FIRESTORE_SOCIAL_GUIDE.md`
- End-to-end testing
- Deep linking
- Smart Solve Replay as animated GIF/video (text + emoji replay is implemented; video generation is not)

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

### Adding sound effects
- **Synthesized (current approach):** Add a `ToneSpec` entry to `SOUND_DEFS` in `src/services/sound.ts` with frequency array + duration, then add the key to the `SoundName` type
- **Asset-based (upgrade path):** Replace the WAV-generation logic in `SoundManager.init()` with `createAudioPlayer(require('./path.mp3'))` — all callsites use the same `SoundName` keys and will work immediately

## Important Notes

- **No energy walls** on core play - ethical F2P design
- **Hints/undos use persistent inventory** (industry standard like Candy Crush/Royal Match). Tokens come from `economy.hintTokens`/`economy.undoTokens`, NOT per-level allocation. New players start with 5 of each. Earned through puzzle completion, events, daily login, ad watching, shop purchases. GameScreen's `handleHint`/`handleUndo` spend from economy via `GRANT_HINT`/`GRANT_UNDO` reducer actions. Relax mode is exempt (unlimited). Expert/perfectSolve modes disable hints/undos entirely. `hintsUsed` counter in game state tracks per-puzzle usage for star rating
- **Boosters** (wildcardTile, spotlight, smartShuffle) are per-puzzle consumables tracked in `boosterCounts` (initialized to 1 each at game start). `GRANT_BOOSTER` action adds boosters mid-game (used by booster_pack contextual offer which grants 1 of each for 15 gems). First-ever booster use triggers a `first_booster` ceremony (tracked via `tooltipsShown`)
- **Portrait orientation only** (set in app.json)
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
- **Ceremony queue** (`player.pendingCeremonies`) is processed in App.tsx via a `useEffect` that watches `player.pendingCeremonies.length` — fires first ceremony immediately when new ones are queued (e.g. after `handleComplete`), chains subsequent ones via `handleDismissCeremony` with 300ms delay. 18 ceremony types fire one at a time. Some ceremonies are queued in `handleComplete` (App.tsx), others directly inside `PlayerContext` `setData()` callbacks
- **Player stage** (`new`/`early`/`established`/`veteran`) is computed from `puzzlesSolved` (0-2/3-10/11-30/31+) and controls HomeScreen section visibility
- **Breather levels** activate after 2+ consecutive failures via `player.needsBreather()` — `getBreatherConfig(level)` drops difficulty back ~4 levels. Additionally, every 5th level in the normal curve is inherently easier
- **Tooltips** are tracked in `player.tooltipsShown: string[]` and persist across sessions — each screen checks its ID on mount. Also used for one-time event tracking (e.g. `'first_booster_used'`)
- **Weekly goals** reset on Monday — `isNewWeek()` in weeklyGoals.ts detects week boundaries, `initWeeklyGoals()` generates 3 new goals
- **Friend comparison** on PuzzleComplete uses mock random data — the `{ beaten: number; total: number }` structure is ready for Firestore integration
- **Mastery track** uses `puzzlesSolved * 100` as XP proxy — replace with real XP tracking when needed
- **Chapters have 15 puzzles each** — 40 chapters × 15 puzzles = 600 total puzzles per GDD
- **Atlas pages have 10 words each** — within GDD's 8-12 range; duplicates increment per-word mastery counter (max 5 = gold border)
- **Seasonal stamp albums have 20 stamps each** — 4 seasons per GDD
- **Rare tile pity timer** guarantees a tile drop within 10 puzzles (`COLLECTION.rareTilePityTimer`)
- **Rare tile recycling** — 5 duplicate tiles = 1 wildcard tile (`COLLECTION.duplicatesForWildcard`). Crossing the threshold triggers a `wildcard_earned` ceremony
- **Grace days** limited to 1 per streak, auto-applied in `updateStreak` when exactly 1 day is missed (`diffDays === 2`). `graceDaysUsed` resets to 0 when streak breaks (missed 2+ consecutive days). GDD: "Missing one day doesn't break streak, missing 2 consecutive days resets"
- **Comeback rewards** at 3/7/30 day absence thresholds (was 3/7/14, fixed to match GDD)
- **Club settings** — `CLUB.autoKickInactiveDays = 14`, `CLUB.maxMembers = 30`
- **Gifting limits** — 1 hint gift/day, 3 tile gifts/day, tracked with daily reset
- **Daily Value Pack** gated to `availableAfterDay: 3` per GDD; `autoEnds: true`
- **Starter Pack** includes exclusive decoration (`starter_bookend`) per GDD
- **Chapter Bundle** includes 1 Board Preview booster per GDD
- **Star rating** uses `hintsUsed` counter + move efficiency: 3★ = no hints + moves ≤ wordCount, 2★ = ≤1 hint + moves ≤ wordCount+1, 1★ = otherwise
- **`.env.example`** documents all required Firebase env vars; `.env` files are gitignored
- **`eas.json`** provides development/preview/production build profiles
- **Difficulty curve is smooth, not a staircase** — `getLevelConfig(level)` returns per-level `BoardConfig` across 12 phases. Every 5th level is a breather (drops back ~2 levels). The old 4-tier staircase (cliff at level 6/16/31) has been replaced. `DIFFICULTY_CONFIGS` still exists for reference but is no longer used by `getLevelConfig`
- **Mystery Wheel state** persisted in `PlayerContext.mysteryWheel` — tracks `spinsAvailable`, `puzzlesSinceLastSpin`, `totalSpins`, `lastJackpotSpin`, `jackpotPity` (25). Free spin awarded every 8 puzzles via `awardFreeSpin()`. Post-puzzle spin prompt only fires when a NEW spin is earned during that puzzle completion (not for old unused spins). HomeScreen wheel button visible for all non-new players (moved out of regular/hardcore-only segment gate). Wheel logic in `src/data/mysteryWheel.ts`, UI in `src/components/MysteryWheel.tsx`
- **Win streak state** persisted in `PlayerContext.winStreak` — tracks `currentStreak`, `bestStreak`, `lastWinDate`, `rewardsClaimed`. Updated via `updateWinStreak(won)`. Milestone ceremonies at 3/5/7/10/15/20 queued directly in `setData`
- **Event layering** enables multiple simultaneous events — main weekly event + mini events (every ~3 days) + weekend blitz (auto Sat/Sun) + win streak + partner events (Firestore scaffold). Data in `src/data/eventLayers.ts`
- **Notification service** in `src/services/notifications.ts` is real (not scaffold). Uses `expo-notifications` with permission handling, Android channels, and segment-aware scheduling
- **Contextual offers** are fully wired to triggers: hint_rescue in GameScreen after 2+ fails, close_finish when 1 word left + stuck/idle, post_puzzle when hints depleted, streak_shield on HomeScreen when streak at risk, booster_pack on hard/expert entry. Max 1 offer per level
- **Analytics** in `src/services/analytics.ts` is real (not no-op). Dual-mode: Firebase when configured, local AsyncStorage fallback. Includes A/B testing via `getVariant()` with deterministic hash
- **IAP** in `src/services/iap.ts` uses `react-native-iap`. Mock mode auto-activates in dev/Expo Go. Init checks `NativeModules` for the IAP native module before importing to prevent EventEmitter crash. Parental controls enforced before every purchase via SettingsContext
- **Ads** in `src/services/ads.ts` uses AdMob when available, otherwise MockAdModal (5s countdown with claim). `isAdFree` flag in EconomyContext disables all ads
- **Firestore** in `src/services/firestore.ts` handles all social operations. Every method has try/catch returning defaults on failure. App works identically offline
- **Puzzle energy** is a soft system (NOT a hard wall). Daily/endless/relax modes are always free. 3 bonus plays after zero energy. Energy display in UI when relevant
- **Adaptive difficulty** in `src/engine/difficultyAdjuster.ts` is invisible to the player. Never shows "we made this easier." Requires 5+ recent results before activating
- **Player segmentation** recomputes on every app open. Drives offer timing, difficulty, home content, notifications. Segments persisted in PlayerContext
- **Solve replay** records every SUBMIT_WORD in `solveSequence` with grid snapshots. ReplayViewer has animated playback. Emoji grid generated via `replayGenerator.ts`
- **Friend challenges** stored locally in PlayerContext.friendChallenges. Shared via Share API with challenge codes. Will upgrade to Firestore delivery when backend is configured
- **Event multipliers** from eventManager are applied to coin/xp/rare-tile rewards in handleComplete. Only the highest multiplier per type is used (not stacked multiplicatively). Active multiplier labels shown in UI
- **`FIRESTORE_SOCIAL_GUIDE.md`** contains complete Firestore implementation plan — schemas for users/friendships/gifts/clubs/leaderboards/partnerEvents/globalEvents, security rules, Cloud Functions, 4-phase migration plan, cost estimates ($15-20/month at 10K DAU)

### Performance Architecture
- **All tile animations use `useNativeDriver: true`** — animations run on the native thread, not blocking JS. Only animate `transform` and `opacity` (no `borderColor`, `shadowOpacity`, or layout-affecting styles via Animated)
- **No continuous animation loops on idle tiles** — only selected/moved tiles run short one-shot animations. Idle tiles have zero overlay layers (no innerGlow, specular, shimmer)
- **`isDeadEnd` solver is deferred** — runs via `setTimeout` in a `useEffect` after words are found, not synchronously in the render path. The solver's recursive DFS is too expensive for per-render execution
- **`findWordInGrid` supports a `limit` parameter** — pass `limit=1` when only existence matters (hint, dead-end check) to avoid finding all occurrences
- **Gesture objects memoized** — Grid.tsx wraps gesture creation in `useMemo` with callback refs, per React Native Gesture Handler best practices
- **Computed game values cached** — `currentWord`, `remainingWords`, `isValidWord` all use `useMemo` in `useGame` hook
- **Timer interval stable** — timePressure timer `useEffect` only depends on `mode` and `state.status`, not `state.timeRemaining`, using a ref to check status inside the interval
- **Grid sizing is dual-dimension** — `cellSize` uses `Math.min(widthBased, heightBased)` via `maxHeight` prop measured by `onLayout` in GameScreen, preventing grid overflow behind booster buttons on tall boards
- **Stable layout architecture** — GameScreen uses absolute-positioned overlays for banners (cascade, freeze, idle hint, mode intro) so they never shift the grid. WordArea has fixed height (90px), boosterBar always reserves space. `gridAreaHeight` updates are debounced (2px threshold) to prevent cascading re-renders from sub-pixel layout shifts
- **Board generation uses heuristic-first validation** — `boardGenerator.ts` checks each word is individually findable via fast DFS before invoking the expensive recursive backtracking solver. This avoids exponential blowup on larger boards (was causing 10+ second hangs on 6×6+ grids)
- **When adding new animations**: always use `useNativeDriver: true`, avoid `Animated.loop` on per-tile components, prefer one-shot animations that complete and settle
- **When modifying tiles**: do NOT add semi-transparent overlay Views or LinearGradients on top of the base tile gradient — these create visible lighter rectangles. Keep tile rendering minimal: base gradient + bottom shadow + letter text
