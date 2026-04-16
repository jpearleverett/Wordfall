# Engine, Mechanics & Progression

Board generation, solver, modes, scoring, rewards, ceremony queue, difficulty
curve. Read this when touching the game engine, reward wiring, or difficulty.

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
Sound manager calls wired at every interaction point in `GameScreen.tsx` and `App.tsx`:
- Cell tap → `tap` sound + light haptic
- Valid word → `wordFound` sound + medium haptic
- Invalid tap → `wordInvalid` sound + error haptic
- Combo/chain → `combo` sound + heavy haptic
- Puzzle complete → `puzzleComplete` sound + success haptic
- Hint/undo → `hintUsed`/`undoUsed` sound
- Boosters → `buttonPress` sound

**Audio is synthesized at runtime with caching** — `SoundManager` (`src/services/sound.ts`) generates tones and chords programmatically (sine waves via WAV data URIs). DSP and WAV encoding are separated: `synthesizeToneSamples()` returns raw `Int16Array` buffers cached in `synthesisCache: Map<string, Int16Array>`, and `createWavDataUri()` wraps them in WAV headers. `preWarmAll()` synthesizes all sounds + music tracks asynchronously on init (yields between each). `playSound()` never triggers synthesis — if a sound isn't cached, it skips silently. Uses `expo-audio` (`createAudioPlayer`), lazy-loaded via `require()`. Replace with real assets by swapping `createAudioPlayer(require('./path.mp3'))` calls.

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
- **Achievement checks**: Calls `player.checkAchievements()` which compares player stats against all 15 achievement thresholds, queues `AchievementCeremony`
- **Weekly goal progress**: Updates tracking keys (`puzzles_solved`, `total_score`, `stars_earned`, `perfect_solves`, `daily_completed`)
- **Mode unlock ceremonies**: Detects newly unlockable modes, queues `ModeUnlockCeremony` for each
- **Collection completion**: Checks if puzzle words completed an Atlas page using local state projection (avoids stale React batched state), queues `CollectionCompleteCeremony`
- **Star milestones**: Checks actual `player.totalStars` against `STAR_MILESTONES` (50/100/250/500)
- **Perfect solve milestones**: Checks exact perfect count against `PERFECT_MILESTONES` (10/25/50)
- **Milestone decorations**: On level-up, checks against `MILESTONE_DECORATIONS` (every 5 levels, 10 total)
- **First rare tile**: Detects when player's first-ever rare tile drops
- **First mode clear**: Captures `prevModePlayed` before `recordModePlay()`, fires `first_mode_clear` for first win in any non-classic mode
- **Mystery wheel progress**: Calls `player.awardFreeSpin()` — awards a free spin every 8 puzzle completions
- **Win streak**: Calls `player.updateWinStreak(true)` — increments consecutive win counter, milestones at 3/5/7/10/15/20
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
