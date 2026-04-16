# Wordfall — Remaining Launch Tasks

> **Status:** All code-side blockers and the overwhelming majority of polish items from the original pre-launch audit have shipped on branch `claude/game-launch-readiness-bxmxE`. What remains is external setup (Play Console, Firebase deploy, hosted URLs, store assets) plus a small v1.1 polish list that was explicitly deferred.
>
> **Last verified:** 2026-04-16.

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
- [ ] **Host the Privacy Policy at `https://wordfallgame.app/privacy`** and ToS at `/terms`. Drafts are in `agent_docs/privacy_policy_draft.md`. Replace `[Entity name]`, `[Contact email]`, `[Effective date]` placeholders first.
- [ ] **Host `/.well-known/assetlinks.json`** at `https://wordfallgame.app/` so the Android App Links `autoVerify="true"` intent-filter actually associates the domain with the app.
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

- [ ] **AsyncStorage receipt store is cleartext** — migrate to `expo-secure-store` (iOS Keychain / Android KeyStore). Low threat for a puzzle game; not a blocker.
- [ ] **Per-UID Firestore rate-limit counter** for Cloud Functions callables. Today we have an in-memory token bucket on `sendPushNotification` only; a Firestore-backed counter would survive cold starts and cover every callable.
- [ ] **Consolidate `cloud-functions/` and `functions/` directories.** Currently both are deployed codebases (`social` + `commerce`). Merge into one and update `firebase.json`.
- [ ] **Inline board-gen timeout banner** instead of `Alert`. `Alert` works and is auditable; inline UI is a UX nicety.
- [ ] **Single-slot write queue** for `PlayerContext` / `EconomyContext` AsyncStorage + Firestore persistence. Coalescence is intentional today (covered by AppState flush) but a single-slot chain is cleaner.
- [ ] **`iap.ts` purchase-promise rejection contract.** Currently resolves `{ success: false, error }` on timeout; could be normalized to `throws`. Contract change, not a bug.
- [ ] **Remaining `console.log` sweep.** Top offenders (notifications, EconomyContext, PlayerContext) are already gated behind `__DEV__`. ~25 more sites in lower-traffic modules.
- [ ] **Maestro E2E coverage expansion.** Smoke flows shipped in PR #183. Add flows for: first purchase, club chat report/block, consent flow.
- [ ] **Context selector Phase 4** — narrow `PlayerContext`/`EconomyContext` subscriptions via `useSyncExternalStore`. Plan exists in `/.claude/plans/kind-weaving-hoare.md` Phase 4. Perf gain, not a correctness issue.
- [ ] **Retry helper + "not synced yet" indicator** for Firestore writes in `AuthContext` / `PlayerContext` / `EconomyContext`.

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
- `NSUserTrackingUsageDescription` + `expo-tracking-transparency` plugin in `app.json` for iOS

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
- `functions/src/index.ts` (validateReceipt, clubGoalProgress, redactUid)
- `cloud-functions/src/index.ts` (sendPushNotification, moderateClubMessage)
- `firestore.rules`
- `app.json`, `eas.json`
