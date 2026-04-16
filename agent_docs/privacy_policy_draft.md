# Wordfall Privacy Policy

> **Status:** Draft for hosting at `https://wordfallgame.app/privacy`. Entity name (Iridescent Games) and contact email (support@wordfallgame.app) are filled in. Replace `[Effective date]` with the publish date before going live. Legal review recommended.

**Effective Date:** [Effective date — set to the date you publish the page]
**Last Updated:** 2026-04-15

## 1. Introduction

Wordfall ("the app", "we", "us") is a word-puzzle game published by Iridescent Games. This Privacy Policy explains what personal data we collect, why, how long we keep it, and what rights you have over it. By installing or using Wordfall, you agree to the practices described here.

## 2. Data We Collect

### 2.1 Identifiers

- **Firebase anonymous user ID.** Assigned automatically when the app starts. Lets us sync your progress across devices you own without requiring a sign-up.
- **Display name (optional).** Only if you choose to set one for leaderboards or club chat.
- **Push notification token (optional).** Only if you grant notification permission.
- **Advertising identifier (AAID on Android, IDFA on iOS).** AAID is collected by Google AdMob when you see ads. IDFA is only collected on iOS if you grant App Tracking Transparency permission; if you decline, we serve non-personalized ads and do not receive IDFA.

We do **not** collect your email address, phone number, mailing address, precise location, contacts, photos, microphone input, or browsing history.

### 2.2 Gameplay & analytics

- Puzzle completion statistics, scores, mode preferences, session length, and feature usage — collected via Firebase Analytics (35+ event types).
- A/B test assignments.
- Daily challenge results and weekly leaderboard scores.

### 2.3 Financial

- **Purchase history.** Which products you bought and when. Processed entirely through Apple App Store or Google Play Billing — we never see your card number, bank account, or billing address.
- **Platform receipts.** Opaque tokens issued by Apple or Google. We send these to our server for entitlement validation and fraud prevention.

### 2.4 Social features

- **Club chat messages.** If you join a club, messages you post are stored in our database so other club members can see them. Messages pass through a profanity filter before storage.
- **Friend lists** (if you add friends) — user IDs only.

### 2.5 Diagnostics

- **Crash reports** via Sentry. Stack traces, device model, OS version, the UI actions leading up to the crash (breadcrumbs), and your anonymous user ID. No content from chat or text inputs is included in crash reports.

## 3. Third-Party Services

We share data with the following processors:

| Service | Provider | Data shared | Purpose | Privacy policy |
|---|---|---|---|---|
| Firebase (Auth, Firestore, Analytics, Cloud Messaging) | Google | UID, display name, gameplay events, push tokens, club chat | Sync, leaderboards, analytics, retention notifications | https://firebase.google.com/support/privacy |
| Sentry | Sentry, Inc. | Crash reports, stack traces, UID, breadcrumbs | Crash diagnostics | https://sentry.io/privacy/ |
| AdMob | Google | AAID (Android) / IDFA (iOS, ATT-gated), impression events | Ad serving | https://policies.google.com/privacy |
| In-App Purchases | Apple / Google | Platform receipt tokens | Purchase validation, fraud prevention | https://www.apple.com/legal/privacy/ ; https://policies.google.com/privacy |
| Expo Push Notifications | Expo / Firebase Cloud Messaging | Push token | Delivering notifications you opt into | https://expo.dev/privacy |

## 4. How We Use Your Data

- To save your puzzle progress and sync it across your devices.
- To show leaderboards, club chat, friend activity, and other social features you opt into.
- To process in-app purchases and deliver the items you bought.
- To fix crashes and improve game balance, difficulty, and onboarding via analytics.
- To serve ads (personalized on Android by default; on iOS only if you grant ATT permission).
- To send retention or event reminders only if you grant notification permission.

We do **not** sell your personal data. We do **not** use your data to train machine-learning models for third parties.

## 5. In-App Purchases, Virtual Currency, and Mystery Wheel

Wordfall offers 47 in-app purchases priced from $0.49 to $99.99. Purchases deliver in-game items including virtual currencies (Coins, Gems), consumables (Hints, Undos), bundles, a VIP weekly subscription, and one-time upgrades (Premium Pass, Remove Ads).

**The Mystery Wheel is a probability-based reward feature.** Spins can be earned through gameplay (free every 6 puzzles completed, plus one free spin per day) or purchased with Gems (which may be purchased for real money). Each spin yields a reward drawn from a weighted-probability table. The approximate drop rates are:

- Common rewards (small coins, small hints): ~54% total
- Uncommon rewards (boosters, small gem awards): ~30% total
- Rare rewards (Mystery Box, rare tile): ~9% total
- Epic rewards (25 Gems, 2x XP): ~6% total
- Legendary jackpot (500 Gems): ~1%

A pity system guarantees a Rare or better reward at least once within every 25 spins. In-app display of these rates is planned; if not present in the app you are using, request them via our contact email and we will provide the full breakdown.

**Parental controls.** If this app is used by a minor, use your device's family controls (Apple Family Sharing with Ask to Buy; Google Family Link) to require approval before any in-app purchase.

## 6. Children's Privacy

Wordfall is rated **Teen (13+) on Google Play** and **12+ on the App Store**. We do not direct the app to children under 13 and do not knowingly collect personal information from children under 13. If you believe your child under 13 has used Wordfall and provided us data, contact us and we will delete the associated anonymous account.

This app is **not certified under the Google Play Families Policy**, and we do not participate in the Designed for Families program.

## 7. Your Rights

### 7.1 GDPR (European Economic Area, UK, Switzerland)

You have the right to:

- Access the personal data we hold about you.
- Rectify inaccurate data.
- Erase your data ("right to be forgotten").
- Restrict or object to certain processing.
- Data portability (receive a copy in a machine-readable format).
- Withdraw consent to optional processing (ads personalization, push notifications) at any time.
- Lodge a complaint with your local Data Protection Authority.

To exercise any of these rights, email `support@wordfallgame.app`. We will respond within 30 days.

### 7.2 CCPA / CPRA (California)

California residents have the right to:

- Know what personal information we collect, use, and share.
- Delete their personal information.
- Opt out of the "sale" or "sharing" of personal information. We do not sell personal information. AdMob ad personalization may be considered "sharing" under CPRA; you can opt out via your device's advertising-ID settings or by declining ATT on iOS.
- Non-discrimination for exercising these rights.

### 7.3 Opt-outs inside the app

- **Analytics opt-out:** SettingsScreen → Privacy. When enabled, no analytics events are sent.
- **Personalized ads (iOS):** decline when the App Tracking Transparency prompt appears, or revoke later in iOS Settings → Privacy → Tracking → Wordfall.
- **Personalized ads (Android):** Settings → Google → Ads → Delete advertising ID, or "Opt out of ads personalization".
- **Push notifications:** Settings → Notifications → Wordfall (OS-level), or inside-app SettingsScreen → Notifications.

### 7.4 Data deletion

Email `support@wordfallgame.app` with the subject "Delete my data" and include your in-app profile screenshot (Settings → Profile shows your user ID suffix). We will delete your Firestore records, Sentry data, and Analytics pseudonymous identifier within 30 days and reply to confirm.

Uninstalling the app removes all on-device data (AsyncStorage). Cloud-side data requires the deletion request above.

## 8. Data Retention

- Cloud (Firestore) data: retained for the lifetime of your anonymous account, or until you request deletion.
- Analytics: 14 months (default GA4 retention).
- Crash reports: 90 days.
- IAP receipts: retained indefinitely for replay-attack prevention.

## 9. Data Security

All data in transit is encrypted over HTTPS/TLS. Firestore and Google Cloud storage encrypt data at rest. User-to-user club chat is stored in Firestore with Firebase Security Rules restricting reads to the club's members. We do not store payment card information.

## 10. International Transfers

Your data is processed in Google Cloud regions (primarily `us-central1`) and Sentry's servers (United States and Europe). By using Wordfall outside the US/EU you consent to this transfer, which is protected by standard contractual clauses and the EU-U.S. Data Privacy Framework.

## 11. Changes to This Policy

We will post any changes to this page and update the "Last Updated" date. Material changes will be surfaced in-app on next launch via a one-time notice.

## 12. Contact

Privacy questions, data requests, or child-data concerns: `support@wordfallgame.app`

For App Store purchase refund questions, contact Apple. For Play Store purchase refund questions, contact Google. We can assist with consumption of in-app items but cannot process refunds directly.
