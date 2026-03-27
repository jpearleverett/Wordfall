# Modes & Boosters Redesign

## Summary

Replace 3 underperforming game modes (limitedMoves, cascade, endless) and all 3 boosters (freeze column, board preview, shuffle filler) with mechanically distinct alternatives that better serve the game's gravity-based identity.

**Why the current ones fail:**
- **limitedMoves**: Adds nothing — every mode already has exactly `wordCount` optimal moves. The "limit" is the same as the star threshold.
- **cascade**: Score multiplier is invisible to the player's decision-making. You play it identically to classic and just get more points.
- **endless**: Indistinguishable from replaying classic levels. No unique mechanic.
- **freeze column**: Prevents gravity in one column, but players rarely need this — the problem is usually not knowing *which* word to clear, not wanting to prevent gravity.
- **board preview**: Shows post-gravity state, but the board is small enough that experienced players can visualize this themselves.
- **shuffle filler**: Randomizes non-word letters but doesn't guarantee solvability after shuffle.

## New Modes

### Gravity Flip (replaces `cascade`)

| Property | Value |
|----------|-------|
| Mode ID | `gravityFlip` |
| Unlock level | 10 |
| Skill gate | 50+ stars |
| Score multiplier | 1.5x |
| Hints | 3 |
| Undos | 3 |
| Combo | Off |

**Mechanic:** Gravity direction rotates 90 degrees clockwise after each word cleared.

- Clear word 1 → gravity falls **right**
- Clear word 2 → gravity falls **up**
- Clear word 3 → gravity falls **left**
- Clear word 4 → gravity falls **down** (back to normal)
- Cycle repeats

**Gravity directions defined:**
- `down`: cells compact toward max row (standard behavior)
- `right`: cells compact toward max column (within each row)
- `up`: cells compact toward row 0
- `left`: cells compact toward column 0

**State changes:**
- New field: `gravityDirection: 'down' | 'right' | 'up' | 'left'` on game state
- Direction advances after each successful SUBMIT_WORD
- Gravity engine receives direction parameter instead of assuming "down"

**Board generation:**
- Standard word placement on initial grid
- Solvability validation must simulate the rotation cycle: try each word removal, apply gravity in the direction that would be active at that step, then check remaining words
- Fallback: if no valid ordering found within budget, regenerate board (same 3-tier fallback as current generator)

**Visual feedback:**
- Arrow indicator on grid border showing current gravity direction
- Arrow rotates with spring animation on each word clear
- Brief directional "whoosh" particle effect when gravity shifts

**Why this works:** Forces multi-step planning about board geometry. The core "order matters" principle is amplified — now order affects not just *which* words are accessible but *where all letters end up*.

---

### Shrinking Board (replaces `limitedMoves`)

| Property | Value |
|----------|-------|
| Mode ID | `shrinkingBoard` |
| Unlock level | 5 |
| Skill gate | 3+ perfect solves |
| Score multiplier | 1.25x |
| Hints | 3 |
| Undos | 3 |
| Combo | Off |

**Mechanic:** After every 2 words cleared, the outermost ring of remaining cells is removed. If this destroys a letter needed for an unsolved word, the puzzle fails.

**Ring removal logic:**
1. After words 2, 4, 6, etc. are cleared, trigger a shrink
2. Identify the outermost ring: all cells where `row === 0 || row === maxRow || col === 0 || col === maxCol` (adjusted for cells already removed by previous shrinks)
3. Remove all cells in that ring (set to null)
4. Apply gravity after removal
5. Check if all remaining words are still findable in the post-shrink grid
6. If any word is now impossible → `status: 'failed'` with message "A word was lost in the shrink!"

**Board generation:**
- Start with +1 row and +1 column vs standard difficulty config (gives the outer ring buffer)
- Place words preferring inner positions where possible (weighted placement bias)
- Validate: simulate worst-case shrink timing and confirm words survive long enough to be found
- All words must be solvable before the shrink that would destroy them

**State changes:**
- New field: `shrinkCount: number` (how many shrinks have occurred)
- New field: `wordsUntilShrink: number` (countdown to next shrink, starts at 2)
- Shrink triggers in SUBMIT_WORD handler when `wordsCleared % 2 === 0`

**Visual feedback:**
- Doomed ring cells pulse with a dim coral border before shrink (shown immediately after the previous shrink, so player always sees what's next)
- On shrink: cells in the ring crack/shatter animation (200ms), then fade out
- Grid visually contracts (border tightens) with spring animation
- Warning text: "SHRINKING IN 1 WORD" when 1 word away from next shrink

**Fail feedback:** "LOST!" label appears on the destroyed word in the WordBank, cells flash red where the missing letters were.

**Why this works:** Creates spatial urgency without a clock. Strategic question becomes "which edge-words do I need to clear first?" — a different planning axis than standard gravity ordering.

---

### No Gravity (replaces `endless`)

| Property | Value |
|----------|-------|
| Mode ID | `noGravity` |
| Unlock level | 3 |
| Skill gate | None |
| Score multiplier | 0.75x |
| Hints | 3 |
| Undos | 3 |
| Combo | Off |

**Mechanic:** Cleared word cells become permanent empty holes. No gravity applied. The grid is static.

**What changes vs classic:**
- `applyGravity()` is skipped entirely after word removal
- Cells are set to null and stay null — no compaction
- Grid develops a Swiss-cheese pattern as words are cleared
- No ordering strategy needed — all words are independently findable from the start

**Board generation:**
- All words must be findable in the initial grid without any gravity shifts
- No word can depend on another word being cleared first
- Solvability check: simply verify each word exists independently in the starting grid (fast — no recursive backtracking needed)
- Can use smaller grids since no gravity dependencies (standard difficulty config, no +1 adjustment)

**State changes:**
- No new fields needed — just skip the gravity call in SUBMIT_WORD when `mode === 'noGravity'`

**Visual feedback:**
- Cleared cells show as dark voids with subtle starfield/space particle effect (matching the game's dark theme)
- No gravity animation, no moved-cell highlighting
- Clean, calm visual tone

**Why this works:** Pure word-finding without ordering pressure. Appeals to players who enjoy the word search aspect but find gravity stressful. Mechanically distinct from Relax mode (which has gravity but unlimited hints/undos). Lower score multiplier reflects the reduced difficulty.

---

## New Boosters (replacing freeze column, board preview, shuffle filler)

### Wildcard Tile (replaces freeze column)

| Property | Value |
|----------|-------|
| Booster ID | `wildcardTile` |
| Starting count | 1 per puzzle |
| Purchasable | Yes |

**Mechanic:** Tap the booster, then tap any cell. That cell becomes a wildcard (matches any letter) for your next word submission.

**Activation flow:**
1. Player taps Wildcard booster button → enters wildcard placement mode
2. Next cell tap places the wildcard (instead of starting a selection)
3. Cell visually transforms: letter replaced with `★`, rainbow shimmer gradient on tile
4. Wildcard cell is now selectable as part of any word — it matches any letter at that position
5. On next successful SUBMIT_WORD that includes the wildcard cell: wildcard is consumed, cell is cleared normally
6. If player clears selection or submits a word that doesn't include the wildcard cell: wildcard persists until used
7. If player activates another booster or taps wildcard button again: cancels wildcard placement mode

**State changes:**
- New field: `wildcardCells: CellPosition[]` (positions of active wildcards)
- New field: `wildcardMode: boolean` (placement mode active)
- Word validation logic: when checking if selected letters spell a target word, wildcard cells match any letter at their position in the word

**Edge cases:**
- Wildcard cell survives gravity (moves with the letter, stays wildcard)
- Only 1 wildcard active at a time (placing a second replaces the first)
- Undo restores the wildcard if the word that consumed it is undone
- Wildcard does NOT help with word finding in the solver/hint system (player must still identify the word)
- Dead-end detection (`isDeadEnd`) must be wildcard-aware: when checking solvability, treat wildcard cells as matching any letter. This prevents false "stuck" alerts when the wildcard could complete a word. The hint system itself still ignores wildcards (player finds the word, wildcard just patches a missing letter).

**Visual:** `★` character with `GRADIENTS.tile.wildcard` (new gradient: gold → orange → pink shimmer). Rainbow border pulse animation (native driver, 2s loop while active).

---

### Spotlight (replaces board preview)

| Property | Value |
|----------|-------|
| Booster ID | `spotlight` |
| Starting count | 1 per puzzle |
| Purchasable | Yes |

**Mechanic:** Highlights every cell containing a letter used by any remaining unfound word. Non-relevant cells dim. Lasts one turn.

**Activation flow:**
1. Player taps Spotlight booster button → effect applies immediately
2. For each remaining unfound word, collect the set of all unique letters needed
3. Union all letter sets → `relevantLetters: Set<string>`
4. Every cell whose letter is in `relevantLetters` gets a gold glow border
5. Every cell whose letter is NOT in `relevantLetters` dims to 30% opacity
6. Effect persists until next successful SUBMIT_WORD or CLEAR_SELECTION
7. Booster count decremented on activation

**What Spotlight does NOT reveal:**
- Which specific word each letter belongs to
- The path/order of any word
- Which cells are filler vs word-path cells (a filler cell with letter 'A' still glows if any remaining word contains 'A')

**State changes:**
- New field: `spotlightActive: boolean`
- New field: `spotlightLetters: string[]` (computed on activation, cleared on dismiss — array instead of Set for JSON serialization in undo history)
- Spotlight clears automatically in SUBMIT_WORD and CLEAR_SELECTION handlers

**Why "every letter in every word" is the right scope:** Narrower scopes (single word) are too close to hints. Broader scopes are useless. This scope says "these letters matter, those don't" — enough to cut through visual noise without solving the puzzle.

**Visual:** Gold glow border (`SHADOWS.glow(COLORS.gold)`) on relevant cells. Non-relevant cells: `opacity: 0.3` via Animated fade (200ms, native driver). Subtle gold particle shimmer on highlighted cells.

---

### Smart Shuffle (replaces shuffle filler)

| Property | Value |
|----------|-------|
| Booster ID | `smartShuffle` |
| Starting count | 1 per puzzle |
| Purchasable | Yes |

**Mechanic:** Randomizes all filler (non-word-path) cells and guarantees the resulting board is solvable from the current state.

**Activation flow:**
1. Player taps Smart Shuffle button → effect applies immediately
2. Identify all cells that are part of any remaining word's solution path (using solver)
3. All other cells get new random letters (35% vowels, 65% consonants — same as current filler distribution)
4. Run `isSolvable()` on the new board with remaining words
5. If not solvable, reshuffle (up to 10 attempts)
6. If still not solvable after 10 attempts, fall back to keeping the original board and refund the booster (with toast: "Couldn't find a valid shuffle — booster refunded")
7. Apply the new board with a shuffle animation

**State changes:**
- No new fields — modifies `board.grid` directly in reducer (same pattern as current SHUFFLE_FILLER action)
- Board replacement triggers via new `SMART_SHUFFLE` action

**Key difference from old shuffle:** The old shuffle filler never checked solvability. Smart Shuffle guarantees you can still win after shuffling. This makes it a reliable "unstick me" tool rather than a gamble.

**Visual:** All filler cells do a synchronized flip animation (scale X: 1 → 0 → 1 over 400ms) revealing new letters. Brief sparkle burst on the grid.

---

## Modes Retained (no changes)

| Mode | ID | Unlock | Notes |
|------|----|--------|-------|
| Classic | `classic` | Level 1 | Baseline |
| Time Pressure | `timePressure` | Level 8 | Clock countdown |
| Perfect Solve | `perfectSolve` | Level 12 | Zero mistakes |
| Daily Challenge | `daily` | Level 1 | Date-seeded |
| Weekly Special | `weekly` | Level 10 | Curated hard |
| Expert | `expert` | Level 30 | No assists |
| Relax | `relax` | Level 3 | Unlimited hints/undos |

## Implementation Impact

### Files that need changes

| File | Changes |
|------|---------|
| `src/types.ts` | Update `GameMode` union (remove 3, add 3). Add `gravityDirection`, `shrinkCount`, `wordsUntilShrink`, `wildcardCells`, `wildcardMode`, `spotlightActive`, `spotlightLetters` to `GameState`. Update `GameAction` union (new actions). Remove old booster types from `BoosterCounts`. |
| `src/constants.ts` | Update `MODE_CONFIGS` (remove 3, add 3). Add `GRADIENTS.tile.wildcard`. Update `BOOSTER_CONFIGS` if it exists. |
| `src/engine/gravity.ts` | Add directional gravity function `applyGravityInDirection(grid, direction)` supporting all 4 directions. Keep existing `applyGravity` as alias for `down`. |
| `src/engine/boardGenerator.ts` | Add gravity-flip-aware solvability check. Add no-gravity board validation (independent word findability). Add shrinking-board validation (words survive shrink timing). |
| `src/engine/solver.ts` | Add gravity-direction parameter to solve/isSolvable. Add `isWordIndependentlyFindable` for noGravity validation. |
| `src/hooks/useGame.ts` | Rewrite SUBMIT_WORD to branch on mode for gravity behavior. Add WILDCARD_PLACE, SPOTLIGHT_ACTIVATE, SMART_SHUFFLE actions. Remove FREEZE_COLUMN, PREVIEW_MOVE, old SHUFFLE_FILLER. Remove `applyGravityWithFrozen` (defined here, not in gravity.ts). Add gravity direction cycling for gravityFlip. Add shrink logic for shrinkingBoard. Skip gravity for noGravity. |
| `src/screens/GameScreen.tsx` | Update booster bar UI (3 new boosters). Add gravity direction indicator for gravityFlip. Add shrink warning/animation for shrinkingBoard. Add void cell rendering for noGravity. Remove freeze mode UI, preview overlay. |
| `src/components/Grid.tsx` | Add wildcard cell rendering (★ with rainbow gradient). Add spotlight dimming (opacity animation). Add void/hole cell rendering for noGravity. Add gravity direction arrow indicator. Remove frozen column styling. |
| `src/components/LetterCell.tsx` | Add wildcard tile variant. Add spotlight dim state. Add void cell variant. |
| `src/screens/ModesScreen.tsx` | Update mode cards for 3 new modes (descriptions, icons, unlock text). |
| `src/types.ts` (EventType) | Rename `cascadeChampionship` → `gravityFlipChampionship` in `EventType` union. Update associated exclusive rewards (`cascade_crown_frame` → `gravity_flip_crown_frame`, `cascade_crystal` → `gravity_flip_crystal`). |
| `src/data/events.ts` | Update the cascade championship event entry to reference `gravityFlip` mode. Rename exclusive reward IDs to match. |
| `App.tsx` | Update mode auto-unlock logic for new mode IDs. |
