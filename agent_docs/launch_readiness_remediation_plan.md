# Wordfall — Final Launch-Readiness Plan (merged)

> **Working-style note for Claude (self-reminder):** Break every task into SMALL chunks. Never attempt more than ~10–15 min of work in a single pass. Long edits/writes time out. After each chunk: save, commit locally if appropriate, then continue. Never Edit > ~150 lines in one call or Write > ~400 lines. This rule applies to every phase below, and to writing/editing this plan itself.

---

## Context

Wordfall is a gravity-based word puzzle (Expo SDK 55, RN 0.83.4, React 19.2, TS ~5.8, zustand + 24-action reducer, Reanimated 4.2.1, Firebase optional, AdMob + react-native-iap, 791 unit tests, 39 suites). The user — an indie developer — asked for an expert assessment of whether the game is ready to ship at Candy Crush / Royal Match / Clash-of-Clans tier, what's missing, and a phased plan with step-by-step outside-env instructions.

This plan is the **merge of two independent deep-scans** of the repo (mine + a second agent's), reconciled against the canonical `agent_docs/pre_launch_audit.md`, `agent_docs/known_issues.md`, and `CLAUDE.md`. Items the user has already completed outside this repo are **explicitly excluded** from the scope — see the "Already-Done Inventory" below. Target: **global Android launch in ~3 months**. iOS deferred.

## Verdict

- **Engineering substrate: A-.** 791/791 tests green, clean tsc, React Compiler on, Reanimated ceremonies, Sentry wired, IAP + AdMob + Firestore + Cloud Functions + receipt validation + VIP lifecycle + leaderboards + consent + club moderation + soft-launch analytics — all real, all wired.
- **Candy-Crush-parity polish: C+.** `assets/audio/` is empty (synthesized fallback), no account-deletion UI, no i18n, no Dynamic Type / colorblind mode, procedural-only chapters not yet validated against real difficulty telemetry, no gifting / share card, no live event authoring pipeline, no soft-launch cohort plan executed.
- **Launch blockers (hard):** 3 code-side (GDPR delete, Restore-in-Settings, `assetlinks.json` SHA256), ~10 user-side console tasks, plus audio commission.
- **Ship-ready?** Not yet. Closer than most indie teams ever get, but ~3 months of focused work + soft-launch tuning separates it from a confident global push.

## 7-Pillar Scorecard (GameRefinery × Hooked)

| # | Pillar | Score | Key gap |
|---|--------|-------|---------|
| 1 | Core Game Loop | 7.5/10 | Audio placeholders; juice pass not dialed in |
| 2 | Meta & Progression | 6.5/10 | Procedural-only; adaptive difficulty unvalidated; no per-chapter generation profile |
| 3 | Retention Systems | 6.5/10 | No hard-energy A/B live; remote push not deployed; no gifting |
| 4 | Monetization | 7/10 code · 3/10 live | IAP SKUs unregistered; no country-tier pricing; no starter-bundle A/B |
| 5 | Social Layer | 5.5/10 | No gifting, no share-card deep link, thin viral surface |
| 6 | Live Ops | 5/10 | No Remote-Config-driven event calendar; no seasonal rotation spec |
| 7 | Tech & Compliance | 7/10 | Account-deletion UI+endpoint missing; web-form fallback missing; no Dynamic Type / colorblind |
| + | Localization (cross-cut) | 1/10 | Strings hardcoded EN |

**Score at Candy-Crush parity ≈ 9/10 across all pillars.** This plan drives pillars 1, 3, 5, 6, 7 into the 8–9 band. Pillars 2 & 4 land in the 7–8 band (chapter volume + offer A/B are post-launch work).

---

## Already-Done Inventory — DO NOT RE-IMPLEMENT

Earlier explore passes missed many of these. Verified via `agent_docs/pre_launch_audit.md` + targeted grep in April 2026. Use these file:line pointers if you need to extend them.

### User has done outside the repo
- Google Play Console account created + verified
- Firebase project (Blaze billing) wired via `EXPO_PUBLIC_FIREBASE_*` + `google-services.json`
- Sentry.io account created (DSN env var still pending)
- `wordfallgame.app` Cloudflare Pages site live with `/privacy`, `/terms`, `/support` (real entity Iridescent Games, date April 16 2026, NY jurisdiction, `info@iridescent-games.com`)
- EAS dev-client APK builds + smoke-tested on real Android device (all screens load, full puzzle plays through)
- Support email alias `info@iridescent-games.com` active

### Wired in code (don't re-implement)
- **Leaderboards — full read + write.** `firestoreService.submitDailyScore` at `src/services/firestore.ts:355` + `submitWeeklyScore` at `:387` called from `src/hooks/useRewardWiring.ts:689,693`. Reads at `:300+`. Firestore rules bound 0–1,000,000. Composite indexes in `firestore.indexes.json`.
- **VIP weekly subscription — end-to-end.** Client `applyProduct` at `src/services/commercialEntitlements.ts:207` sets `isVipSubscriber/vipExpiresAt/adsRemoved/dailyDrip`. Server-side `onSubscriptionRenew` Pub/Sub handler at `functions/src/index.ts:418` consumes Apple App Store Server Notifications v2 + Google RTDN, updates `users/{uid}.vipActive`+`vipExpiresAt` on renew/cancel/refund/expire/trial.
- **Receipt validation + replay protection.** `validateReceipt` HTTPS callable at `functions/src/index.ts:370` with SHA256 hash dedup in `/receipts`. Rejects unauthenticated callers; attributes to `context.auth.uid` only.
- **Push notifications — client side.** `src/services/notifications.ts:506–509` registers Expo + device tokens, persists to `users/{uid}/pushToken`. Server callable `sendPushNotification` at `cloud-functions/src/index.ts:231` with auth + 30/min rate limit + friend/club-co-member gating. `processStreakReminders` scheduled job at `:313`.
- **Sentry SDK wired.** `@sentry/react-native ~7.11.0`; `crashReporter.captureException` at IAP, receipt validation, AuthContext, useRewardWiring, every major Firestore mutation, board-gen timeouts. `redactUid()` PII min in CF logs. Only `EXPO_PUBLIC_SENTRY_DSN` needed to activate.
- **6 Cloud Functions deployed across two codebases** (`firebase.json` codebase routing):
  - `functions/` (commerce): `validateReceipt`, `onSubscriptionRenew`, `clubGoalProgress` (atomic txn, 10k/call cap), `autoKickInactiveMembers`
  - `cloud-functions/` (social): `onPuzzleComplete`, `updateClubLeaderboard`, `sendPushNotification`, `processStreakReminders`, `rotateClubGoals`, `moderateClubMessage` (Perspective API)
- **Firestore rules + indexes.** `firestore.rules` (124 lines, strict ownership + score bounds + club membership/message size 1–200 + reports admin-only + consent ledger). Just needs `firebase deploy`.
- **Consent + UGC safeguards.** Versioned ConsentGate (ToS + Privacy), club chat long-press report/block, server-side Perspective moderation, blocked-users filter client-side, mystery-wheel odds modal, Google UMP + iOS ATT flow before ads init.
- **Build / privacy config.** `allowBackup:false`, Proguard + shrinkResources, HTTPS deep-link `autoVerify="true"` intent filter, `NSUserTrackingUsageDescription`, blocked-permissions list. `wordfallgamesite/.well-known/assetlinks.json` exists with placeholder SHA256.
- **Analytics / experiments.** `src/services/analytics.ts` + `funnelTracker.ts` + `experiments.ts` + `remoteConfig.ts` + `softLaunchAnalytics.ts`. 35+ events, `trackAdRevenue`, `shop_product_tapped` funnel, `analytics.setEnabled` toggle, deterministic bucketing, D1/D7/D30 retention events.
- **Accessibility baseline.** 226 accessibilityLabel instances; `Button.tsx` a11y defaults + 44pt hitSlop; palette raised to ~4.5:1 text contrast; loading state + `busy` on Settings sign-in/out.
- **Restore Purchases** flow **exists** in `ShopScreen.tsx:1403` — just not surfaced in Settings.
- **Bundle** optimized (assets/ 23 MB → 2.4 MB, all images webp, bg video optimized).

---

## Real Launch Gaps (consolidated, deduped vs Already-Done)

### Code-side (small, hard blockers)
1. **GDPR account deletion** — Settings button + `requestAccountDeletion` Cloud Function + local cleanup. Play Store Data-Safety requirement.
2. **Restore Purchases in Settings** — already works in ShopScreen; Play policy wants it discoverable under Account.
3. **"Reset Progress" → "Reset local data"** rename in `SettingsScreen.tsx:109` (confusing vs true deletion).
4. **`assetlinks.json` SHA256** — replace `REPLACE_WITH_YOUR_PLAY_APP_SIGNING_SHA256` once Play app signing fingerprint is issued.

### Code-side (polish — ship gates the other agent flagged, I agree)
5. Audio loader wiring in `src/services/sound.ts` (real files + BGM-by-screen + crossfade + per-category volume + audio-load breadcrumb).
6. `Typography` wrapper for Dynamic Type (`PixelRatio.getFontScale()` clamp 1.0–1.3).
7. Colorblind palette variants (Deut/Prot/Trit) as Settings option.
8. Screen-reader game-state hints on `LetterCell` + `AccessibilityInfo.announceForAccessibility` on word-found.
9. Per-chapter `GenerationProfile` in `src/data/chapters.ts` + honored in `src/engine/boardGenerator.ts` (tutorial-arc curation without hand-authoring).
10. Golden-seed + 10k-fuzz tests on board generator.
11. `difficulty_telemetry` analytics event + retune `difficultyAdjuster.ts` against real data.
12. Gifting (lives/hints) Cloud Function with idempotency key + daily cap.
13. Share-to-social victory card (`react-native-view-shot` + `expo-sharing`) with challenge deep link.
14. Remote-Config event calendar + daily deals override (LiveOps without rebuilds).
15. Hard-energy system gated behind `remoteConfig.hardEnergyEnabled` (A/B, default OFF).
16. i18n scaffolding (`i18next` + `expo-localization`) + ES-419, PT-BR, DE, FR, JA for top-5 screens (UI only, puzzles stay EN).

### User-side (consoles + external — hard blockers)
- Register 20 `wordfall_*` IAP SKUs in Play Console (IDs match `src/data/shopProducts.ts`); set country-tier pricing (IN/BR/MX/ID/PH at 30–50% discount).
- Grant Android Publisher role to `<firebase-project>@appspot.gserviceaccount.com` in Play Console → Users and permissions.
- Upload FCM server key to Firebase → Cloud Messaging.
- Set `EXPO_PUBLIC_SENTRY_DSN` via `eas secret:create` + `.env`.
- AdMob app IDs in `app.json` and rewarded + interstitial unit IDs (via `EXPO_PUBLIC_ADMOB_REWARDED_ID*` / `..._INTERSTITIAL_ID*` env vars) are already real on the user's side. Only remaining AdMob step is verifying those env vars are present in EAS secrets for production AABs (Google test unit fallback in `src/constants.ts` is dev-only).
- Author Google UMP consent message in AdMob → Privacy & messaging.
- Run `firebase deploy --only firestore:rules,firestore:indexes,functions` once.
- Fill Play Console Data Safety form (draft: `agent_docs/data_safety.md`).
- Upload store listing assets (512×512 icon, 1024×500 feature graphic, 8 phone screenshots; copy in `agent_docs/store_listing.md`).
- Set Play target audience to 13+.
- Content rating questionnaire (include mystery-wheel odds disclosure).
- Commission audio (3 BGM with gameplay stems + 20+ SFX).
- Stand up `wordfallgame.app/account-deletion` web-form fallback (Play requires a deletion path reachable **without** installing the app).
- Soft-launch UA budget: Philippines + Canada, 4–6 weeks.

### Deferred to v1.1 (explicitly NOT launch blockers)
`expo-secure-store` receipt migration · consolidate `functions/` + `cloud-functions/` · per-UID Firestore rate-limit counter · inline board-gen timeout banner · PlayerContext/EconomyContext single-slot write queue · `iap.ts` reject-vs-resolve contract · remaining `console.log` sweep · Maestro E2E breadth · `useSyncExternalStore` context selectors · retry helper + "not synced" indicator · iOS lane (Apple Dev enrollment, `GoogleService-Info.plist`, Universal Links, ATT verification on device).

---

## Phase Overview

| Phase | Focus | Dev-days | Wall-clock | Hard blocker? |
|-------|-------|----------|------------|---------------|
| 0 | External setup (consoles, deploy, DSN, AdMob IDs, assetlinks) | ~2 | 1–3d Play review | Yes |
| 1 | Store-compliance code gates (account deletion, restore-in-settings, web form, "reset local data") | ~3 | parallel | Yes |
| 2 | Day-1 churn killers (audio, a11y, UI/E2E tests) | ~9 | 2–4wk audio | Yes |
| 3 | Top-tier polish (GenerationProfile + golden-seed + adaptive-difficulty tuning + juice + BGM stems) | ~9 | 1wk playtest | Strongly-recommend |
| 4 | Global reach + retention levers (i18n, hard-energy A/B, gifting, share card, LiveOps calendar) | ~16 | 1–2wk translation | Strongly-recommend |
| 5 | Soft launch in PH + Canada, tune against KPI gate, then global ramp | ~5 (ongoing) | 4–6wk cohort | Yes (soft launch) |

Rough 3-month solo calendar: wk 1–2 Phase 0+1 · wk 3–5 Phase 2 (audio lands wk 4–5) · wk 6–7 Phase 3 · wk 8–11 Phase 4 (translations land wk 10) · wk 12 soft launch + Phase 5 kickoff.

---

## Phase 0 — External Setup (unblocks everything)

Live builds, receipt validation, push, real ads, crash reporting, deep-link verification are all gated on external services. Do this first — nothing downstream is verifiable without it.

| # | Task | Where | Effort |
|---|------|-------|--------|
| 0.1 | Register 20 `wordfall_*` IAPs in Play Console, IDs matching `src/data/shopProducts.ts`. Enable country-tier pricing (IN/BR/MX/ID/PH −30…−50%). VIP weekly = auto-renewable subscription in a new group "Wordfall VIP". | Play Console | 0.5d |
| 0.2 | Grant **Android Publisher** role to `<firebase-project>@appspot.gserviceaccount.com` in Play Console → Users and permissions. | Play Console | 0.1d |
| 0.3 | Upload FCM server key in Firebase Console → Cloud Messaging. | Firebase Console | 0.1d |
| 0.4 | `firebase deploy --only functions:commerce` (wires `validateReceipt`, `onSubscriptionRenew`, `clubGoalProgress`, `autoKickInactiveMembers`). | shell | 0.25d |
| 0.5 | `firebase deploy --only functions:social` (wires `sendPushNotification`, `moderateClubMessage`, etc.). | shell | 0.25d |
| 0.6 | `firebase deploy --only firestore:rules,firestore:indexes`. | shell | 0.1d |
| 0.7 | AdMob **app IDs** (`app.json`) and rewarded + interstitial **unit IDs** (via `EXPO_PUBLIC_ADMOB_REWARDED_ID*` / `..._INTERSTITIAL_ID*` env vars) are already real on the user's side. Action: verify those env vars are set in EAS secrets so production AABs don't fall through to the dev-only Google test fallback in `src/constants.ts` AD_CONFIG. | EAS secrets | 0.1d |
| 0.8 | Replace `REPLACE_WITH_YOUR_PLAY_APP_SIGNING_SHA256` in `wordfallgamesite/.well-known/assetlinks.json` with Play app signing SHA-256, republish Cloudflare Pages. | site repo | 0.1d |
| 0.9 | Create Sentry project, add `EXPO_PUBLIC_SENTRY_DSN` to `.env` + `eas secret:create`. | Sentry + shell | 0.25d |
| 0.10 | Configure Google UMP consent form (GDPR) in AdMob → Privacy & messaging. | AdMob Console | 0.1d |
| 0.11 | Create Remote Config defaults: `hardEnergyEnabled`(bool,false), `starterBundlePrice`(string,"0.49"), `eventCalendarOverride`(json,null), `interstitialIntervalSeconds`(int), `dailyDealOverride`(json,null). | Firebase Console | 0.25d |

**Verification.** Install internal-test AAB → completion full test purchase (license tester) → Cloud Function logs show `validateReceipt` success · `sendPushNotification` call arrives on device · rewarded ad triggers real impression in AdMob dashboard · `crashReporter.captureException(new Error('sentry-smoke'))` reaches Sentry · tap Play-Store-provided deep link → app opens without browser disambiguation (App Links verified).

**Pillars moved:** 4 (live monetization), 6 (live-ops backbone), 7 (crash reporting).

---

## Phase 1 — Store-Compliance Code Gates

Play policy scanner fails if any of the below is missing. Every item is small.

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.1 | **Account-Deletion UI** under Settings → Account. Two-step confirm + re-auth prompt. Calls `requestAccountDeletion` callable. **[DONE — `requestAccountDeletion` imported into `SettingsScreen` with two-step confirm; handler purges local storage + signs out.]** | `src/screens/SettingsScreen.tsx`, `src/contexts/AuthContext.tsx`, `src/services/firestore.ts` | 1d |
| 1.2 | **`requestAccountDeletion` Cloud Function.** Purges `players/{uid}`, `users/{uid}/*`, club membership + authored messages, consent ledger, `blockedUsers`, Firebase Auth record. Purchase-receipt ledger retained with UID→one-way SHA256 hash (tax / fraud audit). SLA ≤ 30d per Play policy. **[DONE — `functions/src/index.ts` L785 `requestAccountDeletion` HTTPS endpoint.]** | `functions/src/index.ts` | 1d |
| 1.3 | **Surface Restore Purchases in Settings** (flow exists in `ShopScreen.tsx:1403` — reuse). **[DONE — `handleRestorePurchases` wired in `SettingsScreen.tsx:95` via `useCommerce().restorePurchases`.]** | `src/screens/SettingsScreen.tsx`, `src/services/iap.ts` | 0.25d |
| 1.4 | **Data-deletion web-form** at `wordfallgame.app/account-deletion` (Play policy: deletion reachable **without** installing the app). Form → email to `info@iridescent-games.com` → internal SLA invokes the callable on the user's behalf. **[DONE — `wordfallgamesite/account-deletion/index.html` (348 lines) published via Cloudflare Pages.]** | `wordfallgamesite/account-deletion/index.html` (new) | 0.5d |
| 1.5 | Rename Settings:109 "Reset Progress" → **"Reset local data"** (avoid confusion with deletion). **[DONE — label + accessibilityLabel now "Reset local data" at `SettingsScreen.tsx:680`.]** | `src/screens/SettingsScreen.tsx` | 0.1d |
| 1.6 | Fill Play Console Data Safety form from `agent_docs/data_safety.md`. Verify declared types match what the app actually sends (Firebase Analytics, AdMob ad ID, Sentry crash traces). | Play Console | 0.5d |
| 1.7 | Confirm Play target audience = 13+. | Play Console | 0.1d |

**Verification.** Seed a test account with progress + purchases + club membership + chat message → trigger deletion → Firestore shows user doc + subcollections gone; `/receipts` retains hashed-UID rows only; Auth record deleted; push to old token fails gracefully. Restore Purchases from clean install → VIP + Ad Removal flags restored. Play pre-launch report returns no policy violation.

**Pillars moved:** 7 (Compliance/Store).

---

## Phase 2 — Day-1 Churn Killers

Audio, accessibility, UI/E2E test coverage. What a first-session player feels in the first 60s.

### 2A. Audio (biggest single polish uplift)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.1 | Commission 20 SFX + 4 BGM per `assets/audio/README.md`. MP3 44.1 kHz, −14 LUFS, seamless loops. Synthwave aesthetic. **Request gameplay BGM stems (base + high-intensity)** so 3.11 can layer them. | composer | 0d code, 2–4wk wall-clock |
| 2.2 | Drop assets into `assets/audio/`; wire loader in `src/services/sound.ts` preferring real files over synthesis. Keep synth fallback so dev builds still work without assets. | `src/services/sound.ts` | 1d |
| 2.3 | BGM by screen context: `bgm-home` on HomeScreen focus, `bgm-gameplay` on GameScreen, `bgm-relax` in relax mode, `bgm-victory` on complete. 400 ms crossfade; duck under ceremony SFX. | `src/services/sound.ts`, `src/screens/{Home,Game}Screen.tsx`, `src/hooks/useCeremonyQueue.ts` | 1d |
| 2.4 | Per-category volume (`sfxVolume` / `musicVolume` / `ceremonyVolume`) — currently only global music volume applies. Sliders exist; they just don't route. | `src/services/sound.ts`, `src/contexts/SettingsContext.tsx`, `src/screens/SettingsScreen.tsx` | 0.5d |
| 2.5 | Audio-load error breadcrumb to Sentry so missing assets don't silently fail. | `src/services/sound.ts` | 0.25d |

### 2B. Accessibility

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.6 | ✅ DONE. `src/components/common/Typography.tsx` exposes a `Typography` wrapper + `installGlobalFontScaleClamp()` that clamps `PixelRatio.getFontScale()` to 1.0–1.3 app-wide via `Text.defaultProps`. Called from `App.tsx` on boot. | `src/components/common/Typography.tsx`, `App.tsx` | 2d |
| 2.7 | ✅ DONE. Settings exposes a Colorblind Mode selector (off / Deut / Protan / Tritan). `useColors()` hook in `src/hooks/useColors.ts` resolves `getColorblindOverrides()` from `src/services/colorblind.ts` and overlays on the base palette. `SettingsContext.colorblindMode` persisted. | `src/services/colorblind.ts`, `src/hooks/useColors.ts`, `src/contexts/SettingsContext.tsx`, `src/screens/SettingsScreen.tsx` | 1.5d |
| 2.8 | ✅ DONE. `LetterCell` has position + selection + current-word `accessibilityLabel`; `GameScreen.tsx:463` watches `solveSequence` and calls `AccessibilityInfo.announceForAccessibility` on every new word-found. | `src/components/LetterCell.tsx`, `src/screens/GameScreen.tsx` | 1d |

### 2C. UI / E2E coverage

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.9 | ✅ DONE. All 10 Maestro flows present in `.maestro/`: 01_app_launch, 02_daily_puzzle, 03_shop_browse, 04_settings, 05_mode_select, 06_consent_accept, 07_restore_purchases, 08_account_deletion, 09_purchase_happy_path, 10_club_chat_send_and_report. | `.maestro/*.yaml` | 1.5d |
| 2.10 | ✅ DONE. `src/services/__tests__/iapCommerce.integration.test.ts` covers the same commerce surface `useCommerce` orchestrates: happy, replay rejection, duplicate transactionId independence, `__DEV__` network-fallback. Hook-layer render test skipped — no rendering lib in deps (testing-library absent). | `src/services/__tests__/iapCommerce.integration.test.ts` | 1d |
| 2.11 | Snapshot tests for Home/Game/Shop/Settings/Club. | `src/screens/__tests__/*.snap.test.tsx` | 1d |

**Verification.** Delivered BGM validates at −14 ±1 LUFS (Youlean Loudness Meter), no audible loop seam. TalkBack full playthrough of daily puzzle. System-level "Large Text" → no HomeScreen/GameScreen/ShopScreen clipping. Each colorblind palette keeps success/error/selection visually distinct. All 10 Maestro flows green in CI.

**Pillars moved:** 1 (Core Loop feel), 7 (a11y + test coverage).

---

## Phase 3 — Top-Tier Polish (Procedural Curation + Juice)

User chose **tighten procedural generation** instead of hand-authoring 75 tutorial puzzles. Constrain chapters 1–5 to feel curated, validate `difficultyAdjuster.ts` with real telemetry, and land a juice pass on moment-to-moment feel.

### 3A. Per-chapter GenerationProfile

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.1 | ✅ DONE. `src/data/chapters.ts` now defines a `profile` on every chapter with `{minWordLength, maxWordLength, introducedMechanics, emptyCellDensity, dictionaryTier}`. Type in `src/types.ts`. | `src/data/chapters.ts`, `src/types.ts` | 1.5d |
| 3.2 | ✅ DONE. `src/engine/boardGenerator.ts` honors the chapter profile (dictionary filtering, word-length cap, empty-cell density, mechanic-intro gates) while preserving seeded-PRNG determinism. | `src/engine/boardGenerator.ts` | 1.5d |
| 3.3 | ✅ DONE. Golden-seed profile tests at `src/engine/__tests__/boardGenerator.profiles.test.ts` — green in CI. | `src/engine/__tests__/boardGenerator.profiles.test.ts` | 1d |
| 3.4 | ✅ DONE. Fuzz suite at `src/engine/__tests__/boardGenerator.fuzz.test.ts` runs in the normal test suite (~16s) and is green. | `src/engine/__tests__/boardGenerator.fuzz.test.ts` | 0.5d |

### 3B. Validate adaptive difficulty with real telemetry

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.5 | ✅ DONE. `analytics.trackDifficultyTelemetry({ mode, level, stars, attempts, hintsUsed, undosUsed, chainCount, timeMs, adjusterTier })` fires on win (from `useRewardWiring.ts:201`) and fail (from `GameScreen.tsx:1133`). | `src/services/analytics.ts`, `src/screens/GameScreen.tsx`, `src/hooks/useRewardWiring.ts` | 0.5d |
| 3.6 | Recruit 10 Play-Internal-Test players × 50 levels each. Target distributions: easy 75%+ first-try win · medium 50–60% · hard 30–40%. | testers + BigQuery | 2d |
| 3.7 | Retune `difficultyAdjuster.ts` thresholds from observed data. | `src/services/difficultyAdjuster.ts` | 1d |

### 3C. Juice pass on core loop

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.8 | ✅ DONE. `src/components/effects/ParticleSystem.tsx` runs spark+absorb particles on word-find; wired from `PlayField`. Audio tie-in will land with the real-asset commission in Phase 2.1. | `src/components/effects/ParticleSystem.tsx`, `src/screens/game/PlayField.tsx` | 1d |
| 3.9 | ✅ DONE. `src/components/effects/ComboFlash.tsx` — accent-tint flash at combo ≥ 3, gold tint + confetti burst at combo ≥ 5, honours reduce-motion. Mounted in `GameScreen.tsx:1601`. | `src/components/effects/ComboFlash.tsx` | 1d |
| 3.10 | ✅ DONE. Fall-in spring at `GameScreen.tsx:1091` uses `tension:180, friction:9` for a subtle landing bounce-overshoot. Reduce-motion users skip the spring block. | `src/screens/GameScreen.tsx` | 0.5d |
| 3.11 | Layered BGM: high-intensity stem mixes in at combo ≥ 3, fades on miss. Requires 2.1 to have requested stems. | `src/services/sound.ts` | 1d |

**Verification.** CI: golden-seed + fuzz green. Telemetry from 2nd-pass cohort lands within target distributions. Recorded juice demo: fresh eyes say "oh, that's satisfying".

**Pillars moved:** 1 (Core Loop), 2 (Meta/Progression validation).

---

## Phase 4 — Global Reach & Long-Tail Retention

i18n unlocks ~60% of non-EN revenue. Hard-energy A/B + gifting + share cards close the session-frequency + viral gaps. LiveOps pipeline runs seasonal events without builds.

### 4A. Localization (UI only — puzzles stay EN)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.1 | ✅ DONE. `src/i18n/index.ts` bootstraps `i18next` + `react-i18next` + `expo-localization`, initialized in `App.tsx`. | `App.tsx`, `src/i18n/index.ts` | 0.5d |
| 4.2 | **In progress (well advanced).** `src/locales/en.json` covers Onboarding (full), GameScreen fail modal, Settings labels, HomeScreen (full), ShopScreen section titles + premium product names, MysteryWheel title, MasteryScreen season-time strings, ClubScreen (no-club hero, search/create sections, weekly score, club puzzle, club goal, contribution row, member count). Remaining: full ClubScreen depth (chat tabs, leaderboard headings, member rows), Ceremony queue strings, ResultScreen polish strings. | every `src/screens/**` + `src/components/**` with strings | 3–4d |
| 4.3 | Commission translations: ES-419, PT-BR, DE, FR, JA. ~500 strings × 5 locales. Mobile-gaming tone. | external | 0d code, 1–2wk wall-clock |
| 4.4 | ✅ DONE. Locale selector in Settings; defaults to device locale, falls back to EN via `SettingsContext`. | `src/screens/SettingsScreen.tsx`, `src/contexts/SettingsContext.tsx` | 0.5d |
| 4.5 | ✅ DONE (UI plural-safety). Migrated all hardcoded English plural concatenations to i18next `_one/_other` plural keys. Sites: `SettingsScreen.tsx:105` (purchasesRestored), `HomeScreen.tsx:627` (freeSpinsAvailable), `MysteryWheel.tsx:152` (spinsAvailable), `MasteryScreen.tsx:192,214` (daysRemainingSeason, daysLeftRewards), `PuzzleComplete.tsx:259,273` (chaptersAway, starsAway), `ReplayViewer.tsx:254` (movesCount), `ReferralCard.tsx:121` (friendsReferred), `ShopScreen.tsx:900` (weeksSubscribed). Share-text in `replayGenerator.ts:48,49` intentionally kept English per plan 4.7 ("English puzzles, translated UI"). | across strings | 1d |
| 4.6 | Snapshot-test each locale for top 5 screens (DE strings ~+30% wider than EN). | `src/screens/__tests__/*.locale.test.tsx` | 0.5d |
| 4.7 | Store-listing description clearly states "English puzzles, translated UI". | Play Console | 0.1d |

### 4B. Hard-Energy A/B (Remote-Config-gated, default OFF)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.8 | ✅ DONE (Apr 2026). `lives`/`maxLives`/`nextLifeTime` already exposed by `src/contexts/EconomyContext.tsx` with AsyncStorage persistence + auto-refill via `computeRefilledLives`. `useHardEnergy` hook at `src/hooks/useHardEnergy.ts` composes it with `getRemoteBoolean('hardEnergyEnabled')` — returns `canPlay:true` while flag is false so no behaviour change until flip-on. | `src/contexts/EconomyContext.tsx`, `src/hooks/useHardEnergy.ts` (new) | 1d |
| 4.9 | ✅ DONE (Apr 2026). `App.tsx` `GameScreenWrapper` debits a life on every level load via `useHardEnergy().startLevel()` — keyed on `route.key` + mode + level so re-renders never double-debit. When `canPlay=false` the board is blocked and `NoLivesModal` opens. New `life_reward` AdRewardType + 3/day cap (`AD_CONFIG.MAX_LIFE_ADS_PER_DAY`) lets `onWatchAd` grant +1 life via `adManager.showRewardedAd`. Still flip-off safe — `hardEnergyEnabled=false` keeps `startLevel()` a no-op. | `App.tsx`, `src/hooks/useHardEnergy.ts`, `src/services/ads.ts`, `src/constants.ts`, `src/contexts/EconomyContext.tsx` | 1d |
| 4.10 | ✅ DONE (Apr 2026). `src/components/NoLivesModal.tsx` — rewarded-ad CTA (spinner while awaiting ad reward), gem full-refill (disabled when short), countdown to `nextLifeAtMs`, close/wait. Pure UI — wire-up into GameScreen happens alongside 4.9. | `src/components/NoLivesModal.tsx` (new) | 1.5d |
| 4.11 | **Code half DONE.** Client emits `hard_energy_enabled` user property at every `app_launch` (`App.tsx:914-924`) so Firebase Analytics + A/B Testing can segment retention/revenue by the Remote Config cohort the user actually saw. `analytics.updateUserProperties` signature extended to accept the boolean. Console step still TODO: create the 50/50 Firebase A/B experiment in Console → Remote Config → A/B Testing using `hard_energy_enabled` as the breakdown dimension and D7 retention × ARPDAU as primary metrics. Min 2-week run before decision. | Firebase Console + `App.tsx`, `src/services/analytics.ts` | 0.5d |

### 4C. Social & viral loops

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.12 | **Gifting** (lives/hints) to clubmates + referred friends. Cloud Function atomically debits sender pool + credits receiver with idempotency key. Rate-limit 5 gifts/day/sender. **[DONE — `sendGift`/`claimGift` callables with atomic txn + 5/day cap + idempotency (`cloud-functions/src/index.ts`); client wrapper `src/services/gifts.ts` with 5 unit tests; `PlayerSocialContext.sendHintGift`/`sendTileGift` route through `sendGiftSecure` with legacy direct-write fallback; inbox UI `src/components/GiftInbox.tsx` mounted in `ClubScreen` — claim via `claimGiftSecure`, grants applied locally through EconomyContext.]** | `cloud-functions/src/index.ts`, `src/screens/ClubScreen.tsx`, `src/components/GiftInbox.tsx`, `src/contexts/PlayerSocialContext.tsx` | 2d |
| 4.13 | **Share-to-social victory card.** Off-screen grid + score + stars + "beat my score" deep link. `react-native-view-shot` → `expo-sharing`. **[DONE — `src/components/ShareCard.tsx` + `src/hooks/useShareVictory.ts` wrap `captureRef` + `Sharing.shareAsync`; fires `share_tapped` analytics; used from `PuzzleComplete` win surface.]** | `src/components/ShareCard.tsx`, `src/hooks/useShareVictory.ts`, `src/components/PuzzleComplete.tsx` | 1.5d |
| 4.14 | (Stretch) **Ask-for-hint** from stuck tile. Broadcasts snapshot to club chat; clubmate replies with hint. | `src/screens/ClubScreen.tsx`, `cloud-functions/src/index.ts` | 2d |

### 4D. LiveOps authoring pipeline

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.15 | Remote-Config-driven event calendar. JSON schema documented. Fetched on app start. Falls back to `src/data/events.ts`. **[DONE — `parseRemoteEvents` in `src/services/eventManager.ts` consumes `eventCalendarOverride`; malformed/empty falls back to built-in calendar.]** | `src/services/eventManager.ts`, `src/services/remoteConfig.ts`, `src/data/events.ts` | 2d |
| 4.16 | Remote-Config-driven daily deals + flash sales (replace hard-coded date hash in `src/data/dynamicPricing.ts`). Tune without builds. **[DONE — `parseRemoteDailyDeal` + `dailyDealOverride` wired in `getFlashSale`; covered by `src/data/__tests__/dynamicPricing.override.test.ts` (6 cases).]** | `src/data/dynamicPricing.ts`, `src/services/remoteConfig.ts` | 1d |
| 4.17 | "Event editor" JSON template doc so non-engineers can ship events via Remote Config edit. **[DONE — `agent_docs/live_ops.md` documents both overrides + troubleshooting + verification steps.]** | `agent_docs/live_ops.md` (new) | 0.5d |

**Verification.** Locale swap → all top-5 screens render cleanly, no clipped labels. Flip `hardEnergyEnabled=true` → lives consume/regen correctly, ad refill works, no bypass. Two-account gifting → ledgers balance, idempotency stops double-credit. Victory share card renders on Android share sheet; deep link opens on recipient device. Fake event authored in Remote Config appears in-app without rebuild.

**Pillars moved:** 3 (Retention), 5 (Social), 6 (Live Ops), + Localization.

---

## Phase 5 — Soft Launch + First 4 Weeks Live

**Why soft-launch:** global launch is a one-shot marketing moment. Only spend it on a product proven in the wild.

### 5A. Market selection

Ship to **Philippines + Canada** on the Play internal track → open track. PH = large, English, cheap ($0.20 CPI, large sample). Canada = US-like behavior ($1.50 CPI) — best signal for predicting global KPIs.

### 5B. Soft-launch ship gate (must hit all before global)

| Metric | Minimum to ship | Best-in-class (word puzzle) |
|--------|-----------------|------------------------------|
| D1 retention | 40% | 50%+ |
| D7 retention | 18% | 25%+ |
| D30 retention | 6% | 10%+ |
| Session length | 6 min | 10 min |
| Sessions/day | 2.5 | 4+ |
| Payer % | 2% | 5% |
| ARPDAU | $0.08 | $0.20+ |
| LTV D60 | $1.50 | $3+ |
| Crash-free users | 99.5% | 99.9% |

Hit all minimums for 2 consecutive weeks = global-ready.

### 5C. First 4 weeks of live ops (while soft-launch runs)

| # | Task | Effort |
|---|------|--------|
| 5.1 | First A/B: starter bundle $0.49 vs $0.99 vs $1.99 (Remote Config `starterBundlePrice`). Primary metric D7 conversion, not D1 revenue. | 1d setup + 2wk run |
| 5.2 | First holiday-themed event via 4.15 pipeline (seasonal skin + limited offer + leaderboard). | 2d |
| 5.3 | Hard-energy A/B decision gate at 2wk. Ship or revert based on D7 × ARPDAU. | 0.5d analysis |
| 5.4 | Push tuning: segment by last-seen cohort, TOD optimization, stop push to 3-day silent users until reactivation offer. | 1d |
| 5.5 | Funnel drop-off review (onboarding → first-purchase → daily-return). Fix biggest leak. | 1d |
| 5.6 | Country-tier price fine-tune for IN/BR/MX/ID/PH. | Play Console |
| 5.7 | Deprecate synth audio fallback if telemetry shows zero users hit it. | 0.25d |

**Verification.** Weekly review: crash-free-sessions > 99.5% · D1/D7/D30 trending to gate · first cohort LTV curve stabilizing by D14 · at least one A/B produces statistically significant result.

**Pillars moved:** 3, 4, 6 (ongoing).

---

## Budget Rollup (approximate, solo-dev launching in ~3 months)

| Line item | Cost |
|-----------|------|
| Audio commission (3 BGM w/ stems + 20 SFX) | $1,500–3,500 |
| Translations (5 locales × ~500 strings × $0.10/word) | $1,500–3,000 |
| Store creatives (trailer editor, screenshot headlines, feature graphic) | $500–1,500 |
| Legal review of privacy/ToS (one-time) | $500–1,500 |
| UA budget for soft launch (PH + Canada, 4–6wk, ~500–1000 installs/wk clean cohort) | $2,000–5,000 |
| Firebase Blaze spend during soft launch | $50–200 |
| Misc (Fiverr gigs, icon review, Youlean Loudness Meter → free) | $500 |
| **Total to global launch** | **~$6,500–15,000** |

Apple Developer ($99/yr) deferred — iOS is v1.1.

---

## Critical Files by Phase (hot-path)

**Phase 0 (mostly external):** `app.json`, `src/constants.ts` AD_CONFIG, `functions/src/index.ts`, `cloud-functions/src/index.ts`, `firestore.rules`, `firestore.indexes.json`, `.env`, EAS secrets, `wordfallgamesite/.well-known/assetlinks.json`.

**Phase 1:** `src/screens/SettingsScreen.tsx`, `src/services/firestore.ts`, `src/contexts/AuthContext.tsx`, `functions/src/index.ts` (new `requestAccountDeletion`), `wordfallgamesite/account-deletion/index.html` (new).

**Phase 2:** `src/services/sound.ts`, `src/screens/{Home,Game}Screen.tsx`, `src/hooks/useCeremonyQueue.ts`, `src/components/common/Typography.tsx` (new), `src/constants.ts` FONTS + palette, `src/components/LetterCell.tsx`, `src/screens/game/PlayField.tsx`, `src/contexts/SettingsContext.tsx`, `.maestro/*.yaml` (new), `src/hooks/__tests__/useCommerce.test.ts` (new).

**Phase 3:** `src/data/chapters.ts`, `src/types.ts` (GenerationProfile), `src/engine/boardGenerator.ts`, `src/engine/__tests__/{profiles,fuzz}.test.ts` (new), `src/services/analytics.ts`, `src/services/difficultyAdjuster.ts`, `src/hooks/useGame.ts`, `src/components/effects/{ParticleSystem,ComboFlash}.tsx`, `src/screens/game/PlayField.tsx`.

**Phase 4:** `App.tsx`, `src/i18n/index.ts` (new), `src/locales/{en,es-419,pt-BR,de,fr,ja}.json` (new), every screen + component with strings, `src/contexts/EconomyContext.tsx`, `src/services/remoteConfig.ts`, `src/components/NoLivesModal.tsx` (new), `cloud-functions/src/index.ts` (gifting), `src/components/ShareCard.tsx` (new), `src/services/eventManager.ts`, `src/data/{events,dynamicPricing}.ts`.

**Reused existing utilities — DO NOT rewrite:**
- `src/services/iap.ts` (Restore Purchases already works in `ShopScreen:1403` — just surface in Settings)
- `src/services/crashReporting.ts` (Sentry wired, needs DSN only)
- `src/services/ads.ts` (AdMob wired, needs real IDs only)
- `src/services/notifications.ts` (push token saved to Firestore — needs FCM key only)
- `src/hooks/useCeremonyQueue.ts` (25+ ceremonies already queued)
- `src/services/{analytics,funnelTracker,experiments,remoteConfig,softLaunchAnalytics}.ts` (35+ events firing)

---

## End-to-End Verification (gate between phases)

1. **Phase 0 smoke:** `npm test && npm run typecheck` pass · dev APK installs · internal-test-track Play pre-launch report clean · one real test purchase validates server-side · one real push arrives · Sentry ingests smoke error · Play deep link opens app (App Links verified).
2. **Phase 1 compliance:** account-deletion flow purges Firestore, keeps hashed receipts, deletes Auth record · Restore Purchases from clean install recovers VIP + Ad Removal · Play policy scan passes.
3. **Phase 2 day-1:** TalkBack full playthrough · Dynamic Type + colorblind toggles cause no regressions · all 10 Maestro flows green · BGM LUFS-valid + seam-free · per-category volume sliders effective.
4. **Phase 3 polish:** golden-seed + 10k-fuzz green in CI · tester cohort telemetry lands in target difficulty distributions · juice-pass demo lands subjectively.
5. **Phase 4 global:** 5 locales verified with no clipped UI · hard-energy A/B runs correctly under flag · gifting ledger balances + idempotency prevents double-credit · share card + deep link round-trips · Remote-Config event appears without rebuild.
6. **Phase 5 live:** 2 consecutive weeks meeting every KPI in the Phase 5B gate · at least one A/B produces a statistically significant result · no P0/P1 open.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Play policy rejects on deletion flow wording | Medium | 1wk delay | Use Play's pre-launch report before submit; copy wording from accepted apps |
| Audio composer misses deadline | Medium | 2–4wk delay | Kick off brief during Phase 0, not Phase 2; synth fallback keeps dev flowing |
| Soft-launch KPIs miss gate | Medium | 4–8wk iteration | Budget 2 tuning passes; hard-energy A/B is pre-wired to flip on if retention saggy |
| Firebase spending surprise | Low | $ only | Budget alerts at $50/$100/$500 |
| Play Integrity blocks legit users | Medium | support load | Require "Basic" integrity only; require "Strong" only for purchases |
| Translator quality misses gaming jargon | Medium | PR risk | Native-speaker QA pass in-app before launch |
| Hard-energy harms casual D30 | Medium | retention | Ship as A/B default-OFF; 2wk min run; ship only if D7 × ARPDAU positive |
| Country-tier pricing arbitrage (VPN payers) | Low | revenue | Play enforces IP-at-purchase + receipt validation on server |
| Clubs chat abuse | Medium | PR risk | Perspective API wired + report/block + admin reports collection already live |

---

## Outside-the-Environment Step-by-Step (human actions, roughly in order)

### Before Phase 0
1. Create 20 IAP products in Play Console (IDs match `src/data/shopProducts.ts`); set base prices; enable country tiering.
2. Grant Android Publisher to `<firebase-project>@appspot.gserviceaccount.com`.
3. Upload FCM server key in Firebase → Cloud Messaging.
4. Author UMP consent form in AdMob.
5. Get real AdMob app IDs + ad unit IDs (rewarded + interstitial).
6. Copy Sentry DSN.
7. Generate Play app signing SHA-256 (Play Console → Setup → App signing).
8. Create Remote Config defaults: `hardEnergyEnabled=false`, `starterBundlePrice="0.49"`, `eventCalendarOverride=null`, `interstitialIntervalSeconds`, `dailyDealOverride=null`.

### During Phase 1
9. Stand up `wordfallgame.app/account-deletion` HTML form → email to `info@iridescent-games.com`.
10. Confirm the email alias forwards to an inbox you actually read.
11. Complete Play Console Data Safety form from `agent_docs/data_safety.md`.
12. Content rating questionnaire (include mystery-wheel odds disclosure).

### During Phase 2 — audio commission
13. Write composer brief: synthwave, 5–10 reference tracks, per-BGM mood (home ambient · gameplay focused · relax chill · victory triumphant), −14 LUFS, seamless loops, **gameplay stems (base + high-intensity)**.
14. Fiverr Pro / AudioJungle custom / direct outreach — 2–3 quotes, $500–1,500.
15. Contract 1 revision round; 50% deposit / 50% on delivery.
16. Validate LUFS (Youlean Loudness Meter) + loop seamlessness in Audacity; drop into `assets/audio/`.

### During Phase 3 — playtest cohort
17. Recruit 10 testers via Play Internal Test (mix of puzzle vets + casuals).
18. Discord channel or Google Form for qualitative feedback.
19. Pull `difficulty_telemetry` events from Firebase → BigQuery after 1 week; analyze distributions.

### During Phase 4 — localization
20. Commission ES-419 / PT-BR / DE / FR / JA (Gengo / OneHourTranslation / Lokalise). Request "mobile-gaming tone". Provide context glossary ("STAR" = currency, etc.).
21. Native-speaker QA pass in-app before global push.

### Store creatives (run in parallel from Phase 2 onward)
22. Icon review at 48×48 (does it read clearly?).
23. 8 Android phone screenshots with headline overlay; optional 7"/10" tablet.
24. 30s preview video + 2-minute feature video (gameplay editor ~$500 if you don't edit).
25. 1024×500 feature graphic.
26. ASO keyword research (Sensor Tower / AppTweak free tier): target 3 high-volume / low-comp — "word game", "word puzzle", "spelling".

### Legal / ops
27. Tax reporting + Play payout profile set.
28. Retain hashed purchase ledger ≥ 7 years.
29. SLA for account-deletion web-form ≤ 72 hours.

### iOS (v1.1, defer)
Apple Developer enrollment → App Store Connect record (`com.wordfall.app`) → `GoogleService-Info.plist` committed → iOS EAS build → TestFlight → ATT on-device → Universal Links via apple-app-site-association.

---

## Working-Style Reminders for Claude

- **Small chunks always.** One sub-task = one Claude session. Plan files + long edits get written in ≤ ~400-line Writes / ≤ ~150-line Edits. Split before you time out.
- **Commit at logical boundaries.** Push to `claude/<slug>` only. Never push to `main`. User merges PRs.
- **Reuse don't reinvent.** Search before writing. Many "missing" features are wired — see Already-Done Inventory.
- **Verify on device.** Tests prove correctness; they don't prove fun. Pair every code change with a manual check on the physical APK.
- **Trust but verify subagents.** Read the diff of anything a subagent writes before declaring done.
- **Never use `--no-verify` / `--no-gpg-sign`.** If a hook fails, fix the underlying issue.
- **Always read `agent_docs/pre_launch_audit.md` first** when starting a session — it's the canonical "what's done" doc. Earlier explore passes missed it.
- **Document external setup as you go** in `agent_docs/setup.md` so future sessions can retrace.
- **Android-first.** Don't add Apple-side work unless the user explicitly brings iOS into scope.

---

## One-Page Cheat Sheet

| Want to… | Do this first |
|----------|---------------|
| Start tomorrow | Phase 0 tasks 0.1 → 0.11, in one afternoon |
| Know if it's ready | Not yet. 3 months: Phase 0–1 (wk 1–2) → 2 (wk 3–5) → 3 (wk 6–7) → 4 (wk 8–11) → 5 soft-launch (wk 12+) |
| Hit Candy-Crush polish | Audio is the single biggest gap. Kick off the composer brief Day 1 of Phase 0. |
| Spend money well | Audio $2k · translation $2.5k · UA $3k · legal $1k · creatives $1k · misc $0.5k ≈ $10k |
| Single biggest retention lever | Hard-energy A/B — pre-wire as Remote Config, flip on only if soft-launch D7 < 18% |
| Biggest revenue lever | Country-tier pricing + starter-bundle A/B — both land during Phase 0 + Phase 5 |

