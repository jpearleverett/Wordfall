# Wordfall — Game Mechanics (Authoritative)

> This doc is the source of truth for how Wordfall actually plays. **Read this before making design, audio, UX, or AI assumptions about the game.** Genre conventions from Candy Crush, Wordscapes, Word Cookies, and Royal Match do NOT all apply.

---

## Elevator pitch

Wordfall is a **word search with gravity**. Each puzzle ships with a pre-authored list of words to find on a letter grid. The player traces letters with their finger to spell one of those words. When a trace matches a list word, it auto-completes, the cells clear, and gravity pulls the remaining letters down into the empty spaces. The puzzle ends when every word on the list is found — or when the board falls into an unwinnable state.

It is **not** Candy Crush. It is **not** Wordscapes. It shares only surface features with both.

---

## Core loop (one turn)

1. Player sees a grid of letters and a list of words to find.
2. Player touches a letter cell and drags to adjacent cells, tracing a path.
3. **As soon as the traced path matches any word on the find-list**, that word auto-resolves — no submit button, no confirmation. The cells clear.
4. Gravity applies: remaining letters fall into the empty spaces according to the current gravity direction.
5. The player now faces a new board state. Loop to step 2.
6. Puzzle ends on one of three outcomes: **all words found (win)**, **unwinnable board state (stuck fail)**, or **mode-specific fail** (timer out in Time Pressure; perfect-solve violation).

---

## What the game IS

- A **word search**: words exist on the board *and* on a known list; the player's job is to find them.
- **Gravity-based**: cleared cells are removed, remaining cells fall. The grid shrinks as you progress. Empty cells are permanent — they don't refill.
- **Pre-authored + procedurally generated**: 40 authored chapters of ~15 puzzles each (~600 total), then procedural generation by `GenerationProfile`.
- **Input-complete at trace time**: the game recognizes list-words from the traced path continuously; the trace *is* the submission.
- **Order-sensitive**: the order in which you find words changes the board for subsequent finds. Skill is strategic word-choice sequencing.
- **Multi-mode**: 10 distinct modes (see `src/types.ts:262-271`). Different modes add constraints on top of the core loop (timer, shrinking board, gravity direction flip, etc.).

---

## What the game IS NOT (common misconceptions)

These are every Candy-Crush/Wordscapes/match-3 assumption that does NOT apply. **If an AI agent, designer, or composer asks about any of these, the answer is "no, Wordfall doesn't have that."**

| Assumption | Reality |
|---|---|
| "Invalid words get rejected" | **No such thing.** There's no submit button. A trace either matches a list word and auto-resolves, or it doesn't — in which case nothing happens. You cannot submit anything invalid. |
| "Duplicate-word penalty" | **No such thing.** Words are on a finite list; once found they're gone. You can't re-submit. |
| "Longer words are harder to find" | **No.** Every word is already on the visible find-list. Length is not a difficulty signal — a 9-letter word is just there. Long words are emotionally satisfying to trace, but they're not mechanically harder. |
| "New tiles spawn after cascade" | **No.** Cells clear and leave permanent empty spaces. Gravity only moves existing tiles — it never adds new ones. The grid effectively shrinks over the course of a puzzle. |
| "One move can resolve multiple words" (auto-cascades / chain matches) | **No.** One traced word → one resolve → gravity → stop. If gravity happens to arrange letters into a new list-word, **the player still has to trace it manually.** No auto-resolution from cascade. |
| "Run out of moves → fail" | **No move limit exists.** You can trace indefinitely. The fail condition is getting stuck (board arrangement makes remaining words unfindable), not running out of turns. |
| "Lives system gates play" | **Default OFF.** There's a hard-energy system (`src/hooks/useHardEnergy.ts`) but it's Remote-Config gated (`hardEnergyEnabled`) and defaults to `false`. The game currently plays with unlimited attempts. |
| "Word construction from inventory" (à la Wordscapes / Word Cookies) | **No.** Letters are fixed on the grid. The player does not arrange letters from a pool. |
| "Match-3 style matching" | **No.** There is no matching of identical tiles. The game is letter-adjacency path tracing. |
| "Auto-cascade bonus (chain combos)" | **No auto-resolve.** See "chain" below for what the code's `chainCount` actually tracks — it's strategic positional reward, not cascade. |

---

## Failure states (the real ones)

1. **Stuck** — board reaches an arrangement where remaining list words cannot be traced. Detected by `isStuck` dead-end check (`useGame.ts:987-1022`, debounced 500ms). This is the core fail condition.
2. **Timeout** — Time Pressure mode only. Timer hits zero before all words found.
3. **Perfect-solve violation** — Perfect Solve mode only. Player's word choice locks out completion (stricter stuck-state enforcement; no hints/undos allowed).

**The game does NOT fail on:** running out of moves (no move counter), running out of lives (hard-energy off by default), submitting an invalid word (impossible).

---

## Three concepts easily confused: combo, chain, and booster-combo

These are all real and distinct. **Do not conflate them.**

### 1. `combo` (successive-find multiplier)

- **What it is:** a counter that increments each time a word is found, driving a score multiplier for subsequent finds.
- **Where:** `useGame.ts:432` — `comboLevel = state.combo + 1`.
- **Resets on:** specific actions (shuffle booster use, new puzzle). Does NOT reset on simple time gaps.
- **Player-facing signal:** score popup shows `+X (2x!)` etc. when `combo > 1`.

### 2. `chainCount` (gravity-opened-paths counter)

- **What it is:** a counter that increments when the player's word choice, *combined with gravity*, opened up MORE remaining list-words for findability than removing the same word without gravity would have.
- **Where:** `useGame.ts:894-937` (deferred detection). Compares `findWordInGrid` on pre-gravity grid vs. post-gravity grid for all remaining list words; increments if `findableAfter > findableBefore`.
- **What it represents:** strategic reward for picking the *right* word — one whose removal reshuffles letters into better positions for future finds.
- **Not a cascade.** No word auto-resolves. The chain counter just says "your move made more stuff findable than it would have otherwise."
- **Skipped in:** `noGravity` and `shrinkingBoard` modes.

### 3. Booster combo (Eagle Eye / Lucky Roll / Power Surge)

- **What it is:** a 2× score multiplier window activated when the player uses two specific boosters together (e.g., Wildcard + Spotlight = Eagle Eye). Defined in `src/data/boosterCombos.ts`.
- **Where:** state fields `activeComboType`, `comboMultiplier`, `comboWordsRemaining`. Applied during word-score calculation in `useGame.ts:438-445`.
- **Duration:** N words (typically 3) after activation, then expires.
- **Player-facing signal:** `BoosterComboBanner` component + dedicated "boosterCombo" sound + 2× score multiplier on subsequent finds.

---

## Game modes (summary)

Defined in `src/types.ts` around line 262 and `MODE_CONFIGS`. Each mode layers constraints on top of the core loop:

| Mode | What's different |
|---|---|
| `classic` | Baseline — unlimited time, gravity down, no extra rules |
| `gravityFlip` | Gravity direction rotates 90° after each word cleared |
| `timePressure` | Countdown timer; puzzle fails on timeout |
| `perfectSolve` | No hints, no undos; stricter stuck-state enforcement |
| `shrinkingBoard` | Outer ring of board removed every N words found |
| `daily` | One puzzle per 24h, shared across all players |
| `weekly` | Weekly challenge, leaderboard-ranked |
| `noGravity` | No cell movement after clear; cells just disappear in place |
| `expert` | Expanded dictionary tier, denser boards |
| `relax` | Unlimited hints, no pressure, ambient BGM |

---

## Economy notes

- **No hard lives gate by default.** The code includes a `useHardEnergy` hook and `NoLivesModal`, but both are guarded by the `hardEnergyEnabled` Remote Config flag, which defaults to `false`. The live game lets players play as much as they want.
- **Hints cost coins** (earned or purchased). Hints reveal a list-word location on the board.
- **Undos cost coins or are earned.** Undo rewinds the last word clear (restores cells).
- **Boosters:** wildcard (place a wildcard tile), spotlight (highlight tiles of a chosen word), smart shuffle (re-layout grid). Earned via Mystery Wheel, ad rewards, login calendar, or purchased.
- **Piggy Bank** fills passively on puzzle complete; user pays (~$4.99) to break it and claim accumulated gems.
- **VIP Weekly** ($4.99/week): ad-free, 50 daily gems, 3 daily hints, 2× XP, cosmetic tier rewards.
- **Season Pass** ($9.99): 50-tier free+premium lane, rotates every 30 days.

---

## Developer pointers (the files that matter for mechanics changes)

| File | What lives here |
|---|---|
| `src/hooks/useGame.ts` | Reducer (all 24 actions) + zustand store wiring + deferred chain detection |
| `src/stores/gameStore.ts` | Context, selectors, dispatcher |
| `src/engine/` (various) | Grid operations: `removeCells`, `applyGravity`, `findWordInGrid`, `areAllWordsIndependentlyFindable` |
| `src/screens/game/PlayField.tsx` | Gesture handling + selection rendering (per-tap) |
| `src/screens/GameScreen.tsx` | Gameplay UI (high-level, does NOT subscribe to per-tap state) |
| `src/types.ts` | `GameState`, `Board`, `Word`, `Mode`, `MODE_CONFIGS`, etc. |
| `src/data/chapters/` | Authored chapter + puzzle data |
| `src/data/boosterCombos.ts` | Booster combo definitions (Eagle Eye, Lucky Roll, Power Surge) |

---

## For audio / composer work

The emotional beats that actually exist in this game:

- **Tap** (per letter touched)
- **Word found** (auto-resolves on trace match — every time, same moment)
- **Big word** (7+ letters — emotional highlight, not a difficulty signal)
- **Word containing rare tile** (if rare tile mechanic active)
- **Gravity cascade** (tiles falling, no new word auto-resolves)
- **Chain** (strategic reward — your move opened more paths; a "nice move" sting)
- **Successive combo** (building multiplier on consecutive finds)
- **Booster combo activation** (Eagle Eye etc.)
- **Hint revealed / Undo used**
- **Puzzle solved / Star reveals / Perfect solve**
- **Stuck state warning / Stuck fail**
- **Time Pressure timer warnings + timeout**
- **Mode-specific mechanics** (shrink event, gravity flip, etc.)

Do NOT spec audio for: invalid-word rejection, duplicate-word rejection, cascade auto-find, move-limit warning, lives-depleted. None of those moments exist.

See `agent_docs/audio_brief.md` for the composer deliverable manifest.

---

## Changelog for this doc

- **2026-04-20:** Initial authoritative mechanics doc created after audit revealed AI agents were repeatedly applying Candy-Crush / match-3 / Wordscapes conventions that don't apply to Wordfall. Written to prevent future sessions from making the same design-framing mistakes.
