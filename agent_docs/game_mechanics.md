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
| "Auto-cascade bonus (chain combos)" | **No auto-resolve. Ever.** Earlier versions of the code had a `chainCount` counter and a `combo` score multiplier; both were ripped in April 2026 as part of the Option A dopamine refactor. Only the separate booster-combo system (Eagle Eye / Lucky Roll / Power Surge) remains, and that's a voluntary 2× window triggered by using two boosters together — not a cascade. |

---

## Failure states (the real ones)

1. **Stuck** — board reaches an arrangement where remaining list words cannot be traced. Detected by `isStuck` dead-end check (`useGame.ts:987-1022`, debounced 500ms). This is the core fail condition.
2. **Timeout** — Time Pressure mode only. Timer hits zero before all words found.
3. **Perfect-solve violation** — Perfect Solve mode only. Player's word choice locks out completion (stricter stuck-state enforcement; no hints/undos allowed).

**The game does NOT fail on:** running out of moves (no move counter), running out of lives (hard-energy off by default), submitting an invalid word (impossible).

---

## Dopamine architecture (what the game rewards — and what it doesn't)

Wordfall is single-solution: every puzzle has essentially one correct find-order. Match-3 combo/chain mechanics don't map to this — they'd either fire on every win (no signal) or demand speed/reflex play the game doesn't want. The Option A refactor (April 2026) ripped the match-3 layer and replaced it with an architecture honest to Wordfall's genre (Sudoku / crossword family).

### What exists (authoritative list)

1. **Last-word tension.** When `remainingWords` transitions `2 → 1`, the BGM crossfades to the tense bed, a one-shot sting plays, and the final word's chip gets a gold border + gentle 1.08× scale pulse. Implementation: `GameScreen.tsx` effect keyed on `totalWords - foundWords` + `WordBank.tsx` `isLastRemaining` branch. Every puzzle now ends on a tension peak.
2. **Flawless badge.** Every puzzle completed with `perfectRun === true` (no hints, no undos, no shuffle, no wrong-trace) shows a gold "FLAWLESS" pill on the victory screen, between the star row and the score panel. Component: `src/components/victory/FlawlessBadge.tsx`. Audio: `starEarn` sting (placeholder for `flawless_badge.mp3`).
3. **Flawless streak.** Cross-session counter of consecutive flawless puzzles, incrementing only on distinct calendar days (same-day replays don't inflate). Resets on any non-flawless completion. Milestones at **3 / 5 / 7 / 10 / 15 / 20** queue a full-screen `flawless_streak_milestone` ceremony via the existing `MilestoneCeremony` template. Surfaced on the home screen via `FlawlessStreakCard` (gold when active, muted with teach-copy when `currentStreak === 0`). State: `PlayerData.flawlessStreak`.
4. **Booster combo (unrelated, still real).** Separate 2× score multiplier window activated when the player voluntarily pairs two boosters in the same puzzle (Wildcard + Spotlight = Eagle Eye, Wildcard + SmartShuffle = Lucky Roll, Spotlight + SmartShuffle = Power Surge). Duration: N words (default 3). State fields: `activeComboType`, `comboMultiplier`, `comboWordsRemaining`. UI: `BoosterComboBanner`. Defined in `src/data/boosterCombos.ts`. **Do not confuse this with the deleted successive-find `combo` field — different system, different trigger.**

### What was deleted (do not re-invent)

- **`combo` / `maxCombo` fields and the successive-find score multiplier.** A Candy-Crush-style "more points on consecutive finds" bonus. Deleted because in a single-solution puzzle every winner finds words in sequence, so the signal was meaningless.
- **`chainCount` and the deferred chain-detection `useEffect`.** Tracked "gravity made more remaining words findable than the no-gravity case." Technically real but invisible to players and fired on a signal players couldn't reason about. Deleted.
- **`ComboFlash` overlay, chain popup + screen shake, `(Nx)` score suffix, combo chip on GameHeader.** All the UI for the above.
- **`'chain_count'` analytics event, `SCORE.comboMultiplier`, `SCORE.chainBonus`, `CHAIN_INTENSITY` constant, `chainPopupDuration`, orphaned `chainBonus` synth, `'chain_reaction'` achievement.** Swept.

If you see any of the above in code during future work, it's either vestigial (rip it) or in the booster-combo system (leave alone — that system is distinct).

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
| `src/hooks/useGame.ts` | Reducer + zustand store wiring. No chain detection (removed April 2026). |
| `src/stores/gameStore.ts` | Context, selectors (`selectPerfectRun`, `selectRemainingWordsCount`, etc.), dispatcher |
| `src/engine/` (various) | Grid operations: `removeCells`, `applyGravity`, `findWordInGrid`, `areAllWordsIndependentlyFindable` |
| `src/screens/game/PlayField.tsx` | Gesture handling + selection rendering (per-tap) |
| `src/screens/GameScreen.tsx` | Gameplay UI (high-level, does NOT subscribe to per-tap state). Owns the last-word tension effect. |
| `src/components/WordBank.tsx` | Word chips; isLastRemaining pulse lives here |
| `src/components/PuzzleComplete.tsx` | Victory screen; hosts FlawlessBadge render |
| `src/components/victory/FlawlessBadge.tsx` | Gold "FLAWLESS" pill (every clean solve) |
| `src/components/FlawlessStreakCard.tsx` | Home-screen streak display |
| `src/contexts/PlayerContext.tsx` | `flawlessStreak` state + `updateFlawlessStreak` callback (milestones 3/5/7/10/15/20) |
| `src/types.ts` | `GameState`, `Board`, `Word`, `Mode`, `MODE_CONFIGS`, `CeremonyItem.type` union (`flawless_streak_milestone` included), etc. |
| `src/data/chapters/` | Authored chapter + puzzle data |
| `src/data/boosterCombos.ts` | Booster combo definitions (Eagle Eye, Lucky Roll, Power Surge) — separate from the removed successive-find combo |

---

## For audio / composer work

The emotional beats that actually exist in this game:

- **Tap** (per letter touched)
- **Word found** (auto-resolves on trace match — every time, same moment)
- **Big word** (7+ letters — emotional highlight, not a difficulty signal)
- **Word containing rare tile** (if rare tile mechanic active)
- **Gravity fall** (tiles settle into empty spaces; never spawns a new word auto-find)
- **Last-word tension** (plays once when `remainingWords` transitions 2 → 1 — BGM swap + sting)
- **Booster activation** (wildcard / spotlight / smart shuffle) and **booster combo activation** (Eagle Eye / Lucky Roll / Power Surge)
- **Hint revealed / Undo used**
- **Flawless badge reveal** (post-puzzle, every clean solve)
- **Flawless streak milestone** (full-screen ceremony at 3/5/7/10/15/20)
- **Puzzle solved / Star reveals**
- **Stuck fail**
- **Time Pressure timer warnings + timeout**
- **Mode-specific mechanics** (shrink event, gravity flip, etc.)

**Do NOT spec audio for:** invalid-word rejection, duplicate-word rejection, cascade auto-find, chain escalation, move-limit warning, lives-depleted, successive-combo multiplier sounds. None of those moments exist.

See `agent_docs/audio_brief.md` for the composer deliverable manifest.

---

## Changelog for this doc

- **2026-04-20:** Initial authoritative mechanics doc created after audit revealed AI agents were repeatedly applying Candy-Crush / match-3 / Wordscapes conventions that don't apply to Wordfall. Written to prevent future sessions from making the same design-framing mistakes.
- **2026-04-20 (Option A refactor):** Ripped the match-3-shaped combo/chain layer and replaced it with the Last-Word Tension + Flawless Badge + Flawless Streak dopamine architecture. Updated the "Three concepts easily confused" section to reflect that only booster-combo remains; added the "What was deleted" note so future agents don't accidentally re-introduce the removed systems.
