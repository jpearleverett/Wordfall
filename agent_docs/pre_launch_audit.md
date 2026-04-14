# Wordfall — Pre-Launch Audit

> **Status:** Audit-only. No code has been changed on this branch. This is a triage input — items are pre-sorted into Blockers / Polish / Nice-to-have based on launch-risk judgment, but the user has final say on what to fix.
>
> **Scope:** React Native + Expo SDK 55 game shipping to Google Play + App Store. Audit focused on what could ship as a bug, crash, store-review rejection, or unfixable production blind spot.
>
> **Totals:** 779 Jest tests still green. 62 `console.log` in `src/` prod paths. 339 / 361 interactive elements unlabeled (sampled). 0 Sentry instrumentation on 5 critical paths. 23 MB of unoptimized PNG/MP4 assets despite existing `scripts/optimize-assets.sh`. 0 `TODO`/`FIXME`/`HACK` comments. 0 hardcoded secrets.

---

## 0. Blocked on user (external setup — flag don't fix)

These aren't audit items per se, they're prerequisites that can't be completed in code. Listing them up top so they don't get lost in triage.

- [ ] **Register `wordfall_*` IAP products in Play Console.** Catalog lives at `src/data/shopProducts.ts`. Required before real purchases work end-to-end.
- [ ] **Upload FCM server key to Firebase Console** → Cloud Messaging → Project Settings. Required for Android push.
- [ ] **Download `GoogleService-Info.plist` from Firebase Console** → commit to repo root. Referenced in `app.json` but not yet in repo. iOS-only; can wait until iOS work starts.
- [ ] **Apple Developer enrollment + first iOS EAS build.** Blocks iOS launch.
- [ ] **Real AdMob app IDs + unit IDs.** TASK 2 will wire Google's test IDs so dev client works; real IDs come from AdMob web console.
- [ ] **Real `.mp3` audio assets** → drop in `assets/audio/`. Today synthesized tones.

---

## 1. Blockers (must fix before Play Store / App Store submission)

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

- [ ] **`assets/` = 23 MB. `scripts/optimize-assets.sh` exists but has never been run** (0 `.webp` files in tree, 26 `.png`). 9 PNGs over 1 MB each. `bg-homescreen.mp4` = 4.9 MB uncompressed. Est. 7–12 MB savings. Play Store warns over 50 MB APK; we're fine, but every MB over ~20 MB for a puzzle game hurts install conversion. Fix: run `npm run optimize-assets`, commit resulting `.webp` + compressed mp4, update image imports.

---

## 2. Polish (ship-able but visible papercuts)

### Errors & crash safety

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

- [ ] **AsyncStorage + Firestore debounce-timer races in `PlayerContext` / `EconomyContext`.** Intentionally not cleared on rapid mutations (per existing comments at `PlayerContext.tsx:725–753`, `EconomyContext.tsx:329–353`); coalescence behavior is the desired outcome. Data loss risk is very low because AppState flush covers backgrounding. Still worth a single-slot write queue for rigor. Fix: serialize persistence writes via a module-level promise chain.
- [ ] **`iap.ts` purchase promise never rejects on timeout.** Caller must check `success: false` on the resolved object (`iap.ts:293–304`). Works fine — just an unusual contract. Fix: consider normalizing to `throws`.
- [ ] **Swallowed catches in IAP init/cleanup.** `iap.ts:183–185, 604–606, 617–619`. Intentional (AsyncStorage non-critical, connection cleanup). Not a bug. Fix (if desired): breadcrumb instead of silent swallow.
- [ ] **Preload audio failure swallow in `sound.ts:690–691`.** Non-critical — synthesized-tone fallback handles it. Not a bug.
- [ ] **Missing club-invite deep link pattern.** `src/utils/deepLinking.ts` doesn't parse `wordfall://club/{id}`. Not in scope for v1.0 unless we plan to run club-invite campaigns at launch. Fix: add parser + `pendingDeepLinkRef` handling.
- [ ] **Consolidate `cloud-functions/` and `functions/` dirs.** Tracked separately as TASK 6.

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
3. Send me the filtered Blocker list as input to **TASK 7 (Final polish pass)**. I'll tackle them on branch `claude/final-polish`.
4. Polish + Nice-to-have items can live as a v1.1 backlog in a GitHub issue or a follow-up doc.

## Files referenced in this audit

- `App.tsx` (ErrorBoundary wiring, ceremony switch, deep-link handler)
- `src/components/ErrorBoundary.tsx`, `src/components/common/{Button,Modal}.tsx`
- `src/components/{PuzzleComplete,ReplayViewer,ReferralCard,MysteryWheel,GameHeader,PostLossModal,ChallengeCard,AchievementCeremony}.tsx`
- `src/screens/{Home,Shop,Settings,Club,Event,Leaderboard,Collections,Library,Game}Screen.tsx`
- `src/screens/game/{PlayField,GameFlashes,GameBanners}.tsx`
- `src/services/{iap,receiptValidation,ads,analytics,funnelTracker,softLaunchAnalytics,firestore,crashReporting,notifications,sound,commercialEntitlements}.ts`
- `src/contexts/{Auth,Player,Economy}Context.tsx`
- `src/hooks/{useGame,useRewardWiring}.ts`
- `src/utils/{deepLinking,perfInstrument}.ts`
- `src/constants.ts` (color palette)
- `scripts/optimize-assets.sh`
- `assets/` (23 MB, 26 PNG, 0 WebP, `bg-homescreen.mp4` 4.9 MB)
