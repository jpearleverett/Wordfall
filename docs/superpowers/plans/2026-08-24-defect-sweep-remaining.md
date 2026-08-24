# Defect sweep — remaining work (2026-08-24)

Status ledger: `src/__tests__/perfAnimationLedger.json` (machine-checked;
`node scripts/perf-scorecard.js` prints % done). 90 entries fixed so far:
84 perf/animation + the 6 review bugs. A repo-wide correctness hunt
(adversarially verified) confirmed **96 more bugs**; fixing them is in
flight. This file is the to-do list for finishing that campaign.

## A. In flight / uncommitted

1. **Game-core charge/deliver batch (orchestrator, validated, uncommitted):**
   hint/shuffle/premium-autosolve charge gates (`canProduceHint` /
   `canSmartShuffle`), wildcard cancel no-longer-double-charges +
   id-based remap after gravity + destroyed-marker refund, undo restores
   consumed doubler/freeze, premium hint now breaks FLAWLESS,
   daily/weekly snapshot bounded to its own UTC period, timePressure
   background catch-up tick, prestige hint/rare-tile decoders + free-hint
   provisioning in GameScreen. **Next: ledger entries + commit.**
2. **Orphaned-but-valid agent edits (uncommitted, typecheck-clean):**
   week-id year-boundary fix (client `src/utils/weekId.ts` + server twin),
   `puzzleResults` rules hardening, partial `functions/src/social.ts`
   server fixes, `firestore.indexes.json` addition. **Next: verify each
   owning job's finding list is fully covered, complete gaps, commit.**

## B. Fix wave to re-run (subagent limit reset)

The 16-job fix wave died on a session limit; re-run it minus whatever A.2
already covers. Findings source:
`scratchpad/bugs-confirmed.json` (96 confirmed, per-file clusters):
- functions/social+index (clubId never written, streak-reminder field,
  weekly-rerun idempotency, dead chain/combo goal templates, autokick,
  account-deletion event scores, day2 filter, pooled personal goals)
- PlayerContext (cloud LWW clobber, shallow hydration, hydration-failure
  freshness, referral milestone currency, prestige metric reset, segments
  overwrite, club discovery race)
- useRewardWiring (mode-level cross-writes, daily replay farm, mastery
  premium lane, win-streak reset, lastLevelStars, achievement lag,
  seasonal quest modes_played)
- PlayerProgressContext + weeklyGoals + seasonalQuests (weekly-goal +
  seasonal-final rewards never granted, stale shield, shield play-day,
  restore off-by-one, missions panel, dead tracking keys, achievement
  metrics)
- EconomyContext + iap (value-pack drip never claimed, consume-before-
  persist, season-pass rare_tile/mystery_box delivery, offline persist
  block, cloud adopt revert, ad-life timer)
- dynamicPricing + shopProducts + ShopScreen (flash-sale price honesty,
  mega bundles, VIP cosmetic ids, ad-spin grants no spin, VIP claim copy)
- App.tsx + GiftInbox (gift conversion divergence, energy ad without ad,
  comeback tier ids, hard-energy debit after refill, spin prompt)
- analytics.ts (flush mutex, opt-out boot race, load race, stale session,
  UTC day markers)
- events batch (score-unit mismatch, hints key, unimplemented bonuses,
  DST-safe dates, tier badge decoration, club fallback template)
- notifications.ts (persisted cancel registry, cohort filter inversion,
  deterministic template)
- useDeepLinks (daily link without board, initial link dropped)
- persistence batch (secureStorage migration + torn writes, inbox
  claim-before-credit, googleAuth recovery clobber, isSignedIn on signout)
- solver/chapters/referral (dead-end timeout ≠ stuck, chapter boundary
  off-by-one, referral code collision)
- misc batch (experiments fallback, unmute BGM, RC dead mirror, login
  calendar 7day variant, home shield offer props, friend-challenge
  honesty)
- GameScreen two named sites (shield-offer timing predicate, offer
  funnel param name)

## C. Orchestrator-owned cross-cutting items (after the wave)

- **vipActive client wiring**: read `users/{uid}.vipActive/vipExpiresAt`
  on app open and reconcile into EconomyContext VIP state (server
  renewals currently never reach the client).
- **Prestige rare-tile bonus** into useRewardWiring's drop roll
  (`getPrestigeRareTileBonus` decoder already landed).

## D. Finalization

- Harvest all agent ledger entries → ledger; flip statuses honestly.
- Rename `perfAnimationLedger` → `defectLedger` (json + test + scorecard
  + CLAUDE.md row) now that it spans correctness classes C1–C8.
- Full verification: `npm run typecheck`, full jest, engine benchmark
  suites, **`npx expo export --platform android`** (hermes bundle — not
  yet run this session), scorecard, push.

## E. User-side (outside this repo)

- `firebase deploy --only firestore:rules,firestore:indexes,functions`
  now carries: weekly/event + daily score ceilings, joinClub/leaveClub,
  clubId writes, autokick fix, weekly-rerun idempotency, puzzleResults
  hardening, apple-SSN index, week-id year-boundary fix.
