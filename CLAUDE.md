# Wordfall — Agent Context

**Word search with gravity** (React Native + Expo). Each puzzle has a pre-authored list of words to find on a letter grid. The player traces letters with their finger — when the trace matches a list word it auto-resolves (no submit button), those cells clear, and remaining letters fall via gravity into the empty spaces. 10 modes, 40 authored chapters (~600 puzzles), clubs, VIP, prestige.

**Stack:** Expo SDK 55 (New Architecture only — bridgeless), RN 0.83.4, React 19.2, TypeScript ~5.8, Reanimated 4.2.1 + worklets 0.7.2, **zustand** (game state store with selectors), **React Compiler** (auto-memoization via babel-preset-expo), Firebase (optional, has offline fallback), Jest (**66 suites**).

For detailed architecture see `agent_docs/architecture.md` — it's a short **index** that routes you to per-domain slices (state, engine, screens, cloud) so you only read what the current question needs.

## Game Mechanics — read this before making design assumptions

**Authoritative spec:** `agent_docs/game_mechanics.md`. Skim it before any gameplay, audio, UX, or balance work — Wordfall does NOT share mechanics with Candy Crush, Wordscapes, or match-3 games, and agents keep making those assumptions.

**Quick "IS / IS NOT" for Claude sessions:**

- **IS:** word search on a letter grid, words come from a pre-authored find-list, input is finger-trace across adjacent cells, traced path auto-resolves the moment it matches a list word, cleared cells leave permanent empty spaces, gravity pulls remaining letters into those spaces, puzzle ends when all list words are found or the board becomes unwinnable.
- **IS NOT:** there is no submit button, so **invalid words are impossible**; words come from a fixed list, so **duplicate-word submission is impossible**; long words are already on the list, so **word length is not a difficulty signal**; gravity never spawns new tiles, so **the grid only shrinks**; one trace resolves exactly one word, so **auto-cascade chains (à la Candy Crush) do not exist**; there is no move counter, so **running out of moves is not a fail state**; the hard-energy / lives system is Remote-Config gated and defaults to OFF, so **the default game has no lives gate**.
- **Real fail states:** (1) stuck — remaining list words become untraceable; (2) timeout — Time Pressure mode only; (3) perfect-solve violation — Perfect Solve mode only.
- **Dopamine architecture (April 2026 — Option A refactor):** the match-3-style `combo` multiplier and `chainCount` counter were RIPPED. The new layer is: (a) **last-word tension** (BGM swap + chip pulse when 1 word remains), (b) **FLAWLESS badge** inline on every clean solve (no hints/undos/shuffle), (c) **flawless streak** tracked across sessions with full-screen milestone ceremonies at 3/5/7/10/15/20. The only surviving "combo" concept is **booster combo** (`activeComboType` — Eagle Eye / Lucky Roll / Power Surge = 2× multiplier from stacking two boosters), which is a distinct voluntary system. Do not re-introduce `combo` / `maxCombo` / `chainCount` fields, the `ComboFlash` overlay, the chain popup, the `(Nx)` score suffix, `CHAIN_INTENSITY`, `SCORE.comboMultiplier`, or the `'chain_count'` / `'chain_reaction'` analytics/achievements. See `agent_docs/game_mechanics.md` for the full list of deleted systems and why.

## Commands

```bash
npx expo start --dev-client            # Metro bundler (Expo Go NOT supported)
npm run typecheck                      # tsc --noEmit
npm test                               # jest (66 suites)
npm run screenshots                    # build web-harness + capture PNGs → .artifacts/screenshots/
npm install --legacy-peer-deps         # .npmrc sets this by default
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android  # Rebuild dev client APK (Termux requires the env var)
```

## Visual harness (screenshot previews)

Headless-Chromium-driven preview of individual components. Useful for
Claude sessions and CI: run `npm run screenshots` to bundle the
registry at `web-harness/entries.tsx`, serve it locally, and capture
one PNG per entry into `.artifacts/screenshots/`. See
**`web-harness/README.md`** for how to add an entry, the shim layout,
and the Reanimated/snapshot limitations.

## Critical Files

| File | Role |
|------|------|
| `App.tsx` | Entry. ErrorBoundary, provider nesting, navigation, deep links. Ceremonies route through `src/App/CeremonyRouter.tsx` (20 render cases covering the 30-variant `CeremonyItem` union). |
| `src/hooks/useGame.ts` | Game store factory (zustand + redux middleware wrapping 22-action reducer). Returns store instance + stable action dispatchers. **No `state` return — consumers use selectors.** |
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

Launch-blocking gaps (code + user-side) and the **path to a 9/10 top-grosser rating** (ship-readiness review, April 2026) live in **`agent_docs/launch_blockers.md`**. Firebase / Sentry / AdMob env vars + deploy steps are summarized in the same file.

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
- **Leaderboards**: `firestoreService.submitDailyScore` / `submitWeeklyScore` are called from `src/hooks/useRewardWiring.ts` on puzzle complete; reads in `src/services/firestore.ts`. Daily + Weekly scopes, plus Friends scope (`searchUsersByDisplayName` wired into `src/screens/LeaderboardScreen.tsx:276–294` with code/name mode toggle).
- **VIP subscription end-to-end**: `vip_weekly` / `vip_monthly` / `vip_annual` products → `applyProduct` in `src/services/commercialEntitlements.ts` sets `isVipSubscriber/vipExpiresAt`. Server-side renewal/expiry handled by `onSubscriptionRenew` (Apple SSN v2 + Google RTDN) in `functions/src/index.ts`.
- **Cloud Functions** (15 total, single codebase at `functions/` — see `firebase.json`):
  - Commerce (`functions/src/index.ts`): `validateReceipt`, `onSubscriptionRenew`, `clubGoalProgress`, `autoKickInactiveMembers`, `requestAccountDeletion`.
  - Social (`functions/src/social.ts`, re-exported from `index.ts`): `onPuzzleComplete`, `updateClubLeaderboard`, `sendPushNotification`, `processStreakReminders`, `rotateClubGoals`, `moderateClubMessage`, `sendGift`, `claimGift`, `onReferralSuccess`, `distributeWeeklyRewards`.
  - `onPuzzleComplete` + `rotateClubGoals` both understand `mode: 'shared'` goals (Clash-style collective club challenges); `onReferralSuccess` closes the referral reward grant loop with 50/day/UID rate limit and double-claim guard.
- **Gifting (secure path)**: `sendGift` + `claimGift` HTTPS callables in `functions/src/social.ts` — atomic txn, 5/day/sender cap (`users/{uid}/giftQuota`), idempotency-key replay guard. Client wrapper `src/services/gifts.ts` (`sendGiftSecure`/`claimGiftSecure`). `PlayerSocialContext.sendHintGift`/`sendTileGift` route through `sendGiftSecure` with a fallback to the legacy `firestoreService.sendGift` direct write (same `gifts/` schema). Inbox UI: `src/components/GiftInbox.tsx` mounted inside `ClubScreen`.
- **Push notifications client**: `src/services/notifications.ts` registers Expo + device push tokens, saves to Firestore at `users/{uid}/pushToken/current`. Server-side `sendPushNotification` callable exists in `functions/src/social.ts`.
- **Receipt validation + replay protection**: `validateReceipt` in `functions/src/index.ts` with SHA256 hash dedup (`/receipts` collection) + per-UID rate limit (20/5min).
- **Dynamic cohort offers**: `src/data/dynamicPricing.ts:103–250` — `getDynamicOffers(spending, engagement, playerLevel)` already branches on the segment matrix (lapsed → 70% off starter + "WELCOME BACK" 48h; at-risk/returned → 50% off, 24h; non-payer first-purchase at level 5–15 → 75% off special; minnow/dolphin/whale tiers). Don't re-implement.
- **Cosmetic rendering**: `ProfileScreen.tsx` reads `equippedFrame` / `equippedTheme` / `equippedTitle`, resolves via `getFrame()` / `getTheme()` / `getTitleLabel()`, and applies rarity-colored border (common/rare/epic/legendary). Titles flow through gifts/social/leaderboards. Only animated frame glow for legendary is still missing (see `launch_blockers.md`).
- **Prestige**: `performPrestige()` at `PlayerContext.tsx:1603–1670` resets level + stars + mode levels, accumulates permanent bonuses, unlocks cosmetic reward, queues `PrestigeResetCeremony`. Fully live — 5 tiers defined in `src/data/prestigeSystem.ts`.
- **Feel polish already shipped**: spring gravity with per-column stagger (`GameScreen.tsx:1258–1265`, tension 180 / friction 9); invalid-word 6-frame ±8px screen shake (`GameScreen.tsx:1082–1112`, RC-gated + reduce-motion safe); multi-tile bloom particles fired at three dispatch sites on word-found (`GameScreen.tsx:1377, 1379, 1415`); booster combo synergies (Eagle Eye / Lucky Roll / Power Surge) with `BoosterComboBanner` (`GameScreen.tsx:1852–1854`).
- **Adaptive difficulty**: `getAdjustedConfig()` wired at 4 call sites in `App.tsx` (lines 178, 490, 632, 1324); RC-gated via `adaptiveDifficultyEnabled` (default ON). Classic-mode stuck events feed the adjuster.
- **Colorblind palette**: `src/services/colorblind.ts` + `src/hooks/useColors.ts:20–26` merge mode-specific overrides (deuteranopia / protanopia / tritanopia) into `COLORS`; actually applied in `LetterCell.tsx:119, 184–194`.
- **Analytics forwarding**: tri-path — native `@react-native-firebase/analytics`, web `firebase/analytics` with `isSupported()` guard, plus Firestore `analytics_events` batch mirror (60s flush). ~100 event names across funnel.
- **IAP price localization**: `iap.ts:463–480` prefers `storeProduct.price` (currency-localized from the native receipt) and falls back to USD `fallbackPrice` only when the store hasn't loaded.
- **Streak shield (preventive)**: `streak_freeze` SKU + in-game `streak_shield` contextual offer (30 gems) — the shield auto-consumes on a streak miss within a 72h window (`PlayerProgressContext.tsx:227–250`). Duolingo-style "buy in advance."
- **Consent gate, club moderation (Perspective API), report/block, loot-box odds disclosure, A/B testing engine (deterministic hash), Remote Config (65 typed keys), soft-launch analytics module** — all wired.
- **Hard-energy (Phase 4B, Remote-Config-gated, default OFF)**: `src/hooks/useHardEnergy.ts` composes `EconomyContext` lives + `getRemoteBoolean('hardEnergyEnabled')` into `{ canPlay, livesRemaining, nextLifeAtMs, startLevel(), refillWithGems(), creditAdLife() }`. `App.tsx` `GameScreenWrapper` debits a life on every level load (keyed on `route.key` + mode + level so re-renders never double-debit) and mounts `NoLivesModal` when `canPlay=false`. Rewarded-ad path uses a new `life_reward` `AdRewardType` capped at 3/day (`AD_CONFIG.MAX_LIFE_ADS_PER_DAY`). Flip is a Remote Config toggle — while `hardEnergyEnabled=false` `startLevel()` is a no-op and behaviour is unchanged.
- **Firestore rules + indexes**: `firestore.rules` (124 lines, strict), `firestore.indexes.json` — written, just need `firebase deploy`
- **Site/legal**: `wordfallgamesite/` has privacy/terms/support + an `assetlinks.json` template (placeholder SHA256 needs Play app signing fingerprint)

### Launch-blocking gaps — SHIPPED April 2026

The authoritative, verified list lives in **`agent_docs/launch_blockers.md`**. As of 2026-04-22, **all 18 Tier 1–4 code gaps are shipped** on branch `claude/assess-wordfall-launch-readiness-VzyDY`. Summary of what landed:

- **Tier 1 Retention (R1–R7)** — `getPersonalizedNotifications()` wired into `notifications.ts` scheduler; per-timezone `processStreakReminders`; new `processDay2Reengagement` + `processDay7Reengagement` Cloud Functions; restorative `PostStreakBreakOffer` modal (50 gems, 24h window, tracks `streaks.recentBreak`); `segmentWelcomeMessage` rendered as a welcome-back banner on HomeScreen; `maxNotificationsPerDay` RC-overridable with segment-derived cap winning.
- **Tier 2 Monetization (M1–M3)** — `first_purchase_special` raised to 500/50/10; `wildcard_pack_5` / `spotlight_pack_5` / `shuffle_pack_5` SKUs at $1.99 each added alongside `booster_crate`; `getAssignedVariant()` now evaluates `targetSegments` (via new `segmentsForTargeting` param auto-flattened by `useExperiment()`).
- **Tier 3 Social + Metagame (S1, S2, MG1–MG3)** — `firestoreService.listPublicClubs()` + Browse-clubs section inside `ClubScreen.renderNoClub()`; `buildReferralLink()` emits `https://wordfallgame.app/r/{code}` + parser handles `/r/` path; new `season_pass_complete` ceremony type with dedicated `SeasonPassCompleteCeremony` fired at tier 50; new `EventLeaderboardCard` + `submitEventScore` / `getEventLeaderboard` per-event ranking mounted in `EventScreen`; animated legendary frame glow on `ProfileScreen` via Reanimated pulse.
- **Tier 4 Feel polish (C1, C2, P1, P2)** — `gravityLandHaptic()` now fires in the fall-spring `.start()` callback at `GameScreen.tsx:1272`; `TimerDisplay` threshold crossings at 30s / 10s fire haptic + SFX slot + coral flash overlay; new `economy_primer` onboarding phase teaches coins / gems / clubs; `MainNavigator` uses a custom `cardSpringFadeInterpolator` with spring open + cubic-out close transitions.

**Remaining Tier 5 items (user-side, NOT code):**
- `assetlinks.json` SHA256: replace the `REPLACE_WITH_YOUR_PLAY_APP_SIGNING_SHA256` placeholder in `wordfallgamesite/.well-known/assetlinks.json` with the Play App Signing fingerprint.
- Register new SKUs in Play Console: `wordfall_wildcard_pack_5`, `wordfall_spotlight_pack_5`, `wordfall_shuffle_pack_5`.
- Translate 5 non-EN locale files (`de / es-419 / fr / ja / pt-BR` — currently English structural stubs).
- Hand-author puzzle overrides for levels 80–150 (`chapterOverrideJson` RC path exists).

_(resolved April 2026)_ GDPR account deletion UI + `requestAccountDeletion` Cloud Function (purges users + subcollections + club membership + consent ledger + push tokens, hashes receipts for audit trail); secure `sendGift`/`claimGift` callable path; Google Sign-In linking (`src/services/googleAuth.ts` with credential-already-in-use recovery fallback — final activation needs user-side OAuth setup).

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
- **Google Sign-In activation** (code is landed, just needs setup + rebuild):
  1. `npm install --legacy-peer-deps @react-native-google-signin/google-signin` (then commit `package.json` + lockfile)
  2. Google Cloud Console → Credentials → create an OAuth 2.0 **Web Client ID** for the Firebase project. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env` + `eas secret:create`.
  3. Firebase Console → Authentication → Sign-in method → enable **Google**. Paste the same Web Client ID into the Google provider settings.
  4. Play Console → Setup → App signing → copy the **SHA-1** fingerprint → Firebase Console → Project settings → Android app → Add fingerprint.
  5. EAS rebuild dev-client APK (`EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android`) and reinstall — the service autodetects the native module and flips `canLinkGoogle` to `true`.

### Deferred to v1.1 (NOT launch blockers)
- **Localization strings.** `src/i18n/` plumbing + 6 locale files (en / de / es-419 / fr / ja / pt-BR) are structurally wired at 325 keys each. The non-EN files are English placeholders today — ship EN-only for PH/CA soft launch, commission real translations before global.
- iOS lane (Apple Developer enrollment, `GoogleService-Info.plist`, Universal Links, ATT verification).
- Maestro CI wiring (flows 01–15 are authored in `.maestro/`; hosted CI runner with Android emulator is the remaining step).
- GPU-accelerated VFX (Skia bloom / shader passes on tile clears) — premium polish, post-launch.
- Hand-authored puzzle overrides for levels 80–150 — `chapterOverrideJson` RC path exists; current generation is procedural-deterministic.

### Top-tier F2P parity (April 2026 — shipped work)
The big monetization + social + feel-polish push landed across 13 branches. All 4 workstreams shipped except audio commissioning (D5 — blocked on external audio delivery) and the items now tracked in `agent_docs/launch_blockers.md`.

- **Piggy Bank** — `src/components/PiggyBankCard.tsx` + `piggy_bank_break` SKU; fill on puzzle complete (capped); home compact variant when ready; 4 Remote Config knobs.
- **Season Pass** — `src/screens/SeasonPassScreen.tsx` + `SeasonPassHomeCard`, 50-tier ladder, free+premium lanes, `season_pass_premium` SKU; season rotation in `src/services/seasonRotation.ts`. **Tier-50 claim still uses the generic `feature_unlock` ceremony** — dedicated ceremony is a `launch_blockers.md` item.
- **30-day login calendar** — `loginCalendar.ts` extended with 7/14/21/30-day milestones; `loginCalendarVariant` RC for A/B.
- **VIP cosmetic track** — 6 VIP streak tiers with `extraReward` (badge → title → frames → trophy + emote pack). **Legendary frame animation is still static color — animated glow is a `launch_blockers.md` item.**
- **Price anchoring** — `originalPrice` + `originalPriceAmount` on 46 products; strikethrough + % off rendered uniformly. IAP shop prefers `storeProduct.price` from the native receipt (currency-localized) over USD fallback.
- **Referral rewards** — `onReferralSuccess` Cloud Function + `ReferralPendingRewards` UI; reward grants on referred user's first puzzle complete with 50/day rate limit and double-claim guard. Native share is wired; **only `wordfall://` scheme is emitted today** — https universal link generation is a `launch_blockers.md` item (App Links `autoVerify` is already configured in `app.json`).
- **Shared club goals** — `mode: 'shared'` in `CLUB_GOAL_TEMPLATES`; collective progress in `clubs/{clubId}/sharedGoals/{goalId}`; rotator mixes personal + shared weekly.
- **Friend-tier leaderboard** — `FriendLeaderboardCard` on home, `searchUsersByDisplayName` + `createFriendRequest` + `respondToFriendRequest` wired; **add-friend UI lives inside `LeaderboardScreen.tsx:276–294` with code/name mode toggle** (no standalone `AddFriendScreen` — earlier notes saying otherwise are stale).
- **Booster combo synergies** — EAGLE EYE (Wildcard+Spotlight) / LUCKY ROLL (Wildcard+Shuffle) / POWER SURGE (Spotlight+Shuffle); 2× score multiplier, 3-puzzle duration; `BoosterComboBanner` rendered at `GameScreen.tsx:1852–1854` + combo haptic.
- **Invalid-word screen shake** — 6-frame ±8px sequence at `GameScreen.tsx:1082–1112` in `showInvalidFlashAnim`; `invalidShakeEnabled` RC + reduce-motion honored.
- **Multi-tile bloom particles** — `spawnTileBloom` dispatched at `GameScreen.tsx:1377, 1379, 1415` on word-found; per-tile stagger 30ms; cap 24 particles via `clearParticleQueue`.
- **Spring gravity landing** — `Animated.spring(anim, { tension: 180, friction: 9 })` with per-column stagger at `GameScreen.tsx:1258–1265`; friction dropped from 12 → 9 for subtle landing bounce overshoot.
- **Animation migration** — `LetterCell` + `BoardGenBanner` on Reanimated `useSharedValue` + `withSpring`/`withSequence`.
- **Hard-energy (Phase 4B)** — `src/hooks/useHardEnergy.ts` composes `EconomyContext` lives + `getRemoteBoolean('hardEnergyEnabled')` into `{ canPlay, livesRemaining, nextLifeAtMs, startLevel(), refillWithGems(), creditAdLife() }`. `App.tsx` `GameScreenWrapper` debits a life on level load (keyed on `route.key + mode + level`). `NoLivesModal` mounts when `canPlay=false`. Rewarded-ad `life_reward` capped at 3/day. **Remote Config flag defaults OFF.**
- **D5 Audio wire-up** — NOT SHIPPED; waits on real audio delivery per `agent_docs/audio_brief.md`.

### Completed v1.1 hardening (April 2026)
- AsyncStorage receipts migrated to `expo-secure-store` (via `src/services/secureStorage.ts` with AsyncStorage fallback + auto-migration on first read)
- `functions/` + `cloud-functions/` consolidated into single `functions/` codebase (`functions/src/index.ts` re-exports `./social`)
- Per-UID Firestore rate-limit counter at `rateLimits/{uid}_{endpoint}_{windowStart}` (fail-open on transaction error), wired into `validateReceipt` / `clubGoalProgress` / `requestAccountDeletion` / `sendPushNotification`
- Inline board-gen timeout banner (replaces Alert) at `src/components/BoardGenTimeoutBanner.tsx`
- PlayerContext + EconomyContext use single-slot latest-write-wins persist queue (`src/utils/persistQueue.ts`)
- `iap.ts` rejects (instead of resolves) on purchase failures so callers can react
- Remaining `console.log` sweep — replaced with `src/utils/logger`
- `useSyncExternalStore` selectors with cached snapshot for sync status (`src/services/syncStatus.ts`)
- Retry helper (`src/services/retry.ts` with jittered backoff + permanent-error short-circuit) + `NotSyncedBanner` indicator

### Working-style reminders for Claude
- **Small chunks**: never edit > ~150 lines per Edit / write > ~400 lines per Write — long edits time out
- **Commit at logical boundaries**, push to `claude/<slug>` only (never `main`)
- **Reuse, don't reinvent**: many "missing" features are wired — search before writing
- **Verify on device**: tests prove correctness, not fun
