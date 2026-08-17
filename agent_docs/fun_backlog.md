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

### Juice (moment-to-moment) — from the 2026-08-17 feel audit

- **J1. Failed trace never releases + restart fires the error treatment.**
  `Grid.tsx:409-422` onEnd only clears refs; `clearSelection` action has ZERO
  production call sites; non-adjacent restart tap → `lastSelectionResetTap` →
  full invalid flash (error haptic + red flash + ±8px shake,
  `GameScreen.tsx:1236-1248`). Contradicts game_mechanics.md ("invalid-word
  rejection doesn't exist"). FIX: onDragEnd → CLEAR_SELECTION after ~180ms
  grace (auto-submit timer must win), silent trail fade-out, delete the
  invalid-flash wiring for restarts. ~40 lines. THE top feel fix.
- **J2. Stuck fail is silent + motionless.** `defeat` SFX fully built
  (`sound.ts:134,261,755`) and never played anywhere; no haptic/dim/slide on
  `isStuck`. FIX: rising-edge → defeat SFX + BGM duck + Warning haptic (new
  `stuckHaptic`, not errorHaptic) + dim stranded-word tiles (spotlight-dim
  path) + banner slide-in + a11y announce. ~50 lines.
- **J3. Idle nudge unreachable for out-of-hints players.** Timer armed only
  when `hintsAvailable > 0` (`GameScreen.tsx:1266-1274`) but the ad banner
  requires `hintsAvailable === 0` → dead code. FIX: drop the gate (3 lines);
  optionally add pre-monetization 45s "still findable" chip shimmer.
- **J4. Gravity first-fall teleport frame + wave direction ignores cause.**
  Lazy Animated.Value created after commit (`GameScreen.tsx:1381-1409`,
  `Grid.tsx:547` reads undefined on first fall). FIX: create value lazily at
  render in Grid (~10 lines). Also: order column stagger by distance from
  cleared-word centroid (2 lines); move `gravityLandHaptic()` into the
  reduce-motion else-branch (a11y regression — motion off ≠ feedback off).
- **J5. Last-word chip pulse ignores reduce-motion** (`WordBank.tsx:115-149`
  indefinite loop, no useReduceMotion import). One-line guard; fall back to
  static gold border. Ship with J1/J2 batch.
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

- **R1. Flawless streak pays nothing and dies permanently at 20.**
  `PlayerContext.tsx:1489-1508` lifetime rewardsClaimed; no
  ceremonyEconomyGrant case. FIX: reset claims on streak break (re-earnable
  per run), add escalating grant case (3→50c … 20→gems+booster), repeating
  milestone every 10 past 20. ~40 lines. Highest-value retention fix.
- **R2. Notification cap counts scheduling not delivery** (one app open burns
  the whole daily budget, `notifications.ts:332-356`); per-segment
  streakReminderHour/dailyChallengeHour authored but read nowhere. ~30 lines.
- **R3. Play-streak milestones [7,14,30,60,100]** — nothing in D2-D6 where
  habits form, 16-day hole at 14→30. FIX: [3,5,7,10,14,21,30,45,60,100] with
  small new-tier rewards (pure data change, `constants.ts:785`).
- **R4. Events' Play button starts a plain classic puzzle**
  (`App.tsx:232-233` hardcodes mode='classic', event rules never consulted).
  FIX: map speedSolve→timePressure, perfectClear/expertGauntlet→perfectSolve,
  gravityFlipChampionship→gravityFlip, themeWeek→themeWords. ~40 lines.
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

- 2026-08-17: **Streak reminder stale-snapshot fix** (App.tsx passes
  post-update today + floor-1 streak — kills the false "expires tonight!"
  ping on days already played); **hardcore segment gets streak_reminder**
  (the cohort with the most to lose had zero safety net, maxPerDay 1→2);
  **daily card names tomorrow's board** ("Tomorrow: Tall Tower · Night Sky"
  instead of "Come back tomorrow!").

## REJECTED (considered, decided against — with reason)

_(none yet)_
