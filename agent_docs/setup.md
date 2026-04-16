# External Setup & Open Items

Environment and launch-prep notes. Read this when configuring a new
environment, deploying, or preparing for store release.

## Needs External Setup

| Item | How | Fallback if missing |
|------|-----|---------------------|
| Firebase | `EXPO_PUBLIC_FIREBASE_*` env vars | App runs fully offline (AsyncStorage only) |
| Sentry | `EXPO_PUBLIC_SENTRY_DSN` | Console logging |
| AdMob | `react-native-google-mobile-ads@^16` is installed + autolinked via config plugin in `app.json` using Google's public test app IDs. Test unit IDs are the defaults in `src/constants.ts` AD_CONFIG. To go live: swap the plugin's `androidAppId` / `iosAppId` in `app.json` for your real AdMob app IDs, set `EXPO_PUBLIC_ADMOB_REWARDED_ID` + `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID` in `.env`, rebuild EAS APK. | `MockAdModal` component (only activated in `__DEV__` when the native module isn't linked) |
| IAP products | Register `wordfall_*` IDs in App Store Connect / Play Console | Production purchases are gated off until store products and server validation are configured |
| Firestore rules + indexes | `firebase.json` is in the repo root; run the helper script or `firebase deploy --only firestore:rules,firestore:indexes` | Rules file exists at `firestore.rules`, indexes at `firestore.indexes.json` — still requires deployment |
| Cloud Functions | Both directories are wired as codebases in `firebase.json` (`commerce` → `functions/`, `social` → `cloud-functions/`). Deploy from repo root: `firebase deploy --only functions` (both), `firebase deploy --only functions:commerce`, or `firebase deploy --only functions:social`. Helper script at `scripts/firebase_deploy_functions.sh`. Both currently run on Node 22 with `firebase-functions/v1` imports. | Club goals, leaderboards, IAP validation don't run |
| Audio assets | Drop `.mp3` files in `assets/audio/` | Synthesized tones |

EAS project already configured (`projectId: b6dd187c-d46c-4331-bb15-5c7ffced89b3`, owner `jpearleverett`).

## Still Needs Work

- **Play Console & App Store Connect setup**: Register `wordfall_*` IAP product IDs (matches `src/data/shopProducts.ts`), create Google Play API service account for server-side receipt validation, upload service account JSON for Cloud Functions to use.
- **AdMob real IDs**: `react-native-google-mobile-ads@^16` is installed and autolinked via the config plugin in `app.json`. Today the plugin references Google's public test app IDs (`ca-app-pub-3940256099942544~...`) and AD_CONFIG defaults to the matching test ad unit IDs so dev client builds work without real IDs. To go live: swap `androidAppId` / `iosAppId` in `app.json` for real AdMob app IDs, set `EXPO_PUBLIC_ADMOB_REWARDED_ID` + `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID` in `.env`, rebuild EAS APK. `MockAdModal` still handles the `__DEV__` case where the native module isn't linked.
- **FCM credentials for Android push notifications**: `expo-notifications` handles local notifications today. Remote push needs the FCM server key uploaded to Firebase Console → Cloud Messaging → Project Settings, plus the `google-services.json` already present.
- **iOS setup pending**: `GoogleService-Info.plist` referenced in `app.json` but not yet committed (download from Firebase Console when ready). iOS Universal Links also pending — scheme works; HTTPS needs domain + apple-app-site-association.
- Consolidate `cloud-functions/` and `functions/` into one codebase (currently both are deployed but split by domain — commerce vs social).
- Professional audio assets to replace synthesized tones (drop `.mp3` files in `assets/audio/`).
- Context selectors for PlayerContext/EconomyContext (narrow subscriptions via `useSyncExternalStore` — plan exists in `/.claude/plans/kind-weaving-hoare.md` Phase 4).
- E2E tests (Detox/Maestro — unit coverage is strong with 791 tests).
