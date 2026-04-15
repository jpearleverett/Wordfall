# Wordfall Data Safety Declarations

**Purpose:** Source of truth for the Google Play Data Safety form and the Apple App Privacy Nutrition Labels. Update this doc when code changes what we collect; paste from here into the consoles.

**Last verified:** 2026-04-15 (Expo SDK 55, commit at `claude/store-listing-prep` HEAD).

---

## Summary — what Wordfall collects at a glance

| Data point | Collected? | Linked to identity? | Purpose | Notes |
|---|---|---|---|---|
| Firebase anonymous UID | Yes | Yes (pseudonymous) | Cross-device sync, leaderboards | Not tied to email/phone |
| Display name (self-chosen) | Optional | Yes | Leaderboards, club chat | User-provided only |
| Email | No | — | — | No email login flow |
| Phone number | No | — | — | — |
| Gameplay / analytics events | Yes | Yes | Game balance, funnel analysis | 35+ event types |
| Purchase history (receipts) | Yes | Yes | Entitlement validation, fraud prevention | Card info handled by Apple/Google |
| Crash diagnostics (Sentry) | Yes | Yes (UID attached) | Crash fixing | Stack traces + breadcrumbs |
| Advertising ID (AAID/IDFA) | **Android: yes; iOS: pending ATT** | Yes | AdMob personalization | iOS ATT prompt is a TASK 6 item |
| Push token (Expo/FCM) | Yes | Yes | Retention notifications | User-grantable permission |
| Device model / OS version | Yes | Yes | Crash grouping, analytics cohort | Non-sensitive diagnostics |
| Approximate location | No | — | — | No location API used |
| Precise location | No | — | — | No location API used |
| Contacts | No | — | — | — |
| Photos / camera | No | — | — | — |
| Microphone | No | — | — | `RECORD_AUDIO` Android permission is for playback system, not recording |
| Files/storage | No | — | — | AsyncStorage is sandboxed, not "files" |
| Web browsing history | No | — | — | — |
| Financial info (beyond receipts) | No | — | — | Payments happen inside Apple/Google |

---

## Google Play Data Safety form

Paste answers into Play Console → App content → Data safety. Questions follow Google's form order as of April 2026.

### 1. Data collection and security

- **Is all of the user data collected by your app encrypted in transit?** **Yes.**
  - All Firebase SDKs use HTTPS; Sentry uses HTTPS; AdMob uses HTTPS; Apple/Google Play receipt validation uses HTTPS.
- **Do you provide a way for users to request that their data be deleted?** **Yes.**
  - Anonymous UID + associated Firestore docs are deleted on request via the contact email in the privacy policy.
  - Local AsyncStorage is cleared by uninstalling the app.
  - Note: this is a manual process today — there is no in-app "delete my data" button. Flag as post-launch work (privacy-policy-driven SLA: we commit to 30-day turnaround).

### 2. Data types

Play groups data into categories. For each, report: **collected**, **shared**, **required/optional**, **purposes**.

#### Personal info

| Data type | Collected | Shared | Required/Optional | Purposes |
|---|---|---|---|---|
| Name (display name) | Yes | No | Optional | App functionality (leaderboards, club chat) |
| Email address | No | — | — | — |
| User IDs (Firebase UID) | Yes | No | Required | App functionality, analytics |
| Address / phone / race / political views / sexual orientation / etc | No | — | — | — |

#### Financial info

| Data type | Collected | Shared | Required/Optional | Purposes |
|---|---|---|---|---|
| User payment info | No | — | — | Handled by Google Play Billing; we never see card details |
| Purchase history | Yes | No | Optional | App functionality (entitlement, restore purchases), fraud prevention |
| Credit score / other financial info | No | — | — | — |

#### Location

All **No.** No location API used.

#### Web browsing

All **No.**

#### App activity

| Data type | Collected | Shared | Required/Optional | Purposes |
|---|---|---|---|---|
| App interactions | Yes | No | Required | Analytics (35+ event types via Firebase Analytics), app functionality |
| In-app search history | No | — | — | — |
| Installed apps | No | — | — | — |
| Other user-generated content (club chat messages) | Yes | No | Optional | App functionality (social feature) — profanity-filtered before storage |
| Other actions | Yes | No | Optional | A/B testing (`experiment_assigned` event) |

#### App info and performance

| Data type | Collected | Shared | Required/Optional | Purposes |
|---|---|---|---|---|
| Crash logs | Yes | Yes (Sentry) | Required | Diagnostics (with user UID attached for correlation) |
| Diagnostics | Yes | No | Required | Analytics |
| Other app performance data | Yes | No | Required | Analytics |

#### Device or other IDs

| Data type | Collected | Shared | Required/Optional | Purposes |
|---|---|---|---|---|
| Device or other IDs (AAID) | Yes | Yes (Google AdMob) | Optional | Advertising (personalized ads). User can reset/opt out via device settings. |
| Push notification token | Yes | No | Optional | App functionality (retention notifications) |

### 3. Data sharing

"Shared" here means sent off-device to third parties we don't control. For Wordfall:

- **Google (Firebase)** — UID, display name, game activity, crash logs, push tokens. This is processing, not third-party sharing, under Google's terms, BUT Play's form asks you to declare it regardless. Treat Firebase-sent data as "collected but not shared" because it's under our account.
- **Sentry** — crash logs + user UID + breadcrumbs. Declare as shared (processor).
- **Google AdMob** — AAID + impression events. Declare as shared (advertising).
- **Apple/Google Play Billing** — receipts only. Declare as not collected for the purposes of the form (we never see the user's financial details).

### 4. Security practices

- **Is data encrypted in transit?** Yes.
- **Do you commit to the Google Play Families Policy?** **No.** Target audience is 13+ (see age-rating §F below). The Mystery Wheel probability-based reward mechanic means we self-rate as teen+ and would not pass the Families-friendly bar.
- **Independent security review?** Not at v1.0. Consider adding a SOC 2 Type I at scale.

---

## Apple App Privacy Nutrition Labels

Paste into App Store Connect → App Information → App Privacy. Apple's categories differ slightly from Play's.

### Data Linked to You

- **Identifiers** — User ID (Firebase UID). Purposes: App Functionality, Analytics, Developer's Advertising.
- **Usage Data** — Product Interaction. Purposes: Analytics, Developer's Advertising.
- **Diagnostics** — Crash Data, Performance Data. Purposes: App Functionality, Analytics.
- **Purchases** — Purchase History. Purpose: App Functionality.
- **User Content** — Other User Content (club chat messages). Purpose: App Functionality.

### Data Used to Track You

(Only applies if we show personalized ads on iOS after the ATT prompt is added in TASK 6.)

- **Identifiers** — Device ID (IDFA). Purpose: Developer's Advertising.
- **Usage Data** — Product Interaction. Purpose: Developer's Advertising.

If TASK 6 ships before iOS launch: this section gets populated. If user declines ATT at runtime, AdMob falls back to non-personalized ads and no tracking occurs for that user.

### Data Not Collected

- Contact Info (email, phone, address, other)
- Health & Fitness
- Financial Info (we never see card data; only purchase history is collected, under Purchases above)
- Location (both Coarse and Precise)
- Sensitive Info
- Contacts
- Browsing History
- Search History
- Audio Data (despite `RECORD_AUDIO` Android permission — that's for playback routing, not recording)

---

## Per-SDK data access summary

| SDK | Data accessed | Destination | Privacy policy |
|---|---|---|---|
| `firebase/auth` + `firebase/firestore` (JS SDK) | UID, display name, gameplay data, chat, leaderboards, friendships, clubs | Our Firebase project | https://firebase.google.com/support/privacy |
| `@react-native-firebase/analytics` (native) | 35+ event names + params, user UID, session ID, device model, OS | Our Firebase project → Google Analytics 4 | https://firebase.google.com/support/privacy |
| `@sentry/react-native` ~7.11.0 | Uncaught JS + native exceptions, stack traces, user UID, breadcrumbs (up to 50), device info | Sentry SaaS (our project) | https://sentry.io/privacy/ |
| `react-native-google-mobile-ads` ^16 | AAID (Android), IDFA (iOS pending ATT), impression/click events, device model, ad session | Google AdMob | https://policies.google.com/privacy |
| `react-native-iap` ^15 | Platform receipt token, product ID | Apple StoreKit / Google Play Billing (then our Cloud Function → Apple/Google validation endpoints) | Apple / Google (storefront privacy policies) |
| `expo-notifications` ~55 | Push token, permission state, notification presentation events | Expo push service + Firebase Cloud Messaging | https://docs.expo.dev/versions/latest/sdk/notifications/ |
| `@react-native-async-storage/async-storage` 2.2 | On-device only; never transmitted | Local device sandbox | N/A |

---

## Data retention & deletion

- **Local AsyncStorage** — cleared on app uninstall, or on user-invoked "Clear local data" (SettingsScreen).
- **Firestore documents** — retained for account lifetime. Deleted on emailed request within 30 days.
- **Firebase Analytics** — 14-month default retention (configurable in GA4 admin).
- **Sentry events** — 90-day retention (default org plan).
- **AdMob** — per Google AdMob retention policy.
- **IAP receipts** — `receipts/{hash}` Firestore collection retained indefinitely for replay detection.

---

## Data subject rights (GDPR / CCPA)

The privacy policy commits to:

- Right to access: email request → JSON export within 30 days.
- Right to deletion: email request → Firestore + Sentry scrub within 30 days.
- Right to portability: same JSON export.
- Right to rectification: self-service via Settings.
- Opt-out of analytics: SettingsContext exposes a toggle that, when set, short-circuits `analytics.logEvent` in `src/services/analytics.ts`. **Verify this toggle exists and works before shipping** (flagged for TASK 6 if missing).
- Opt-out of personalized ads (iOS): handled via the ATT prompt (TASK 6).
- Opt-out of personalized ads (Android): AAID reset / "Opt out of ads personalization" in device settings.

---

## Age rating inputs (IARC / Apple / Play)

Source of truth for the questionnaire answers that drive age rating. Full Q&A lives in `agent_docs/store_listing.md` §F.

Key answers:

- **Simulated gambling: YES.** Mystery Wheel (`src/data/mysteryWheel.ts`) is a weighted-probability reward mechanic with real-money currency (spins purchasable with gems; gems are sold for cash). Weights: common (21% / 15% / 18%), uncommon (12% / 10% / 8%), rare (5% / 4%), epic (3% / 3%), legendary jackpot (1%). 25-spin pity system.
- **User-generated content: YES.** Club chat (`src/screens/ClubScreen.tsx:111`), profanity-filtered via `src/utils/profanityFilter.ts` (45+ words, leet-speak substitution), 200-char cap per message.
- **Profanity: filtered.** No unfiltered profanity in app content.
- **Violence, sexual content, drugs, horror: none.**
- **Real-money IAP: YES.** 47 SKUs, $0.49 – $99.99.

This pushes the expected ratings to:
- **Play (IARC):** Teen (13+).
- **Apple App Store:** 12+ (simulated gambling category).

---

## Disclosure inconsistency flagged for TASK 6

The pre-existing `store-metadata/privacy-policy.md` (migrated into `privacy_policy_draft.md`) claimed "No loot boxes; all probabilities displayed." Both halves are inaccurate for current v1.0:

1. **Mystery Wheel is a gacha/loot-box mechanic** by every store's working definition.
2. **Probabilities are defined in `src/data/mysteryWheel.ts` but NOT displayed in-app.**

`privacy_policy_draft.md` is corrected to describe the mechanic honestly. **TASK 6 remediation:** add an in-app "Odds" modal on the Mystery Wheel screen that surfaces the weights from `WHEEL_SEGMENTS` directly. This also aligns with upcoming Play Console gacha probability-disclosure rules (already required in China; Google has signaled global rollout).
