# Defect sweep — completion record (2026-08-24)

**Status: complete.** Every confirmed defect from both Aug-2026 sweeps is
fixed on `claude/game-perf-animation-fixes-ro85vl` and machine-guarded.

Ledger: `src/__tests__/defectLedger.json` — **183 entries, 183 fixed
(100%)**, enforced in both directions by `src/__tests__/defectLedger.test.ts`
(a regressed "fixed" entry AND a stale "open" entry both fail the build).
`node scripts/defect-scorecard.js` prints the breakdown.

## What was swept

| Sweep | Method | Result |
|---|---|---|
| Perf / animation | 15 finders + adversarial verifiers over every screen, ceremony, overlay, effect, context | 87 confirmed → all fixed |
| Branch review bugs | 6 pre-existing bugs surfaced in review | all fixed |
| Correctness | 12 domain finders + per-cluster adversarial verifiers over economy, cloud, engine, state, progression, time, persistence, flows | 96 confirmed, 5 rejected → all fixed |

Classes: F3/F4/F6 (animation ownership, state-swap flash, interrupted
lifecycle), P1–P9 (re-render, virtualization, leaks, blurred work,
reduce-motion, sync work, keys, dead code), C1–C8 (money, server,
gameplay contract, time/determinism, input, progression, persistence,
telemetry).

## Verification at close

- `npm run typecheck` — clean
- `npm test` — **142 suites / 2086 tests** green (started at 117 suites /
  1655 tests with 3 failing suites)
- Engine game-feel benchmarks (boardGen.perf, stuckRate, skilledPlay,
  hintPerf, modeSolvability) — 31 tests green; invariants held through
  the solver and generator changes
- `npx expo export --platform android` — **Hermes production bundle
  builds** (12MB `.hbc`); this is the release-blocking check typecheck and
  jest cannot substitute for
- `node scripts/defect-scorecard.js` — 183/183

## Not done (deliberately)

- **Device motion pass.** No physical device/emulator in this environment,
  so the frame-by-frame flicker matrix in the original design doc
  (`2026-08-23-animation-performance-hardening-design.md` §Manual motion
  matrix) is unperformed. Automated geometry/lifecycle guards and the
  Android export stand in; the device walkthrough is still owed before
  release.
- **`firebase deploy`** (user-side, outside this repo). The branch's server
  halves ride it: daily/weekly/event score ceilings, `joinClub`/`leaveClub`
  + `users.clubId` maintenance, autokick fix, weekly-payout idempotency,
  streak-reminder query fix, account-deletion sweep, `puzzleResults` and
  leaderboard direct-write rules hardening, apple-SSN collection-group
  index, week-id year-boundary fix. Until it runs, those client paths use
  their existing fallbacks.
