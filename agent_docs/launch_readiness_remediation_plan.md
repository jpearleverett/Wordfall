# Wordfall — Launch-Readiness Remediation Plan

## Context

Wordfall is a gravity-based word puzzle (Expo SDK 55, RN 0.83.4, React 19.2, TS ~5.8, zustand state, Reanimated 4.2.1 + worklets, Firebase optional, AdMob, react-native-iap, 791 unit tests). The question asked: is it Candy Crush / Royal Match / Clash of Clans level of polish and launch-ready, and if not, what does it need?

**Honest verdict after deep code exploration:** the engineering substrate is genuinely strong (solver, gravity, board generator, IAP service, shop UI, clubs, ceremony system, consent/privacy compliance, Firestore rules, 0 `@ts-ignore`, 0 `TODO`/`FIXME` in core logic), but there are real **launch blockers** outside the code (Play Console IAP registration, Cloud Function deploys, FCM key, AdMob real IDs, assetlinks.json hosting) and real **polish gaps inside the code** — chief among them: `assets/audio/` is empty except for a README (the game runs on synthesized ADSR tones), no account-deletion UI (Play Store requirement since 2022), no i18n, no UI/E2E coverage beyond 5 Maestro smoke flows, limited accessibility (no dynamic type, no colorblind mode), and an unvalidated adaptive-difficulty model.

**Target chosen by user:** Global launch (~3 months) — full Phase 0–4 scope. Professional audio commission. Hard-energy as remote-config A/B. Keep procedural puzzles but tighten constraints.

**Branch for implementation:** `claude/assess-game-readiness-iImfQ`.

---

## Framework Used: GameRefinery / Deconstructor-of-Fun 7-Pillar F2P Launch-Readiness model

Cross-referenced against the Hooked Model (Trigger → Action → Variable Reward → Investment) for retention depth. Scores are honest — Candy Crush = 10, Expo default demo = 1.

| # | Pillar | Score | Key gap |
|---|--------|-------|---------|
| 1 | Core Game Loop | 7.5 / 10 | Audio assets empty; game feel capped |
| 2 | Meta Game & Progression | 6 / 10 | Procedural-only puzzles; adaptive difficulty unvalidated |
| 3 | Retention Systems | 6.5 / 10 | No hard energy lever; remote push not deployed |
| 4 | Monetization (code / live) | 7 / 10 code / 3 / 10 live | Play Console SKUs unregistered; Cloud Fns not deployed |
| 5 | Social Layer | 5.5 / 10 | Social Cloud Fns not deployed; no gifting; thin share UI |
| 6 | Live Ops | 5 / 10 | No live experiments; no seasonal rotation spec |
| 7 | Technical & Compliance | 7 / 10 | Account-deletion UI+endpoint missing; no dynamic type; no Sentry DSN |
| + | Localization (cross-cut) | 1 / 10 | All strings hardcoded English |

**Ready to ship?** No — not at Candy Crush parity. The game is closer to a strong soft-launch candidate than a worldwide-launch candidate. With the ~3-month plan below it will reach launch parity.

---

## Phase structure

Phases are ordered **by dependency and risk**, not time. Phases 0–1 are hard launch gates (external config + store compliance). Phase 2 attacks day-1 churn drivers. Phase 3 raises core-loop polish to competitor parity. Phase 4 adds global reach + retention levers. Phase 5 is post-launch live ops.

Estimates are senior-dev-days of coding work. External wall-clock (audio commission, translator turnaround, Play Console review) runs in parallel and is called out separately.

---

## Phase 0 — External Setup (no code; unblocks everything)

Live-build testing, receipt validation, push notifications, real ads, and crash reporting are all gated on external services. Do this first because nothing later is verifiable without it.

| # | Task | Files / surface | Effort |
|---|------|-----------------|--------|
| 0.1 | Register 20 `wordfall_*` IAP SKUs in Play Console, match IDs exactly to `src/data/shopProducts.ts`. Set country-tier pricing (IN/BR/MX/ID/PH at 30–50% discount). | Play Console only | 0.5d |
| 0.2 | Grant Android Publisher role to `<firebase-project>@appspot.gserviceaccount.com` in Play Console → Users and permissions (required for `validateReceipt` to call Google Play Developer API). | Play Console only | 0.1d |
| 0.3 | Upload FCM server key in Firebase Console → Cloud Messaging → Project Settings. | Firebase Console only | 0.1d |
| 0.4 | Deploy commerce Cloud Functions (`firebase deploy --only functions:commerce`). Affects `validateReceipt`. | `functions/src/index.ts` already committed | 0.25d |
| 0.5 | Deploy social Cloud Functions (`firebase deploy --only functions:social`). Affects `sendPushNotification`, `clubGoalProgress`, `moderateClubMessage`. | `cloud-functions/src/index.ts` already committed | 0.25d |
| 0.6 | Deploy Firestore rules + indexes (`firebase deploy --only firestore:rules,firestore:indexes`). | `firestore.rules`, `firestore.indexes.json` committed | 0.1d |
| 0.7 | Swap AdMob test app IDs for real ones in `app.json` plugin config + set `EXPO_PUBLIC_ADMOB_REWARDED_ID`, `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID` in `.env` and EAS secrets. Rebuild dev APK. | `app.json`, `src/constants.ts` AD_CONFIG | 0.5d |
| 0.8 | Host `/.well-known/assetlinks.json` on `wordfallgame.app` so Android App Links `autoVerify="true"` binds the domain. | `wordfallgamesite/` Cloudflare Pages | 0.25d |
| 0.9 | Create Sentry project, add `EXPO_PUBLIC_SENTRY_DSN` to `.env` and EAS secrets. All `crashReporter.captureException` sites already wired — just need DSN. | env only | 0.25d |
| 0.10 | Configure Google UMP consent form (GDPR message) in AdMob Console. `AdsConsent.requestInfoUpdate` + `showForm` already called at app start. | AdMob Console only | 0.1d |

**Dependencies:** 0.4 requires 0.2; 0.7 requires new EAS build.

**Verification:**
- Install internal-test-track AAB on a real Android device.
- Complete a full test purchase (Play Console license-tester account) and confirm `validateReceipt` Cloud Function logs show a successful validation.
- Send a push notification from `sendPushNotification` callable; arrives on device.
- Trigger a rewarded-video ad via `src/services/ads.ts`; confirm real AdMob dashboard impression.
- Throw a test error via `crashReporter.captureException(new Error('sentry-smoke'))`; confirm Sentry receives it.
- Tap the Play-Store-provided deep link URL; Android routes straight into app (no browser disambiguation).

**Pillars moved:** 4 (live monetization), 6 (live ops backbone), 7 (crash reporting).

---

## Phase 1 — Store-Compliance Must-Haves

Without this, Play Store submission fails policy review. All other polish is wasted if the store rejects the binary.

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.1 | **Account Deletion UI** in `SettingsScreen.tsx` under Account section. Two-step confirmation + auth re-prompt. Calls new `requestAccountDeletion` callable. Mirror a web-form fallback on `wordfallgame.app/account-deletion`. | `src/screens/SettingsScreen.tsx`, `src/services/firestore.ts`, `src/contexts/AuthContext.tsx` | 1d |
| 1.2 | **Server-side erasure Cloud Function** `requestAccountDeletion`. Purges `players/{uid}`, `users/{uid}/*` subcollections, club membership + authored chat messages, consent records, blocked-users list, and Firebase Auth record. Purchase receipt ledger retained with UID → one-way hash for tax/fraud audit. Respond within 30d per Play policy. | `functions/src/index.ts` | 1d |
| 1.3 | Surface **Restore Purchases** in Settings (not only in ShopScreen:1403). VIP subscription + Ad Removal are durable SKUs — Play/Apple both require a discoverable restore path. | `src/screens/SettingsScreen.tsx`, `src/services/iap.ts` (reuse existing flow) | 0.25d |
| 1.4 | Add a **Data Deletion web-form endpoint** on `wordfallgame.app/account-deletion` (Play Store requires a method reachable *without* installing the app). Simple form → email to `info@iridescent-games.com` → internal SLA to call the callable on the user's behalf. | `wordfallgamesite/account-deletion/index.html` | 0.5d |
| 1.5 | Fill in Play Console **Data Safety form** using `agent_docs/data_safety.md` as source of truth. Confirm data-types declared match what the app actually sends (Firebase Analytics, AdMob ad ID, Sentry crash traces). | Play Console only | 0.5d |
| 1.6 | Confirm Play Console **target audience = 13+** (current app has no under-13 age gate; changing to <13 would require a COPPA gate in `OnboardingScreen.tsx` before any analytics init). | Play Console only | 0.1d |
| 1.7 | Audit `src/screens/SettingsScreen.tsx:109` "Reset Progress" — rename to "Reset local data" to avoid confusion with account deletion. | `src/screens/SettingsScreen.tsx` | 0.1d |

**Dependencies:** 1.1 depends on 1.2 deployment (don't ship a button that 500s). 1.3 is pure UI-reuse.

**Verification:**
- Manually create a test account, populate with progress + purchases + club membership, trigger deletion flow. Inspect Firestore — user doc + subcollections gone; receipt ledger retains hashed UID only. Auth record gone. Push to device fails gracefully.
- Restore Purchases from a clean install after a prior purchase — VIP and Ad Removal flags restored.
- Play Console Pre-launch Report returns no policy violations.
- Submit to Play Console internal test track; confirm policy auto-scan passes.

**Pillars moved:** 7 (Compliance, Store).

---

## Phase 2 — Day-1 Churn Killers

Real audio, accessibility, and UI test coverage. These are the retention fundamentals a first-session player feels within 60 seconds.

### 2A. Audio (biggest single polish uplift)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.1 | Commission **20 SFX + 4 BGM** per `assets/audio/README.md` spec. MP3 44.1 kHz, −14 LUFS integrated, seamless BGM loops. Synthwave aesthetic brief. | External (audio house / composer) | 0d code, 2–4wk wall-clock |
| 2.2 | Drop assets into `assets/audio/`, wire loader in `src/services/sound.ts`. Keep synthesized fallback as last resort so dev builds still work without assets. | `src/services/sound.ts` | 1d |
| 2.3 | Loop BGM by screen context: `bgm-home` on HomeScreen focus, `bgm-gameplay` on GameScreen, `bgm-relax` in relax mode, `bgm-victory` on puzzle complete. Crossfade 400ms between tracks; duck under ceremony SFX. | `src/services/sound.ts`, `src/screens/HomeScreen.tsx`, `src/screens/GameScreen.tsx`, `src/hooks/useCeremonyQueue.ts` | 1d |
| 2.4 | Wire per-category volume: `sfxVolume` vs `musicVolume` vs `ceremonyVolume`. Currently only global music volume is actually applied. Settings sliders exist; they just don't route into `soundManager` correctly. | `src/services/sound.ts`, `src/screens/SettingsScreen.tsx`, `src/contexts/SettingsContext.tsx` | 0.5d |
| 2.5 | Add **audio-load error breadcrumb** to Sentry so missing assets don't silently fail. | `src/services/sound.ts` | 0.25d |

### 2B. Accessibility

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.6 | **Dynamic Type / text scaling** via a `Typography` wrapper honoring `PixelRatio.getFontScale()` clamped 1.0–1.3. Migrate all hardcoded font sizes to the wrapper over time; start with high-traffic screens. | `src/components/common/Typography.tsx` (new), then `src/screens/HomeScreen.tsx`, `src/screens/GameScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/constants.ts` FONTS | 2d |
| 2.7 | **Colorblind palette option** (Deuteranopia, Protanopia, Tritanopia). Swap letter-cell hue gradients + success/error colors via theme variant. Selectable in Settings. | `src/constants.ts` palette, `src/screens/SettingsScreen.tsx`, `src/contexts/SettingsContext.tsx`, `src/components/LetterCell.tsx` | 1.5d |
| 2.8 | Screen-reader game-state hints on `LetterCell` ("Letter A at row 2 column 3. Selected. Current word: WOR"). Announce word-found events via `AccessibilityInfo.announceForAccessibility`. | `src/components/LetterCell.tsx`, `src/screens/game/PlayField.tsx` | 1d |

### 2C. UI / E2E test coverage

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.9 | Maestro flows: `purchase_happy_path`, `club_chat_send_and_report`, `consent_accept`, `account_deletion`, `restore_purchases`. | `.maestro/*.yaml` | 1.5d |
| 2.10 | Integration test for `useCommerce` with mocked `react-native-iap` covering: happy purchase, validation failure, duplicate transaction ID, network timeout recovery. | `src/hooks/__tests__/useCommerce.test.ts` (new) | 1d |
| 2.11 | Snapshot tests for the 5 highest-traffic screens (Home, Game, Shop, Settings, Club) to catch unintentional UI regressions. | `src/screens/__tests__/*.snap.test.tsx` | 1d |

**Dependencies:** 2.2 depends on 2.1 (assets arriving). 2.9 depends on Phase 0 (real test SKUs in Play Console). 2.11 can run in parallel.

**Verification:**
- LUFS measurement of all delivered BGM within −14 ±1 LUFS. No audible seam at loop point.
- Enable TalkBack on a physical Android device, complete daily puzzle end-to-end with screen reader only.
- Enable system-level "Large Text" accessibility; confirm no Text component clips or overflows on HomeScreen / GameScreen / ShopScreen.
- Toggle each colorblind palette; confirm success/error/selection colors remain distinguishable.
- Maestro suite green on CI for all 10 flows (5 existing + 5 new).

**Pillars moved:** 1 (Core Loop game-feel), 7 (Accessibility + Test coverage).

---

## Phase 3 — Top-Tier Polish

The user chose **improve procedural generation instead of hand-authoring 75 puzzles**. Constrain the generator so chapters 1–5 feel like curated tutorials, validate `difficultyAdjuster.ts` with real telemetry, and add juice to the moment-to-moment feel.

### 3A. Tighten procedural generation for onboarding arc

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.1 | Add a **per-chapter `GenerationProfile`** to `chapters.ts` specifying: max word length, required mechanic-intro (e.g., chapter 1 must have at least one gravity cascade; chapter 2 must introduce a 4-letter word; chapter 3 introduces chain bonus), empty-cell density, dictionary subset (common words only for ch1–3). | `src/data/chapters.ts`, `src/types.ts` | 1.5d |
| 3.2 | Extend `src/engine/boardGenerator.ts` to honor `GenerationProfile`. Keep seeded PRNG determinism (daily puzzles must not drift). Retry budget cap raised when constraints are tighter. | `src/engine/boardGenerator.ts` | 1.5d |
| 3.3 | Golden-seed tests: for chapters 1–5, assert that the generated board for seed S always satisfies the profile (word length caps, mechanic intro present). Also asserts `solver.ts` finds a solution within budget on every generated board. | `src/engine/__tests__/boardGenerator.profiles.test.ts` (new) | 1d |
| 3.4 | Fuzz test: 10 000 seeds × each chapter → 0 unsolvable, < 1 % solver-budget exhaustion. CI job. | `src/engine/__tests__/boardGenerator.fuzz.test.ts` (new) | 0.5d |

### 3B. Validate adaptive difficulty with real telemetry

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.5 | Emit `difficulty_telemetry` analytics event on every board completion/failure with `{mode, level, stars, attempts, hintsUsed, undosUsed, chainCount, timeMs, adjusterTier}`. Used to retune `difficultyAdjuster.ts` thresholds. | `src/services/analytics.ts`, `src/services/difficultyAdjuster.ts`, `src/hooks/useGame.ts` | 0.5d |
| 3.6 | Recruit 10 Play-Console-internal-test players, have them play 50 levels each. Pull telemetry, evaluate whether the adjuster actually moves the curve: target distributions — easy 75%+ first-try win, medium 50–60%, hard 30–40%. | External (testers) + analysis | 2d |
| 3.7 | Retune `difficultyAdjuster.ts` thresholds based on observed data; re-run to confirm. | `src/services/difficultyAdjuster.ts` | 1d |

### 3C. Juice pass on core loop

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.8 | Word-find choreography upgrade: spark → shimmer → absorb into score. Tie to new audio layer. | `src/components/effects/ParticleSystem.tsx`, `src/screens/game/PlayField.tsx` | 1d |
| 3.9 | Combo-multiplier visual feedback: screen-tint pulse on combo ≥ 3, confetti burst at combo ≥ 5. | `src/components/effects/NeonStarBurst.tsx` (reuse), new `src/components/effects/ComboFlash.tsx` | 1d |
| 3.10 | Gravity-settle animation polish: tiny bounce-overshoot when letters land (Reanimated `withSpring(damping: 10)`). | `src/screens/game/PlayField.tsx`, `src/engine/gravity.ts` animation timings | 0.5d |
| 3.11 | Layered BGM: add a "high-intensity" stem that mixes in when combo ≥ 3 and fades out on miss. Depends on 2.1 audio commission brief including stems. | `src/services/sound.ts`, audio brief | 1d |

**Dependencies:** 3.5–3.7 require Phase 0 Firebase Analytics live. 3.11 requires audio commission brief to request stems (tell the composer during Phase 2.1, not after).

**Verification:**
- Golden-seed + fuzz tests pass in CI.
- Telemetry-driven tuning: 2nd-pass tester cohort reports "felt well-paced" qualitatively and quantitatively within target distributions.
- Recorded video of juice pass shown to a fresh pair of eyes — do they say "oh, that's satisfying"?

**Pillars moved:** 1 (Core Loop feel), 2 (Meta/Progression validation).

---

## Phase 4 — Global Reach & Long-Tail Retention

i18n unlocks ~60% of addressable non-EN revenue. Hard-energy A/B + gifting + share cards close the social-viral and session-frequency gaps vs. Candy Crush. Live-event authoring pipeline lets you run LiveOps without shipping builds.

### 4A. Localization

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.1 | Add `i18next` + `react-i18next` + `expo-localization`. Bootstrap in `App.tsx`. | `App.tsx`, `src/i18n/index.ts` (new), `package.json` | 0.5d |
| 4.2 | Extract all UI strings to `src/locales/en.json`. Start with high-traffic screens (Home, Game, Shop, Settings, Club, Onboarding, Ceremony), then long-tail. Use `ts-i18n-extract` or similar. | every `src/screens/**`, every `src/components/**` | 3–4d |
| 4.3 | Commission professional translations for ES-419, PT-BR, DE, FR, JA (covers ~50% of non-EN revenue at launch). ~500 strings × 5 locales. | External translators | 0d code, 1–2wk wall-clock |
| 4.4 | Add locale selector in Settings. Default to device locale; fall back to EN. | `src/screens/SettingsScreen.tsx`, `src/contexts/SettingsContext.tsx` | 0.5d |
| 4.5 | Plural/gender rules where relevant (English's "1 star / 2 stars" is simple; others aren't). Use i18next `plural` formatter. | across extracted strings | 0.5d |
| 4.6 | Audit all string concatenation that breaks translation ("You earned " + n + " coins" → `{{count, number}}` interpolation). | across strings | 1d |
| 4.7 | Snapshot-test each locale for top 5 screens — catch layout-breaking long strings (DE tends to be +30% longer than EN). | `src/screens/__tests__/*.locale.test.tsx` | 0.5d |

### 4B. Hard-Energy A/B (remote-config-gated, default off)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.8 | Add `lives` / `livesMax` / `livesRegenAt` to `EconomyContext`. Persist via AsyncStorage + Firestore sync. | `src/contexts/EconomyContext.tsx`, `src/types.ts` | 1d |
| 4.9 | `useGame.ts` consumes a life on board start if `remoteConfig.get('hardEnergyEnabled') === true`. Board failure = life lost; board win = no life consumed. Regen 1 life / 30 min. Cap 5. | `src/hooks/useGame.ts`, `src/services/remoteConfig.ts` | 1d |
| 4.10 | "No lives" modal with 3 paths: watch rewarded ad (+1 life, capped 3/day), spend 30 gems (full refill), ask clubmate (depends on 4.13 gifting), wait (shows countdown). | `src/components/NoLivesModal.tsx` (new) | 1.5d |
| 4.11 | Firebase A/B experiment: 50/50 split on `hardEnergyEnabled`. Target D7 retention + ARPDAU. Minimum 2-week run before decision. | Firebase Console + `src/services/experiments.ts` | 0.5d |

### 4C. Social & viral loops

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.12 | **Gifting mechanic**: send lives / hints to clubmates + referred friends. Cloud Function atomically debits sender pool + credits receiver with idempotency key. Rate-limit 5 gifts/day per sender. | `cloud-functions/src/index.ts`, `src/screens/ClubScreen.tsx` | 2d |
| 4.13 | Share-to-social victory card. Generate an off-screen image (letter grid + score + star rating + "beat my score" deep link) via `react-native-view-shot`, then `expo-sharing`. | `src/components/ShareCard.tsx` (new), `src/screens/GameScreen.tsx` win handler | 1.5d |
| 4.14 | Asymmetric "ask for hint" — tap on a stuck tile, broadcasts to club chat with a puzzle snapshot, clubmate replies with a hint. Stretch goal. | `src/screens/ClubScreen.tsx`, `cloud-functions/src/index.ts` | 2d |

### 4D. LiveOps authoring pipeline

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.15 | Remote-Config-driven event calendar. JSON schema documented; fetched at app start; falls back to `src/data/events.ts` local default. | `src/services/eventManager.ts`, `src/services/remoteConfig.ts`, `src/data/events.ts` | 2d |
| 4.16 | Remote-Config-driven daily deals + flash sales (currently hard-coded date hash in `src/data/dynamicPricing.ts`). Allows tuning without builds. | `src/data/dynamicPricing.ts`, `src/services/remoteConfig.ts` | 1d |
| 4.17 | "Event editor" internal JSON template doc in `agent_docs/live_ops.md` so non-engineers can ship new events via Firebase Remote Config edit. | `agent_docs/live_ops.md` (new) | 0.5d |

**Dependencies:** 4.10 optionally depends on 4.12 for the "ask clubmate" path. 4.12 depends on Phase 0 social Cloud Functions deployed.

**Verification:**
- Change device locale to ES-419 / PT-BR / DE / FR / JA; open all main screens, confirm no untranslated strings, no clipped labels.
- Flip `hardEnergyEnabled=true` in Remote Config; confirm lives consumed correctly, regen timer accurate, rewarded-ad refill works, no way to bypass.
- Two-account test: send a gift, receive it, confirm ledgers balance, idempotency key prevents double-credit.
- Victory share card renders correctly on Android share sheet; deep link opens on recipient device.
- Create a fake event in Remote Config; confirm app picks it up without rebuild.

**Pillars moved:** 3 (Retention), 5 (Social), 6 (Live Ops), Localization (cross-cutting).

---

## Phase 5 — Post-Launch Live Ops (first 4 weeks live)

| # | Task | Effort |
|---|------|--------|
| 5.1 | First A/B: starter-bundle price $0.49 vs $0.99 vs $1.99. Optimize for D7 conversion, not just D1 revenue. | 1d setup + 2wk runtime |
| 5.2 | First holiday-themed event (seasonal skin pack + limited offer + leaderboard). Use the authoring pipeline from 4.15. | 2d |
| 5.3 | Hard-energy A/B decision gate (after 2-week run at scale): ship or revert. Key metric = D7 retention × ARPDAU. | 0.5d analysis |
| 5.4 | Push-notification tuning: segment by last-seen cohort, time-of-day optimization, stop push to 3-day-silent users until a reactivation offer. | 1d |
| 5.5 | Funnel drop-off review at 2-week mark — onboarding, first-purchase, daily-return. Fix the biggest funnel leak. | 1d |
| 5.6 | Price-tier localization per country (India / Brazil / Mexico / Indonesia / Philippines lower elasticity — 30–50 % discount). | Play Console only |
| 5.7 | Soft deprecation of synthesized-audio fallback if audit confirms zero users ever hit it. | 0.25d |

**Verification:** weekly retention review, crash-free-sessions > 99.5%, ARPDAU tracking trend, first cohort LTV curve stabilizing by D14.

**Pillars moved:** 3, 4, 6.

---

## Outside-the-Environment Step-by-Step Checklist (for you, the human)

Everything below is *outside* Claude's control. Do these in roughly this order; many can run in parallel with code work.

### Before Phase 0

1. **Google Play Console** — create developer account ($25 one-time), create app listing "Wordfall", set package `com.wordfall.game`, target audience 13+.
2. **Firebase Console** — create production project (distinct from any dev project), add Android app with package `com.wordfall.game`, download `google-services.json`, replace the current one committed at repo root.
3. **AdMob** — create app linked to Firebase, create ad units (rewarded, interstitial), note real IDs.
4. **Sentry** — create project "wordfall-android", copy DSN.
5. **Domain / Cloudflare Pages** — confirm `wordfallgame.app` is under your control; verify the privacy + ToS pages deployed from `wordfallgamesite/`.

### During Phase 0

6. Register all 20 IAP SKUs in Play Console (IDs must exactly match `src/data/shopProducts.ts`). Set base prices; enable country tiering.
7. Grant Android Publisher role to `<firebase-project>@appspot.gserviceaccount.com` in Play Console → Users and permissions.
8. Upload FCM server key in Firebase Console → Cloud Messaging.
9. Configure the Google UMP consent form in AdMob Console (choose GDPR message template).
10. Create Firebase Remote Config parameters: `hardEnergyEnabled` (bool, default false), `starterBundlePrice` (string, default "0.49"), `eventCalendarOverride` (json, default null).
11. Upload `.well-known/assetlinks.json` to `wordfallgame.app`. Use Android Studio's App Links Assistant to generate the file content with your app's SHA-256 cert fingerprint.

### During Phase 1

12. Build a simple `wordfallgame.app/account-deletion` HTML form (name + email + reason). Pipe submissions to `info@iridescent-games.com`.
13. Confirm `info@iridescent-games.com` actually exists and forwards somewhere you read.
14. Complete Play Console Data Safety form using `agent_docs/data_safety.md` answers.

### During Phase 2 — audio commission

15. Write a creative brief for the composer: synthwave aesthetic, ref tracks, target mood per BGM (home = ambient, gameplay = focused, relax = chill, victory = triumphant), LUFS target, per-SFX purpose from `assets/audio/README.md`. **Request stems** for the gameplay BGM (base + high-intensity layer) so Phase 3.11 can layer them.
16. Get 2–3 quotes. Fiverr Pro or boutique composers ~$500–1500 for the full package. Pay 50% deposit, 50% on delivery.
17. Arrange for 1 revision round built into the contract.
18. When deliverables arrive: validate LUFS (Youlean Loudness Meter free tool), test loop seamlessness in DAW/Audacity, drop into `assets/audio/`, commit.

### During Phase 3 — playtest cohort

19. Recruit 10 testers via Play Console Internal Test track. Mix of puzzle-game veterans and casual players.
20. Provide them a Discord channel or Google Form for qualitative feedback.
21. After 1 week, pull `difficulty_telemetry` events from Firebase → BigQuery (or export), analyze in a spreadsheet.

### During Phase 4 — localization

22. Commission translations: Gengo / OneHourTranslation / Smartling — usually $0.08–0.12/word × ~500 strings × 5 locales ≈ $1500–3000. Request "mobile gaming tone" explicitly.
23. Provide context notes (e.g., "STAR" = gameplay currency, not celestial body) to avoid mis-translations.
24. After return: run a native-speaker QA pass in-app before launch (even paid pros miss game-specific jargon).

### iOS (v1.1+, can defer)

25. Apple Developer enrollment ($99/year).
26. App Store Connect — create app record, bundle ID `com.wordfall.app`.
27. Download `GoogleService-Info.plist` from Firebase Console, commit to repo root.
28. Host `apple-app-site-association` at `https://wordfallgame.app/.well-known/apple-app-site-association` for iOS Universal Links.
29. First iOS EAS build + TestFlight.
30. ATT prompt verification on real iOS 14.5+ device.

### Legal / ops

31. Confirm tax reporting / Play Store payout profile (Payments Profile in Play Console).
32. Retain hashed purchase ledger for 7 years minimum (US tax / Play Store dispute requirements).
33. Establish a support SLA for account-deletion web-form requests (recommend ≤ 72 hours).

---

## Critical Files (hot-path summary for implementation)

Touched in this plan — organized by phase so you can see dependencies at a glance.

**Phase 0** (mostly external):
- `app.json`, `src/constants.ts` (AD_CONFIG)
- `functions/src/index.ts`, `cloud-functions/src/index.ts`
- `firestore.rules`, `firestore.indexes.json`
- `.env`, EAS secrets
- `wordfallgamesite/.well-known/assetlinks.json` (new)

**Phase 1**:
- `src/screens/SettingsScreen.tsx`
- `src/services/firestore.ts`, `src/contexts/AuthContext.tsx`
- `functions/src/index.ts` (new `requestAccountDeletion` callable)
- `wordfallgamesite/account-deletion/index.html` (new)

**Phase 2**:
- `src/services/sound.ts` (audio wiring, per-category volume)
- `src/screens/HomeScreen.tsx`, `src/screens/GameScreen.tsx` (BGM context)
- `src/components/common/Typography.tsx` (new), `src/constants.ts` FONTS
- `src/components/LetterCell.tsx`, `src/screens/game/PlayField.tsx` (colorblind + a11y hints)
- `src/contexts/SettingsContext.tsx`
- `.maestro/*.yaml` (new flows)
- `src/hooks/__tests__/useCommerce.test.ts` (new)

**Phase 3**:
- `src/data/chapters.ts`, `src/types.ts` (GenerationProfile)
- `src/engine/boardGenerator.ts`
- `src/engine/__tests__/boardGenerator.profiles.test.ts`, `boardGenerator.fuzz.test.ts` (new)
- `src/services/analytics.ts`, `src/services/difficultyAdjuster.ts`, `src/hooks/useGame.ts`
- `src/components/effects/ParticleSystem.tsx`, new `ComboFlash.tsx`
- `src/screens/game/PlayField.tsx` (juice + spring)

**Phase 4**:
- `App.tsx`, `src/i18n/index.ts` (new)
- `src/locales/{en,es-419,pt-BR,de,fr,ja}.json` (new)
- Every screen + component with user-facing strings
- `src/contexts/EconomyContext.tsx`, `src/hooks/useGame.ts`, `src/services/remoteConfig.ts`
- `src/components/NoLivesModal.tsx` (new)
- `cloud-functions/src/index.ts` (gifting callable)
- `src/components/ShareCard.tsx` (new), `src/screens/GameScreen.tsx` win handler
- `src/services/eventManager.ts`, `src/data/events.ts`, `src/data/dynamicPricing.ts`

**Reused existing utilities (do NOT rewrite):**
- `src/services/iap.ts` (ShopScreen:1403 already has Restore Purchases — just re-expose in Settings)
- `src/services/crashReporting.ts` (Sentry wire-up done — just needs DSN)
- `src/services/ads.ts` (AdMob wired — just needs real IDs)
- `src/services/notifications.ts` (local + remote scaffolded — just needs FCM key)
- `src/hooks/useCeremonyQueue.ts` (25+ ceremony types already queued properly)
- `src/services/funnelTracker.ts`, `src/services/analytics.ts` (35+ events already firing)

---

## End-to-End Verification (how to prove the whole thing works)

Run after each phase before advancing:

1. **Phase 0 smoke**: `npm test && npm run typecheck` pass; EAS dev client APK installs; internal-test-track build on Play Console passes Pre-launch Report; one real IAP test purchase completes and receipt validates server-side; one real push notification arrives on device; one Sentry test error ingested.
2. **Phase 1 compliance**: Manual account-deletion flow from a test account — confirm Firestore purge, Auth record gone, hashed purchase ledger retained. Restore Purchases from clean install recovers VIP. Play Console Data Safety + policy review pass.
3. **Phase 2 day-1**: TalkBack full playthrough; Dynamic Type + colorblind palette toggles work without regressions; all 10 Maestro flows green in CI; LUFS-normalized audio loops seamlessly; per-category volume sliders work.
4. **Phase 3 polish**: Golden-seed tests + 10 000-seed fuzz pass in CI; tester cohort telemetry shows target difficulty distributions; subjective "feels juicy" confirmation.
5. **Phase 4 global**: 5 locales verified in-app with no clipped UI; hard-energy A/B runs correctly under Remote Config flag; gifting ledger balances; share card renders and opens deep link on recipient device; event authored via Remote Config edit appears in app without rebuild.
6. **Phase 5 live**: Crash-free-sessions > 99.5% at 2-week mark; D1 > 35%, D7 > 15%, D30 > 5% (industry benchmarks for casual puzzle); at least one A/B produces a statistically significant result.

---

## Effort Totals (senior-dev-days of coding work)

| Phase | Coding | Wall-clock (external) |
|-------|--------|-----------------------|
| 0 | ~2d | Play Console review can be 1–3 days |
| 1 | ~3d | Data Safety form review |
| 2 | ~9d | Audio commission 2–4 weeks |
| 3 | ~9d | Playtest cohort 1 week |
| 4 | ~16d | Translation 1–2 weeks |
| 5 | ~5d (ongoing) | A/B runtime 2 weeks each |

Rough 3-month solo-dev calendar: weeks 1–2 Phase 0 + 1; weeks 3–5 Phase 2 (audio arrives week 4–5); weeks 6–7 Phase 3; weeks 8–11 Phase 4 (translations arrive week 10); week 12 soft launch + Phase 5 kickoff.

---

## Known Risks & Open Assumptions

- **Audio commission wall-clock** is the critical path for Phase 2. Start the creative brief during Phase 0, not Phase 2.
- **Hard-energy A/B** may increase early monetization but hurt casual-player D30 retention. Genuine business decision; don't ship until A/B result is conclusive.
- **Procedural-only first 5 chapters** (user chose this over hand-authoring) caps the perceived "premium feel". Mitigation: `GenerationProfile` constraints + juice pass + telemetry-tuned difficulty. Reconsider hand-authoring post-launch if D1 funnel leaks at chapter 1–3.
- **Account-deletion retention policy** (1.2) assumes hashed purchase-ledger retention for tax / fraud. If your jurisdiction requires full erasure, swap to a tombstoned UID model — single-line change in the Cloud Function.
- **Cloud Functions codebase split** (`functions/` vs `cloud-functions/`) — `agent_docs/pre_launch_audit.md` line 48 flags consolidation as v1.1 polish. Leave split; consolidate post-launch if desired.
