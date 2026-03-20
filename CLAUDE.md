# Wordfall - AI Agent Context

## Project Overview

Wordfall is a gravity-based strategic word puzzle mobile game built with **React Native + Expo**. Players find hidden words on a letter grid; when a word is cleared, letters above fall due to gravity, creating chain opportunities. The game features 10 modes, 40 chapters, collections, social features, and a library meta-game.

- **Framework:** React Native 0.77.3, Expo ~54.0.0, TypeScript ~5.8.0
- **Backend:** Firebase (Auth + Firestore) - scaffolded, env vars needed
- **State:** React Context (4 providers) + useReducer for game state + AsyncStorage persistence
- **Navigation:** React Navigation (bottom tabs + nested stacks)

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
│   ├── GameHeader.tsx, PuzzleComplete.tsx      # Game UI
│   ├── common/       # Button, Card, Modal, Badge, ProgressBar
│   ├── economy/      # CurrencyDisplay, ShopItem
│   ├── modes/        # TimerDisplay, MoveCounter
│   └── events/       # EventBanner, EventProgress
├── screens/          # 12 screens (Home, Game, Modes, Collections, Library, Profile, Settings, Shop, Club, Leaderboard, Event, Onboarding)
├── navigation/       # AppNavigator (not used directly - App.tsx handles nav)
├── config/           # firebase.ts
├── data/             # Static game data (chapters, collections, cosmetics, events, missions)
├── types.ts          # All TypeScript interfaces and type unions (~520 lines)
├── constants.ts      # Colors, configs, scoring, economy, animations (~446 lines)
└── words.ts          # Word dictionary (~2000 curated 3-6 letter words)
```

### Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Entry point. 5 bottom tabs (🏠🎮💎📚👤), nested stack navigators, provider wrappers, full reward/progression/mission wiring, welcome-back modal, auto mode-unlock |
| `src/types.ts` | ALL type definitions. Edit here when adding new data structures |
| `src/constants.ts` | Colors, difficulty configs, mode configs, scoring, economy, animations |
| `src/hooks/useGame.ts` | Core game state reducer - handles 15+ game actions including boosters. Timer tick for timePressure mode runs here |
| `src/engine/boardGenerator.ts` | Puzzle generation with seeded PRNG and solvability validation |
| `src/engine/gravity.ts` | Column-based gravity physics (letters fall down), frozen column support |
| `src/engine/solver.ts` | Recursive backtracking solver, dead-end detection, hint generation |
| `src/contexts/PlayerContext.tsx` | Master player data hub (progress, collections, missions, streaks, cosmetics, library, modes, comebacks) |
| `src/components/PuzzleComplete.tsx` | Victory screen with confetti particles, animated score counter, staggered reveals |
| `src/components/WordBank.tsx` | Animated word chips with celebration scale, glow pulse, valid word state |
| `src/components/Grid.tsx` | Column-based grid renderer with gravity layout, frozen column styling, post-gravity moved-cell highlighting |
| `src/components/LetterCell.tsx` | Individual cell with selection animation, glow, valid-word green, frozen indicator, moved-cell trail |
| `src/screens/GameScreen.tsx` | Main gameplay screen with all visual feedback: green/red flash, chain popup, score popup, idle hint, mode intro, stuck UX, boosters |
| `src/data/collections.ts` | 12 Word Atlas pages, 6 rare tile sets, 4 seasonal albums |
| `src/data/chapters.ts` | 40 chapters across 8 library wings with themed words |
| `src/data/cosmetics.ts` | 12 color themes, 15 frames, 18 titles, 24 library decorations |
| `src/data/events.ts` | 12-week rotating event calendar (10 event types) |
| `src/data/missions.ts` | 22 daily mission templates with weighted random selection |
| `GAME_DESIGN_DOCUMENT.md` | Full 48KB GDD with 17 sections - the source of truth for features |

### State Management

- **Game state:** `useGame` hook with `useReducer` in `GameScreen`. Actions: SELECT_CELL, CLEAR_SELECTION, SUBMIT_WORD, USE_HINT, UNDO_MOVE, NEW_GAME, RESET_COMBO, TICK_TIMER, SHUFFLE_FILLER, FREEZE_COLUMN, PREVIEW_MOVE, USE_BOOSTER. State includes `frozenColumns`, `previewGrid`, `boosterCounts`, `cascadeMultiplier`, `perfectRun`, `maxCombo`, `history` (for undo).
- **Player data:** `PlayerContext` - progress, collections (atlas/tiles/stamps), missions, streaks (with grace days + shield), cosmetics, library wings, mode stats, achievements, comebacks. Persisted to AsyncStorage.
- **Economy:** `EconomyContext` - coins, gems, hintTokens, eventStars, libraryPoints. Add/spend/check methods. Persisted to AsyncStorage.
- **Settings:** `SettingsContext` - volume (SFX + music), haptics, notifications, theme (5 themes). Persisted to AsyncStorage.
- **Auth:** `AuthContext` - Firebase anonymous auth with loading state.

### Navigation Structure

```
App.tsx (RootStack)
├── MainTabs (Bottom Tab Navigator)
│   ├── Home 🏠 (HomeStack) → HomeMain, Shop, Settings, Game
│   ├── Play 🎮 (PlayStack) → Modes, Game, Event, Leaderboard
│   ├── Collections 💎 (CollectionsStack) → CollectionsMain
│   ├── Library 📚 (LibraryStack) → LibraryMain
│   └── Profile 👤 (ProfileStack) → ProfileMain, Settings, Club
└── Onboarding (shown once for new users, 5-step flow)
```

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
2. Tap letters in sequence (horizontal or vertical adjacency only) to spell words
3. Non-adjacent taps trigger red flash + error haptic and clear selection
4. When a valid word is selected, cells turn green with checkmarks and auto-submit after 400ms
5. Cleared letters disappear; letters above fall due to gravity (with LayoutAnimation)
6. Post-gravity: cells that shifted position glow briefly with cyan trail (400ms fade)
7. Score popup floats up showing points earned (with combo multiplier display)
8. Chain celebrations ("2x CHAIN!") appear with screen shake on consecutive word finds
9. Find all words to trigger victory screen with confetti, animated score counter, and star reveals

### Visual Feedback System
- **Green flash overlay**: 200ms on valid word match, before auto-submit
- **Red flash overlay**: 100ms→200ms fade on invalid adjacency tap
- **Chain popup**: Spring-scaled "Nx CHAIN!" with screen shake (3px oscillation)
- **Score popup**: "+150 (2x!)" springs in, holds 600ms, floats up and fades out
- **Post-gravity highlight**: Moved cells get cyan border glow that fades over 400ms
- **Idle hint prompt**: After 20 seconds of inactivity, tappable banner appears suggesting a hint
- **Mode intro banner**: 2.5-second banner on game start for non-classic modes (e.g. "No mistakes allowed!")
- **Stuck detection**: After 1.5 seconds in dead-end state, shows banner with inline undo button

### Boosters
Three booster types available during gameplay:
- **Freeze Column** (❄️): Prevents gravity from affecting a selected column for one move
- **Board Preview** (👁️): Shows what the board will look like after submitting the current selection
- **Shuffle Filler** (🔀): Randomizes non-word filler letters on the board

### Board Generation
- Uses Mulberry32 seeded PRNG for reproducible puzzles
- Words placed via recursive backtracking with overlap at matching letters
- All puzzles validated by solver to ensure solvability
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

**Audio assets not yet provided** - `SoundManager` (`src/services/sound.ts`) is a no-op placeholder. When `.mp3` files are added and loaded in the sound manager, all calls will work immediately.

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

### Grid Layout
- Flex-end columns for gravity visualization
- Cell touch targets: 44pt minimum
- Grid padding: 12px, cell gap: 4px
- Cell size computed dynamically based on column count and screen width
- Grid has surface background, 16px border radius, 8pt elevation shadow

### Animations & Visual Feedback
- **Cell selection**: Scale down 0.9 → spring to 1.05 with animated glow border (150ms)
- **Valid word detection**: Cells turn green with checkmarks, green flash overlay (200ms)
- **Invalid tap**: Red flash overlay (100ms in, 200ms out), error haptic
- **Post-gravity cells**: Cyan border glow + elevated shadow fading over 400ms
- **Score popup**: Springs in, holds 600ms, floats up and fades out. Shows combo multiplier
- **Chain celebration**: "Nx CHAIN!" popup with spring scale + screen shake (3px, 200ms)
- **WordBank chips**: Found words scale up 1.15x with spring then settle; active words have pulsing glow
- **Puzzle complete**: Confetti particles (24 particles, 8 colors), stars pop in with staggered delays and rotation, score counts up from 0 over 1200ms, rewards and buttons slide in sequentially
- **Button press**: All Pressable buttons scale to 0.92-0.96x on press with opacity change
- **Screen transitions**: Title springs in, buttons slide up with spring physics

## Implementation Status

### Complete
- Core gameplay engine (board gen, gravity, solver, word selection)
- All 10 game mode support with correct mode IDs and auto-unlock
- 5-tab navigation with 12 screens (all fully functional, no stubs)
- 4 context providers with AsyncStorage persistence
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
- Idle hint prompt after 20 seconds of inactivity
- Mode intro banner for non-classic modes
- Stuck detection with inline undo button
- Animated WordBank with celebration, glow, and valid-word states
- Valid word green flash + auto-submit (400ms)
- Daily login reward UI (7-day cycle on HomeScreen)
- Welcome-back animated modal with tiered comeback rewards
- Perfect Solve undo recovery (undo from failed state)
- App.tsx fully wired: onComplete awards rewards, mission progress, mode unlocks, atlas collection
- 5-step onboarding with animated illustrations (mini grid, gravity demo, strategy bubbles)
- TypeScript compiles with zero errors

### Scaffolded / Needs Work
- Audio asset files (sound effects, music) - SoundManager is wired but no .mp3/.wav files exist
- Image assets (app icon, illustrations) - using emoji placeholders throughout
- Firebase Cloud Functions (server-side scheduled tasks)
- Actual Firestore sync (currently AsyncStorage only)
- Real-time leaderboard computation
- IAP integration (expo-in-app-purchases) - Shop UI is complete
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

### Adding sound effects
1. Place `.mp3` file in assets directory
2. Load it in `SoundManager.init()` via `Audio.Sound.createAsync(require(...))`
3. Map it to a `SoundName` key - calls are already wired throughout the game

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
- **Adjacency validation** happens in GameScreen's `handleCellPress` - non-adjacent taps trigger red flash and clear selection
- **Mode auto-unlock** happens in `App.tsx` `handleComplete` based on `MODE_CONFIGS[mode].unlockLevel`
