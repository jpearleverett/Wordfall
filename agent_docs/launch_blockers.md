# Wordfall — Launch Blockers & Path to 9/10

> **Source of truth** for what's actually missing on the path from a solid
> soft-launch candidate (verified ~7/10 as of April 2026) to a top-grossing
> competitor against Wordscapes / Royal Match (9/10).
>
> This replaces the old `pre_launch_audit.md` / `launch_runbook.md` /
> `soft_launch_plan.md` references in earlier docs.
>
> Every item below was **grep-verified against the working tree** during the
> April 2026 deep audit. Do not re-list items that are already wired — search
> first.
>
> **Status (2026-04-22):** All Tier 1–4 code gaps are **SHIPPED** on
> branch `claude/assess-wordfall-launch-readiness-VzyDY`. Remaining work
> is Tier 5 only (user-side / content). See the per-item status lines
> below for the commit and verify the change on device before marking
> the punch list closed.

---

## How to read this doc

- **Tier 1** = retention pipeline. Moves the score the most. F2P games live
  or die here. Every item is a connect-existing-infrastructure fix, not
  greenfield.
- **Tier 2** = monetization shelf. Direct ARPDAU lift.
- **Tier 3** = social discovery + ceremony polish. D7/D30 social retention.
- **Tier 4** = feel polish. Clean wins, 1–2 days each.
- **Tier 5** = user-side / content / non-code. Not written by engineers.

Each item shows the **exact file:line** where to make the change plus the
existing hook it plugs into.

---

## Tier 1 — Retention pipeline (the #1 launch risk)

These are the fixes that separate a top-200 grossing title from a top-50.
All plug into existing infrastructure that's already been written — we just
never connected the wires.

### R1. Wire `getPersonalizedNotifications()` into the scheduler

- **File to edit:** `src/services/notifications.ts` (specifically the
  `schedule()` method around line 276–300 where the frequency cap is
  enforced).
- **Existing hook:** `src/services/playerSegmentation.ts:445` already
  exports `getPersonalizedNotifications(segments)` returning per-segment
  `enabledCategories`, `streakReminderHour`, `dailyChallengeHour`,
  `comebackDelayDays`, `maxPerDay`. Hardcore players get `maxPerDay: 1`,
  at-risk gets 3 (reminder at 19h), lapsed gets 2 (comeback-focused).
- **Work:** Replace the hardcoded `MAX_NOTIFICATIONS_PER_DAY = 3` check
  at `notifications.ts:147` with the segment-derived value. Use the
  segment's reminder hours instead of the constants.
- **Status:** ✅ SHIPPED. `setNotificationSegments()` is called from
  `App.tsx` whenever segments recompute; `schedule()` reads
  `isCategoryAllowedForSegment()` and `resolveMaxPerDay()` which drive
  off the segment config. Commit: `Tier 1 retention wave: R1 + R5 + R6 + R7`.

### R2. Per-timezone streak reminders

- **File to edit:** `functions/src/social.ts:504–554`
  (`processStreakReminders`).
- **Current state:** hardcoded `.schedule('0 20 * * *').timeZone('UTC')` —
  every user gets the 8 PM UTC push, which is 3 AM in Tokyo.
- **Work:** write `user.tzOffsetMinutes` at session start (Expo
  `Localization.getCalendars()` returns it). Change the scheduler to run
  hourly and bucket users by their 8 PM local hour.
- **Status:** ✅ SHIPPED. `processStreakReminders` now runs hourly and
  per-user filters by `localHourForUser(tzOffsetMinutes, nowMs) === 20`.
  `syncPlayerProfile` writes `tzOffsetMinutes` to the user doc on every
  profile sync. Commit: `Tier 1 retention wave: R2 + R3 + R4`.

### R3. Day-2 re-engagement Cloud Function

- **New file:** add `processDay2Reengagement` to `functions/src/social.ts`
  (mirror the `processStreakReminders` pattern — 100-batch, 9-minute
  budget, per-UID push via `sendPushNotification`).
- **Target:** users whose `lastOpenDate` is exactly 2 days ago and who
  haven't made a first purchase. Push "Come back, 2× coins waiting" and
  set a server flag that surfaces an in-app 50% off starter on their next
  open (the `dynamicPricing.ts:103–250` engine already returns
  cohort-appropriate offers — this just needs a trigger).
- **Status:** ✅ SHIPPED. `processDay2Reengagement` Cloud Function in
  `functions/src/social.ts` runs hourly, targets users whose
  `lastActiveDate === today-2` AND no purchase history, pushes at local
  19:00 via the shared `runReengagementPass()` helper.

### R4. Day-7 re-engagement Cloud Function

- **New file:** add `processDay7Reengagement` next to R3.
- **Target:** `lastOpenDate == today - 7`. Push "We miss you — your spot
  is saved" and surface the **already-wired** "WELCOME BACK" 70% off
  starter from `dynamicPricing.ts:110–128` (engagement === 'lapsed'
  branch). The offer exists; just needs the push trigger.
- **Status:** ✅ SHIPPED. `processDay7Reengagement` Cloud Function
  mirrors the Day-2 function, targeting `lastActiveDate === today-7`.

### R5. Restorative streak save modal

- **Current state:** the **preventive** streak shield is fully wired —
  `streak_freeze` SKU + in-game `streak_shield` contextual offer (30
  gems) auto-consumes within a 72h window at
  `PlayerProgressContext.tsx:227–250`. That's the Duolingo model.
- **Missing:** the Candy Crush complement — "Restore your 14-day streak:
  50 gems" modal shown when `dailyStreak` just broke in the last 24h.
- **Work:** new `PostStreakBreakOffer` component; one reducer action
  `restoreStreak()` that reverts `streakBrokenAt` and restores the prior
  streak count. Hook into the ceremony queue so it shows on next app
  open if the break is fresh.
- **Status:** ✅ SHIPPED. `PlayerProgressContext` tracks
  `streaks.recentBreak = { prevStreak, brokenAtMs }` on any full break
  (prevStreak >= 3). New methods `restoreBrokenStreak()` and
  `dismissStreakBreak()` are re-exported through `PlayerContext`. The
  `PostStreakBreakOffer` modal in `src/components/PostStreakBreakOffer.tsx`
  costs 50 gems (`RESTORE_GEM_COST`), is mounted inside `HomeMainScreen`,
  and logs `streak_restored` / `streak_restore_dismissed` analytics
  events.

### R6. Render `segmentWelcomeMessage` on HomeScreen

- **Current state:** computed in `App.tsx:1207` via
  `getWelcomeBackMessage(player.segments)`; passed to HomeScreen as a
  prop; destructured at `HomeScreen.tsx:152`; **never rendered in JSX**.
- **Work:** add a header banner in HomeScreen's top section that renders
  `{segmentWelcomeMessage.title}` + `{segmentWelcomeMessage.subtitle}`
  when non-null. ~20 lines.
- **Status:** ✅ SHIPPED. `segmentWelcomeMessage` is now rendered as a
  `welcomeBackBanner` bento-panel above the milestone banner in
  `HomeScreen.tsx:536-547`.

### R7. Make `MAX_NOTIFICATIONS_PER_DAY` Remote-Config overridable

- **File to edit:** `src/services/notifications.ts:147`.
- **Current:** `const MAX_NOTIFICATIONS_PER_DAY = 3` — hardcoded.
- **Work:** read from `getRemoteNumber('maxNotificationsPerDay')` with
  3 as the default. Add the key to `RemoteConfigValues` in
  `src/services/remoteConfig.ts`. Combine with R1 so the segment-derived
  cap wins when present.
- **Status:** ✅ SHIPPED. `resolveMaxPerDay()` picks segment cap >
  `getRemoteNumber('maxNotificationsPerDay')` > `DEFAULT_MAX_NOTIFICATIONS_PER_DAY`
  (3). New RC key `maxNotificationsPerDay` added to `RemoteConfigValues`
  and `REMOTE_CONFIG_DEFAULTS`. Ops can flip to 4–5 without a rebuild.

---

## Tier 2 — Monetization lift (ARPDAU & first-purchase conversion)

### M1. Raise `first_purchase_special` rewards

- **File to edit:** `src/data/shopProducts.ts:68–85`.
- **Current:** `{ coins: 200, gems: 25, hintTokens: 5 }` at $0.49 (dynamic
  pricing gives it a 75% "WELCOME GIFT" boost for non-payers at
  level 5–15 via `dynamicPricing.ts:153–163`).
- **Target:** `{ coins: 500, gems: 50, hintTokens: 10 }`. Same $0.49
  price. Industry-standard first-purchase velocity lift: +15–25%.
- **Status:** ✅ SHIPPED. `shopProducts.ts:68-85` now grants 500 coins +
  50 gems + 10 hints at the same $0.49 price.

### M2. Add 3 per-booster SKUs + combo pack

- **File to edit:** `src/data/shopProducts.ts` (add near the existing
  `booster_crate` at line 408).
- **Current:** only `booster_crate` (5 of each booster, $4.99). All
  other "booster" appearances in the catalog are bundle-inclusions, not
  dedicated per-booster SKUs.
- **New SKUs:**
  - `wildcard_pack_5` @ $1.99
  - `spotlight_pack_5` @ $1.99
  - `shuffle_pack_5` @ $1.99
  - (`booster_crate` stays as the $4.99 trio)
- **User-side:** register the 3 new SKUs in Play Console.
- **Status:** ✅ SHIPPED (code). All 3 SKUs added to `shopProducts.ts`
  and `IAPProductId` union. **User-side blocker:** `wordfall_wildcard_pack_5`,
  `wordfall_spotlight_pack_5`, `wordfall_shuffle_pack_5` still need to
  be registered in Play Console before the SKUs can be purchased.

### M3. Evaluate `targetSegments` in A/B assignment

- **File to edit:** `src/services/experiments.ts` — the
  `getAssignedVariant()` function (lines 293–336).
- **Current:** `targetSegments?: string[]` is declared at line 41 and
  **set** on the `first_purchase_offer` experiment at line 148
  (`targetSegments: ['non_payer']`), but `getAssignedVariant()` never
  checks it. All experiments are assigned hash-deterministically
  regardless of segment membership.
- **Work:** before assigning a variant, if `experiment.targetSegments`
  is set, check whether any of the player's segments (spending,
  engagement, skill, motivation) match. If none match, return
  `null` (not assigned). ~10 lines.
- **Status:** ✅ SHIPPED. `getAssignedVariant()` now accepts
  `segmentsForTargeting: readonly string[]` and returns the control
  variant when `targetSegments` is set and doesn't intersect.
  `useExperiment()` flattens `player.segments` and passes them
  automatically. Commit: `Tier 2 monetization wave: M1 + M2 + M3`.

---

## Tier 3 — Social discovery + metagame ceremony

### S1. Club Browser screen

- **Current state:** `src/screens/ClubScreen.tsx:339–370` renders a
  `renderNoClub()` view with only a "enter club code to join" input.
  There is no `listClubs` / `searchClubs` / `browseClubs` API anywhere
  in `src/services/firestore.ts` (which already has `createClub`,
  `getClub`, `getClubMessages`).
- **Work:** add a `listPublicClubs({ minTrophies, maxTrophies, language })`
  query to `firestore.ts`. The `clubs/` Firestore collection already
  has the fields — just missing the reader. Build a `ClubBrowserScreen`
  with filter chips + list + "Join" CTA that calls the existing
  `joinClub(clubId)` path.
- **Status:** ✅ SHIPPED. `firestoreService.listPublicClubs({ maxMembers?,
  minWeeklyScore?, limit })` added (ordered by `weeklyScore` desc). The
  existing `ClubScreen.renderNoClub()` now includes a "Browse clubs"
  section with Refresh button, displaying each club's name / description /
  member count / weekly score + a JOIN CTA that reuses the existing
  `onJoinClub(id)` handler.

### S2. HTTPS universal referral links

- **File to edit:** `src/utils/deepLinking.ts:107–109`
  (`buildReferralLink`).
- **Current:** outputs `wordfall://referral/{code}` only. The parser
  handles both `wordfall://` and `https://wordfallgame.app` URLs (and
  Android App Links `autoVerify: true` for `https://wordfallgame.app`
  is already configured in `app.json:97–111`), but the builder that
  generates share text only emits the custom scheme — so a friend
  tapping a referral link in a chat app won't land on the Play Store
  with the code preserved.
- **Work:** change `buildReferralLink()` to return
  `https://wordfallgame.app/r/{code}`. Update the Cloudflare Pages site
  (`wordfallgamesite/`) to bounce `/r/:code` either to the app (via App
  Link) or to the Play Store with the code stored in a deferred
  deep-link cookie.
- **Status:** ✅ SHIPPED. `buildReferralLink()` now returns
  `https://wordfallgame.app/r/{code}`. The parser in `parseDeepLink()`
  handles the short `/r/{code}` path as well as the legacy
  `wordfall://referral/{code}`. The custom-scheme builder is still
  available as `buildReferralSchemeLink()` for callers that need it.

### MG1. Tier-50 Season Pass cinematic ceremony

- **File to edit:** `src/App/CeremonyRouter.tsx` (20 render cases today;
  add a new one).
- **Current state:** tier-50 claims of the Season Pass grant rewards
  through `EconomyContext.claimSeasonPassTier()` but use the generic
  `feature_unlock` ceremony. No bespoke cinematic.
- **Work:** add a new `season_pass_complete` type to the
  `CeremonyItem.type` union in `src/types.ts:729`; queue it from
  `claimSeasonPassTier()` when `tier.tier === 50`; build a
  `SeasonPassCompleteCeremony` component modeled on
  `PrestigeResetCeremony` (full-screen, sparkle field, legendary set
  reveal).
- **Status:** ✅ SHIPPED. New `CeremonyItem.type` variant
  `'season_pass_complete'`; new `SeasonPassCompleteCeremony` component
  modeled on `PrestigeResetCeremony`; routed through `CeremonyRouter`
  alongside the existing 20 cases. `SeasonPassScreen.handleClaim()`
  queues the ceremony when `tier === MAX_SEASON_TIER`.

### MG2. Event leaderboard UI

- **File to edit:** `src/screens/EventScreen.tsx`.
- **Current state:** shows event icon, countdown, progress bar, tier
  rewards, and multipliers — but zero player ranking display. The
  `LeaderboardScreen` / `WeeklyLeaderboardScreen` components already
  exist; `firestoreService.submitDailyScore` is already wired. The
  infrastructure is there; the event scope isn't.
- **Work:** add an `EventLeaderboardCard` that queries
  `events/{eventId}/scores` (new collection, same shape as
  `dailyScores`). Mount it inside EventScreen between the progress bar
  and the tier rewards. Add 1 Firestore index.
- **Status:** ✅ SHIPPED. New `submitEventScore` + `getEventLeaderboard`
  in `firestore.ts`; new `EventLeaderboardCard` in
  `src/components/events/`; mounted per active event inside EventScreen;
  `useRewardWiring.handleComplete()` submits each puzzle score to every
  active event's scope via `eventManager.getActiveEvents()`. Firestore
  rules extended with `events/{eventId}/scores/{userId}` match block.

### MG3. Animated legendary frame glow

- **File to edit:** `src/screens/ProfileScreen.tsx:198–208`.
- **Current state:** `frameBorderColor` switch picks a static color per
  rarity (`COLORS.rarityLegendary` for legendary). Applied as a flat
  `borderColor`. No animation.
- **Work:** when `equippedFrame.rarity === 'legendary'`, wrap the
  avatar with an Animated.View driven by `useSharedValue` +
  `withRepeat(withSequence(...))` that pulses opacity 0.6 → 1.0 and
  scale 1.0 → 1.04 over ~1400ms. Respect `useReduceMotion()`.
- **Status:** ✅ SHIPPED. `ProfileScreen.tsx` wraps the avatar in an
  `Animated.View` driven by `glowPulse` shared value running a
  `withRepeat(withSequence(withTiming 700ms, withTiming 700ms), -1)`
  cycle. Scale 1.00 ↔ 1.04 and shadow opacity 0.6 ↔ 1.0. Static when
  `useReduceMotion()` is true or rarity !== legendary.

---

## Tier 4 — Feel polish (clean wins, 1–2 days)

### C1. Fire `gravityLandHaptic` on spring complete

- **File to edit:** `src/screens/GameScreen.tsx:1258–1265` (the
  `Animated.spring(...).start()` block for gravity fall).
- **Current state:** `gravityLandHaptic()` is defined at
  `src/services/haptics.ts:51` and only called from tests. Production
  never fires it.
- **Work:** in the `Animated.parallel(animations).start(() => { ... })`
  callback (already exists for `setFallActive(false)`), call
  `gravityLandHaptic()`. Respect the existing `hapticsEnabled` setting
  and `reduceMotion` flag. One line.
- **Status:** ✅ SHIPPED. Now called in the
  `Animated.parallel(animations).start()` callback at
  `GameScreen.tsx:1272`. Respects global `hapticsEnabled` setting
  enforced inside the haptics service.

### C2. Time Pressure 30s / 10s warnings

- **File to edit:** `src/components/TimerDisplay.tsx` (plus trigger site
  in `GameScreen.tsx`).
- **Current state:** `sound.ts:71–72` reserves `timerWarning30s` and
  `timerWarning10s` SFX slots that are never triggered. Timer display
  only has a generic red color change under 25% remaining. No haptic,
  no pulse, no sting at the 30s / 10s crossings.
- **Work:** add a `useEffect` that fires a visual pulse + haptic (and
  SFX slot, which stays silent on synth until real audio ships) when
  `remainingSeconds` crosses 30 and 10.
- **Status:** ✅ SHIPPED. `TimerDisplay` uses `warned30sRef` /
  `warned10sRef` one-shot guards; both reset when `totalSeconds`
  changes (new puzzle). Each crossing fires `errorHaptic()` +
  `soundManager.playSound('timerWarningNNs')` (silent on synth, live
  on real audio delivery) + a coral flash overlay driven by
  `flashAnim` withSequence 0→1 (120ms) → 0 (500ms).

### P1. Onboarding economy / social education

- **File to edit:** `src/screens/OnboardingScreen.tsx` (currently 578
  lines of pure "trace a word" tutorial).
- **Current state:** welcome → tutorial board A/B/C → celebrate. No
  teaching of coins vs. gems vs. hints; no mention of clubs, friends,
  or the referral system; no first-purchase education. The `first_win`
  ceremony covers some of this but after the tutorial ends.
- **Work:** add one post-celebrate slide that introduces the three
  currencies + their acquisition paths, and a CTA to "Join a Club
  for free rewards" that routes to the Club Browser (see S1). Keep it
  under 10 seconds of screen time.
- **Status:** ✅ SHIPPED. New `economy_primer` phase between `celebrate`
  and onComplete. Renders 3 icon+copy rows (coins / gems / clubs) with
  a single "GOT IT" CTA. Deliberately <10s of screen time.

### P2. Custom nav transitions

- **File to edit:** `src/navigation/MainNavigator.tsx:28–32`.
- **Current state:** `screenOptions` sets only `headerShown: false`,
  `cardStyle`, and `freezeOnBlur`. Stack defaults are used for
  transitions.
- **Work:** add a `cardStyleInterpolator` that uses a spring for Home
  ↔ Game and slide-from-right for Profile. Respect `useReduceMotion`.
  ~30 lines.
- **Status:** ✅ SHIPPED. New `cardSpringFadeInterpolator` in
  `MainNavigator.tsx` plus open/close `TransitionSpec` (spring stiffness
  180 damping 22 for push, 220ms cubic-out for pop). React Navigation
  honors OS reduce-motion automatically.

---

## Tier 5 — User-side + content (not code)

### U1. `assetlinks.json` SHA256 fingerprint

- **File:** `wordfallgamesite/.well-known/assetlinks.json:8`.
- **Current:** `"REPLACE_WITH_YOUR_PLAY_APP_SIGNING_SHA256"` placeholder.
- **Work:** paste the fingerprint from Play Console → Setup → App
  Signing. Redeploy the Cloudflare Pages site.

### U2. Translate 5 non-EN locales

- **Files:** `src/locales/{de,es-419,fr,ja,pt-BR}.json`.
- **Current:** all 6 locale files are at structural parity (325 keys,
  346 lines) but the non-EN files are English placeholder strings.
  i18n plumbing is fully wired; only the translations are missing.
- **Work:** commission translations (325 keys × 5 locales). EN-only is
  fine for PH/CA soft launch. Do this before WW.

### U3. Hand-authored puzzle overrides for levels 80–150

- **Current:** all puzzles are procedural-deterministic via
  `boardGenerator.ts` + `puzzleGenerator.ts` (seed = `level * 1337`).
  The `chapterOverrideJson` Remote Config path exists for publishing
  overrides without a rebuild.
- **Work:** design 70 hand-curated puzzles for the difficulty plateau
  between level 80 and 150. Publish via Remote Config. Can be deferred
  to v1.1 post-launch.

### U4. Play Console / Firebase / AdMob chores

(These have always been outside the code; they stay here for
completeness.)

- Register `wordfall_*` IAP SKUs in Play Console (catalog:
  `src/data/shopProducts.ts`).
- Grant Firebase default service account
  (`<project>@appspot.gserviceaccount.com`) the **Android Publisher**
  role so `validateReceipt` can call Google's API.
- Upload FCM server key to Firebase → Cloud Messaging (for remote push).
- Set `EXPO_PUBLIC_SENTRY_DSN` as an EAS secret + `.env`.
- Confirm `EXPO_PUBLIC_ADMOB_REWARDED_ID*` / `..._INTERSTITIAL_ID*` are
  in EAS secrets so production AABs don't fall through to the dev-only
  Google test unit fallback in `src/constants.ts`.
- Author UMP consent message inside AdMob → Privacy & messaging → GDPR.
- Run `firebase deploy --only firestore:rules,firestore:indexes,functions`.
- Fill Play Console Data Safety form (draft in `agent_docs/data_safety.md`).
- Upload store listing assets (icon, feature graphic, screenshots —
  copy in `agent_docs/store_listing.md`).
- Commission real audio per `agent_docs/audio_brief.md` (synth fallback
  already fully wired at 72 SFX + 10 BGM slots — drop in progressively).
- **Google Sign-In activation:** `npm install --legacy-peer-deps
  @react-native-google-signin/google-signin`; create OAuth 2.0 Web
  Client ID in Google Cloud; enable Google provider in Firebase Auth;
  add SHA-1 fingerprint; rebuild dev-client APK. Code is already landed
  in `src/services/googleAuth.ts` with credential-already-in-use
  recovery fallback.

---

## Shipped status (2026-04-22)

All 18 Tier 1–4 code gaps landed on branch
`claude/assess-wordfall-launch-readiness-VzyDY`:

| Tier | Items | Status |
|------|-------|--------|
| Tier 1 (retention) | R1 R2 R3 R4 R5 R6 R7 | ✅ all shipped |
| Tier 2 (monetization) | M1 M2 M3 | ✅ all shipped |
| Tier 3 (social + ceremony) | S1 S2 MG1 MG2 MG3 | ✅ all shipped |
| Tier 4 (feel polish) | C1 C2 P1 P2 | ✅ all shipped |
| Tier 5 (user-side / content) | U1 U2 U3 U4 | ⏳ outside engineering |

**Verify before merge:** install the dev-client APK, smoke-test the
retention pipeline (streak break + restore), the club browser, the
tier-50 season pass ceremony, and the event leaderboard. Typechecking
is unaffected (no new TS errors introduced). Run `npm test` to confirm
the full suite still passes.

## What this list deliberately leaves out

- Features that are **already wired** and that earlier docs said weren't.
  See the "corrections" section below so no one re-builds these.
- Skia / GPU bloom VFX — premium polish, v1.1.
- iOS lane — deliberately deferred per CLAUDE.md.

## Corrections from earlier audit passes (already wired, don't rebuild)

The April 2026 ship-readiness audit had false-positive gaps. These are
**all verified wired** in the current tree:

- Spring gravity landing with per-column stagger
  (`GameScreen.tsx:1258–1265`, tension 180 / friction 9).
- Invalid-word 6-frame ±8px screen shake
  (`GameScreen.tsx:1082–1112`, RC-gated + reduce-motion safe).
- Multi-tile bloom particles on word-found (`GameScreen.tsx:1377, 1379,
  1415`; `spawnTileBloom` with 30ms stagger, 24-particle cap).
- Booster combo synergies — Eagle Eye / Lucky Roll / Power Surge with
  2× multiplier + `BoosterComboBanner` at `GameScreen.tsx:1852–1854`.
- Prestige reset — `performPrestige()` at
  `PlayerContext.tsx:1603–1670`: resets level + stars + mode levels,
  accumulates permanent bonuses, unlocks cosmetic, queues
  `PrestigeResetCeremony`.
- Cohort-segmented offers + winback (`dynamicPricing.ts:103–250`).
- Preventive streak shield (`streak_freeze` SKU + `streak_shield`
  offer, 72h window, `PlayerProgressContext.tsx:227–250`).
- Friend search by display name —
  `LeaderboardScreen.tsx:276–294` with code/name mode toggle.
- Colorblind palette — `useColors.ts:20–26` +
  `LetterCell.tsx:119, 184–194`.
- Firebase Analytics forwarding — native
  `@react-native-firebase/analytics` + web `firebase/analytics` +
  Firestore `analytics_events` batch mirror (60s flush).
- Expo-managed splash screen at `app.json:20–24` pointing to
  `./assets/splash.png`.
- Adaptive difficulty — `getAdjustedConfig()` wired at 4 call sites in
  `App.tsx` (178, 490, 632, 1324); RC-gated with default ON.
- Cosmetic frame rendering on `ProfileScreen.tsx:155–200` (static
  rarity-colored border; only the animated glow for legendary is the
  remaining gap, see MG3).
- IAP price localization — `iap.ts:463–480` prefers native
  `storeProduct.price` over USD fallback.
- First-purchase modal — RC-gated at levels
  `firstPurchaseModalMinLevel..MaxLevel` (default 5–6), shown once,
  disabled by prior purchase (`useRewardWiring.ts:604–620`).
- Max 100 friends via `maxFriendsPerUser` Remote Config key.
- Account deletion comprehensive — users + subcollections + clubs +
  messages + consent + push tokens; receipts anonymized with SHA-256
  hash for audit (`functions/src/index.ts:888–1021`).
- Firestore rules strict with score bounds and ownership checks
  (`firestore.rules`, 195 lines).
- Android App Links `autoVerify: true` configured for
  `https://wordfallgame.app` in `app.json:97–111`.
- FCM push token registration — written to
  `users/{uid}/pushToken/current` on init.

---

## Changelog

- **2026-04-22:** Document created from the deep ship-readiness audit.
  Replaces stale refs to `pre_launch_audit.md` / `launch_runbook.md` /
  `soft_launch_plan.md` (files never existed in the current tree;
  `setup.md` was deleted earlier in April).

