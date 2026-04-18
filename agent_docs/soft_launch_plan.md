# Wordfall — Soft-Launch Plan

> Phased rollout strategy for Wordfall global launch. Defines KPI gates, kill-switch protocol, and the explicit go/no-go criteria between each phase.
>
> **Status:** awaiting hard-blocker resolution (see `launch_runbook.md`) before Phase 0 begins.

---

## Why Soft Launch

Top-tier mobile titles (King, Supercell, Playrix) routinely soft-launch in 2–5 markets for 4–12 weeks before global UA spend. The reasoning:

1. **Validate retention math** — D1, D7, D30 numbers from real users beat any internal QA
2. **Validate monetization** — synthetic IAP testing can't reveal whether players actually open their wallets
3. **Stress-test infrastructure** — Firebase quotas, Cloud Function cold starts, ad waterfall behavior
4. **Identify rage-quit moments** — funnel drop-off at specific levels reveals difficulty tuning issues
5. **Collect localization signal** — even with English-only launch, accent dialects (PH English, CA English) reveal copy issues

**Cost of skipping:** burning UA budget on a global launch where D7 is 8% (you needed 15%) means setting fire to $50–500K before knowing the game wasn't ready.

---

## Phase 0 — Internal QA (Week -2 to 0)

**Markets:** 0 (closed testing)
**Audience:** 5–20 internal testers + friends/family
**Method:** Play Console internal testing track

**Gates to advance to Phase 1:**
- [ ] All hard blockers from `launch_runbook.md` complete (assetlinks, Firebase deploy, IAP SKUs registered, AdMob configured)
- [ ] All 14 plan branches merged to `main`
- [ ] Crash-free rate ≥ 99.5% across testers
- [ ] Sentry receiving events
- [ ] Firebase Cloud Functions logs show successful invocations
- [ ] Manual smoke test passes (12-point checklist in `launch_runbook.md` Section 12)

---

## Phase 1 — Soft Launch (Week 1–6)

**Markets:** Philippines + Canada (English-speaking, low UA cost, established mobile gaming audiences)
**Audience target:** 5,000–20,000 daily active users (DAU)
**UA budget:** $2,000–$5,000 total spread across 4 weeks
**Channels:** Google UAC (App Campaigns) + Meta Ads, $50–150/day

### Why PH + CA?
- **PH:** mature mobile gaming market, low CPI ($0.20–$0.80), high session frequency, English-fluent audience reveals copy issues
- **CA:** premium English-speaking market, similar economic profile to US/UK so monetization signal is predictive of global launch
- **Combined:** geographic + economic diversity covers most failure modes

### Week-by-week instrumentation

#### Week 1 — Funnel + Retention baseline
**KPIs to watch:**
- Install → tutorial complete: **target ≥ 80%**
- Tutorial complete → first puzzle complete: **target ≥ 90%**
- D1 retention: **target ≥ 35%**
- Crash-free rate: **target ≥ 99.5%**
- Median session length: **target 6–12 minutes**

**Red flags requiring kill-switch:**
- D1 < 25% → fundamental product issue (FTUE, performance, crash)
- Crash-free < 98% → ship stability fix before continuing UA
- > 30% of users drop in tutorial → tutorial too long or unclear

#### Week 2 — Monetization signal
**KPIs to watch:**
- D7 retention: **target ≥ 15%**
- ARPDAU: **target ≥ $0.10** (will be lower in PH, weighted average)
- Conversion to payer: **target ≥ 1.5%** by D7
- ARPPU: **target ≥ $5** by D7
- Median puzzles played per session: **target ≥ 3**

**Red flags:**
- D7 < 10% → retention loops broken, not enough hooks pulling players back
- ARPDAU < $0.05 → monetization too soft (first-purchase offer not converting)
- Conversion < 1% by D7 → IAP funnel issue (price points, paywall placement)

#### Week 3 — Feature interaction
**Decisions to make based on data:**
- Is piggy bank fill rate right? Tune via Remote Config (`piggyBankFillPerPuzzle`)
- Are season pass tiers being claimed? Tune `seasonPassXpPerPuzzle`
- Are referrals firing? Check `referral_success_grant` analytics event count
- Are clubs being joined? If < 30% of D7 users join a club, surface clubs more prominently

#### Week 4 — D30 + LTV signal
**KPIs to watch:**
- D30 retention: **target ≥ 5%**
- D7→D30 retention ratio: **target ≥ 0.4**
- ARPPU: **target ≥ $8** (LTV proxy)
- K-factor (viral coefficient): **target ≥ 0.05** (each user brings 0.05 friends via referral)

**Decisions:**
- Soft launch extension (4 more weeks at higher UA spend) if KPIs strong
- Iteration sprint if KPIs missing — prioritize the lowest-performing pillar
- Kill features that don't move the needle (Remote Config flag → false)

### Phase 1 → Phase 2 advancement gates

**ALL must be true to proceed:**
- [ ] D1 ≥ 35%
- [ ] D7 ≥ 15%
- [ ] D30 ≥ 5%
- [ ] ARPDAU ≥ $0.10 (CA-weighted)
- [ ] ARPPU ≥ $8
- [ ] Crash-free ≥ 99.5%
- [ ] Conversion to payer ≥ 2% by D7
- [ ] No P0 bug reports outstanding

**If any KPI is missing:** stay in Phase 1, iterate, re-measure for 2 weeks. Repeat.

---

## Phase 2 — Regional Expansion (Week 7–12)

**Markets:** US, UK, AU, NZ, IE (English-speaking + high-ARPU)
**Audience target:** 50,000–200,000 DAU
**UA budget:** $20,000–$50,000 total
**Channels:** Google UAC + Meta + TikTok Ads

**Why these markets?**
- High ARPU validates revenue model at scale
- Same language (no localization risk)
- Mature mobile gaming audiences (predictable behavior)

**KPIs (in addition to Phase 1 gates):**
- Top 100 in Word Puzzle category in at least one tier-1 market
- Server cost per DAU stable (Firebase autoscale handling load)
- Sentry crash count flat or declining as DAU grows

**Phase 2 → Phase 3 gates:**
- [ ] US ARPDAU ≥ $0.20
- [ ] Server costs ≤ 15% of revenue
- [ ] Top 200 Word Puzzle in US
- [ ] Phase 1 KPI floor maintained

---

## Phase 3 — Global Launch (Week 13+)

**Markets:** all remaining countries (with localization roadmap)
**Audience target:** 1M+ DAU
**UA budget:** scale to LTV-driven; typical ramp $5K → $50K daily
**Channels:** full UA mix + creator partnerships + PR push

**Localization priority order (per CLAUDE.md v1.1 plan):**
1. Spanish (LATAM) — large Spanish-speaking market, low CPI
2. Brazilian Portuguese
3. German — high ARPU
4. French
5. Japanese — premium ARPU but high QA bar

**LiveOps cadence after global launch:**
- Weekly daily-deal rotation (already automated)
- Weekly shared club goal (already automated)
- Monthly season pass rotation (Branch 6)
- Quarterly themed event (e.g., Halloween chapter pack, Holiday cosmetics)

---

## Kill-Switch Protocol

Every major feature is behind a Remote Config flag (see `launch_runbook.md` Section 12). If a feature is causing harm:

1. **Identify the feature** via Sentry / analytics dashboard
2. **Flip the flag to `false`** in Firebase Console → Remote Config
3. **Wait 12 hours** for client cache to refresh
4. **Verify in analytics** that the harmful event count drops
5. **Investigate root cause** while feature is dark
6. **Ship fix → re-enable flag**

**Hard-energy is the most likely flag to flip:**
- Default OFF
- If you turn it ON and D1 drops > 5 percentage points, flip it back OFF

---

## A/B Test Calendar

Run these in soft launch to tune defaults before global:

| # | Test | Variants | Primary KPI | Duration |
|---|---|---|---|---|
| 1 | Piggy bank fill rate | 1 / 2 / 3 gems per puzzle | ARPPU | 2 weeks |
| 2 | Season pass XP/puzzle | 30 / 50 / 75 | tier completion rate | 2 weeks |
| 3 | First-purchase price | $0.49 / $0.99 / $1.99 | D7 conversion % | 3 weeks |
| 4 | Referral reward gems | 10 / 25 / 50 | viral K-factor | 4 weeks |
| 5 | Hard-energy ON | OFF / ON | D1, ARPDAU | 2 weeks |
| 6 | Login calendar variant | 7-day / 30-day | D7 retention | 4 weeks |
| 7 | Tutorial length | 3-step / 4-step | tutorial completion + D1 | 2 weeks |
| 8 | Booster combo multiplier | 1.5× / 2× / 3× | combo activation rate | 2 weeks |

Each test enrolls 33% of new installs into each variant, deterministic by user UID hash. Stats sig requires ≥ 1000 users per variant (~6000 installs total per test).

---

## Server Cost Budget

**Firebase Blaze plan budget for soft launch:**
- Firestore reads: $0.06 / 100K — at 50K DAU × 100 reads/day = $30/day
- Firestore writes: $0.18 / 100K — at 50K DAU × 30 writes/day = $27/day
- Cloud Functions: $0.40 / 1M invocations — at 50K DAU × 5 invocations = $0.10/day
- Cloud Storage / Push: ~$5/day
- **Estimated total Phase 1:** ~$70/day = ~$2,100/month for 50K DAU

**At Phase 3 scale (1M DAU):** ~$1,400/day = ~$42K/month. Should be ≤ 15% of revenue if monetization is healthy.

**Cost cap alarm:** Firebase Console → Set budget alert at $100/day during soft launch. If hit, throttle UA spend.

---

## Reporting

**Daily (automated, sent to email or Slack):**
- DAU
- Crash-free rate
- New IAP revenue ($)
- D1 retention (running 7-day average)

**Weekly (manual review):**
- Funnel chart: install → tutorial → first puzzle → first IAP
- Cohort retention table (D1/D3/D7/D14/D30)
- ARPDAU + ARPPU trend
- Top 10 events by frequency
- Top 5 errors in Sentry

**Bi-weekly (decision meetings):**
- Review A/B test results
- Decide on Remote Config tunings
- Decide on next sprint priorities

---

## Exit Criteria for Iteration

**If after 8 weeks of Phase 1 + iteration the KPI gates are still missed:**
- Don't push to global launch with weak fundamentals — burning UA budget on a leaky bucket compounds losses
- Pause UA, take a 4-week iteration sprint to fix the failing pillar
- Re-test with a fresh cohort

**Definition of "done with soft launch":** all gates met for 2 consecutive weeks without major Remote Config tuning. That's when you scale spend.
