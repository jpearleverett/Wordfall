# Commercial Launch Prep

Date: 2026-04-13

This document captures the repo-side launch preparation for Wordfall's
commercial stack. It does not replace store-console or Firebase-console setup,
but it makes the required repo and deployment flow explicit.

## What this repo now expects

### Native billing

- `react-native-iap` is installed and configured through Expo plugins.
- `react-native-nitro-modules` is installed as the required peer dependency.
- `expo-build-properties` is configured for Android Kotlin compatibility.

Because native billing is now part of the app build, any billing dependency or
plugin change requires a fresh dev client / EAS build.

### Firebase root deploy surface

The repo root now contains:

- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `scripts/firebase_deploy_rules_indexes.sh`
- `scripts/firebase_deploy_functions.sh`

These cover Firestore rules/indexes and both existing function directories.

## Required environment and console setup

### Expo / app runtime env vars

Set these before production testing:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL`
- `EXPO_PUBLIC_SENTRY_DSN` (recommended)
- `EXPO_PUBLIC_ADMOB_REWARDED_ID` (if rewarded ads are part of launch)

### Firebase console / CLI requirements

- Firebase project selected locally via `firebase use <project>`
- Firestore enabled
- Functions enabled
- Billing enabled on the Firebase/GCP project if your usage requires it
- Secrets / runtime config configured for commerce validation:
  - Apple shared secret / App Store server credentials
  - Google Play service credentials / API access

### Store-console requirements

These are still manual:

- App Store Connect IAP products matching the `wordfall_*` IDs
- Google Play Console products matching the `wordfall_*` IDs
- iOS In-App Purchase capability and review metadata
- Android Play Billing setup
- Subscription configuration for `wordfall_vip_weekly`
- Test accounts / sandbox accounts

### Push / link infrastructure still manual

- APNs credentials
- FCM credentials
- Universal Link domain ownership and `apple-app-site-association`

## Root deploy commands

### Firestore rules and indexes

Run:

- `bash scripts/firebase_deploy_rules_indexes.sh`

### Cloud functions

Build and deploy both directories from the repo root:

- `bash scripts/firebase_deploy_functions.sh`

This script keeps the two current function directories separate:

- `functions/` for commerce/receipt/subscription work
- `cloud-functions/` for social/push/event work

## Suggested validation order

1. `npm run typecheck`
2. `npm test -- --ci --runInBand`
3. Deploy Firestore rules/indexes
4. Deploy `functions/`
5. Deploy `cloud-functions/`
6. Confirm `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL` points at the deployed commerce functions base URL
7. Build a fresh dev client / EAS build
8. Test:
   - purchase flow
   - restore flow
   - premium pass ownership across Shop/Mastery/Settings
   - unavailable validation messaging

## EAS notes

Because native billing is configured via Expo plugins:

- JS-only reload is not enough after changing billing deps/plugins
- build a new dev client after native changes
- use the existing development/preview/production EAS profiles as your base

Recommended commands from this repo:

- `npx expo start --dev-client`
- `EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android`

## Remaining manual production checklist

Before store launch, confirm:

- [ ] Store products exist and are approved/configured
- [ ] Receipt validation secrets are configured server-side
- [ ] Firestore rules and indexes are deployed
- [ ] Both function directories are deployed
- [ ] `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL` is set in the build environment
- [ ] APNs/FCM credentials are configured
- [ ] Sentry DSN is configured
- [ ] Rewarded ads use real production IDs
- [ ] A fresh native build was created after billing/plugin changes
