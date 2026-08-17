# Fun / Retention Backlog (living doc — /loop "make it a blast")

Started 2026-08-17. This is the working ledger for the open-ended fun loop:
evaluate game-feel end to end, rank the gaps, ship improvements one at a
time, re-evaluate. Each iteration: pick the top OPEN item, ship it, move it
to SHIPPED with the commit hash, keep `npm run typecheck` + jest green.

Constraints (from `game_mechanics.md` — read it before editing this list):
- No combo/chain/cascade systems — deleted April 2026, do not re-invent.
- Restraint is a value: Wordfall is Sudoku-family calm, not a slot machine.
- The skill gap (57% random-play dead-ends mid-game, 0% with one-ply
  lookahead) is closed by TEACHING, not by easier boards.
- Reduce-motion and colorblind support must hold for every new feel effect.

## Measured baseline (2026-08-17)

- boardGen p50 44ms / p95 <900ms; stuckRate floor 12% early / 57% mid
  (random play), 0% skilled; reward cadence ≤5 dry levels to L60;
  curve monotonic through L14. All guards green at 99 suites / 1495 tests.

## OPEN (ranked — top item is next to ship)

### First-session (FTUE) — from the 2026-08-17 first-session audit
(~20 blocking interruptions before L10; player never plays 2 puzzles
back-to-back)

- **F7. Stars are a hidden boolean** (moves ≤ totalWords is ALWAYS true → 3★
  = hintsUsed===0) so 3★ + FLAWLESS both fire on every early win; three
  rewardless flawless ceremonies inside session 1. FIX: align 3★ with
  perfectRun (no hints/undos/shuffles), 2★ = one assist; small coin grants +
  autoDismissMs on 3/5/7 flawless milestones. Interacts with R1 — ship
  together. ~25 lines + tests (starThresholds defined and unread).
- **F10. First session has no ending hook.** SessionEndReminder is dead code
  (setShowSessionReminder never called); comeback ping is 3 days out.
  FIX: fire reminder on Home when puzzlesSolved≥3 && daily not done; 20h
  comeback ping when puzzlesSolved<10. ~40 lines.
- **F-minor:** economy primer hardcoded EN (i18n); onboardingMilestones
  advertise wrong unlock levels (3/8/12 vs actual 2/6/8); getNextMilestone
  returns LAST eligible so keep_going can never display; auto-advance timer
  not suppressed while a ceremony is on screen (PuzzleComplete:485-489);
  LoadingTip/loadingTips.ts never imported.

### Juice (moment-to-moment) — from the 2026-08-17 feel audit

- **J2-remainder (visual only).** Stuck-fail audio/haptic/a11y shipped in
  batch 3; still open: dim the stranded-word tiles via the spotlight-dim
  path + slide the banner in with a spring instead of a hard mount.
- **J3-remainder.** Idle gate fix shipped; still open: pre-monetization ~45s
  "still findable" chip shimmer (reassurance tier before the hint/ad CTA).
- **J6. Big-word celebration over-juiced** (`GameScreen.tsx:1523-1549`):
  random ALL-CAPS adjective + ±14px shake + 3 stacked haptics. FIX: factual
  "7 LETTERS" badge, ±6px or grid-breath, single haptic, real `bigWord` SFX
  slot. ~25 lines.
- **J7. Trace pitch ladder collapses on confident swipes** (one sound per
  40ms batch, `PlayField.tsx:144-168`). FIX: schedule per-cell taps at ~22ms
  offsets, cap 4/batch, keep single haptic. ~15 lines.
- **J8. Score popup: opaque slab at fixed top:33% for ~900ms.** FIX: origin
  at cleared-word centroid via `cellPositionToScreen`, translucent chip,
  ~350ms hold. ~60 lines (grid-area offset threading is the fiddly part).
- **J9. Tiles vanish by unmount — no clear animation.** Ghost layer at last
  coordinates, 140ms scale+fade, gated `!reduceMotion` (instant vanish IS
  correct reduce-motion). `GridDissolveEffect.tsx` is dead code built for
  this. ~70 lines.
- **J10. Bonus coin tile payoff is a string concat** + badge can be destroyed
  silently by an overlapping word. FIX: idle badge pulse (isolated shared
  value), gold-only bloom + coin flight on collect, "coin tile lost" note on
  destruction. ~80 lines, behind bonusTileEnabled.
- **J11 (design, needs user sign-off). "Kept it open" sequencing
  acknowledgment** — solver already knows when a clear avoided a dead end;
  once-per-puzzle teal tint + caption, NO score bonus/multiplier/escalation.
  New beat outside the sanctioned list — do not ship without approval.

### Retention (session-to-session) — from the 2026-08-17 retention audit

- **R2. Notification cap counts scheduling not delivery** (one app open burns
  the whole daily budget, `notifications.ts:332-356`); per-segment
  streakReminderHour/dailyChallengeHour authored but read nowhere. ~30 lines.
- **R5. Returning-player modal pile-up** — login calendar (900ms), streak
  shield offer (1000ms), PostStreakBreakOffer, welcome-back, MysteryWheel,
  ceremonies — no sequencer. FIX: shared overlayOwner priority order;
  suppress shield UPSELL when break RESTORE is showing. ~50 lines.
- **R6. No "almost done" meta goal on Home.** NextGoalCard picking the
  closest-to-completion goal (chapter stars / wing / atlas page / mastery
  tier), one CTA. ~80 lines.
- **R7. Mid-game skill gap taught once, in the easy zone.** Dead-end
  explainer is once-per-lifetime and burns at L1-30 (12% zone); 57% zone is
  L31+. FIX: re-show per difficulty phase (~4 lifetime), L31 entry banner,
  stuck-banner CTA "see which word to clear first" using order-safe getHint.
- **R8. Ten modes unlock by L22 then nothing pulls players back.** Render
  modeStats on cards, per-mode 3-tier goals, deep-link the recommendation,
  late unlock beats (L60/L80). ~60 lines.
- **R9. DailyRewardTimers fully built, rendered nowhere** — wire into LIVE
  NOW rail or delete.

### Verified-good (do NOT break)

Daily variety architecture, streak forgiveness, order-matters teaching
(tutorial board D + dead-end banner + order-safe hints), per-tap render
isolation, selection trail behind tiles, rising tap pitch, last-word tension
coordination, victory polish, humane stuck-rescue logic,
legacyTaskCardsEnabled=false, honest reminder scheduling.

## SHIPPED

- 2026-08-17 (batch 5 — tutorial teaches searching + events play real rules):
  - **F2** tutorial renders the find-list chips from step 1 (checked off as
    found); step 3 hides the highlight + hand pointer so the player locates
    DOG unaided (positions stay authored for input validation and the
    gravity-replay integrity test — new `hideHighlight` step flag); step-1
    copy teaches drag as well as tap.
  - **F6** MilestoneCeremony gained a `tips` prop; the first_win ceremony
    now renders the three gravity/order teaching rows it always carried in
    data (two onboarding phases were deleted on the promise it would), and
    auto-dismiss went 4000 → 6000ms so they're readable.
  - **F8** L5-10 board-shape monotony broken: 6×5 → 6×6 (first 5-letter
    word at L7) → 7×6 (L8-9) → 6×5 breather at L10. curveProfile now pins
    shape (rows×cols) runs ≤2 through L14 — the old guard keyed on full
    config and passed six identical shapes.
  - **R4** events play their rules: speedSolve → timePressure (authored 60s),
    perfectClear → perfectSolve, expertGauntlet → perfectSolve at expert,
    gravityFlipChampionship → gravityFlip, themeWeek → curated nature word
    list; the rest stay classic deliberately. Pure mapping layer
    `getEventPlayConfig` in events.ts + unit suite.
  - **Weekly board is now a pure function of the week id**: theme words made
    candidates slow enough that the 700ms wall-clock cut returned different
    boards across runs on the SAME device (cache eviction → different
    puzzle, caught by sharedBoards.test). The weekly search now ignores the
    clock (`deterministic: true`) and is bounded by attempts (64 → 24;
    worst measured ~1.9s). Follow-up idea: prewarm the weekly cache off the
    tap path (InteractionManager after Home mount) to hide the rare slow
    week on low-end devices.

- 2026-08-17 (batch 4 — streak systems pay + never dead-end):
  - **R1** flawless-streak milestones are re-earnable per run
    (rewardsClaimed resets on break — losing a real streak IS the
    anti-farm), pay escalating rewards via a new
    ceremonyEconomyGrant/flawlessMilestoneGrant case (3→50c up to
    20→800c+50g, then 400c+25g every 10 past 20 so the ladder never ends),
    ceremony shows the exact credited amount, autoDismissMs 3500 (three can
    land in one strong session — they shouldn't each demand a tap).
    FlawlessStreakCard always has a next milestone.
  - **R3** play-streak ladder [7,14,30,60,100] →
    [3,5,7,10,14,21,30,45,60,100]: tiers in the D2-D6 habit window and no
    gap >15 days until 30. Pure data change; ceremonyQueue pins updated to
    assert the properties (early tier ≤3, bounded gaps), not the old array.
- 2026-08-17 (batch 3 — fail-state feel + visible gravity):
  - **J2 (core)** the board dying now has a beat: `puzzleFailStuck` synth
    chord over ducked BGM + new Warning-grade `stuckHaptic` + screen-reader
    announcement naming the buried word, once per dead end; hard fails
    (timeout → `puzzleFailTime`, violation → `puzzleFailInstant`) get the
    same treatment with a double-play guard.
  - **J3 (core)** idle-nudge timer no longer gated on having hints — the
    out-of-hints ad banner was unreachable dead code; canShowAdHint still
    suppresses it in no-hint modes.
  - **J4** gravity fall values now created at Grid render time (transform
    attached from a tile's first post-gravity frame — kills the
    teleport-then-fall pop); column stagger radiates from the cleared word's
    centroid instead of always sweeping left-to-right; gravityLandHaptic now
    fires under reduce-motion too (motion off ≠ feedback off).
  - **F3** easy gravity boards prefer a small shared-column overlap for the
    last-placed word: 77% → 97% of L1-10 boards now have a clear order that
    visibly moves another word's letters, forgiveness gate unchanged at
    0.95. Pinned by new `visibleGravity.test.ts` (≥90% floor); all perf/
    stuck/skilled guards re-run green. Suites 99 → 100.
- 2026-08-17 (batch 2 — trace release + FTUE de-interruption):
  - **J1** dead traces release silently ~180ms after finger lift (per-gesture
    multi-cell detection in Grid keeps tap-by-tap selection working; valid
    words always win via the 50ms auto-submit); the restart-tap error
    treatment (error haptic + red flash + shake) is deleted — restarting a
    trace is normal play, per game_mechanics.md.
  - **J5** last-word chip pulse + tension overshoot now respect
    reduce-motion (static gold border carries the meaning).
  - **F1** the FTUE paywall-before-first-puzzle is gone (App.tsx queue block
    removed, `firstSessionStarterBundleEnabled` default false) — the
    well-timed L5-6 offer in useRewardWiring is the only first-purchase
    surface again.
  - **F4** last-word tension gated to boards with ≥4 words
    (LAST_WORD_TENSION_MIN_WORDS) — no more climax on the first word of L1.
  - **F5** level-1 baseline unlocks (Play tab, Classic/Daily) no longer fire
    congratulation ceremonies; state still set.
  - **F9** NEXT always gives the next puzzle — the free-spin prompt no
    longer hijacks it on L1/L5/L10 (still fires on the Home exit path).
- 2026-08-17 (batch 1): **Streak reminder stale-snapshot fix** (App.tsx
  passes post-update today + floor-1 streak — kills the false "expires
  tonight!" ping on days already played); **hardcore segment gets
  streak_reminder** (the cohort with the most to lose had zero safety net,
  maxPerDay 1→2); **daily card names tomorrow's board** ("Tomorrow: Tall
  Tower · Night Sky" instead of "Come back tomorrow!").

## REJECTED (considered, decided against — with reason)

_(none yet)_
