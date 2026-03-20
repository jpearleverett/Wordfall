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
| `App.tsx` | Entry point. 5 bottom tabs, nested stack navigators, provider wrappers, full context wiring for game rewards/progression |
| `src/types.ts` | ALL type definitions. Edit here when adding new data structures |
| `src/constants.ts` | Colors, difficulty configs, mode configs, scoring, economy, animations |
| `src/hooks/useGame.ts` | Core game state reducer - handles 15+ game actions including boosters |
| `src/engine/boardGenerator.ts` | Puzzle generation with seeded PRNG and solvability validation |
| `src/engine/gravity.ts` | Column-based gravity physics (letters fall down), frozen column support |
| `src/engine/solver.ts` | Recursive backtracking solver, dead-end detection, hint generation |
| `src/contexts/PlayerContext.tsx` | Master player data hub (progress, collections, missions, streaks, cosmetics, library) |
| `src/components/PuzzleComplete.tsx` | Victory screen with confetti particles, animated score counter, staggered reveals |
| `src/components/WordBank.tsx` | Animated word chips with celebration scale, glow pulse, valid word state |
| `GAME_DESIGN_DOCUMENT.md` | Full 48KB GDD with 17 sections - the source of truth for features |
| `PLAN.md` | 20-phase implementation roadmap |

### State Management

- **Game state:** `useGame` hook with `useReducer` in `GameScreen`. Actions: SELECT_CELL, SUBMIT_WORD, USE_HINT, UNDO_MOVE, NEW_GAME, TICK_TIMER, SHUFFLE_FILLER, FREEZE_COLUMN, PREVIEW_MOVE, USE_BOOSTER, etc. State includes `frozenColumns`, `previewGrid`, `boosterCounts`.
- **Player data:** `PlayerContext` - progress, collections, missions, streaks, cosmetics, library. Persisted to AsyncStorage.
- **Economy:** `EconomyContext` - coins, gems, hintTokens, eventStars, libraryPoints. Persisted to AsyncStorage.
- **Settings:** `SettingsContext` - volume, haptics, notifications, theme. Persisted to AsyncStorage.
- **Auth:** `AuthContext` - Firebase anonymous auth.

### Navigation Structure

```
App.tsx (RootStack)
├── MainTabs (Bottom Tab Navigator)
│   ├── Home (HomeStack) → HomeMain, Shop, Settings, Game
│   ├── Play (PlayStack) → Modes, Game, Event, Leaderboard
│   ├── Collections (CollectionsStack) → CollectionsMain
│   ├── Library (LibraryStack) → LibraryMain
│   └── Profile (ProfileStack) → ProfileMain, Settings, Club
└── Onboarding
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
3. When a valid word is selected, cells turn green with checkmarks and auto-submit after 400ms
4. Cleared letters disappear; letters above fall due to gravity (with LayoutAnimation)
5. Score popup floats up showing points earned (with combo multiplier display)
6. Chain celebrations ("2x CHAIN!") appear on consecutive word finds
7. Find all words to trigger victory screen with confetti, animated score counter, and star reveals

### Boosters
Three booster types available during gameplay:
- **Freeze Column**: Prevents gravity from affecting a selected column for one move
- **Board Preview**: Shows what the board will look like after submitting the current selection
- **Shuffle Filler**: Randomizes non-word filler letters on the board

### Board Generation
- Uses Mulberry32 seeded PRNG for reproducible puzzles
- Words placed via recursive backtracking with overlap at matching letters
- All puzzles validated by solver to ensure solvability
- Filler letters use vowel-balanced distribution (35% vowels)

### 10 Game Modes
`classic`, `limitedMoves`, `timePressure`, `perfectSolve`, `cascade`, `daily`, `weekly`, `endless`, `expert`, `relax`

### Scoring
- Word found: 100 + (20 * letter count)
- Combo multiplier: +50% per consecutive word
- Cascade mode: multiplier grows by 0.25 per word
- Perfect clear: 500 bonus
- No hints bonus: 200

## Design System

### Colors (dark theme only)
- Background: `#0a0e27` / Surface: `#1a1f45`
- Accent (cyan): `#00d4ff` / Gold: `#ffd700`
- Green (success): `#4caf50` / Coral (danger): `#ff6b6b`
- Purple: `#a855f7` / Orange: `#ff9f43` / Teal: `#2ed8a3`
- All colors defined in `COLORS` object in `src/constants.ts`

### Grid Layout
- Flex-end columns for gravity visualization
- Cell touch targets: 44pt minimum
- Grid padding: 12px, cell gap: 4px
- Cell size computed dynamically based on column count and screen width

### Animations & Visual Feedback
- **Cell selection**: Scale down 0.9 → spring to 1.05 with animated glow border
- **Valid word detection**: Cells turn green with checkmarks, green flash overlay on screen
- **Score popup**: Springs in, holds 600ms, floats up and fades out. Shows combo multiplier
- **Chain celebration**: "Nx CHAIN!" popup with spring scale animation
- **WordBank chips**: Found words scale up 1.15x with spring then settle; active words have pulsing glow
- **Puzzle complete**: Confetti particles (24 particles, 8 colors), stars pop in with staggered delays and rotation, score counts up from 0, rewards and buttons slide in sequentially
- **Button press**: All Pressable buttons scale to 0.92-0.96x on press with opacity change
- **Screen transitions**: Title springs in, buttons slide up with spring physics

## Implementation Status

### Complete
- Core gameplay engine (board gen, gravity, solver, word selection)
- All 10 game mode support in the reducer (with correct mode IDs)
- 5-tab navigation with 12 screens
- 4 context providers with AsyncStorage persistence
- Sound manager, haptics, analytics services (SFX calls wired, no audio assets yet)
- 40 chapters across 8 library wings
- 12 Word Atlas pages, 6 rare tile sets, 4 seasonal albums
- 12-week rotating event calendar (10 event types)
- 22 daily mission templates
- 50+ cosmetic items (themes, frames, titles, decorations)
- Economy system with full reward wiring (coins, gems, library points on puzzle complete)
- Booster system (Freeze Column, Board Preview, Shuffle Filler) with UI and reducer support
- Visual polish: score popups, confetti, animated score counter, button press feedback
- Animated WordBank with celebration, glow, and valid-word states
- Chain celebration popup on combos
- Valid word green flash + auto-submit
- Daily login reward UI (7-day cycle on HomeScreen)
- Perfect Solve undo recovery (undo from failed state)
- App.tsx fully wired: onComplete awards rewards, onNextLevel generates next board, auto-onboarding
- 5-step onboarding with animated illustrations (mini grid, gravity demo, strategy bubbles)
- TypeScript compiles with zero errors

### Scaffolded / Needs Work
- Audio asset files (sound effects, music) - SoundManager exists but no .mp3/.wav files
- Image assets (icons, illustrations) - using emoji placeholders
- Firebase Cloud Functions (server-side scheduled tasks)
- Actual Firestore sync (currently AsyncStorage only)
- Real-time leaderboard computation
- IAP integration (expo-in-app-purchases)
- Ad integration (rewarded ads for hints)
- Push notifications
- Friend challenge matchmaking
- Club chat real-time messaging
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

## Important Notes

- **No energy walls** on core play - ethical F2P design
- **Hints/undos are consumables** (3 each per puzzle by default, purchasable)
- **Boosters** (freezeColumn, boardPreview, shuffleFiller) are per-puzzle consumables tracked in `boosterCounts`
- **Portrait orientation only** (set in app.json)
- **Dark mode only** - no light theme
- **`--legacy-peer-deps` required** for npm install due to React Navigation peer dep conflicts
- **Screens use default exports**, not named exports
- **`AppNavigator.tsx`** in `src/navigation/` is NOT used - `App.tsx` handles all navigation directly
- **Firebase env vars** must be set as `EXPO_PUBLIC_FIREBASE_*` for the app to connect
- **Word database** in `src/words.ts` contains ~2000 curated English words (3-6 letters)
- **Seeded PRNG** ensures daily puzzles are identical for all players on the same day
