# Wordfall — Agent Context

Gravity-based word puzzle (React Native + Expo). Find hidden words on a letter grid; cleared letters fall, creating chain opportunities. 10 modes, 40 authored chapters (~600 puzzles), clubs, VIP, prestige.

**Stack:** Expo SDK 55 (New Architecture only — bridgeless), RN 0.83.4, React 19.2, TypeScript ~5.8, Reanimated 4.2.1 + worklets 0.7.2, **zustand** (game state store with selectors), **React Compiler** (auto-memoization via babel-preset-expo), Firebase (optional, has offline fallback), Jest (**39 suites, 791 tests**).

For detailed architecture see `agent_docs/architecture.md` — it's a short **index** that routes you to per-domain slices (state, engine, screens, cloud) so you only read what the current question needs.

## Commands

```bash
npx expo start --dev-client            # Metro bundler (Expo Go NOT supported)
npm run typecheck                      # tsc --noEmit
npm test                               # jest (791 tests)
npm install --legacy-peer-deps         # .npmrc sets this by default
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android  # Rebuild dev client APK (Termux requires the env var)
```

## Critical Files

| File | Role |
|------|------|
| `App.tsx` | Entry. ErrorBoundary, provider nesting, navigation, deep links, 25+ ceremony switch |
| `src/hooks/useGame.ts` | Game store factory (zustand + redux middleware wrapping 24-action reducer). Returns store instance + stable action dispatchers. **No `state` return — consumers use selectors.** |
| `src/stores/gameStore.ts` | Zustand store factory, `GameStoreContext`, `useGameStore` selector hook, `useGameDispatch`, 25+ pre-built selectors. |
| `src/screens/game/PlayField.tsx` | Grid + selection rendering. Subscribes to per-tap state (`selectedCells`) via zustand selectors so GameScreen doesn't re-render on taps. |
| `src/screens/GameScreen.tsx` | Gameplay UI: offers, tutorials, post-loss modal. **Does NOT subscribe to `selectedCells`** — reads coarse state via ~20 zustand selectors. |
| `src/types.ts` | ALL type definitions — edit here when adding data structures |

Extended list (grid gestures, game sub-components, contexts, engine, utility hooks): **`agent_docs/critical_files.md`**.

## Gotchas

Build, native-module, and runtime quirks (`Reanimated` worklet pitfalls, SDK 55 native deps, Babel plugin order, Firebase hybrid SDK, Termux EAS quirks, etc.) live in **`agent_docs/gotchas.md`**. Consult that file when a build or runtime issue surfaces.

## Code Patterns

See `agent_docs/patterns.md` — conventions for exports, types, Reanimated, adding a new ceremony / action / mode, and the zustand + selector pattern.

## Dev Client (REQUIRED)

Expo Go is not supported. You need the dev client APK.

```bash
# Daily: start Metro
npx expo start --dev-client
# Open the "Wordfall" custom app on device; press `r` in terminal to reload JS

# Rarely: rebuild native APK (only when adding/removing native deps)
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android
# Download APK from the URL EAS prints, install on device

# JS-only changes do NOT need a new APK — just reload Metro.
# Native dep changes (adding/removing/upgrading anything in node_modules
# with native code) DO need a fresh APK.
```

**Termux note:** Local Android builds are impossible in Termux (NDK has no ARM64 host tools). Always use EAS cloud builds. Free tier = 30 builds/month, ~1 per week is enough. The `EAS_SKIP_AUTO_FINGERPRINT=1` env var is required in Termux — see Gotchas.

## Branch Strategy

**Never push directly to `main`.** Work on feature branches named `claude/<slug>`:

```bash
git checkout main && git pull origin main
git checkout -b claude/<slug>
# ... edit, test, commit ...
git push -u origin claude/<slug>
```

User reviews and merges via GitHub PR. Exception: tiny config-only fixes (package.json, eas.json, .gitignore) that unblock a broken build can go direct to main **only if the user explicitly says so**.

## External Setup & Open Items

Firebase / Sentry / AdMob env vars, IAP/Firestore/Cloud Functions deploy steps, launch-prep to-do list — see **`agent_docs/setup.md`** and **`agent_docs/pre_launch_audit.md`**.

EAS project already configured (`projectId: b6dd187c-d46c-4331-bb15-5c7ffced89b3`, owner `jpearleverett`).

## Launch Status (April 2026 — Android-first)

Target: Google Play. iOS deferred (no Apple Developer enrollment yet, by design).

### What the user has ALREADY done outside this repo (do not ask again)
- Google Play Console account: created + verified ($25 paid)
- Firebase project on Blaze plan: created, billing enabled, wired into the app via `EXPO_PUBLIC_FIREBASE_*` env vars and `google-services.json` (in repo root)
- Sentry.io account: created. SDK is wired (`@sentry/react-native ~7.11.0`). Only the `EXPO_PUBLIC_SENTRY_DSN` env var still needs to be set
- Cloudflare Pages site: live at https://wordfallgame.app — privacy policy (`/privacy`), terms (`/terms`), and support page already published from `wordfallgamesite/` in repo
- Support email alias `info@iridescent-games.com` is live (matches `SUPPORT_EMAIL` in `src/screens/SettingsScreen.tsx`)
- EAS project + dev client APK: building cleanly, smoke test passed (all screens load, game plays through)

### What the codebase ALREADY has wired (don't re-implement, just verify)
- **Leaderboards**: `firestoreService.submitDailyScore` / `submitWeeklyScore` are called from `src/hooks/useRewardWiring.ts:689,693` on puzzle complete; reads in `src/services/firestore.ts:300+`
- **VIP subscription end-to-end**: `vip_weekly` product → `applyProduct` in `src/services/commercialEntitlements.ts:207` sets `isVipSubscriber/vipExpiresAt`. Server-side renewal/expiry handled by `onSubscriptionRenew` (Apple SSN v2 + Google RTDN) in `functions/src/index.ts:418`
- **Cloud Functions** (13 total, split across two codebases — see `firebase.json`):
  - `functions/` (commerce codebase): `validateReceipt`, `onSubscriptionRenew`, `clubGoalProgress`, `autoKickInactiveMembers`, `requestAccountDeletion`
  - `cloud-functions/` (social codebase): `onPuzzleComplete`, `updateClubLeaderboard`, `sendPushNotification`, `processStreakReminders`, `rotateClubGoals`, `moderateClubMessage`, `sendGift`, `claimGift`
- **Gifting (secure path)**: `sendGift` + `claimGift` HTTPS callables in `cloud-functions/src/index.ts` — atomic txn, 5/day/sender cap (`users/{uid}/giftQuota`), idempotency-key replay guard. Client wrapper `src/services/gifts.ts` (`sendGiftSecure`/`claimGiftSecure`). `PlayerSocialContext.sendHintGift`/`sendTileGift` route through `sendGiftSecure` with a fallback to the legacy `firestoreService.sendGift` direct write (same `gifts/` schema) so it stays safe pre-deploy. Inbox UI: `src/components/GiftInbox.tsx` mounted inside `ClubScreen`; reads `firestoreService.getPendingGifts`, claim via `claimGiftSecure`, grant applied locally through EconomyContext (`addHintTokens` / `addBoosterToken('wildcardTile')` / `addLives`).
- **Push notifications client**: `src/services/notifications.ts` registers Expo + device push tokens, saves to Firestore at `users/{uid}/pushToken` (line 506-509). Server-side `sendPushNotification` callable exists in `cloud-functions/src/index.ts:231`
- **Receipt validation + replay protection**: `validateReceipt` in `functions/src/index.ts:370` with SHA256 hash dedup (`/receipts` collection)
- **Consent gate, club moderation (Perspective API), report/block, loot-box odds disclosure, A/B testing engine, Remote Config, soft-launch analytics module, 35+ analytics events** — all wired
- **Firestore rules + indexes**: `firestore.rules` (124 lines, strict), `firestore.indexes.json` — written, just need `firebase deploy`
- **Site/legal**: `wordfallgamesite/` has privacy/terms/support + an `assetlinks.json` template (placeholder SHA256 needs Play app signing fingerprint)

### Real launch-blocking gaps (code-side)
- **Social account linking**: Firebase Anonymous auth only. No Google Sign-In. Not strictly blocking but anonymous-only means a wiped device = lost paid progression.
- **`assetlinks.json` SHA256**: replace `REPLACE_WITH_YOUR_PLAY_APP_SIGNING_SHA256` in `wordfallgamesite/.well-known/assetlinks.json` with the Play app signing key fingerprint (from Play Console → App signing).
- _(resolved April 2026)_ GDPR account deletion UI + `requestAccountDeletion` Cloud Function are live; direct-client gifting upgraded to a secure `sendGift`/`claimGift` callable path with rate limits.

### Real launch-blocking gaps (user-side, outside this repo)
- Register `wordfall_*` IAP SKUs in Play Console (catalog: `src/data/shopProducts.ts`)
- Grant Firebase default service account (`<project>@appspot.gserviceaccount.com`) the **Android Publisher** role in Play Console → Users and permissions (so `validateReceipt` can call Google's API)
- Upload FCM server key to Firebase → Cloud Messaging (for remote push)
- Set `EXPO_PUBLIC_SENTRY_DSN` as an EAS secret + `.env`
- AdMob **app IDs** in `app.json` AND rewarded + interstitial **unit IDs** (via `EXPO_PUBLIC_ADMOB_REWARDED_ID*` / `..._INTERSTITIAL_ID*` env vars) are already real on the user's side. Only remaining AdMob step: confirm those env vars are populated in EAS secrets so production AABs don't fall through to the dev-only Google test unit fallback in `src/constants.ts`
- Author the UMP consent message inside AdMob → Privacy & messaging → GDPR
- Run `firebase deploy --only firestore:rules,firestore:indexes,functions` (one-time)
- Fill Play Console Data Safety form (draft in `agent_docs/data_safety.md`)
- Upload store listing assets (icon, feature graphic, screenshots — copy in `agent_docs/store_listing.md`)
- Commission real audio (synth fallback works but sounds amateur)

### Deferred to v1.1 (NOT launch blockers)
- Migrate AsyncStorage receipts to `expo-secure-store`
- Consolidate `cloud-functions/` + `functions/` into one codebase
- Per-UID Firestore rate-limit counter
- Inline board-gen timeout banner (vs Alert)
- Localization (UI-only, top 5 languages)
- Maestro E2E flows beyond smoke
- iOS lane (Apple Developer enrollment, `GoogleService-Info.plist`, Universal Links, ATT verification)

### Working-style reminders for Claude
- **Small chunks**: never edit > ~150 lines per Edit / write > ~400 lines per Write — long edits time out
- **Commit at logical boundaries**, push to `claude/<slug>` only (never `main`)
- **Reuse, don't reinvent**: many "missing" features are wired — search before writing
- **Verify on device**: tests prove correctness, not fun
