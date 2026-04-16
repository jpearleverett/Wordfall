# Wordfall — Known Issues & Launch Gaps

> Created during Phase 0 baseline (see `/root/.claude/plans/as-an-expert-mobile-inherited-stream.md`).
> This file tracks everything discovered during the launch readiness assessment that needs follow-up before ship.

---

## Correction of earlier assessment

Two items flagged as "stubbed" in the initial assessment turned out to be more complete than described. Updated status:

### 1. Leaderboards — PARTIAL (not fully stubbed)
- **What exists:** `src/services/firestore.ts` implements `getDailyLeaderboard`, `getWeeklyLeaderboard`, `getAllTimeLeaderboard` (`weeklyScores` + `users.totalScore` queries). `src/screens/LeaderboardScreen.tsx` calls them, falls back to a deterministic mock (`generateMockLeaderboard`) when Firestore is disabled / empty.
- **Real gap:** Nothing ever **writes** to `weeklyScores` / `dailyScores` collections. No `submitScore()` / `writeLeaderboardEntry()` in the codebase. Grep for `weeklyScores` returns only the read path.
- **Phase 1 task narrows to:** add score-submit on puzzle complete → Firestore, plus a server-side bounds-validating Cloud Function. Keep the existing read path & mock fallback.

### 2. VIP Weekly Subscription — MORE WIRED THAN REPORTED
- **What exists:**
  - Product `vip_weekly` → store id `wordfall_vip_weekly` defined (`src/data/shopProducts.ts:802`).
  - Purchase application via `applyProduct()` in `src/services/commercialEntitlements.ts:207-211`: sets `isVipSubscriber=true`, `vipExpiresAt=now+7d`, `adsRemoved=true`, enables gem+hint daily drip, grants `frame_vip_exclusive`.
  - VIP streak tracking fields exist (`vipStreakWeeks`, `vipStreakBonusClaimed`, `vipStreakLastChecked`).
  - Shop purchase button wired (`src/screens/ShopScreen.tsx:856`).
- **Real gap:** No subscription **renewal** detection. Missing:
  - Apple App Store Server Notifications v2 webhook → Cloud Function
  - Google RTDN (Real-Time Developer Notifications) → Cloud Function
  - On renewal: extend `vipExpiresAt` +7d, increment `vipStreakWeeks`
  - On expiry/cancel: clear `isVipSubscriber`, `adsRemoved`, `dailyDrip`
  - Grace period / billing retry handling
- **Phase 1 task narrows to:** server-side receipt + lifecycle. Client code largely already handles VIP state correctly.

---

## Confirmed launch gaps (from the full assessment — still valid)

### Must-fix before ship

- [ ] **Audio assets**: `/assets/audio/` empty. 830-line synth fallback in `src/services/sound.ts` works but sounds amateur. Commission 3 BGM + 20 SFX.
- [ ] **Social account linking**: only Firebase Anonymous auth. No Google/Apple Sign-In. Users who wipe device lose paid progression.
- [ ] **Secure receipt storage**: receipts currently in AsyncStorage (cleartext). Migrate to `expo-secure-store`.
- [ ] **GDPR account deletion**: no UI or Cloud Function for "Delete my account & data".
- [ ] **Remote push (FCM/APNs)**: `sendPushNotification` Cloud Function scaffolded; FCM server key + APNs .p8 not configured.
- [ ] **Leaderboard score submission**: see correction #1 above.
- [ ] **VIP subscription renewal/expiry**: see correction #2 above.

### External (console / account) work

- [ ] Apple Developer: app ID, IAPs (30+ SKUs), subscription group, ATT, Sign-in-with-Apple key, APNs auth key
- [ ] Google Play Console: app, IAPs, subscription, service account with Android Publisher role, data safety, content rating, assetlinks.json
- [ ] Firebase: production project, Firestore rules/indexes deploy, Cloud Functions deploy, secrets (Apple shared secret, Play SA, Perspective, FCM), Remote Config defaults, BigQuery export
- [ ] AdMob: create apps, ad units, UMP consent form, IDFA / ATT prompt
- [ ] Sentry: project + DSN as EAS secret + release alerts
- [ ] Privacy policy legal review + hosted at `wordfallgame.app/privacy`
- [ ] Store creatives: 8 screenshots × 2 form factors × 2 stores, preview videos, feature graphic, ASO keywords

### Soft-launch required

- [ ] Pick 1-2 markets (recommended: Philippines + Canada)
- [ ] 4-6 weeks minimum soft-launch to validate KPIs (D1 ≥40%, D7 ≥18%, D30 ≥6%, crash-free ≥99.5%, payer% ≥2%, ARPDAU ≥$0.08)
- [ ] UA budget ($500-2000/week)
- [ ] Weekly economy / difficulty / ad-load tuning via Remote Config

### Nice-to-have before global launch

- [ ] Localization (5 languages, UI only for v1 — puzzles stay English)
- [ ] RevenueCat consideration for cross-platform subscription management
- [ ] Offer A/B experiments (framework exists, no experiments configured)
- [ ] In-product age gate (if targeting child-friendly ratings)

---

## Phase 0 baseline results

Results recorded on: 2026-04-16

### Dependency install
- `npm install --legacy-peer-deps` — **PASS** (930 packages, 38s, 3 deprecation warnings — `glob@7.2.3` transitive, not blocking)

### Typecheck
- `npx tsc --noEmit` — **PASS** (exit 0, no errors)

### Tests
- `npm test` — **PASS** (39/39 suites, 791/791 tests, 21.3s)

### Device smoke test
- **DEFERRED** — requires user to provide Android device + run EAS build. Captured as separate outside-environment task.

---

## Environment notes for Claude future sessions

- Repo is at `/home/user/Wordfall`.
- Working branch: `claude/game-readiness-assessment-NABLG` (base for phase work).
- Dev client APK is required — Expo Go not supported.
- Native builds must go through EAS (Termux cannot build locally — NDK missing ARM64 host tools).
- **Never push to `main`**. Use `claude/<slug>` branches; user merges PRs.
- Use `npm install --legacy-peer-deps` (`.npmrc` sets this by default but re-affirm if fresh clone).
