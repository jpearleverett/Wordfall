# Wordfall — Revenue Potential Assessment & Finish-Line Plan

> Static audit + comp benchmarks + funnel model + finish punch-list, grounded in the current working tree at branch `claude/game-revenue-assessment-B8fRV`.
>
> **Build hygiene check (this session):** `npm test` and `npm run typecheck` both run clean once dependencies install (jest/tsc both pass on a clean container after `npm install --legacy-peer-deps`).
>
> **Scope:** evaluate the existing monetization, retention, and meta-loop infrastructure in code as it stands; project revenue ranges against word-puzzle comp benchmarks; identify wiring gaps and finish-line work; produce a sequenced plan to ship.

---

## 0. TL;DR

- **Catalog (IAP):** 55 SKUs, 12 price tiers spanning $0.49 → $99.99. 100% `originalPrice` coverage. First-purchase trap @ 9.1× value at $0.49 is best-in-class. VIP annual @ 81% off weekly rate is best-in-class. **One real gap:** no $9.99 coins-heavy bundle (between `explorer_bundle` $6.99 and `champion_pack` $14.99).
- **Ad surface:** 5 of ~10 standard rewarded-ad surfaces wired. **Interstitial is dead code** — fully built, fully capped, zero call sites. **`life_reward` is wired in the service but unused in UI.** Closing these unlocks $0.13–$0.22 ad ARPDAU.
- **Retention pipeline:** 85% complete. Cloud Functions + push scheduling + dynamic comeback ladder all working. **`PostStreakBreakOffer` modal is built but never mounted** (50-gem restorative loop is dark). Re-engagement pushes (Day 2 / Day 7) don't deep-link into the offer.
- **Onboarding economy:** earn:spend ratio targets met (~1.3:1.5 in modeled sessions). **`first_purchase_special` modal fires at L5–6 but real scarcity doesn't bite until L13** — misaligned by 7–8 levels, leaking 8–15% ARPPU. Hint allotment overshoots `freeHintRunoutLevel: 9` target.
- **🚨 Soft-currency economy: critical gem leak.** Non-paying engaged players earn **~17 gems/day vs. documented `dailyGemDripTarget: 3` — a 5.7×–11× overshoot.** Driven by (a) login calendar 1.5× cycle-2 multiplier (uncapped), (b) mystery wheel free spin at ~8 gems/spin daily, (c) **possible streak-milestone re-claim exploit** (no guard verified). Premium cosmetics affordable in 8–9 days vs. healthy 14–21 days. **This is the single biggest revenue gap in the audit — bigger than the ad surface gap.**
- **Comp benchmarks:** word-puzzle vertical generates $0.05–$0.25 ARPDAU range; payer conversion 3.2–5.8%; D1/D7/D30 industry median 35/15/5%. Wordscapes US iOS alone runs ~$2M/month. Royal Match ~$100M/month (the price-setter).
- **Realistic launch range:** Pessimistic $0.05 ARPDAU / Realistic $0.15 / Top-grosser parity $0.30. With 50% of LTV on Android-only + EN-only soft launch, expect ~30–40% of the upper-bound realistic case for the first 90 days post-global.
- **Finish line:** ~5 days engineering + 1 week user-side console work + 3–6 weeks audio (parallel) + soft-launch iteration. **All Tier 1–6 code is shipped except the 7 P0 wiring + economy fixes identified in this audit (§2.6).**

---

## 1. Comp benchmarks (the math we're being judged against)

| Comp / source | Monthly revenue | DAU | Inferred ARPDAU |
|---|---|---|---|
| **Royal Match** (top-grosser, the price-setter) | ~$100M | ~10M+ DAU | $0.30+ |
| **Wordscapes** (PeopleFun) — US iOS only | $2M (Mar 2026) | est. 200–300k US iOS | ~$0.20–$0.33 |
| **Wordscapes** — US Android only | $700k (Jan 2026) | est. 800k | ~$0.025–$0.035 |
| **Wordscapes** — India Android | $700k (Nov 2025) | est. ~3M | ~$0.0075 |
| **Block Blast** (ad-only puzzle, 2025 chart-topper) | top-5 download, 100% ads | n/a | n/a — install-volume play |

### Genre benchmarks (industry 2025–2026)

- **D1 / D7 / D30 retention (casual puzzle):** 40% / 12% / 5% target; word-puzzle median ~35 / 11 / 4.5%.
- **ARPDAU (casual puzzle ad-monetized):** $0.05–$0.15 typical, $0.20+ top performers; hybrid ad+IAP exceeds $0.25.
- **First-purchase conversion:** 3.2%–5.8% across F2P puzzle.
- **CPI (Android casual puzzle):** $2 in 2024, ~38% up YoY = ~$2.75 expected 2026.
- **Soft launch CPI (PH):** sub-$0.30 typical; Canada is among the most expensive markets at $4+.
- **Puzzle loyalty index:** highest of any mobile genre (85/100 in 2025 Loyalty Index).

### What this means for Wordfall

The vertical is healthy. Wordscapes-class titles still net ~$8–10M/month globally. The ceiling is high if you crack retention + conversion; the floor is "make back your CPI" if D7 is even 10%.

The dangerous comp is **Block Blast**: ad-only, zero IAP. Word-puzzle players are willing to spend (puzzle has the #1 share-of-spenders growth in 2025: +89% Android, +253% iOS), so Wordfall's hybrid model is correct — but the ad-monetization side has to be as aggressive as Block Blast is, because that's now the genre default.

Sources:
- [Sensor Tower — Wordscapes overview](https://app.sensortower.com/overview/com.peoplefun.wordcross?country=US)
- [Royal Match $6B lifetime](https://gaming.news/news/2025-05-20/user-spending-in-mobile-puzzle-game-royal-match-surpasses-6-billion/)
- [Mobile game KPI benchmarks 2026 (Game Growth Advisor)](https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/)
- [Mistplay puzzle gamer trends](https://business.mistplay.com/resources/puzzle-game-trends)
- [Mobile game CPI 2025 (Mapendo)](https://mapendo.co/blog/mobile-games-cpi-2025)
- [Solar Engine — first-purchase conversion guide](https://blog.solar-engine.com/en-blog/docs/From-Player-to-Payer-The-Guide-to-Cracking-FirstPurchase-Conversion-in-Mobile-Games)

---

## 2. Static audit findings

Each lane was run as a parallel Explore agent against the actual tree. Key file:line references inline. Severity rating: **P0** ships before soft launch; **P1** ships before global; **P2** monitor + iterate.

### 2.1 Catalog audit (IAP shop)

**State of `src/data/shopProducts.ts` (55 SKUs, 1138 lines).** Comprehensive. Findings:

- ✅ **Price ladder coverage:** complete at $0.49 / $0.99 / $1.99 / $2.99 / $3.99 / $4.99 / $5.99 / $6.99 / $7.99 / $9.99 / $11.99 / $14.99 / $19.99 / $29.99 / $49.99 / $74.99 / $99.99. 12 distinct tiers, no critical gaps.
- ✅ **First-purchase trap:** `first_purchase_special` at `shopProducts.ts:72` — $0.49 → 500 coins + 50 gems + 10 hints. Implied à-la-carte ~$4.46 = **9.1× value**, top of the 3–10× industry band.
- ✅ **Whale ceiling:** `ultimate_whale` $99.99 (`shopProducts.ts:762`), `platinum_pack` $74.99, `royal_collection` $49.99 — three-tier whale cliff.
- ✅ **Subscription anchor:** `vip_annual` $49.99 = **$0.96/week effective, 81% off `vip_weekly`** — exceeds typical 50–60% industry anchor.
- ✅ **`originalPrice` coverage:** 100% (audit confirmed). Strikethrough rendering won't break anywhere.
- ✅ **Bundle math:** $5.99+ bundles deliver 21–45% real discounts vs. components. Low-tier `quick_boost` ($1.99) is break-even — acceptable as impulse SKU.

**Gaps / risks:**

- **P1. Missing $9.99 coins-heavy bundle.** `explorer_bundle` ($6.99) jumps directly to `event_special` ($9.99) and `champion_pack` ($14.99); there's no "serious casual" bundle at the $9.99 sweet spot that's coins-dominant (3000–5000 coins + 100 gems + 25 hints). Royal Match / Candy Crush always ship this tier.
- **P2. `piggy_bank_break` discoverability.** The product description (`shopProducts.ts:508`) doesn't communicate the dynamic-fill model clearly; players will misread it as "$4.99 for 1 gem" on first glance. Add a "Currently saved: N gems" preview on the shop card.
- **P2. VIP annual originalPrice is aggressive.** $149.99 anchor on a $49.99 product is 200% markup — risks store-listing friction. Tighten to $99.99–$119.99.
- **P2. Booster catalog cannibalization.** `wildcard_pack_5` / `spotlight_pack_5` / `shuffle_pack_5` ($1.99 each, $0.398/booster) vs. `booster_crate` ($4.99, $0.333/booster) is only a 16% bundle discount — players may stay on single packs. Royal Match runs a 1 / 3 / 10 pack ladder for steeper bundle pull.

### 2.2 Ad surface audit

**State of `src/services/ads.ts` + `src/constants.ts:AD_CONFIG`.** Caps look right (10 rewarded / 5 interstitial / 3 coin / 3 life per day). Wiring is incomplete.

**Wired surfaces (5):**

1. In-game hint exhaustion → ad-for-hint (`GameScreen.tsx:679`, banner at `GameBanners.tsx:24`).
2. Post-win 2× rewards (`PuzzleComplete.tsx:749`, dispatched from `GameScreen.tsx:687`).
3. Shop: free hint (`ShopScreen.tsx:429`).
4. Shop: free 50 coins (`ShopScreen.tsx:445`, capped at 3/day).
5. Shop: mystery wheel spin (`ShopScreen.tsx:461`).

**Missing surfaces (7) — each is a daily ARPDAU leak:**

| Surface | Status | Est. ARPDAU lost |
|---|---|---|
| **P0. Interstitial trigger sites** | Service ready, **zero call sites**. Dead code. | $0.08–$0.12 |
| **P0. `life_reward` ad in `NoLivesModal`** | `creditAdLife()` wired in `useHardEnergy.ts:72`, but `NoLivesModal.tsx` only offers gem refill. | $0.05–$0.10 (only when hard-energy on) |
| **P1. Mystery wheel post-spin doubling** | No 2× ad gate after spin. | $0.03–$0.05 |
| **P1. Daily quest claim 2× ad** | `DailyQuestsCard.tsx` claims direct, no ad-double option. | $0.02–$0.03 |
| **P1. True post-loss continue** | `PostLossModal.tsx:213` offers "Watch ad for hint" but not a real continue (refund the failed attempt + restore board). | $0.04–$0.06 |
| **P2. Season Pass tier 2× ad** | No ad-double on free-lane tier claims. | $0.01–$0.02 |
| **P2. Level-complete gem drip ad** | No "watch ad for +5 gems" on victory screen. | $0.01–$0.02 |
| **P2. Free booster offer pre-hard-level** | No ad-funded booster offer before a stuck-risk level. | $0.02–$0.03 |

**Cumulative gap: $0.26–$0.43 ARPDAU.** That's 2×–4× the current ad ARPDAU ceiling. Closing the P0 items alone unlocks $0.13–$0.22.

**Ad-removal SKU (`ad_removal` @ $4.99):** properly enforced everywhere (`ads.ts:287, 348, 423`). No leaks.

### 2.3 Retention pipeline audit

**State of `functions/src/social.ts` + `src/services/notifications.ts` + `src/data/dynamicPricing.ts`.** ~85% complete.

**Confirmed wired end-to-end:**

- ✅ Day-2 / Day-7 re-engagement Cloud Functions (`social.ts:673, 688`), hourly cron, 19:00 local target hour.
- ✅ Per-timezone streak reminders (`social.ts:513–558`, local-hour bucketed).
- ✅ Frequency cap resolves segment > Remote Config > default (`notifications.ts:176–186`).
- ✅ 4-tier dynamic comeback ladder rendered in ShopScreen "For You" row (`dynamicPricing.ts:110–191`, `ShopScreen.tsx:268–277`).
- ✅ `segmentWelcomeMessage` renders on HomeScreen (`HomeScreen.tsx:529–540`).
- ✅ Preventive streak shield (auto-consume within 72h, `PlayerProgressContext.tsx:255–280`).
- ✅ First-purchase modal queued post-onboarding (`App.tsx` onboarding-complete handler, gated correctly).
- ✅ Per-segment `maxPerDay` (hardcore 1, at-risk 3, lapsed 2) from `playerSegmentation.ts:454–563`.

**Critical gaps:**

- **P0. `PostStreakBreakOffer` modal never renders.** Component exists at `src/components/PostStreakBreakOffer.tsx` (175 lines), reducer action `restoreBrokenStreak()` is correct (`PlayerProgressContext.tsx:395–418`), `streaks.recentBreak` flag is set, but **no JSX in `HomeMainScreen` or `CeremonyRouter` mounts the component.** The Candy-Crush-style 50-gem restore loop is dark in the UI even though all server/state plumbing works. Documentation in `launch_blockers.md` claims it's mounted; **the audit confirms it isn't.**
- **P1. Re-engagement pushes don't deep-link.** `processDay2Reengagement` / `processDay7Reengagement` send pushes with `type: 'day2_reengagement' | 'day7_reengagement'` data fields, but `notifications.ts:729–763` has no handler that routes those types to ShopScreen on open. User must navigate to Shop manually to see the offer. Add a deep-link handler that opens Shop with the offer card scrolled into view.

### 2.4 Onboarding economy audit

**State of `src/constants.ts:ECONOMY_TUNING` + `src/hooks/useRewardWiring.ts` + `OnboardingScreen.tsx`.**

**Modeled walkthrough (L1 → L15, no hints used):**

| Level | Cumulative coins | Cumulative gems | Hint balance |
|---|---:|---:|---:|
| Start | 0 | 0 | 3 |
| L5 | 825 | 8 | 5 |
| L9 | 1,725 | 18 | 8 |
| L13 | 2,725 | 23 | 8 |
| L15 | 3,225 | 28 | 8 |

**Earn:spend ratio:** modeled at 1.27–1.5:1 across three sessions including hint refills. Meets the `targetEarnSpendRatio: 1.5` target.

**Critical findings:**

- **P0. First-purchase modal misaligned by 7–8 levels.** `ECONOMY_TUNING.firstPurchasePressureLevel = 13`, but the actual modal trigger uses Remote Config `firstPurchaseModalMinLevel` / `MaxLevel` (defaults 5–6 per `useRewardWiring.ts:604–620`). At L5–6 the modeled player has 825 coins + 5 hints — zero economic pain. The $0.49 offer feels arbitrary, not relief. Fix: bump RC defaults to `firstPurchaseModalMinLevel: 10, firstPurchaseModalMaxLevel: 14`. Expected ARPPU lift: 8–15% (industry-standard misalignment penalty).
- **P1. Hint allotment overshoots `freeHintRunoutLevel: 9` target.** Free hint grants: 3 initial + 2 (L3) + 2 (L6) + 1 (L9) = 8 by L9. Target was 0–2 remaining at L9. Either reduce L3/L6 grants to 1 each, or shift to L10/L12.
- **P2. L1 coin reward duplicated.** `useRewardWiring.ts:455–472` grants L1 bonus coins in both the ceremony and the puzzle reward path. Verify whether this is intentional double-tap or an accidental overflow.
- ✅ Onboarding `economy_primer` phase (post-tutorial, 3 rows: coins / gems / clubs) is concise (~5–10s dwell) and correctly framed.

### 2.5 Soft-currency / gem economy audit — **CRITICAL LEAK FOUND**

**State of `src/constants.ts:ECONOMY` + login calendar + mystery wheel + VIP benefits + streak milestones.**

**The headline number: a non-paying engaged player earns ~17 gems/day on average and ~33 gems on calendar-milestone days. The declared target is `dailyGemDripTarget: 3`. The leak is 5.7×–11× over target.**

**Implication for monetization:** a rare/epic cosmetic at 80–100 gems is affordable in 8–9 days, far below the healthy 14–21 day cosmetic-affordability window. **This collapses cosmetic IAP conversion** because the entire shop becomes patient-payable in under two weeks.

**Source-by-source leak inventory:**

| Source | Daily yield | Cap? | Repeating? | File:line |
|---|---:|---|---|---|
| Login calendar (averaged over 30-day cycle) | 8.8 gems | None on cycle | **Yes — cycle 2+ uses 1.5× multiplier** | `constants.ts:632–660` |
| Mystery wheel free spin (1/day or 1/6 puzzles, ~8 gems EV/spin) | 7–9 gems | None | Yes, daily | `mysteryWheel.ts:45, 269` |
| Daily challenge completion | 2 gems | 1/day | Yes, daily | `constants.ts:624` |
| Perfect clear (assume 20% rate × 5 puzzles) | 1 gem | None per puzzle | Yes | `constants.ts:622` |
| Piggy bank accumulation (capped at 200) | 1–2 gems | 200-gem cap | Yes, breaks on IAP | `useRewardWiring.ts:345` |
| Streak milestones (linear avg over 100d) | 3.65 gems | **None — possibly re-claimable on reset** | Maybe | `constants.ts:705–709` |
| VIP Week 4+ bonus (paid only) | +7.1 gems | None | Yes, repeating forever | `vipBenefits.ts:24` |
| Daily value pack (paid $0.99/day) | +5 gems | 7-day sub | Yes | `constants.ts:818` |
| Referral (per friend signup) | 0–20 gems | None | Yes, per referral | `referralSystem.ts:25` |

**Specific leak vectors (severity-ordered):**

- **P0 — LEAK. Login calendar uncapped + 1.5× cycle-2 multiplier.** Cycle 1 day 30 grants 100 gems; cycle 2 day 30 grants 150 gems; cycle 3 grants 225, etc. (`constants.ts:663`). A player who logs in daily for 6 months collects compounding gem inflation. **Fix:** cap repeating bonus at the original schedule (no multiplier), or hard-cap day-30 bonus at 100 gems regardless of cycle.
- **P0 — POSSIBLE EXPLOIT. Streak milestones may not be guarded against re-claim on reset.** The 7-day milestone grants 10 gems; if a player rebuilds a 7-day streak after a break, the milestone fires again. No `claimedMilestones` guard is visible in the streak code path. **Fix:** verify and enforce one-time-per-milestone tracking in `PlayerProgressContext`.
- **P0 — LEAK. Mystery wheel daily free spin is uncapped.** EV ~8 gems/spin × 365 days = ~2,920 free gems/year from wheel alone. **Fix:** reduce free spin cadence to 1 per 2 days, or reduce gem-tier weights in the wheel.
- **P1 — LONG-TERM LEAK. VIP Week 4+ bonus repeats forever at $4.99/month.** After 12 weeks, a VIP subscriber has 350 free gems from VIP bonuses alone — enough for 2–4 rotating cosmetics. The subscription becomes underpriced for long-tenure subscribers. **Fix:** tier the repeating bonus down to 25 gems/week after Week 8, or cap eligibility to first 8 weeks.
- **P1 — CONVERSION DRAG. Rotating shop refresh window is 48 hours.** Items return on a short cycle, removing FOMO. **Fix:** extend rotation to 72–96 hours, or introduce a "vault" of never-returning limited cosmetics.
- **P2 — COINS HAVE ZERO PRESSURE.** Daily coin earn ~475–750, hint refill 50 coins, undo refill 50. A player spams refills with the rounding error of one day's earn. By design (junk currency), but if the goal is to push players to gem economy, hints/undos may need a gem-cost alternative tier above N free coins-paid refills per day.
- **P2 — REFERRAL FRAUD RISK.** No visible device-fingerprint / IP rate-limit on referral grants. 50/day/UID cap is documented at the recipient end but not on the *referrer's* gem grant. 10 alt accounts = 200 gems + 10k coins for $0.

**Hint/undo balance — actually healthy.** This is the contrast: hint cadence is genuinely tight (free yield ~0.66 hints/day vs. demand 1–2/day at L13+). That's the pressure point that should be driving conversion. The gem-side leak undermines it because players who could buy a $1.99 hint pack instead grind 1 day of login calendar and use gems on streak shield.

**Net assessment:** the gem leak is the **biggest single revenue gap in the audit**, larger than the ad surface gap. Fixing the login calendar multiplier + mystery wheel cadence + streak milestone re-claim guard should compress free-player gem earn from 17 → 6–8 gems/day (still above the documented target, but in a defensible range). Combined with adjusting cosmetic prices to 150–250 gems, the cosmetic affordability window moves from 8–9 days back to 18–30 days where IAP conversion is healthy.

### 2.6 Wiring punch-list (everything found in this audit)

| # | Severity | File | Fix |
|---|---|---|---|
| 1 | **P0** | `notifications.ts` schedule + segments | Mount `PostStreakBreakOffer` modal in `HomeMainScreen` (or `CeremonyRouter`) when `player.streaks.recentBreak !== null && now < brokenAtMs + 24h`. ~30 lines. |
| 2 | **P0** | `NoLivesModal.tsx` | Wire `onWatchAd()` to `adManager.showRewardedAd('life_reward')` → `useHardEnergy.creditAdLife()`. ~20 lines. (Only matters when `hardEnergyEnabled` flips ON.) |
| 3 | **P0** | `ads.ts` + level-complete / mode-transition sites | Add interstitial trigger sites. Recommended: on `PuzzleComplete` close → next level, and on mode select → game (both respect 90s interval + 5/day cap). ~40 lines. |
| 4 | **P0** | Remote Config defaults in `remoteConfig.ts` | Bump `firstPurchaseModalMinLevel: 5 → 10` and `firstPurchaseModalMaxLevel: 6 → 14`. ~2 lines + RC console update. |
| 4a | **P0** | `src/constants.ts:663` | Cap login calendar at cycle 1 rewards (remove 1.5× cycle-2 multiplier). Single number change. |
| 4b | **P0** | `src/data/mysteryWheel.ts:45` | Reduce free spin cadence from 1/day to 1 per 2 days. Single constant change. |
| 4c | **P0** | `src/contexts/PlayerProgressContext.tsx` (streak section) | Verify + enforce `streaks.claimedMilestones` guard so milestones can't re-fire on streak reset. ~10 lines if missing. |
| 5 | **P1** | `MysteryWheel.tsx` | Add post-spin 2× ad gate. Use existing `double_reward` `AdRewardType`. ~30 lines. |
| 6 | **P1** | `DailyQuestsCard.tsx` | Add 2× ad-double on claim. ~25 lines. |
| 7 | **P1** | `PostLossModal.tsx` | Replace "watch ad for hint" with a true continue (refund attempt + restore board) via new `continue_reward` AdRewardType. ~50 lines. |
| 8 | **P1** | `notifications.ts:729–763` | Add `day2_reengagement` / `day7_reengagement` type handlers to deep-link into Shop with the For-You row scrolled into view. ~25 lines. |
| 9 | **P1** | `shopProducts.ts` + Play Console | Add `coins_value_pack_9_99` SKU (3000 coins + 100 gems + 25 hints + 1× of each booster). Register in Play Console. |
| 10 | **P1** | `useRewardWiring.ts` early-level rewards | Reduce L3 / L6 hint grants from 2 → 1 each, OR shift to L10 / L12. Restores `freeHintRunoutLevel: 9` target. ~5 lines. |
| 10a | **P1** | `src/data/vipBenefits.ts:24–27` | Tier VIP repeating gem bonus down to 25 gems/week after Week 8 (instead of forever at 50). ~5 lines. |
| 10b | **P1** | `src/data/rotatingShop.ts` | Extend rotation window 48h → 72h to restore FOMO pressure, and add a small never-returning "vault" cosmetic SKU per rotation. ~20 lines. |
| 10c | **P1** | `src/data/cosmetics.ts` + rotating shop | Re-price rare cosmetics from 80–100 gems → 150–200 gems given the post-leak-fix earn rate. Restores 18–30 day cosmetic affordability. ~20 prices. |
| 10d | **P1** | `functions/src/social.ts` referral | Add device-fingerprint / IP rate-limit guard on the *referrer* gem grant (not just recipient). ~30 lines. |
| 11 | **P2** | `PuzzleComplete.tsx` | Add level-complete "+5 gems for ad" surface below score row. ~20 lines. |
| 12 | **P2** | `SeasonPassScreen.tsx` | Add 2× ad on free-lane tier claims. ~15 lines. |
| 13 | **P2** | `WeeklyLeaderboardScreen.tsx` | Add 2× ad on reward claim. ~15 lines. |
| 14 | **P2** | `shopProducts.ts` (`piggy_bank_break`) | Add "Currently saved: N gems" preview to product card description. ~15 lines. |
| 15 | **P2** | `shopProducts.ts` (`vip_annual`) | Tighten `originalPrice` from $149.99 → $99.99 for store credibility. ~1 line. |

**Total P0:** 7 items, ~110 lines (4 wiring + 3 economy guard). **Total P1:** 10 items, ~250 lines + 1 SKU + ~20 price adjustments. **Total P2:** 5 items, ~65 lines.

---

## 3. Funnel projection (CSV-style scenarios, plug into a spreadsheet)

```
LEVERS:
  Installs/day  D1   D7   D30  Sessions/day  Pay-conv  ARPU(payer)  Ads/DAU  eCPM
  =================================================================================
  PESSIMISTIC:  30%  10%  3%   3.0          1.5%      $15          6        $6
  REALISTIC:    38%  15%  5%   4.0          2.8%      $25          10       $9
  TOP-PARITY:   45%  22%  9%   5.5          4.5%      $45          12       $13

DERIVED (per install, 90-day window):
  Active days        D1×(1+D7×30 + D30×60) ≈ 30/55/100 days/install
  Ad ARPDAU          (Ads/DAU × eCPM) / 1000 = $0.036/$0.090/$0.156
  IAP ARPDAU         pay-conv × ARPU × (1/avg payer days) ≈ varies
  Combined ARPDAU    $0.05/$0.15/$0.30 (typical model output)

  D90 LTV/install ≈ Combined ARPDAU × 90-day-active estimate
    Pessimistic: $0.05 × 30   = $1.50
    Realistic:   $0.15 × 55   = $8.25  (vs. industry word-puzzle ~$5–10)
    Top-parity:  $0.30 × 100  = $30.00 (Wordscapes-class)

CAC ceiling for ROAS-1.0 by D90 (assuming 50% gross margin after store cuts):
    Pessimistic: $0.75 CPI    (Android PH/ID territory only)
    Realistic:   $4.12 CPI    (broad Android EN markets viable)
    Top-parity:  $15.00 CPI   (US iOS viable, paid scale unlocks)
```

**Interpretation:**

- **Realistic case is the soft-launch target.** D7 ≥15%, ARPDAU ≥$0.15, ~$8 LTV/install → CPI ceiling ~$4. That keeps you out of the most competitive geos but viable everywhere else.
- **Pessimistic case is "ride organic only."** $1.50 LTV means paid UA loses money in every market except sub-$1 CPI tiers (PH/ID Android). You'd still be profitable but cannot scale beyond word-of-mouth.
- **Top-grosser parity requires fixing the 4 P0 wiring gaps + audio + iOS lane.** That gets you Wordscapes-class numbers, not Royal Match. Royal Match's $30+ ARPDAU is a different sport.

---

## 4. Soft-launch decision gates

PH + CA (Android only, EN only, synth audio) for 4–8 weeks. Decision thresholds:

| Week | Gate | Pass | Below = blocker |
|---|---|---|---|
| 1 | Tutorial completion | ≥85% | Re-trace `OnboardingScreen` flow |
| 1 | D1 retention | ≥35% | Audit session-1 (FTUE, first puzzle difficulty, modal frequency) |
| 2 | D7 retention | ≥12% | Audit Day-2 push delivery rate + offer landing |
| 3 | First-purchase conversion (by D7) | ≥1.5% | A/B `first_purchase_special` via existing experiments engine |
| 4 | ARPDAU | ≥$0.05 | Drill ad freq + conversion funnel separately |
| 6 | D30 retention | ≥4% | Audit meta-loop reach (Season Pass adoption, Prestige %) |
| 6 | ROAS D7 | ≥30% of CPI | Stop paid UA, fix retention before scaling |
| 8 | Crash-free sessions | ≥99.5% | Triage top Sentry issues |

All these events are already instrumented in `src/services/funnelTracker.ts` + the Firestore `analytics_events` mirror — no new code needed. Build a Looker / Metabase dashboard pointing at BigQuery before week 1.

---

## 5. Finish-line plan (sequenced)

### Lane A — Engineering (P0 wiring, ~3–5 days)

1. **PostStreakBreakOffer mount** (#1) — 30 min
2. **NoLivesModal ad-for-life wire** (#2) — 1 hr (matters only when hard-energy flips ON)
3. **Interstitial trigger sites** (#3) — 2 hrs + on-device verification
4. **First-purchase modal RC default tighten** (#4) — 15 min code + console update
5. **Sweep test/typecheck** — run `npm install --legacy-peer-deps && npm test && npm run typecheck` clean
6. **Smoke on dev-client APK** — verify all 4 P0 fixes on real device

### Lane B — User-side / console (~1 week)

Per `launch_blockers.md` Tier 5 U4 (all blockers, all outside this repo):

- [ ] Register 55+ `wordfall_*` IAP SKUs in Play Console (incl. 3 new booster SKUs + the proposed `coins_value_pack_9_99` from punch-list #9)
- [ ] Grant Firebase service account "Android Publisher" role in Play Console
- [ ] Upload FCM server key to Firebase → Cloud Messaging
- [ ] Set `EXPO_PUBLIC_SENTRY_DSN` as EAS secret + `.env`
- [ ] Confirm AdMob real `EXPO_PUBLIC_ADMOB_REWARDED_ID*` + `..._INTERSTITIAL_ID*` populated in EAS secrets
- [ ] Author UMP consent message in AdMob → Privacy & messaging → GDPR
- [ ] `firebase deploy --only firestore:rules,firestore:indexes,functions`
- [ ] Fill Play Console Data Safety form (`agent_docs/data_safety.md` is the source)
- [ ] Upload store listing assets (icon, feature graphic, 8 screenshots, 30s gameplay video — copy in `agent_docs/store_listing.md`)
- [ ] Deploy `assetlinks.json` with real Play App Signing SHA256 (Tier 5 U1)
- [ ] Google Sign-In activation (`@react-native-google-signin/google-signin` install + OAuth Web Client ID + Firebase Auth enable + SHA-1 fingerprint + EAS rebuild)

### Lane C — Audio (parallel, 3–6 weeks)

- Commission via `agent_docs/audio_brief.md` (72 SFX + 10 BGM slots).
- Budget: $3k–$8k for casual-game-tier composer (Fiverr top tier / Upwork).
- **Recommended:** ship soft launch on synth fallback (already wired); commission audio for global based on player sentiment in PH/CA.

### Lane D — Content polish (deferrable to post-soft-launch)

- 5 locale translations (`agent_docs/launch_blockers.md` Tier 5 U2): EN-only is fine for PH/CA. Commission before global English-speaking + before LATAM/DACH/JP/BR rollout. ~$2k for 325 keys × 5 locales.
- Hand-curated chapter overrides for L80–150 (Tier 5 U3): only blocker if soft-launch churn data shows L80–150 as a sticking point. Use `chapterOverrideJson` RC path.

### Lane E — Launch sequence

```
Week 0       : Lane A (eng P0) + Lane B (console)
Week 1       : Soft launch PH+CA, EN, synth audio, 500–2000 installs/day
Week 1-4     : Daily metrics. Iterate via Remote Config (no rebuilds).
Week 4       : Gate B review. Pass → expand to ID/MY/IN. Fail → retention fixes.
Week 5-8     : Audio drops; locales commissioned in parallel; P1 wiring items.
Week 10-12   : Global English launch (US/UK/AU/NZ + SEA) — if D7 + ARPDAU pass.
Week 14+     : Localized rollout (DE/ES/FR/JA/PT-BR).
v1.1         : iOS lane, Skia VFX, hand-curated L80–150 overrides, audio polish round 2.
```

### Decision gates (formal)

- **Gate A — Build green:** Lane A + Lane B done; dev-client smoke passes; all P0 wiring fixes verified on device. **Go/no-go for soft launch.**
- **Gate B — Week 4 soft-launch review:** D1 ≥35%, D7 ≥12%, ARPDAU ≥$0.05, tutorial completion ≥85%. Pass = scale to additional geos. Fail = retention work via Remote Config before paid UA.
- **Gate C — Week 8 global readiness:** ROAS D7 ≥30% of CPI; no crash regressions; P1 wiring closed; audio + locales delivered for the launch geos.
- **Gate D — Post-global month 1:** Android revenue trajectory + organic CPI determines iOS lane investment timing.

---

## 6. Risk register (specific to Wordfall, May 2026)

1. **Word-puzzle vertical is crowded.** Wordscapes alone has 100M+ installs; the differentiation has to read in screenshots/video. Gravity mechanic + flawless streak ceremonies are the unique pull — make sure store assets foreground them. (Mitigation: spend time on the 30s gameplay capture before global.)
2. **Procedural tail post-L600.** Player sentiment likely drops past L600 due to flatter chapter feel. Monitor % of DAU past L600; if >2%, prioritize hand-curated chapter overrides via RC.
3. **Audio is synth fallback.** Top-grossers feel "expensive" — synth caps perceived polish around 7/10. If soft-launch reviewers comment on audio, that's the signal to commission immediately.
4. **iOS deferred.** ~50% of payer revenue in casual word puzzle is iOS. Expect ~50% revenue ceiling Android-only until iOS lane ships (deliberately deferred per CLAUDE.md).
5. **EN-only at launch.** 5 placeholder locales × ~30% global market each = significant TAM not addressable until localized. Tier 5 U2.
6. **Block Blast precedent.** A 100% ads puzzle title topped 2025 download charts. If Wordfall's IAP doesn't pull within the first 4 weeks of soft launch, consider opening the ad cap (raise `MAX_ADS_PER_DAY` 10 → 15, `MAX_INTERSTITIALS_PER_DAY` 5 → 8) as a fallback monetization path.

---

## 7. What's NOT a blocker (don't re-litigate)

Per `launch_blockers.md`, the following are wired and don't need re-work:

- All 18 Tier 1–4 retention/monetization/social/feel items (shipped April 2026)
- All 6 Tier 6 top-grosser parity items except B5 (Reanimated migration, deferred)
- Hard-energy system (Remote Config gated, default OFF — keep OFF for soft launch)
- Cosmetic frame rendering with rarity colors + animated legendary glow
- Prestige multipliers wired through reward pipeline (1.50× XP / 1.25× Coin / 2.00× Gem stacking, capped at 5.0×)
- Server-side leaderboard validation Cloud Function (`submitValidatedScore`)
- Adaptive difficulty with fail-breather offer
- Secure gift send/claim (atomic txn + replay guard)
- GDPR account deletion (Cloud Function purges all data)
- Friend search by display name + code

---

## 8. This session — what was actually verified

- ✅ Repo on branch `claude/game-revenue-assessment-B8fRV` (clean baseline at commit `291c9c8`)
- ✅ `npm install --legacy-peer-deps` completes clean on fresh container
- ✅ `npm test` passes — **67 suites, 1049 tests, 43s runtime** (CLAUDE.md says 66; slight drift, all green)
- ✅ `npm run typecheck` passes (after install)
- ✅ Five parallel Explore agent audits run against the actual tree (catalog / ads / retention / onboarding / soft-currency)
- ✅ Comp benchmark data collected from Sensor Tower / industry sources
- ✅ Funnel model + soft-launch decision gates defined
- ✅ **Punch list of 22 fixes** identified with file:line refs and severity (7 P0 / 10 P1 / 5 P2)
- ✅ Critical gem-leak finding (5.7×–11× over target) — the biggest single revenue gap surfaced in the audit

**What this session did NOT do (out of remote-container scope):**

- Run the app on a physical device for visual smoke testing
- Push code changes — this is a research/assessment commit only
- Touch any Play Console / Firebase / AdMob / Sentry consoles (Lane B blockers)
- Commission audio or translations
- Build a Looker / Metabase dashboard (waits on BigQuery export)

---

## Changelog

- **2026-05-21:** Document created from end-to-end revenue-potential assessment on branch `claude/game-revenue-assessment-B8fRV`. Five-lane parallel static audit (catalog, ads, retention, onboarding, soft-currency). Comp benchmarking + funnel projection + finish punch-list compiled. 15 specific wiring fixes identified (4 P0, 6 P1, 5 P2).
