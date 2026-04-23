# Cloud & Services

Firebase (Auth/Firestore/Functions), Analytics (hybrid JS/native SDK), IAP,
Ads, Sentry, deep linking, receipt validation. Read this when touching
network-backed services, analytics events, monetization, or push.

## Firebase Architecture — Hybrid SDK

Auth/Firestore/Functions use the JS SDK (`firebase` npm package). Analytics uses the native module (`@react-native-firebase/analytics` v24+) because `firebase/analytics` is web-only and throws on RN. Both initialize independently: `firebase/app` reads `EXPO_PUBLIC_FIREBASE_*` env vars; `@react-native-firebase/app` reads `google-services.json` (Android) and `GoogleService-Info.plist` (iOS). Both must point to the same Firebase project.

- **Firestore rules/indexes**: `firebase.json` in repo root references `firestore.rules` + `firestore.indexes.json`, both deployed to `wordfall-mobile-game` project.
- **Cloud Functions**: single codebase at `functions/` (consolidated Apr 2026 — see `firebase.json`). Deployed on Node 22. 19 functions live: commerce in `functions/src/index.ts` (`validateReceipt`, `onSubscriptionRenew`, `clubGoalProgress`, `autoKickInactiveMembers`, `requestAccountDeletion`) and social in `functions/src/social.ts` re-exported from `index.ts` (`onPuzzleComplete`, `updateClubLeaderboard`, `sendPushNotification`, `processStreakReminders`, `processDay2Reengagement`, `processDay7Reengagement`, `rotateClubGoals`, `moderateClubMessage`, `sendGift`, `claimGift`, `onReferralSuccess`, `distributeWeeklyRewards`, `submitValidatedScore`). Per-UID rate-limit counter helper (`checkFirestoreRateLimit` at `rateLimits/{uid}_{endpoint}_{windowStart}`) guards `validateReceipt` / `clubGoalProgress` / `requestAccountDeletion` / `sendPushNotification` / `submitValidatedScore`; fail-open on transaction error so Firestore hiccups don't black-hole legitimate traffic. `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL` set in `.env`.

  **Tier 6 B4 (April 2026)** added `submitValidatedScore` — routes daily / weekly / event leaderboard writes through a callable that enforces auth, per-UID rate limit (60/hr), score ceiling per mode×level (`maxPlausibleScore` helper), and a duration floor (`durationMs >= wordCount × 400`). Client gate is the `leaderboardValidationEnabled` RC flag (default ON, with direct-write fallback as kill-switch). Firestore rules have NOT yet been tightened — direct writes remain allowed during the bake-in period; tightening to admin-SDK-only writes is a follow-up commit once the callable is verified in production.
- **Auth**: Firebase anonymous auth with loading state (`AuthContext`).
- **Firestore social layer** (`src/services/firestore.ts`): leaderboards (daily / weekly / per-event — `events/{eventId}/scores/{uid}` via `submitEventScore` + `getEventLeaderboard`), friend system with codes, public-club browse (`listPublicClubs` — orders by `weeklyScore` desc), gift delivery (legacy client-direct path — still live for back-compat), player profile sync (now writes `tzOffsetMinutes` + `lastActiveDate` for re-engagement scheduling). Every method has try/catch returning defaults on failure — app works identically offline.
- **Gifting — secure path** (`src/services/gifts.ts` + `functions/src/social.ts` `sendGift` / `claimGift`): atomic server-side transaction, 5-gift/day/sender cap (`users/{uid}/giftQuota/{YYYY-MM-DD}`), idempotency-key replay guard, clubmate/friend relationship check (reuses push-auth logic). Writes the same `gifts/` schema as the legacy direct path so `getPendingGifts` keeps working unchanged. Client entry points: `PlayerSocialContext.sendHintGift` / `sendTileGift` call `sendGiftSecure` with a fallback to legacy direct write, and `src/components/GiftInbox.tsx` (mounted in `ClubScreen`) consumes `firestoreService.getPendingGifts`, claims via `claimGiftSecure`, and applies the grant locally through EconomyContext (`addHintTokens` / `addBoosterToken('wildcardTile')` / `addLives`). Server never writes to the recipient economy.

## Analytics (tri-mode)

`src/services/analytics.ts` dispatches events to three targets:
- **Native module** on iOS/Android (`@react-native-firebase/analytics` v24+)
- **JS SDK** on web (`firebase/analytics` guarded by `isSupported()`)
- **Firestore mirror**: every event also written to `analytics_events` collection (60s flush) + AsyncStorage as offline buffer

~100 typed event names across app lifecycle. Revenue (`trackRevenue`, `trackAdRevenue`), retention (`trackRetention` for D1/D7/D30), conversion funnels (`trackFunnel`), cohort analysis (`trackCohort`). User properties (level, stage, payer status). A/B testing via deterministic hash variant assignment (`getVariant()`). 133 `logEvent`/`trackEvent` call sites across the codebase.

## IAP (`src/services/iap.ts`)

`react-native-iap@^15.0.0` installed + autolinked via config plugin in `app.json`. v14 had Gradle/Nitro issues; v15 fixed them. Full purchase flow: init → `fetchProducts` → `requestPurchase` → `purchaseUpdatedListener` → server-side receipt validation → `finishTransaction` (iOS) / `acknowledgePurchaseAndroid` + `consumePurchaseAndroid` (Android) → entitlement persistence. Mock mode is `__DEV__`-only (production rejects purchases when the native module isn't linked or `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL` is unset). Receipt replay protection via hash dedupe in AsyncStorage (last 500). 50+ products in `shopProducts.ts` + 3 mega bundles in `dynamicPricing.ts`.

## Ads (`src/services/ads.ts`)

`react-native-google-mobile-ads@^16` installed + autolinked. Rewarded + interstitial via AdMob. 5 reward types. Rewarded: daily cap 10, 30s cooldown. Interstitial: daily cap 5, 90s interval. `AD_CONFIG` defaults to Google's public test ad unit IDs (so dev builds show real test ads); `MockAdModal` covers `__DEV__` when the native module isn't linked. Ad completion fires `analytics.trackAdWatched`; failures breadcrumbed to Sentry. Wired into GameScreen (post-fail, post-complete) and ShopScreen.

## Receipt Validation (`src/services/receiptValidation.ts`)

Server-side validation via Firebase Cloud Function at `${FIREBASE_FUNCTIONS_URL}/validateReceipt`. Sends `{ receipt, productId, platform }`. Fraud detection via receipt hash tracking in AsyncStorage (prevents replay attacks). Falls back to client-side trust in `__DEV__` only; production fails closed when network or function unavailable.

## Push Notifications

`src/services/notifications.ts` uses `expo-notifications`. 9 categories with template interpolation. Permission handling with graceful denial. Android notification channel. Convenience schedulers: `scheduleStreakReminder()` (8 PM), `scheduleDailyChallenge()` (9 AM), `scheduleComebackReminder()` (3 days). Daily frequency cap resolved by `resolveMaxPerDay()`: per-segment cap from `getPersonalizedNotifications()` > RC key `maxNotificationsPerDay` > default 3. `getPersonalizedNotifications(segments).enabledCategories` also drives `isCategoryAllowedForSegment()` so hardcore / at_risk / lapsed players each see the curated subset. App.tsx calls `setNotificationSegments(player.segments)` on every session start. Remote push: `registerForRemotePush()` gets Expo + device tokens, writes to Firestore `users/{uid}/pushToken/current`, `handleRemoteNotification()` routes by category.

`src/services/notificationTriggers.ts` wires 8 gameplay-event triggers, all idempotent (cancels previous before scheduling new):
- `triggerStreakReminder` (after streak update)
- `triggerEnergyFullNotification` (on energy spend)
- `triggerEventNotification` (app open)
- `triggerDailyChallengeReminder` (app open)
- `triggerWinStreakMilestoneNotification` (milestones 3/5/7/10/15/20)
- `triggerComebackReminder` (app background)
- `triggerStreakAtRiskNotification` (background — streak ≥ 1 day and not played today)
- `triggerFriendBeatScoreNotification` (immediate when friend beats score)

**Server-side re-engagement Cloud Functions** (`functions/src/social.ts`): `processStreakReminders` runs hourly (`'0 * * * *'` UTC) and per-user filters by `localHourForUser(tzOffsetMinutes, nowMs) === 20` so the push lands at 8 PM local. `processDay2Reengagement` + `processDay7Reengagement` mirror the same shape via the shared `runReengagementPass()` helper, targeting users whose `lastActiveDate` equals exactly today-2 or today-7. Day-2 skips users with purchase history; Day-7 pairs with the "WELCOME BACK" 70% off starter already wired in `dynamicPricing.ts:110–128`. `syncPlayerProfile()` writes `tzOffsetMinutes` + `lastActiveDate` on every profile sync so these functions have the data they need.

## Crash Reporting (`src/services/crashReporting.ts`)

Dynamic `require('@sentry/react-native')`. When available + `EXPO_PUBLIC_SENTRY_DSN` set, forwards exceptions/messages/breadcrumbs/user context. Console-only fallback. Global `ErrorUtils` handler catches uncaught JS errors. Breadcrumb buffer (50 max) + Sentry forwarding. Root `ErrorBoundary` wraps app tree inside `GestureHandlerRootView`; shows synthwave crash screen with Restart button using `expo-updates.reloadAsync()`.

## Deep Linking

`wordfall://` scheme configured in `app.json` with Android intent filters. **Android App Links `autoVerify: true` is configured for `https://wordfallgame.app`** (`app.json:97–111`). `src/utils/deepLinking.ts` parses BOTH `wordfall://` and `https://wordfallgame.app/*` URLs, wrapped in try/catch:

- `wordfall://referral/{code}` — auto-applies code
- `wordfall://challenge/{id}` — stores challenge ID
- `wordfall://daily` — navigates to daily mode
- Query param fallbacks supported

`buildReferralLink()` at `deepLinking.ts:107–109` now emits `https://wordfallgame.app/r/{code}` so share text in chat apps can install-attribute via the web; the parser accepts both the `/r/` short path and the legacy `wordfall://referral/{code}` scheme. A `buildReferralSchemeLink()` escape hatch remains for callers that need the custom scheme explicitly.

App.tsx handles cold-start (`Linking.getInitialURL()`) and warm-start (`Linking.addEventListener('url')`). All share text includes deep link CTAs via `generateShareText()`.

## A/B Testing (`src/services/experiments.ts`)

6 pre-configured experiments: `onboarding_flow`, `energy_cap`, `hint_rescue_price`, `first_purchase_offer`, `daily_reward_generosity`, `mystery_wheel_free_frequency`. Weighted multi-variant assignment with deterministic hash (same `simpleHash` as `analytics.getVariant()`). `useExperiment()` hook memoizes variant assignment per userId and auto-flattens `player.segments` (engagement + spending + skill + motivations) into the new `segmentsForTargeting` param so `getAssignedVariant()` can honor `targetSegments`. Users outside the target set get the control variant and are not enrolled. Exposure tracking is separate from assignment for proper intent-to-treat analysis. `startDate`/`endDate` windows also respected.

## Player Segmentation (`src/services/playerSegmentation.ts`)

4 dimensions: engagement (7 segments), skill (4), spending (4), motivation (5). `computeSegments()` called on every app open via PlayerContext `useEffect`. Drives personalized offer timing, difficulty, home content, notification scheduling, mode recommendations. Segments persisted in PlayerContext.

## Regional Pricing

`src/data/regionalPricing.ts` — 8 region tiers (US, EU, IN, BR, SEA, JP, KR, default). India/Brazil at 0.40-0.45x, SEA at 0.50x, EU/UK at 0.95x. `detectRegion()` uses device locale, `getRegionalPrice()` formats with currency symbol. Store-side pricing ultimately controlled by App Store/Play Store; this just provides display formatting.

## Dynamic Pricing

`src/data/dynamicPricing.ts` — segment-based offer personalization. `getDynamicOffers(spending, engagement, playerLevel)` returns 1-3 offers with discounts/badges/expiry:
- **non-payer**: 50% off starter
- **minnow**: $1.99-$2.99
- **dolphin**: $4.99-$9.99
- **whale**: $49.99-$99.99 VIP mega bundles
- **lapsed**: 70% off win-back

`getFlashSale(date)` returns rotating daily deal with 40-60% discount + countdown. 3 `MEGA_BUNDLES` at $14.99/$19.99/$29.99.
