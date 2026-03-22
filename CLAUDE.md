# Wordfall - AI Agent Context

## Project Overview

Wordfall is a gravity-based strategic word puzzle mobile game built with **React Native + Expo**. Players find hidden words on a letter grid; when a word is cleared, letters above fall due to gravity, creating chain opportunities. The game features 10 modes, 40 chapters, collections, social features, a library meta-game, and a full player experience layer (interactive tutorial, progressive disclosure, ceremony system, achievements, weekly goals, mastery track, shareable results).

- **Framework:** React Native 0.77.3, Expo ~54.0.0, TypeScript ~5.8.0
- **Backend:** Firebase (Auth + Firestore) - scaffolded, env vars needed
- **State:** React Context (4 providers) + useReducer for game state + AsyncStorage persistence
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
├── services/         # Singletons: sound (expo-av), haptics (expo-haptics), analytics
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
│   ├── SessionEndReminder.tsx                   # Auto-dismissing daily/streak reminder
│   ├── common/       # Button, Card, Modal, Badge, ProgressBar, AmbientBackdrop, HeroIllustrations, Tooltip
│   ├── economy/      # CurrencyDisplay, ShopItem
│   ├── modes/        # TimerDisplay, MoveCounter
│   └── events/       # EventBanner, EventProgress
├── screens/          # 13 screens (Home, Game, Modes, Collections, Library, Profile, Settings, Shop, Club, Leaderboard, Event, Onboarding, Mastery)
├── navigation/       # AppNavigator (not used directly - App.tsx handles nav)
├── config/           # firebase.ts
├── data/             # Static game data
│   ├── chapters.ts, collections.ts, cosmetics.ts, events.ts, missions.ts  # Original data
│   ├── tutorialBoards.ts    # Fixed tutorial board layout + guided steps
│   ├── achievements.ts      # 15 achievements with bronze/silver/gold tiers
│   ├── weeklyGoals.ts       # Weekly goal templates + generation logic
│   └── masteryRewards.ts    # 30-tier season pass reward definitions
├── utils/
│   └── shareGenerator.ts    # Wordle-style shareable emoji grid generator
├── types.ts          # All TypeScript interfaces and type unions
├── constants.ts      # Colors, gradients, shadows, configs, scoring, economy, feature unlock schedule
└── words.ts          # Word dictionary (~2000 curated 3-6 letter words)
```

### Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Entry point. Progressive tab unlocking, nested stack navigators, provider wrappers, full reward/progression/mission wiring, ceremony queue processing, welcome-back modal, feature unlock detection, achievement/weekly goal progress, breather level support, personalized recommendations |
| `src/types.ts` | ALL type definitions including `FeatureUnlockId`, `WeeklyGoal`, `WeeklyGoalsState`, `CeremonyItem`. Edit here when adding new data structures |
| `src/constants.ts` | Colors, `GRADIENTS`, `SHADOWS`, difficulty configs, mode configs, scoring, economy, `FEATURE_UNLOCK_SCHEDULE`, `getBreatherConfig()`, `STREAK` milestones |
| `src/contexts/PlayerContext.tsx` | Master player data hub: progress, collections, missions, streaks, cosmetics, library, modes, comebacks, **plus**: `featuresUnlocked`, `weeklyGoals`, `pendingCeremonies`, `tooltipsShown`, `failCountByLevel`, `consecutiveFailures`, `wordsFoundTotal`, `modesPlayedThisWeek`. Methods: `unlockFeature`, `checkFeatureUnlocks`, `markTooltipShown`, `initWeeklyGoals`, `updateWeeklyGoalProgress`, `queueCeremony`, `popCeremony`, `recordFailure`, `needsBreather`, `checkAchievements` |
| `src/hooks/useGame.ts` | Core game state reducer - handles 15+ game actions including boosters. Timer tick for timePressure mode runs here. Computed values (`currentWord`, `remainingWords`, `isValidWord`) cached with `useMemo`. `isDeadEnd` computed via deferred `useEffect` (not in render path) to avoid blocking the UI thread with the expensive solver |
| `src/engine/boardGenerator.ts` | Puzzle generation with seeded PRNG, freeform path placement (8-directional), and solvability validation |
| `src/engine/gravity.ts` | Column-based gravity physics (letters fall down), frozen column support |
| `src/engine/solver.ts` | 8-directional DFS word finder, recursive backtracking solver, dead-end detection, hint generation. `findWordInGrid` supports optional `limit` parameter for early termination. `getHint` uses solution ordering directly without redundant re-solve |
| `src/components/PuzzleComplete.tsx` | Victory screen with confetti (16 particles), animated score counter, staggered reveals inside a `ScrollView` with `maxHeight` constraint. **Plus**: `isFirstWin` welcome, `leveledUp` badge, `difficultyTransition` ceremony, `nextLevelPreview`, `shareText` with Share API, `friendComparison` mock display |
| `src/components/Grid.tsx` | Column-based grid renderer with gravity layout, responsive sizing via `maxHeight` prop (cell size constrained by both width and available height), drag-to-select via react-native-gesture-handler (gesture objects memoized with `useMemo`, callbacks via refs), frozen column styling, post-gravity moved-cell highlighting. LetterCell receives no `onPress` — all input handled by grid-level gesture detector |
| `src/screens/GameScreen.tsx` | Main gameplay screen: green flash, chain popup, score popup, dynamic idle hint (adjusts by fail count), mode intro, stuck UX, boosters, near-miss encouragement on failure with progress bar. Measures grid area via `onLayout` and passes `maxHeight` to GameGrid for responsive sizing. `handleCellPress` delegates adjacency checks to the reducer |
| `src/screens/HomeScreen.tsx` | Dynamic home screen with progressive section visibility based on `playerStage` (new/early/established/veteran). Sections: hero card, streak, daily rewards, weekly goals, mission progress, personalized recommendations, quick play |
| `src/screens/OnboardingScreen.tsx` | 4-phase interactive tutorial: welcome → guided tutorial puzzle (real GameGrid + TutorialOverlay) → celebration → ready screen with tips |
| `src/screens/ProfileScreen.tsx` | Player profile with stats grid, achievements grid (15 achievements × 3 tiers with colored dots), collection progress, cosmetics |
| `src/screens/MasteryScreen.tsx` | Season pass / mastery track with 30 tiers, free + premium reward lanes, XP progress |
| `src/screens/ModesScreen.tsx` | Game mode grid with first-visit tooltip via `Tooltip` component |
| `src/screens/CollectionsScreen.tsx` | Atlas/Tiles/Stamps tabs with first-visit tooltip |
| `src/screens/LibraryScreen.tsx` | Library wings with first-visit tooltip |
| `src/data/tutorialBoards.ts` | Fixed 5×4 tutorial board (CAT, DOG, SUN) + `TUTORIAL_STEPS` with highlight positions and guided actions |
| `src/data/achievements.ts` | 15 `AchievementDef` entries across 5 categories (puzzle, collection, streak, mode, mastery), each with bronze/silver/gold tiers |
| `src/data/weeklyGoals.ts` | 8 goal templates, `generateWeeklyGoals()` picks 3 per week, `isNewWeek()` utility |
| `src/data/masteryRewards.ts` | 30 `MasteryReward` tiers with free/premium lanes, `getMasteryTierForXP()`, `getXPProgressInTier()` |
| `src/utils/shareGenerator.ts` | `generateShareText()` converts grid + score into Wordle-style emoji grid for sharing |
| `src/components/common/Tooltip.tsx` | Reusable contextual tooltip with glassmorphism styling, arrow, auto-dismiss persistence via `player.markTooltipShown()` |
| `GAME_DESIGN_DOCUMENT.md` | Full 48KB GDD with 17 sections - the source of truth for features |

### State Management

- **Game state:** `useGame` hook with `useReducer` in `GameScreen`. Actions: SELECT_CELL, CLEAR_SELECTION, SUBMIT_WORD, USE_HINT, UNDO_MOVE, NEW_GAME, RESET_COMBO, TICK_TIMER, SHUFFLE_FILLER, FREEZE_COLUMN, PREVIEW_MOVE, USE_BOOSTER. State includes `frozenColumns`, `previewGrid`, `boosterCounts`, `cascadeMultiplier`, `perfectRun`, `maxCombo`, `history` (for undo).
- **Player data:** `PlayerContext` - progress, collections (atlas/tiles/stamps), missions, streaks (with grace days + shield + milestone ceremonies), cosmetics, library wings, mode stats, achievements, comebacks, **plus**: feature unlock tracking (`featuresUnlocked`), weekly goals, ceremony queue (`pendingCeremonies`), tooltip tracking (`tooltipsShown`), failure tracking (`failCountByLevel`, `consecutiveFailures`), and breather level detection. Persisted to AsyncStorage.
- **Economy:** `EconomyContext` - coins, gems, hintTokens, eventStars, libraryPoints. Add/spend/check methods. Persisted to AsyncStorage.
- **Settings:** `SettingsContext` - volume (SFX + music), haptics, notifications, theme (5 themes). Persisted to AsyncStorage.
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
- **Idle hint prompt**: Dynamic timer based on fail count (20s default → 15s after 1 failure → 10s after 2+), tappable banner suggesting a hint
- **Mode intro banner**: 2.5-second banner on game start for non-classic modes (e.g. "No mistakes allowed!")
- **Near-miss encouragement**: On failure, shows "SO CLOSE!" (1 word away) or "KEEP GOING!" with progress bar and word count, plus prominent retry button

### Boosters
Three booster types available during gameplay:
- **Freeze Column** (❄️): Prevents gravity from affecting a selected column for one move
- **Board Preview** (👁️): Shows what the board will look like after submitting the current selection
- **Shuffle Filler** (🔀): Randomizes non-word filler letters on the board

### Board Generation
- Uses Mulberry32 seeded PRNG for reproducible puzzles
- Words placed along random adjacent paths (any direction: horizontal, vertical, diagonal, zigzag) via DFS with randomized neighbor order
- Each letter in a word must be 8-directionally adjacent to the previous letter, but the path can change direction freely (e.g., right → diagonal-down-left → down → diagonal-up-right)
- All puzzles validated by solver to ensure solvability (solver uses same 8-directional DFS to find words)
- Filler letters use vowel-balanced distribution (35% vowels)
- 3-tier fallback: standard → simplified → minimal generation on failure

### 10 Game Modes
| Mode | Key Rule | Unlock Level |
|------|----------|-------------|
| `classic` | Standard play | 1 |
| `limitedMoves` | N moves only | 5 |
| `timePressure` | Countdown timer (auto-tick in useGame) | 8 |
| `perfectSolve` | Zero mistakes, no hints/undos | 10 |
| `cascade` | Score multiplier +0.25x per word | 12 |
| `daily` | Same puzzle for all players (date-seeded) | 1 |
| `weekly` | Harder curated puzzle, 7-day window | 15 |
| `endless` | Procedural, no level gating | 3 |
| `expert` | No hints, no undo, harder boards | 20 |
| `relax` | Unlimited undos, gentle puzzles | 1 |

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

**Audio is synthesized at runtime** — `SoundManager` (`src/services/sound.ts`) generates tones and chords programmatically (sine waves via WAV data URIs loaded into expo-av). No `.mp3`/`.wav` asset files needed. Sound effects use `ToneSpec` definitions (frequency arrays + duration), background music uses `ProgressionSpec` (chord progressions looped with crossfade). All sounds are functional — replace with real assets by swapping `Audio.Sound.createAsync()` calls.

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
- **Collection completion**: Checks if puzzle words completed an Atlas page, queues `CollectionCompleteCeremony`
- **Share text generation**: Generates Wordle-style emoji grid via `generateShareText()`
- **Friend comparison**: Generates mock friend score data (Firestore-ready structure)
- **Failure tracking**: Records failures via `player.recordFailure()` for breather level and dynamic hint support

### Ceremony Queue System

Ceremonies (modals) are queued via `player.queueCeremony()` and processed sequentially in `HomeMainScreen`. Types: `feature_unlock`, `mode_unlock`, `achievement`, `streak_milestone`, `collection_complete`. Each ceremony has a dedicated component with animations, rewards display, and dismiss/action buttons. When one is dismissed, the next in the queue fires after 300ms.

### Breather Level System

After 2+ consecutive failures or a 1-star clear, `player.needsBreather()` returns true. `App.tsx` `startGame()` and `handleNextLevel()` check this and use `getBreatherConfig(level)` to serve an easier board (fewer words, smaller grid, lower difficulty).

Welcome-back modal in `HomeMainScreen` awards tiered comeback rewards (3-day/7-day/14-day absence) with animated card UI instead of basic alert.

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
- **Glassmorphism cards**: Cards use gradient backgrounds + subtle inner glow overlays (`rgba` border + shadow) for depth
- **Ambient backdrops**: All screens use `<AmbientBackdrop variant="home|library|game|..." />` for floating animated orb backgrounds (10 twinkling stars + 2 nebula orbs, all `useNativeDriver: true`)
- **Hero illustrations**: Home and Library screens have decorative `<HomeHeroIllustration />` / `<LibraryHeroIllustration />` components built from Views + gradients (no image assets)
- **Screen top padding**: All screens use `paddingTop: 60` in their `content` style to clear the status bar / safe area consistently
- **Section layout**: Screens follow a pattern of hero card → section panels, each with `borderRadius: 20-28`, gradient fill, and `SHADOWS.medium`
- **Accent borders**: Highlighted/active items use thin accent-colored borders with matching glow shadow via `SHADOWS.glow(COLORS.accent)`

### Grid Layout
- Flex-end columns for gravity visualization
- Cell touch targets: 44pt minimum
- Grid padding: 12px, cell gap: 4px
- Cell size computed dynamically based on column count, screen width, and available height (`Math.min(widthBased, heightBased)` when `maxHeight` prop is provided via `onLayout` measurement)
- Grid has gradient background (`GRADIENTS.grid`), 16px border radius, accent gradient border

### Animations & Visual Feedback
All tile animations use `useNativeDriver: true` for native-thread execution. No continuous animation loops run on idle tiles (shimmer and pulse loops removed for performance).
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
- 12-week rotating event calendar (10 event types)
- 22 daily mission templates with progress tracking wired
- 50+ cosmetic items (12 themes, 15 frames, 18 titles, 24 decorations)
- Economy system with full reward wiring (coins, gems, library points, rare tiles on puzzle complete)
- Atlas word collection against all 12 pages
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
- TypeScript compiles with zero errors (gradient color tuple types corrected across Button.tsx, ClubScreen.tsx, EventScreen.tsx, OnboardingScreen.tsx)

#### Player Experience Systems (all complete)
- **Interactive tutorial**: 4-phase onboarding (welcome → guided puzzle with TutorialOverlay → celebration → ready). Players tap highlighted cells on a real GameGrid to find CAT, DOG, SUN
- **Progressive disclosure**: Dynamic HomeScreen sections based on `playerStage` (new/early/established/veteran). Streak hidden until 3 puzzles, quick play until established, weekly goals/missions for established+
- **Ceremony queue**: Sequential modal system for level-ups, mode unlocks, feature unlocks, achievements, streak milestones, collection completions. Queued in PlayerContext, processed in HomeMainScreen
- **First-win celebration**: Special "WELCOME TO WORDFALL!" badge on PuzzleComplete for `puzzlesSolved === 0`
- **Level-up celebration**: "LEVEL UP!" badge with level number on PuzzleComplete
- **Difficulty transition ceremony**: "New Challenge Tier!" badge when crossing easy→medium→hard→expert thresholds
- **Mode unlock ceremonies**: Animated modal when modes unlock via level progression
- **Feature unlock ceremonies**: Full-screen modal when tabs/features unlock
- **Achievement system**: 15 achievements × 3 tiers (bronze/silver/gold) with ceremony modals, profile grid display with colored tier dots
- **Weekly goals**: 3 goals per week from 8 templates, progress tracking, reward tiers, panel on HomeScreen
- **Streak milestone ceremonies**: Fires at 7/14/30/60/100 day milestones with rewards from `STREAK.milestoneRewards`
- **Collection completion ceremonies**: Modal when Atlas page or rare tile set completed
- **Shareable results**: Wordle-style emoji grid via `Share` API on PuzzleComplete
- **Friend score comparison**: "You beat X of Y friends!" display on PuzzleComplete (mock data, Firestore-ready)
- **Post-puzzle next level preview**: "COMING UP" section showing next level number + difficulty
- **Near-miss encouragement**: On failure, "SO CLOSE!" or "KEEP GOING!" with progress bar and prominent retry
- **Breather levels**: After 2+ consecutive failures, serves easier board via `getBreatherConfig()`
- **Dynamic hint generosity**: Idle hint timer adjusts by fail count (20s → 15s → 10s)
- **Personalized recommendations**: "Recommended for You" card on HomeScreen suggesting untried modes, daily challenge, or harder difficulty
- **Contextual tooltips**: First-visit tooltips on Modes, Collections, Library screens via `Tooltip` component + `tooltipsShown` tracking
- **Session end reminders**: Auto-dismissing banner when navigating home with incomplete daily
- **Mastery track**: 30-tier season pass with free/premium reward lanes, XP-based progression

### Scaffolded / Needs Work
- Professional audio assets — current synthesized tones are functional but could be replaced with studio-quality .mp3/.wav files
- Image assets (app icon, splash screen) — using emoji placeholders for icons; hero illustrations are code-generated Views
- Firebase Cloud Functions (server-side scheduled tasks)
- Actual Firestore sync (currently AsyncStorage only) — friend comparison data is mock, ready for Firestore
- Real-time leaderboard computation
- IAP integration (expo-in-app-purchases) — Shop UI is complete, Mastery premium track is UI-only
- Ad integration (rewarded ads for hints)
- Push notifications
- Friend challenge matchmaking
- Club chat real-time messaging
- Analytics service (wired but no-op - no actual tracking)
- End-to-end testing
- Deep linking

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
1. Create `src/components/MyCeremony.tsx` — full-screen animated modal with glassmorphism card, icon, title, rewards, dismiss button
2. Add ceremony type string to `CeremonyItem['type']` union in `src/types.ts`
3. Queue it via `player.queueCeremony({ type: 'my_ceremony', data: {...} })` from wherever it's triggered (usually `handleComplete` in App.tsx)
4. Render it in `HomeMainScreen` inside the ceremony switch: `{activeCeremony?.type === 'my_ceremony' && <MyCeremony ... onDismiss={handleDismissCeremony} />}`

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
- **Asset-based (upgrade path):** Replace the WAV-generation logic in `SoundManager.init()` with `Audio.Sound.createAsync(require('./path.mp3'))` — all callsites use the same `SoundName` keys and will work immediately

## Important Notes

- **No energy walls** on core play - ethical F2P design
- **Hints/undos are consumables** (3 each per puzzle by default, purchasable)
- **Boosters** (freezeColumn, boardPreview, shuffleFiller) are per-puzzle consumables tracked in `boosterCounts`
- **Portrait orientation only** (set in app.json)
- **Dark mode only** - no light theme (5 dark theme variants in cosmetics)
- **`--legacy-peer-deps` required** for npm install due to React Navigation peer dep conflicts
- **Screens use default exports**, not named exports
- **`AppNavigator.tsx`** in `src/navigation/` is NOT used - `App.tsx` handles all navigation directly
- **Firebase env vars** must be set as `EXPO_PUBLIC_FIREBASE_*` for the app to connect (currently placeholders)
- **Word database** in `src/words.ts` contains ~2000 curated English words (3-6 letters)
- **Seeded PRNG** ensures daily puzzles are identical for all players on the same day
- **Timer tick** for timePressure mode runs inside `useGame` hook, not in the screen
- **Adjacency validation** uses 8-directional adjacency (horizontal, vertical, diagonal) with no direction locking — paths can zigzag freely. Adjacency is checked in the `SELECT_CELL` reducer action; non-adjacent taps start a new selection from the tapped cell
- **Drag selection** is handled by `react-native-gesture-handler` PanGesture on the Grid — players can drag across tiles to select them. Gesture objects are memoized with `useMemo` and use refs for callbacks to avoid reattachment on re-renders. `GestureHandlerRootView` wraps the app in `App.tsx`
- **LetterCell has no `onPress` prop** — all touch input is handled by the grid-level gesture detector via hit testing. LetterCell is purely presentational (wrapped in `React.memo`)
- **Mode auto-unlock** happens in `App.tsx` `handleComplete` based on `MODE_CONFIGS[mode].unlockLevel`, with `ModeUnlockCeremony` modal
- **Progressive tab unlocking** is controlled by `FEATURE_UNLOCK_SCHEDULE` in constants.ts and `player.featuresUnlocked` array — Collections at level 5, Library at level 8
- **Ceremony queue** (`player.pendingCeremonies`) is processed in `HomeMainScreen` — ceremonies fire one at a time with 300ms delay between dismissals
- **Player stage** (`new`/`early`/`established`/`veteran`) is computed from `puzzlesSolved` (0-2/3-10/11-30/31+) and controls HomeScreen section visibility
- **Breather levels** activate after 2+ consecutive failures via `player.needsBreather()` — serves easier config from `getBreatherConfig()`
- **Tooltips** are tracked in `player.tooltipsShown: string[]` and persist across sessions — each screen checks its ID on mount
- **Weekly goals** reset on Monday — `isNewWeek()` in weeklyGoals.ts detects week boundaries, `initWeeklyGoals()` generates 3 new goals
- **Friend comparison** on PuzzleComplete uses mock random data — the `{ beaten: number; total: number }` structure is ready for Firestore integration
- **Mastery track** uses `puzzlesSolved * 100` as XP proxy — replace with real XP tracking when needed

### Performance Architecture
- **All tile animations use `useNativeDriver: true`** — animations run on the native thread, not blocking JS. Only animate `transform` and `opacity` (no `borderColor`, `shadowOpacity`, or layout-affecting styles via Animated)
- **No continuous animation loops on idle tiles** — shimmer and pulse loops were removed. Only selected/moved tiles run short one-shot animations
- **`isDeadEnd` solver is deferred** — runs via `setTimeout` in a `useEffect` after words are found, not synchronously in the render path. The solver's recursive DFS is too expensive for per-render execution
- **`findWordInGrid` supports a `limit` parameter** — pass `limit=1` when only existence matters (hint, dead-end check) to avoid finding all occurrences
- **Gesture objects memoized** — Grid.tsx wraps gesture creation in `useMemo` with callback refs, per React Native Gesture Handler best practices
- **Computed game values cached** — `currentWord`, `remainingWords`, `isValidWord` all use `useMemo` in `useGame` hook
- **Timer interval stable** — timePressure timer `useEffect` only depends on `mode` and `state.status`, not `state.timeRemaining`, using a ref to check status inside the interval
- **Grid sizing is dual-dimension** — `cellSize` uses `Math.min(widthBased, heightBased)` via `maxHeight` prop measured by `onLayout` in GameScreen, preventing grid overflow behind booster buttons on tall boards
- **When adding new animations**: always use `useNativeDriver: true`, avoid `Animated.loop` on per-tile components, prefer one-shot animations that complete and settle
