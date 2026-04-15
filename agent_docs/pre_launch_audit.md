# Wordfall — Pre-Launch Audit

> **Status:** Audit-only. No code has been changed on this branch. This is a triage input — items are pre-sorted into Blockers / Polish / Nice-to-have based on launch-risk judgment, but the user has final say on what to fix.
>
> **Scope:** React Native + Expo SDK 55 game shipping to Google Play + App Store. Audit focused on what could ship as a bug, crash, store-review rejection, or unfixable production blind spot.
>
> **Totals (re-verified 2026-04-15):** 791 Jest tests still green. 62 `console.log` in `src/` prod paths. 339 / 361 interactive elements unlabeled (sampled). 0 Sentry instrumentation on 5 critical paths. 23 MB assets — 23 WebP + 26 PNG coexist (optimize-assets was run but PNG originals never removed); `bg-homescreen.mp4` (4.9 MB) also ships alongside its 753 KB optimized twin. 0 `TODO`/`FIXME`/`HACK` comments. 0 hardcoded secrets.
>
> **Addendum B totals:** 2 critical-severity server auth holes (`validateReceipt` accepts client-supplied `userId`; `sendPushNotification` unauthenticated). 1 high-severity Firestore-rule hole (`dailyScores` / `weeklyScores` accept unbounded client-written scores). 3 UGC safeguards missing from Apple 1.2 checklist (report, block, ToS gate). 0 GDPR/UMP consent SDK. 0 analytics opt-out. Mystery Wheel paid-spin odds undisclosed. 2 unused Android permissions declared. `allowBackup` defaults open. `npm audit --production` = 0 critical / 2 high / 2 moderate (all transitive build tooling).
>
> **Addendum 2026-04-15:** PRs #179–#185 shipped between the original audit and now (context selectors, AdMob real IDs, Maestro E2E, Android package rename to `com.wordfall.game`). The one new iOS blocker surfaced during the TASK 1 re-check is listed in §1 under "iOS-only".
>
> **Addendum 2026-04-15 (B) — deeper sweep:** The original audit focused on crashes, error handling, a11y, and telemetry gaps. A second pass covering **store policy compliance (UGC, privacy consent, loot boxes)**, **server-side security**, and **build/release config** surfaced additional blockers, listed below in §§1.UGC, 1.PRIV, 1.LOOT, 1.SEC, 1.BUILD. These are launch-blocking in the same sense as the existing blockers — a policy-violation rejection has the same effect as a crash. Treat them with the same weight.

---

## 0. Blocked on user (external setup — flag don't fix)

These aren't audit items per se, they're prerequisites that can't be completed in code. Listing them up top so they don't get lost in triage.

- [ ] **Register `wordfall_*` IAP products in Play Console.** Catalog lives at `src/data/shopProducts.ts`. Required before real purchases work end-to-end.
- [ ] **Grant Android Publisher role to the Firebase default service account** (`<project>@appspot.gserviceaccount.com`) in Play Console → Users and permissions. `functions/src/index.ts` reads the Google Play subscription endpoint via `admin.app().options.credential.getAccessToken()` — without this role, `validateReceipt` returns 403 on all Android receipts.
- [ ] **Upload FCM server key to Firebase Console** → Cloud Messaging → Project Settings. Required for Android push.
- [ ] **Download `GoogleService-Info.plist` from Firebase Console** → commit to repo root. Referenced in `app.json` but not yet in repo. iOS-only; can wait until iOS work starts.
- [ ] **Apple Developer enrollment + first iOS EAS build.** Blocks iOS launch.
- [ ] **Sentry project + DSN.** Create the project, add `EXPO_PUBLIC_SENTRY_DSN` to `.env`. Without this, the instrumentation gaps below are invisible even once fixed.
- [ ] **Real `.mp3` audio assets** → drop in `assets/audio/`. Today synthesized tones.
- [x] ~~Real AdMob app IDs + unit IDs.~~ *Done in PRs #180–#182 (Apr 2026). `app.json` now ships real AdMob app IDs; `eas.json` injects real unit IDs per profile.*

---

## 1. Blockers (must fix before Play Store / App Store submission)

### iOS-only (App Store submission)

- [ ] **Missing `NSUserTrackingUsageDescription` + no ATT prompt before first ad request.** `app.json` declares `infoPlist` + `privacyManifests` but not the tracking description string; `expo-tracking-transparency` is not in the plugins list; `grep -r 'requestTrackingPermissionsAsync\|NSUserTrackingUsageDescription' src/` returns zero hits. AdMob (`react-native-google-mobile-ads@^16`) on iOS 14.5+ requires the ATT prompt for IDFA-based personalization; without it Apple's App Review will flag the SDK's entitlement use against a missing purpose string. **Fix (TASK 6):** (1) add `"NSUserTrackingUsageDescription": "This identifier will be used to deliver more relevant ads."` to `app.json` `ios.infoPlist`, (2) add `"expo-tracking-transparency"` to the plugins array, (3) call `requestTrackingPermissionsAsync()` once before the first AdMob request in `src/services/ads.ts`, (4) pass the ATT result into the Google Mobile Ads SDK's `requestNonPersonalizedAdsOnly` flag. Only blocks iOS launch; Android is unaffected.

### Errors & crash safety

- [ ] **No ErrorBoundary around ceremony subtree in `App.tsx` switch.** Ten+ ceremonies (`FeatureUnlockCeremony`, `ModeUnlockCeremony`, `AchievementCeremony`, `StreakMilestoneCeremony`, `CollectionCompleteCeremony`, `MilestoneCeremony`, `MysteryWheel`, etc.) render inside the `App.tsx` ceremony switch and will crash the whole app on render error. `App.tsx:~150–201`, `src/components/*Ceremony.tsx`. Fix: wrap the ceremony switch in a local `ErrorBoundary` with a "Skip" fallback that calls `player.dequeueCeremony()`.
- [ ] **No ErrorBoundary around `PuzzleComplete`.** Mid-game crash = player loses their score + rewards. `src/components/PuzzleComplete.tsx`, rendered by `GameScreen.tsx`. Fix: wrap the modal in a local boundary that still calls `onClose`/victory dequeue so the player isn't stuck.
- [ ] **No ErrorBoundary around purchase flow.** A render error inside `ShopScreen` purchase handling crashes to root error screen; user loses context of what they were buying. `src/screens/ShopScreen.tsx:251–347`. Fix: wrap the purchase-in-progress modal subtree.
- [ ] **Duplicate purchase events not deduped at the source.** If Play Billing fires `purchaseUpdatedListener` twice for the same `storeId` (known Play behavior on reconnect), the second `resolvePendingPurchase` silently no-ops but `handlePurchaseUpdate` still runs validation + fulfillment twice. `src/services/iap.ts:474, 585–592`. Fix: dedupe by `transactionId` in `handlePurchaseUpdate` before calling `validateReceipt`.
- [ ] **Receipt-hash store race.** Two rapid purchases can both read the same `loadReceiptHashes()` snapshot, append their own hash, and race on `save()` — last writer wins, first hash lost, fraud detection misses a real replay. `src/services/receiptValidation.ts:117–131`. Fix: serialize `saveReceiptHash` via a single-slot promise chain or use an atomic AsyncStorage helper.

### Instrumentation (post-launch diagnosability)

- [ ] **Zero Sentry instrumentation on purchase flow.** If a user reports "I paid and got nothing," today there's no trace. `src/services/iap.ts:284 (requestPurchase), 474 (handlePurchaseUpdate), 513 (finishTransaction), 555 (handlePurchaseError)`; `src/services/receiptValidation.ts:193–277`. Fix: `crashReporter.captureException` + breadcrumbs with `{sku, transactionId, step}` tags at every catch in the purchase pipeline.
- [ ] **Zero Sentry instrumentation on auth failures.** `src/contexts/AuthContext.tsx:36, 48` — anonymous sign-in + sign-out errors go to `console.warn` only. First user with broken auth = invisible outage. Fix: `captureException` with `{userId?, operation}` context.
- [ ] **Zero Sentry instrumentation on board-generation timeouts.** `App.tsx:158, 175, 433, 475, 526, 560, 590, 618` — 5s timeout + 4-tier fallback means a mode-config bug that breaks generation shows up to the user as "please wait" forever; we'd never know. Fix: `captureMessage('board_gen_timeout', {mode, chapter, seed, tier})` at the fallback.
- [ ] **Zero Sentry instrumentation on Firestore write failures.** `src/services/firestore.ts` (all mutation methods). Silent `logger.warn` only. Fix: `captureException` on every catch; tag with `{collection, docId, op}`.

### Analytics coverage

- [ ] **`trackAdWatched` + `trackAdRevenue` defined but never called.** `src/services/analytics.ts:605, 664` are live methods. `src/services/ads.ts` never calls them. Ad-funded reward flow is invisible to analytics = can't tune ad placement or report eCPM. Fix: call `trackAdWatched(adType, rewardType)` from the rewarded-ad completion handler in `ads.ts` and `trackAdRevenue` on `onAdRevenuePaid`.
- [ ] **First-purchase funnel has a gap between shop view and purchase-initiated.** `ShopScreen` calls `funnelTracker.trackStep('shop_view')` on mount but there's no `shop_product_tapped` step before `iap_initiated`. Drop-off between browse and tap is invisible. Fix: add a `shop_product_tapped` funnel step in `src/services/funnelTracker.ts:10` and fire it from `handlePurchase` in `ShopScreen.tsx`.

### Accessibility (legal + store review)

- [ ] **339 / 361 interactive elements (94%) have no `accessibilityLabel`.** Fails WCAG 2.1 Level A. Relevant to Play Store accessibility review and to US ADA / EU EAA exposure. Custom `Button` (`src/components/common/Button.tsx`) doesn't expose `accessibilityLabel` / `accessibilityRole` props — downstream components can't set them even when they want to. Top offenders: `GameHeader.tsx:105,162,187`, `PostLossModal.tsx:103,111,118`, `ShopScreen.tsx:566,664,694`, `HomeScreen.tsx:450,470`, `AchievementCeremony.tsx:92`, `ChallengeCard.tsx:166,189`. Fix: (1) pass `accessibilityLabel` / `accessibilityRole` through `Button.tsx`, (2) sweep the top offenders.

### Data integrity / UX on failure

- [ ] **`EventScreen` renders blank when `eventManager.getActiveEvents()` is empty.** `src/screens/EventScreen.tsx:52–54` fetches events but doesn't branch on empty / error. If a user hits Events between event rotations they see a white screen → app looks broken. Fix: add "No events right now — check back soon" empty state.
- [ ] **`ClubScreen` renders blank if `clubId` is null or club fetch fails.** `src/screens/ClubScreen.tsx` has a loading spinner (`chatLoading` line 89) but no error / not-in-a-club empty state. Fix: add "Join a club" prompt when `clubId` is null, and "Could not load club" when fetch fails.
- [ ] **`ShopScreen` has no visible "purchase failed" UI.** Async IAP errors are logged but not surfaced; a failed purchase looks identical to a successful one once the spinner stops. `src/screens/ShopScreen.tsx:251–347`. Fix: either inline error banner or `Alert.alert` on catch.

### Bundle size (store submission warning)

- [ ] **`assets/` = 23 MB. Optimize-assets was partially run but originals never removed.** Current state: 23 `.webp` + 26 `.png` coexist; `bg-homescreen.mp4` (4.9 MB) ships alongside `bg-homescreen-optimized.mp4` (753 KB). 9 PNGs over 1 MB each. Est. 7–12 MB savings. Play Store warns over 50 MB APK; we're fine, but every MB over ~20 MB for a puzzle game hurts install conversion. **Fix:** (1) `git grep` to confirm image imports use the WebP names (not the PNG originals), (2) `git rm` the 26 PNGs whose WebP twin exists, (3) `git rm assets/videos/bg-homescreen.mp4` (the optimized version is what Metro should be loading; verify via grep of `bg-homescreen` imports first).

---

### 1.UGC — UGC moderation (Apple Guideline 1.2 / Play UGC policy) *[Addendum B]*

Club chat accepts user-generated text. Apple and Google both require the same five UGC safeguards. Today we have **1 of 5**.

- [ ] **No in-app "report message" or "report user" mechanism.** Grep for `report|block|mute` across `src/` returned zero hits. Apple 1.2 requires users be able to flag objectionable content. `src/screens/ClubScreen.tsx` renders messages with no long-press menu. **Fix:** add long-press → "Report message" that writes to a `reports/` collection + captures `{messageId, reporterId, reason}`; deployed at the same time as the server-side handler.
- [ ] **No "block user" mechanism.** Once a user is reported, the reporter has no way to stop seeing their messages. Apple 1.2 requires it. **Fix:** add a `blockedUserIds` array on the user profile; filter client-side in `ClubScreen` message list; deny-list their incoming messages server-side.
- [ ] **Profanity filter is client-side only.** `src/utils/profanityFilter.ts` is real (45+ words, leet/substitution handling) and is applied at send in `ClubScreen.tsx:111, 118`. But because filtering only runs on the client, a modified client skips it entirely — server accepts anything ≤200 chars (`src/services/firestore.ts:685–705`; `firestore.rules:58–61`). **Fix:** mirror the filter in a Cloud Function that runs on `onCreate(clubs/{clubId}/messages/{id})`, or gate write via a callable that filters before `set`.
- [ ] **No Terms of Service / EULA acceptance gate.** `OnboardingScreen.tsx` is game-tutorial only. The privacy policy and ToS drafts (`agent_docs/privacy_policy_draft.md`) exist but no in-app acceptance step. Play UGC policy + EU GDPR require a user-visible ToS. **Fix:** add an "I agree to the Terms of Service and Privacy Policy" gate in onboarding (or first-launch dialog) with external links.
- [ ] **No in-app support / developer contact.** Apple 1.2(d) requires published contact info for users to reach the developer. `SettingsScreen.tsx` has no "Contact Support" or "Email Us" row. **Fix:** add a "Contact" row in Settings that opens `mailto:support@wordfall.app` (or similar).

> Already-in-place: client-side profanity filter (`src/utils/profanityFilter.ts`). Counts as partial credit for Apple 1.2(a) but not a complete implementation.

---

### 1.PRIV — Privacy consent & tracking *[Addendum B]*

These are enforcement-level gaps. Any one of them is grounds for a store rejection or, in the EU, post-launch regulatory complaint.

- [ ] **No GDPR consent SDK / CMP / Google UMP integration.** `src/services/ads.ts` calls `MobileAds().initialize()` with no preceding `requestConsentInfoUpdate` and no consent gate. In the EU (GDPR + ePrivacy), personalized ads require opt-in consent before any identifier is read. Google ad serving policy requires a Google-certified CMP for EU traffic. **Blocks EU launch.** **Fix:** install Google UMP SDK (via `react-native-google-mobile-ads`' built-in consent module or an `@react-native-firebase` package), call `requestConsentInfoUpdate` on app start before ads load, and pass the consent status into `requestNonPersonalizedAdsOnly`.
- [ ] **Privacy Policy + Terms of Service rows in Settings are non-functional.** `src/screens/SettingsScreen.tsx:348–356` — both `TouchableOpacity` elements have no `onPress`. They render a chevron but do nothing on tap. Play Store compliance requires a reachable in-app privacy policy. **Fix:** `onPress={() => Linking.openURL('https://wordfall.app/privacy')}` on line 348 and the equivalent ToS URL on line 353.
- [ ] **Firebase Analytics auto-enabled, no user opt-out.** `src/services/analytics.ts:152–216` initializes `@react-native-firebase/analytics` without `setAnalyticsCollectionEnabled(false)`. There is no analytics toggle in `SettingsScreen` and no `analyticsEnabled` field in `SettingsContext`. On iOS this runs before any ATT prompt; on Android it collects AAID by default. GDPR + CCPA require explicit opt-out for ad identifiers. The Play Store Data Safety form already drafted in `agent_docs/data_safety.md` must match whatever ships. **Fix:** (1) add `analyticsEnabled: boolean` to `SettingsContext`, default-off in EU (based on consent result), (2) add a toggle in `SettingsScreen.tsx`, (3) call `nativeAnalytics.setAnalyticsCollectionEnabled(value)` when the setting changes, (4) gate `trackEvent` calls on the setting.
- [ ] **AdMob `childDirectedTreatment` / `tagForUnderAgeOfConsent` flags not set.** `src/services/ads.ts` creates `RewardedAd.createForAdRequest(...)` without `RequestOptions`. Google ad serving requires these flags to match the Play Console "target audience" declaration, or ads are denied. **Fix:** pass `{ requestNonPersonalizedAdsOnly, tagForChildDirectedTreatment, tagForUnderAgeOfConsent }` into every ad-request call; derive from consent + target-audience.
- [ ] **No age gate.** `OnboardingScreen.tsx` auto-advances after 3s on the welcome phase. If the Play Console target audience includes under-13, COPPA + GDPR-K require a neutral age-screen before any data collection. **Fix (only if the Play Console target audience is set to include under-13):** add a neutral date-of-birth screen before analytics init, gate all tracking on the result.

---

### 1.LOOT — Loot box probability disclosure *[Addendum B]*

- [ ] **Mystery Wheel odds are not disclosed pre-purchase.** `src/components/MysteryWheel.tsx` lets the user spend gems (SKU = `SPIN_COST_GEMS = 15`, bundle = `SPIN_BUNDLE_COST_GEMS = 60` in `src/data/mysteryWheel.ts:269, 272`). Gems are purchasable with real money, so this is a paid loot box under Apple (Guideline 3.1.1) and Google policy. Weighted outcomes exist (`src/data/mysteryWheel.ts:56–156`: 10 segments summing to 100%, plus a 6-outcome secondary "Mystery Box" table at lines 162–169) but the probabilities are never shown to the user. **Fix:** add a "View odds" affordance on `MysteryWheel.tsx` that opens a modal listing every segment as a percentage. Same disclosure must appear in the Play Store and App Store listing descriptions.

---

### 1.SEC — Server-side auth & fraud vectors *[Addendum B]*

Hand-verified the Cloud Functions and Firestore rules source. These are real holes, not hypotheticals.

- [ ] **`validateReceipt` accepts an attacker-supplied `userId` that overrides the authenticated UID.** `functions/src/index.ts:325, 327` — `await storeReceiptHash(hash, productId, userId ?? authenticatedUserId)` and `const uid = userId ?? authenticatedUserId;`. The client POSTs `{ receipt, productId, platform, userId? }` plus a Firebase ID token. If a valid receipt is presented with someone else's `userId`, fulfillment gets written to that target's `users/{uid}/purchases` subcollection. Fraud vector: buy once, reassign to many users. **Fix:** drop the `userId` field from the request schema entirely; use `authenticatedUserId` and require it (reject requests with no valid bearer token). If a `userId` param is kept for explicit gifting later, enforce `userId === authenticatedUserId` or `auth.token.admin === true`.
- [ ] **`sendPushNotification` has no auth check whatsoever.** `cloud-functions/src/index.ts:176–211`. Arrow function signature is `async (data) => { ... }` — the `context` argument is never destructured. Any unauthenticated caller can trigger push to any `userId`. Harassment / spam / phishing vector. **Fix:** callable signature must be `async (data, context) => { if (!context.auth) throw new HttpsError('unauthenticated', '...'); ... }`, plus (a) rate-limit per `auth.uid`, (b) only allow sending to users who have an existing friendship / club-comembership / explicit event subscription relationship with `auth.uid`.
- [ ] **`clubGoalProgress` accepts unauthenticated calls.** `functions/src/index.ts:569–630`. Similar pattern: `context` is present in signature but never checked. Any caller can increment any club's goal counter. **Fix:** `if (!context.auth) throw new HttpsError('unauthenticated', '...')`, then verify `auth.uid` is a member of the target club via Firestore read.
- [ ] **Firestore `clubs/{clubId}/messages/{id}` allows create by any authenticated user, regardless of club membership.** `firestore.rules:58–61` — `allow create: if request.auth != null;`. Any logged-in user can post into any club's chat, even one they didn't join. **Fix:** tighten to `allow create: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/clubs/$(clubId)).data.memberIds && request.resource.data.message is string && request.resource.data.message.size() <= 200;`.
- [ ] **Firestore `dailyScores` / `weeklyScores` allow unbounded client writes.** `firestore.rules:22–33` — client writes the `score` field directly. No bounds check. Classic leaderboard-cheat vector: write score `999999999`, top the leaderboard. **Fix:** route score submission through a Cloud Function that validates the puzzle result (seed + move log), OR tighten the rule to `&& request.resource.data.score is number && request.resource.data.score >= 0 && request.resource.data.score <= 100000` (pick a reasonable ceiling) as a partial mitigation.
- [ ] **No rate limiting on any callable / onRequest function.** Every Cloud Function is callable as fast as the attacker can hit it. Expo SDK is used to send push (`sendPushNotification` at ~$0.00 per send, but still spammable). Receipt validation hits Apple/Google's endpoints — sustained abuse could get the whole project rate-limited by Apple. **Fix (post-launch acceptable):** per-UID token bucket using a small Firestore counter doc, refill-per-minute; 30 req/min is generous for honest use. Implement during v1.1 if not before launch.

---

### 1.BUILD — Android / iOS build config *[Addendum B]*

- [ ] **Two unused Android permissions declared: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`.** `app.json:77–78`. `src/services/sound.ts` only plays audio — there is no recording path anywhere. Declaring `RECORD_AUDIO` triggers Play Console's "sensitive permission" review and the permission prompt on first launch, hurting install-trust. **Fix:** delete both lines from `app.json`.
- [ ] **`android.allowBackup` not explicitly set (defaults to `true`).** No entry in `app.json`. With `allowBackup: true`, Google Backup will snapshot AsyncStorage — which in our app stores the IAP receipt hash store, economy state, and VIP flags. A restore to another device could resurrect unearned currency / VIP. **Fix:** `app.json` doesn't expose `allowBackup` directly; add `"android.allowBackup": "false"` via `expo-build-properties` plugin config, or ship a small Expo config plugin that injects the attribute into `AndroidManifest.xml`.
- [ ] **Proguard / minification not enabled for Android release.** `expo-build-properties` config in `app.json:120–129` sets `kotlinVersion` but no `enableProguardInReleaseBuilds: true`. The release APK ships unminified, exposing game logic. **Fix:** add `"enableProguardInReleaseBuilds": true, "enableShrinkResourcesInReleaseBuilds": true` to the android block of the `expo-build-properties` plugin.
- [ ] **Android HTTPS deep links not wired.** `app.json:80–94` only declares the custom `wordfall://` scheme. The iOS `associatedDomains` has `applinks:wordfall.app` but Android has no matching `<intent-filter android:autoVerify="true"><data android:scheme="https" android:host="wordfall.app" /></intent-filter>`. Any campaign that shares an `https://wordfall.app/...` link will open the browser, not the app, on Android. **Fix:** add a second `intentFilters` entry with `scheme: "https"`, `host: "wordfall.app"`, `autoVerify: true`; also host the `/.well-known/assetlinks.json` file at that domain.
- [ ] **`npm audit --production` reports 4 transitive vulnerabilities.** 2 high (`@xmldom/xmldom` XML-injection, `picomatch` ReDoS), 2 moderate (`brace-expansion`, `yaml`). All transitive, all in build tooling — they do not end up in the shipped JS bundle. Not a launch blocker on their own but worth bumping before next EAS build to keep `npm audit` clean for review. **Fix:** `npm install --legacy-peer-deps` after bumping direct deps; re-run `npm audit` to confirm zero high/critical.

---

## 2. Polish (ship-able but visible papercuts)

### Errors & crash safety

- [ ] **No field-length validation at the Firestore rule layer for club messages.** Already covered as a blocker in §1.SEC above. Noting here for cross-reference — once the `.size() <= 200` check lands, this moves to "verified clean".
- [ ] **Game field subtrees have no local ErrorBoundary.** `src/screens/game/PlayField.tsx`, `GameFlashes.tsx`, `GameBanners.tsx`. Root boundary exists but a render error means the whole app restarts mid-game. Fix: one boundary wrapping the game field with a "Return to Home" fallback.
- [ ] **Silent `.catch(() => {})` on Share API.** `src/components/PuzzleComplete.tsx:863`, `src/components/ReplayViewer.tsx:230`. Share being cancelled is fine; Share failing due to OS-level error should at least be logged to Sentry as a breadcrumb. Fix: `.catch((e) => crashReporter.addBreadcrumb(...))`.
- [ ] **Silent Share / clipboard catches in `ReferralCard`.** `src/components/ReferralCard.tsx:71–73, 84–86`. If clipboard is unavailable (rare but possible on locked-down devices) the user taps and nothing happens — no toast, no fallback. Fix: `Alert.alert('Copy failed', 'Long-press the code to copy manually.')`.

### Instrumentation

- [ ] **62 `console.log/warn/error` in production paths under `src/`.** Biggest offenders: `services/notifications.ts` (21), `contexts/EconomyContext.tsx` (6), `services/sound.ts` (5), `contexts/PlayerContext.tsx` (5), `utils/perfInstrument.ts` (5), `services/receiptValidation.ts` (4), `contexts/AuthContext.tsx` (2). Fix: wrap with `if (__DEV__) console.*` or funnel through a logger that routes to Sentry breadcrumbs in prod.
- [ ] **No Sentry on reward-wiring failures.** `src/hooks/useRewardWiring.ts` has no `captureException` — a ceremony queue bug that drops rewards is invisible. Fix: wrap each reward application in try/catch with `captureException(e, {tags: {rewardType}})`.
- [ ] **No Sentry on `PuzzleComplete` render / callback failures.** Same pattern — add breadcrumbs at victory-sequence boundaries.

### Offline resilience

- [ ] **Firestore writes in `AuthContext`, `PlayerContext`, `EconomyContext` fail silently.** `firestore.ts` returns null on error, contexts don't retry. Offline + online user re-sync is invisible to the user. Fix: write a small retry helper (3 attempts, exponential backoff), surface a "Not synced yet — changes saved locally" indicator in Profile header when offline for > 30s.

### Accessibility / UX

- [ ] **`hitSlop` only used once in whole repo.** `src/components/common/Modal.tsx:101` is the only place. Custom `Button.tsx` doesn't expose `hitSlop`. Icon buttons (`HomeScreen` settings/shop shortcuts, `GameHeader` back, modal closes, emoji reactions in `ClubScreen`) all fail 44pt/48dp minimum. Fix: add default `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` to `Button.tsx` and icon button components.
- [ ] **Low-contrast palette entries.** `src/constants.ts` COLORS: `buttonSecondary #2d1452` on `bg #0a0015` (~2:1), `textMuted #6b4d8a` on bg (~2.5:1), `borderSubtle rgba(255,255,255,0.06)` near-invisible, `tabInactive #6b4d8a` on bg. All fail WCAG AA 1.4.3. Fix: bump `textMuted` and `tabInactive` to ~`#a08cc7` (~4.5:1), bump `buttonSecondary` border, thicken `borderSubtle` to rgba(255,255,255,0.12).
- [ ] **Missing loading indicators on async actions.** `MysteryWheel.tsx:213–228` spin button not disabled while spin is in flight; `SettingsScreen.tsx:220, 225` sign-in buttons don't disable; HomeScreen challenge-claim handler doesn't disable. Users can double-tap. Fix: local `pending` state + disabled + spinner.
- [ ] **Deep-link `challengeId` not validated.** `App.tsx:~1514` stores the ID in `pendingDeepLinkRef` without checking it exists; downstream `GameScreen` may render blank. Fix: validate via Firestore lookup before navigation; show "That challenge has expired" toast on miss.
- [ ] **Board-generation timeout surfaces as `Alert`, not inline UI.** `GameScreen.tsx:175–192`. `Alert` is jarring vs. inline "Trying a different puzzle…" message. Fix: inline banner + auto-retry.

---

## 3. Nice-to-have (can ship without; v1.1 cleanup)

- [ ] **AsyncStorage-stored receipts are not encrypted at rest.** `src/services/iap.ts:650–676` writes the receipt-hash store and pending-purchase queue to AsyncStorage in cleartext. A physically compromised device (rooted / jailbroken) can read them. Not a typical consumer-scale threat for a puzzle game, but worth noting for the v1.1 security pass. Fix: migrate to `expo-secure-store` (iOS Keychain / Android KeyStore-backed).
- [ ] **Cloud Functions log `authenticatedUserId` in plaintext on warn/error paths.** `functions/src/index.ts:298–317, 370`. Firebase logs are private but PII-minimization best practice says truncate or hash. Fix: log only the first 6 chars of the UID.
- [ ] **AsyncStorage + Firestore debounce-timer races in `PlayerContext` / `EconomyContext`.** Intentionally not cleared on rapid mutations (per existing comments at `PlayerContext.tsx:725–753`, `EconomyContext.tsx:329–353`); coalescence behavior is the desired outcome. Data loss risk is very low because AppState flush covers backgrounding. Still worth a single-slot write queue for rigor. Fix: serialize persistence writes via a module-level promise chain.
- [ ] **`iap.ts` purchase promise never rejects on timeout.** Caller must check `success: false` on the resolved object (`iap.ts:293–304`). Works fine — just an unusual contract. Fix: consider normalizing to `throws`.
- [ ] **Swallowed catches in IAP init/cleanup.** `iap.ts:183–185, 604–606, 617–619`. Intentional (AsyncStorage non-critical, connection cleanup). Not a bug. Fix (if desired): breadcrumb instead of silent swallow.
- [ ] **Preload audio failure swallow in `sound.ts:690–691`.** Non-critical — synthesized-tone fallback handles it. Not a bug.
- [ ] **Missing club-invite deep link pattern.** `src/utils/deepLinking.ts` doesn't parse `wordfall://club/{id}`. Not in scope for v1.0 unless we plan to run club-invite campaigns at launch. Fix: add parser + `pendingDeepLinkRef` handling.
- [ ] **Consolidate `cloud-functions/` and `functions/` dirs.** Tracked separately as TASK 5 in the current launch plan (`claude/functions-consolidate` branch).

---

## What I verified but found clean

- **0 `TODO` / `FIXME` / `HACK` / `XXX` comments** in `src/` (puzzle-word hits in `data/` are content, not code markers).
- **0 hardcoded secrets.** All Firebase / Sentry / IAP keys come from `EXPO_PUBLIC_*` env vars or native config files.
- **Memory leaks: none.** Every `setInterval` / `setTimeout` / `AppState.addEventListener` / `onAuthStateChanged` subscription in `src/` has a cleanup return.
  - Verified: `EconomyContext.tsx:271, 372`, `PlayerContext.tsx:737, 755, 799`, `AuthContext.tsx:30`.
- **IAP retry + timeout + pending-purchase recovery** working as designed (`iap.ts:294, 622–647`).
- **Receipt-validation retry** (3 attempts, exponential backoff) working as designed (`receiptValidation.ts:146–175`).
- **Root `ErrorBoundary`** wired at `App.tsx:62` with Sentry `captureException` at `ErrorBoundary.tsx:32` + Restart button.
- **Funnel analytics framework** solid — `funnelTracker.ts` defines the steps, `analytics.ts` schema in `AnalyticsEventName` is comprehensive. Gaps are in *call sites*, not in the framework.

---

## Suggested triage workflow for the user

1. Read Section 0 — make sure nothing there surprises you.
2. Pick the Blockers (Section 1) you consider launch-critical. Strike the rest down to Polish or Nice-to-have.
3. Send me the filtered Blocker list as input to **TASK 6 (Final polish pass)**. I'll tackle them on branch `claude/final-polish`. The iOS ATT blocker is committed regardless.
4. Polish + Nice-to-have items can live as a v1.1 backlog in a GitHub issue or a follow-up doc.

## Files referenced in this audit

- `App.tsx` (ErrorBoundary wiring, ceremony switch, deep-link handler)
- `app.json` (permissions, plugins, privacy manifests, deep links)
- `src/components/ErrorBoundary.tsx`, `src/components/common/{Button,Modal}.tsx`
- `src/components/{PuzzleComplete,ReplayViewer,ReferralCard,MysteryWheel,GameHeader,PostLossModal,ChallengeCard,AchievementCeremony}.tsx`
- `src/screens/{Home,Shop,Settings,Club,Event,Leaderboard,Collections,Library,Game,Onboarding,EditProfile,Profile}Screen.tsx`
- `src/screens/game/{PlayField,GameFlashes,GameBanners}.tsx`
- `src/services/{iap,receiptValidation,ads,analytics,funnelTracker,softLaunchAnalytics,firestore,crashReporting,notifications,sound,commercialEntitlements}.ts`
- `src/contexts/{Auth,Player,Economy,Settings}Context.tsx`
- `src/hooks/{useGame,useRewardWiring}.ts`
- `src/utils/{deepLinking,perfInstrument,profanityFilter}.ts`
- `src/data/{mysteryWheel,shopProducts}.ts`
- `src/constants.ts` (color palette, AD_CONFIG)
- `functions/src/index.ts` (validateReceipt, clubGoalProgress)
- `cloud-functions/src/index.ts` (sendPushNotification, processStreakReminders)
- `firestore.rules` (all collection access rules)
- `scripts/optimize-assets.sh`
- `assets/` (23 MB, 26 PNG, 23 WebP, `bg-homescreen.mp4` 4.9 MB)
