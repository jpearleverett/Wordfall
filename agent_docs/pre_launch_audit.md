# Wordfall — Remaining Launch Tasks

> **Status:** All code-side blockers and the overwhelming majority of polish items from the original pre-launch audit have shipped on branch `claude/game-launch-readiness-bxmxE`. The April 2026 top-tier F2P parity plan also shipped in 13 follow-up branches (piggy bank, 50-tier season pass, 30-day login calendar, VIP cosmetic track, universal price anchoring, referral reward grant, shared club goals, friend leaderboard, booster combo synergies, invalid-word screen shake, multi-tile bloom particles, Reanimated migration, Maestro E2E expansion — see CLAUDE.md "Top-tier F2P parity" section). What remains is external setup (Play Console, Firebase deploy, hosted URLs, store assets, audio commission) plus a small v1.1 polish list that was explicitly deferred.
>
> **Last verified:** 2026-04-18 (post top-tier parity work, 61 test suites / 981 tests green).

---

## 0. External setup — must be completed outside the codebase

These unblock the actual Play Store submission. The app is wired to handle each one; you just have to stand the service / setting up.

### Play Store submission
- [ ] **Register the `wordfall_*` IAP products** in Play Console. Catalog is in `src/data/shopProducts.ts`. Real purchases will be rejected until these exist.
- [ ] **Grant Android Publisher role** to the Firebase default service account (`<project>@appspot.gserviceaccount.com`) in Play Console → Users and permissions. Required so `validateReceipt` can call Google's Android Publisher API.
- [ ] **Upload FCM server key** to Firebase Console → Cloud Messaging. Required for Android push notifications.
- [ ] **Prepare store listing assets**: 512×512 hi-res icon, 1024×500 feature graphic, phone screenshots. Copy is ready in `agent_docs/store_listing.md`.
- [ ] **Fill in Play Console Data Safety form.** Answers drafted in `agent_docs/data_safety.md`.
- [ ] **Set Play Console target audience** to 13+ (current app has no under-13 age gate). If you change this to under-13 you'll also need to add a date-of-birth gate in `OnboardingScreen.tsx` before any analytics init.
- [ ] **Content rating questionnaire** — include Mystery Wheel odds disclosure in the description (matches the in-app modal already shipped).

### Deploy
- [x] ~~**Host the Privacy Policy at `https://wordfallgame.app/privacy`** and ToS at `/terms`.~~ Done — the final HTML is in the `wordfallgamesite/` subdirectory and deployed via Cloudflare Pages. Entity (Iridescent Games), effective date (April 16, 2026), jurisdiction (New York), and contact email (info@iridescent-games.com) are all filled in.
- [ ] **Replace the `assetlinks.json` SHA-256 placeholder.** File already exists at `wordfallgamesite/.well-known/assetlinks.json` and deploys with Cloudflare Pages, but `REPLACE_WITH_YOUR_PLAY_APP_SIGNING_SHA256` must be swapped for the real Play app-signing fingerprint (Play Console → Setup → App signing) so Android App Links `autoVerify="true"` completes.
- [ ] **Activate Google Sign-In account linking.** Code is landed (`src/services/googleAuth.ts` + `AuthContext.linkGoogle` + `SettingsScreen` CTA). User-side activation: `npm install --legacy-peer-deps @react-native-google-signin/google-signin` → OAuth 2.0 Web Client ID in Google Cloud Console → set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env` + EAS secret → enable Google provider in Firebase Console → register Play app-signing SHA-1 on Firebase Android app → EAS rebuild. Until then `AuthContext.canLinkGoogle` stays `false` and the Settings button is a guarded no-op.
- [ ] **Stand up `info@iridescent-games.com`** (or change `SUPPORT_EMAIL` in `src/screens/SettingsScreen.tsx` to whatever inbox you use).
- [ ] **Deploy Firestore rules and Cloud Functions**: `firebase deploy --only firestore:rules,firestore:indexes,functions`. The new `moderateClubMessage` trigger and tightened rules are already committed.
- [ ] **Create a Sentry project**, set `EXPO_PUBLIC_SENTRY_DSN` in `.env` and EAS secrets. All the `crashReporter.captureException` call sites are already wired — they just need the DSN to start reporting.
- [ ] **Configure the Google UMP consent form** in AdMob Console (GDPR message). The code calls `AdsConsent.requestInfoUpdate` + `showForm` but the message itself is authored in the AdMob dashboard.

### Optional / when ready
- [ ] **Real `.mp3` audio assets** in `assets/audio/`. Today the app uses synthesized tones as a fallback.
- [ ] **`npm audit --production`** — 4 transitive vulns in build tooling (no runtime impact). Bump after the next `npm install`.
- [ ] **iOS lane** (can wait — Play Store is shipping first):
  - Apple Developer account enrollment
  - Download `GoogleService-Info.plist` from Firebase Console → commit to repo root
  - First iOS EAS build
  - iOS Universal Links: host apple-app-site-association at `https://wordfallgame.app/.well-known/apple-app-site-association`
  - Verify ATT prompt shows on a real iOS 14.5+ device (code is wired in `ads.ts`)

---

## 1. v1.1 polish (deferred — not a launch blocker)

Each of these is explicitly acceptable for v1.0 per the original audit. Track in an issue and revisit post-launch.

- [x] **AsyncStorage receipt store is cleartext** — migrated to `expo-secure-store` via `src/services/secureStorage.ts` (iOS Keychain / Android KeyStore, chunked 1800-byte reads for iOS Keychain cap, AsyncStorage fallback when native module unavailable, auto-migrates legacy AsyncStorage values on first read). Covers `RECEIPT_HASH_STORAGE_KEY` in `receiptValidation.ts` and `RECEIPTS_STORAGE_KEY` in `iap.ts`.
- [x] **Per-UID Firestore rate-limit counter** for Cloud Functions callables. `checkFirestoreRateLimit(uid, endpoint, limit, windowSeconds)` helper writes token-bucket counters to `rateLimits/{uid}_{endpoint}_{windowStart}` via atomic transaction; fails open on Firestore errors. Wired into `validateReceipt` (20/5min), `clubGoalProgress` (60/min), `requestAccountDeletion` (3/hour), and belt-and-suspenders after the in-memory bucket on `sendPushNotification`. Firestore rules deny direct read/write on the `rateLimits` collection.
- [x] **Consolidate `cloud-functions/` and `functions/` directories.** Merged into a single `functions/` codebase (Apr 2026). `functions/src/index.ts` re-exports `./social` which contains all 8 social callables. `firebase.json` collapsed to a single `{source: "functions"}` entry; `.easignore` / `tsconfig.json` / `scripts/firebase_deploy_functions.sh` updated accordingly.
- [x] **Inline board-gen timeout banner** — `src/components/BoardGenTimeoutBanner.tsx` replaces the `Alert` path.
- [x] **Single-slot write queue** for `PlayerContext` / `EconomyContext` AsyncStorage + Firestore persistence. `src/utils/persistQueue.ts` exposes `createPersistQueue` with latest-write-wins semantics; EconomyContext uses a single queue (AsyncStorage + Firestore writer), PlayerContext uses two queues keyed separately.
- [x] **`iap.ts` purchase-promise rejection contract.** Purchase failures now reject; callers handle with try/catch.
- [x] **Remaining `console.log` sweep.** Migrated remaining sites to `src/utils/logger`.
- [x] **Maestro E2E coverage expansion.** 15 flows present in `.maestro/`: 01_app_launch, 02_daily_puzzle, 03_shop_browse, 04_settings, 05_mode_select, 06_consent_accept, 07_restore_purchases, 08_account_deletion, 09_purchase_happy_path, 10_club_chat_send_and_report, 11_referral_claim, 12_piggy_bank_break, 13_season_pass_claim, 14_friend_leaderboard, 15_booster_combo. Each new-surface flow branches on UI state so fresh-install runs stay green. Running the suite on CI hardware is still a v1.1 polish item (needs a Linux runner with Android emulator).
- [x] **Context selector Phase 4** — `useSyncExternalStore` with cached-snapshot pattern landed for sync-status selectors (`src/services/syncStatus.ts` → `useSyncStatus` / `useSyncStatusSelector`). Context-level migration remains an incremental refactor and is lower priority (Perf gain, not a correctness issue).
- [x] **Retry helper + "not synced yet" indicator** for Firestore writes. `src/services/retry.ts` (`withRetry` with jittered backoff + permanent-error short-circuit) + `src/components/NotSyncedBanner.tsx` (surfaces when `state === 'failed' && failureCount >= 2`). `submitDailyScore` / `submitWeeklyScore` already wrapped in `withRetry`.

---

## 2. Done — for reference

All of the following are committed on `claude/game-launch-readiness-bxmxE`. Kept here as an index so you can `git log --grep=` any item.

### Crash safety
- Root + scoped `LocalErrorBoundary` around ceremony switch, `PuzzleComplete`, `ShopScreen`, and the game field subtree
- IAP dedup by `transactionId` to stop double-fulfillment on Play reconnect
- Receipt-hash store serialized through a single-slot promise chain
- Share and clipboard `.catch(...)` paths now drop Sentry breadcrumbs instead of swallowing silently
- IAP init/cleanup + pending-purchase persistence failures → breadcrumbs

### Diagnosability (Sentry)
- `captureException` on IAP (`handlePurchaseUpdate`, `handlePurchaseError`), `receiptValidation` retry exhaustion, `AuthContext` sign-in/sign-out, `useRewardWiring`, every major Firestore mutation site
- `captureMessage` on all 3 board-generation timeout fallback paths with `{mode, level}` tags
- Cloud Function logs now use `redactUid()` — only the first 6 chars of the UID are emitted

### Analytics
- `trackAdRevenue` fires on AdMob `paid` events (rewarded + interstitial)
- `shop_product_tapped` funnel step between `shop_view` and `iap_initiated`
- `analytics.setEnabled(bool)` plumbed through `SettingsContext` → UI toggle

### Security (server + rules)
- `validateReceipt` rejects unauthenticated callers and always attributes purchases to `authenticatedUserId` — never a client-supplied UID
- `sendPushNotification` requires auth, rate-limits 30/min per UID, only allows push to friends / club co-members
- `clubGoalProgress` requires auth; progress is credited to `context.auth.uid`, not a client field; per-call cap of 10k points
- `sendGift` / `claimGift` require auth, 5 gifts/day/sender cap (date-keyed `users/{uid}/giftQuota` doc), idempotency-key replay guard, clubmate/friend relationship required; server never writes to the recipient's economy doc (client applies grant locally after claim)
- Firestore `dailyScores`/`weeklyScores`: enforced `0 ≤ score ≤ 1,000,000`
- Firestore club `messages`: require membership + userId match + 1–200 char size
- `reports/` admin-only collection + `users/{uid}/blockedUsers` subcollection + `users/{uid}/consent` ledger

### UGC safeguards (Play + Apple 1.2)
- First-launch `ConsentGate` (ToS + Privacy Policy acceptance, versioned, server-mirrored)
- Club chat long-press → Report / Block
- Blocked users filtered client-side; messages from blocked users never rendered
- Server-side profanity filter via `moderateClubMessage` Cloud Function trigger
- Contact Support row (mailto:) in Settings

### Privacy & ads
- Google UMP consent flow (`AdsConsent.requestInfoUpdate` + `showForm`) before `MobileAds().initialize()`
- iOS App Tracking Transparency flow (`requestTrackingPermissionsAsync`) before first ad request; denied → NPA
- AdMob `RequestOptions` (`requestNonPersonalizedAdsOnly`, `tagForChildDirectedTreatment`, `tagForUnderAgeOfConsent`) on every ad request
- Analytics opt-out + Personalized Ads opt-out toggles in Settings, persisted in `SettingsContext`
- Privacy Policy / Terms of Service rows in Settings `Linking.openURL` the hosted URLs

### Loot box (Apple 3.1.1 / Google policy)
- Mystery Wheel "View odds" button opens a modal showing every segment percentage plus the Mystery Box secondary table and the 25-spin pity rule

### Build config
- `RECORD_AUDIO` / `MODIFY_AUDIO_SETTINGS` moved to `blockedPermissions` (were unused)
- `allowBackup: false` — AsyncStorage (receipt hashes, VIP flags) no longer snapshotted by Google Backup
- Proguard + `shrinkResources` enabled for Android release via `expo-build-properties`
- Android HTTPS deep-link intent-filter (`https://wordfallgame.app`) with `autoVerify="true"`
- `NSUserTrackingUsageDescription` retained in `ios.infoPlist` for when the iOS lane opens; the `expo-tracking-transparency` config plugin was removed from `app.json` in Apr 2026 (Android-first launch — re-add with `npm install expo-tracking-transparency` + plugin entry when iOS ships)

### Accessibility
- `Button.tsx` accepts `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `accessibilityState`, `hitSlop`, `testID` with sane defaults (44pt hit-slop, label falls back to title)
- Palette: raised `textMuted`/`tabInactive` to ~4.5:1 contrast, `buttonSecondary` to ~3.4:1, `borderSubtle` alpha to 0.12
- Accessibility labels + hit-slop on top offender Pressables (`PostLossModal`, `AchievementCeremony`, `ChallengeCard`)
- Loading indicators + `accessibilityState={{ busy }}` on Settings Sign In / Sign Out

### Deep links
- `challengeId` shape-validated before use (1–64 alphanumeric/_/- chars)
- `club_invite` pattern added to `parseDeepLink` + handled in App.tsx with the same shape validation

### Bundle
- 23 PNG originals + 4.9 MB `bg-homescreen.mp4` removed; all requires now point to `assets/images/optimized/*.webp` + `bg-homescreen-optimized.mp4`
- `assets/` folder: 23 MB → 2.4 MB

---

## Files referenced

- `App.tsx` — ConsentGate, LocalErrorBoundary wrap, deep-link handling, board-gen Sentry, privacy toggle propagation
- `src/components/{LocalErrorBoundary,ConsentGate,MysteryWheel,ReferralCard,ReplayViewer,PuzzleComplete,PostLossModal,AchievementCeremony,ChallengeCard}.tsx`
- `src/components/common/Button.tsx`
- `src/screens/{Settings,Club,Shop,Game}Screen.tsx`
- `src/services/{ads,iap,receiptValidation,analytics,funnelTracker,firestore,consent,crashReporting}.ts`
- `src/contexts/{Auth,Settings,Player,Economy}Context.tsx`
- `src/utils/{deepLinking,localAssets}.ts`
- `src/constants.ts` (palette)
- `src/hooks/useRewardWiring.ts`
- `functions/src/index.ts` (validateReceipt, clubGoalProgress, redactUid, checkFirestoreRateLimit, requestAccountDeletion; re-exports `./social`)
- `functions/src/social.ts` (sendPushNotification, moderateClubMessage, sendGift, claimGift, onPuzzleComplete, updateClubLeaderboard, processStreakReminders, rotateClubGoals)
- `src/services/gifts.ts` (secure gifting client wrapper; `sendGiftSecure` / `claimGiftSecure`)
- `src/components/GiftInbox.tsx` (gift-inbox UI; mounted in `ClubScreen`, claim via `claimGiftSecure`, grants applied via EconomyContext)
- `src/contexts/PlayerSocialContext.tsx` (sends gifts through `sendGiftSecure` with legacy direct-write fallback)
- `firestore.rules`
- `app.json`, `eas.json`
