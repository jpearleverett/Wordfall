# Wordfall — Known Issues & Launch Gaps

> Created during Phase 0 baseline (see `/root/.claude/plans/as-an-expert-mobile-inherited-stream.md`).
> **Significantly revised after deep code-scan verification on 2026-04-16.**
> The earlier explore-agent reports missed `agent_docs/pre_launch_audit.md` and several wired Cloud Functions / client paths.
> The repo is *much* closer to launch than the original assessment said.

---

## Phase 0 baseline results (2026-04-16)

- `npm install --legacy-peer-deps` — PASS (930 packages, 38s)
- `npx tsc --noEmit` — PASS (clean)
- `npm test` — PASS (39/39 suites, 791/791 tests, 21.3s)
- Device smoke test — PASS (user-confirmed: APK builds via EAS, all screens load, game plays through)

---

## Status corrections vs the initial assessment

### 1. Leaderboards — WIRED (correction)
- `firestoreService.submitDailyScore` (`src/services/firestore.ts:355`) and `submitWeeklyScore` (`src/services/firestore.ts:387`) write scores.
- They are CALLED on puzzle complete from `src/hooks/useRewardWiring.ts:689,693`.
- Reads via `getDailyLeaderboard` / `getWeeklyLeaderboard` / `getAllTimeLeaderboard` (`src/services/firestore.ts:300+`).
- Firestore rules already enforce `0 ≤ score ≤ 1,000,000` and ownership (`firestore.rules:23-50`).
- Composite indexes exist (`firestore.indexes.json`).
- Mock fallback in `LeaderboardScreen.tsx` only kicks in when Firestore is disabled / empty.

### 2. VIP weekly subscription — WIRED end-to-end (correction)
- Client side: purchase → `applyProduct` (`src/services/commercialEntitlements.ts:207`) sets `isVipSubscriber=true`, `vipExpiresAt=now+7d`, `adsRemoved=true`, `dailyDrip` (50 gems + 3 hints), VIP frame.
- Server side: `onSubscriptionRenew` Pub/Sub function (`functions/src/index.ts:418`) handles BOTH:
  - Apple App Store Server Notifications v2 (`handleAppleSubscriptionEvent`)
  - Google RTDN (`handleGoogleSubscriptionEvent`)
- Updates `users/{uid}.vipActive` + `vipExpiresAt` on renew/cancel/refund/expire.
- Trial detection (`is_trial_period` / `paymentState`) included.
- Receipt validation server-side via `validateReceipt` (`functions/src/index.ts:370`) with SHA256 hash replay protection.

### 3. Push notifications — client WIRED (correction)
- `src/services/notifications.ts` registers Expo + device push tokens, saves to `users/{uid}/pushToken` in Firestore (line 506-509).
- Server-side `sendPushNotification` callable exists (`functions/src/social.ts`) with auth, in-memory 30/min rate limit + per-UID Firestore rate-limit counter (`rateLimits/{uid}_sendPushNotification_{windowStart}`), friend/club-co-member-only delivery.
- `processStreakReminders` scheduled function exists (`functions/src/social.ts`).
- Real launch dependency: FCM server key uploaded to Firebase Console.

### 4. Sentry — WIRED (correction)
- SDK installed (`@sentry/react-native ~7.11.0`).
- `crashReporter.captureException` wired across IAP, receipt validation, AuthContext, useRewardWiring, every major Firestore mutation, board-gen timeouts.
- `redactUid()` PII minimization in Cloud Function logs.
- Only missing: `EXPO_PUBLIC_SENTRY_DSN` env var (user confirmed Sentry account exists).

### 5. Cloud Functions — 13 deployed in a single `functions/` codebase (consolidated Apr 2026)
**Commerce (`functions/src/index.ts`):**
- `validateReceipt` (HTTPS) — Apple+Google validation, replay protection, per-UID Firestore rate-limit (20/5min)
- `onSubscriptionRenew` (Pub/Sub) — VIP lifecycle
- `clubGoalProgress` (callable) — atomic transactional club goal increment, fraud ceiling, per-UID rate-limit (60/min)
- `autoKickInactiveMembers` (scheduled, daily 3am UTC)
- `requestAccountDeletion` (HTTPS callable + HTTP endpoint for web form) — GDPR purge, per-UID rate-limit (3/hour)

**Social (`functions/src/social.ts`, re-exported from `index.ts`):**
- `onPuzzleComplete` (Firestore trigger) — propagates results to club goals
- `updateClubLeaderboard` (Pub/Sub)
- `sendPushNotification` (callable) — auth + rate-limited
- `processStreakReminders` (Pub/Sub)
- `rotateClubGoals` (Pub/Sub)
- `moderateClubMessage` (Firestore trigger) — Perspective API
- `sendGift` / `claimGift` (callables) — atomic gift txn, 5/day/sender cap, idempotency-key replay guard

### 6. Privacy/legal/site — DONE (correction)
- `wordfallgamesite/` published to Cloudflare Pages at https://wordfallgame.app
- `/privacy`, `/terms`, `/support` live, with real entity (Iridescent Games), date (April 16 2026), jurisdiction (New York), email (info@iridescent-games.com)
- `wordfallgamesite/.well-known/assetlinks.json` exists — needs SHA256 fingerprint replaced (one-line edit when Play app signing is set up)
- ConsentGate enforces ToS/Privacy versioned acceptance, server-mirrored

### 7. Analytics — 35+ events instrumented (was reported as ~60+ earlier; both off — actual is ~35+ distinct events plus soft-launch module)

---

## Real launch-blocking gaps (Android-first)

### Code-side (Phase 1)
- [ ] **GDPR account deletion**: `confirmResetProgress` in `SettingsScreen.tsx:109` only clears local state. Need:
  - Settings UI button "Delete account & data" with double-confirm
  - Cloud Function `deleteUserData` to wipe `/users/{uid}` + subcollections + leaderboard entries + receipts
  - Local cleanup: AsyncStorage clear, sign-out, navigate to onboarding
- [x] **Social account linking** (Apr 2026): Google Sign-In wired via `src/services/googleAuth.ts` (`linkAnonymousToGoogle` → Firebase `linkWithCredential`, with `credential-already-in-use` → `signInWithCredential` recovery fallback). `AuthContext` exposes `linkedEmail` / `canLinkGoogle` / `linkGoogle`; `SettingsScreen` surfaces "Sign In with Google" for anonymous users and the linked email once upgraded. Native module is lazy-required so dev APKs without it don't crash. Final activation (user-side): install `@react-native-google-signin/google-signin`, set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, enable Google provider in Firebase Console, add Play app signing SHA-1 → Firebase Android app, EAS rebuild. Apple Sign-In deferred with iOS lane.
- [ ] **`assetlinks.json` SHA256**: replace `REPLACE_WITH_YOUR_PLAY_APP_SIGNING_SHA256` with real Play app signing fingerprint. Two-line task once Play app signing key is generated.

### User-side / external (Phase 2)
- [ ] Register `wordfall_*` IAP SKUs in Play Console
- [ ] Grant Firebase default service account `<project>@appspot.gserviceaccount.com` the **Android Publisher** role in Play Console → Users and permissions
- [ ] Upload FCM server key to Firebase → Cloud Messaging
- [ ] Set `EXPO_PUBLIC_SENTRY_DSN` (`eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value <DSN>` + add to `.env`)
- [ ] Swap test AdMob app IDs for real IDs in `app.json` (plugin `androidAppId`); set `EXPO_PUBLIC_ADMOB_REWARDED_ID` + `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID`
- [ ] Author UMP consent message in AdMob → Privacy & messaging
- [ ] Run `firebase deploy --only firestore:rules,firestore:indexes,functions` (or `scripts/firebase_deploy_functions.sh`)
- [ ] Fill Play Console Data Safety form (draft in `agent_docs/data_safety.md`)
- [ ] Upload store listing assets — icon (512×512), feature graphic (1024×500), 8 phone screenshots; copy in `agent_docs/store_listing.md`
- [ ] Pick content rating; ensure Mystery Wheel odds disclosure mentioned in description
- [ ] Set Play target audience to 13+ (current code has no DOB gate)

### Polish (Phase 2-3, parallel)
- [ ] Commission audio: 3 BGM + 20+ SFX. Synth fallback ships fine but sounds amateur vs Royal Match tier.
- [ ] Soft-launch markets (Philippines + Canada recommended) for 4-6 weeks before global UA push.

---

## Deferred to v1.1 (NOT launch blockers)

Remaining after Apr 2026 hardening pass:
- Maestro E2E expansion (first purchase, club chat report/block, consent flow)
- Localization (UI-only, top 5 languages — puzzles stay English)
- iOS lane

### Completed Apr 2026 (see `agent_docs/pre_launch_audit.md` section 1 for details)
- AsyncStorage receipt store → `expo-secure-store` migration (`src/services/secureStorage.ts`)
- Per-UID Firestore rate-limit counter (`checkFirestoreRateLimit` in `functions/src/index.ts`)
- Consolidated `cloud-functions/` + `functions/` into a single `functions/` codebase
- Inline board-gen timeout banner (`src/components/BoardGenTimeoutBanner.tsx`)
- Single-slot write queue for PlayerContext / EconomyContext (`src/utils/persistQueue.ts`)
- `iap.ts` purchase-promise rejection contract normalized
- Remaining `console.log` sweep — migrated to `src/utils/logger`
- Retry helper (`src/services/retry.ts`) + "not synced yet" indicator (`src/components/NotSyncedBanner.tsx`)
- `useSyncExternalStore` + cached-snapshot pattern landed for sync-status selectors

---

## Environment notes for Claude future sessions

- Repo at `/home/user/Wordfall`; working branch `claude/game-readiness-assessment-NABLG`.
- **Always read `agent_docs/pre_launch_audit.md` first** — it's the canonical "what's done" doc.
- Dev client APK required (Expo Go not supported); user has working APK on Android.
- Native builds: EAS only (Termux can't build locally — NDK has no ARM64 host tools). Use `EAS_SKIP_AUTO_FINGERPRINT=1`.
- **Never push to `main`**. Use `claude/<slug>` branches; user merges PRs.
- `npm install --legacy-peer-deps` (forced by `.npmrc`).
- Cloud Functions live in a single `functions/` codebase (consolidated Apr 2026). `functions/src/index.ts` hosts commerce callables and re-exports `./social` which hosts all social callables.
