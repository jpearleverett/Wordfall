# Wordfall — Launch Runbook

> Step-by-step external setup needed to ship to Google Play. Follow in order. Each step lists the exact command or console path; do not improvise.
>
> **Owner:** the human (jpearleverett). Claude cannot execute these — they require Firebase / Play Console / EAS credentials.
>
> **Status of code-side blockers:** all resolved (see `pre_launch_audit.md`). What remains here is purely external.

---

## 1. Play Console — App Signing SHA-256 → assetlinks.json

**Why:** Without a valid `assetlinks.json` SHA fingerprint, Android App Links won't auto-verify and every deep link prompts the user with a chooser sheet (broken referral and gift flows).

**Steps:**
1. Open Play Console → your app → **Setup → App signing**.
2. Find the **App signing key certificate** section.
3. Copy the **SHA-256 certificate fingerprint** (looks like `AB:CD:EF:...:99` — 64 hex chars with colons).
4. Open `wordfallgamesite/.well-known/assetlinks.json` in this repo.
5. Replace the placeholder string `REPLACE_WITH_YOUR_PLAY_APP_SIGNING_SHA256` on line 8 with the exact value from step 3.
6. Commit and push to whatever branch deploys the Cloudflare Pages site (typically `main`).
7. Verify deployment with: `curl -s https://wordfallgame.app/.well-known/assetlinks.json | jq` — confirm the fingerprint shows up.
8. Test on an Android device: install the production app, open `https://wordfallgame.app/referral/TEST123` — it should open the app directly with no chooser.

**Verification:** Google's tool at `https://developers.google.com/digital-asset-links/tools/generator` can confirm the file is valid.

---

## 2. Firebase — Deploy Cloud Functions, Firestore Rules & Indexes

**Why:** All 13 (soon 15+) Cloud Functions, the Firestore rules, and the indexes live in this repo but have never been pushed to the Firebase project. Until you deploy them, IAP receipt validation, leaderboards, club goals, push notifications, and account deletion all fail.

**Pre-flight:**
```bash
cd /home/user/Wordfall
# Verify Firebase CLI is current
firebase --version  # need >=13.0
# Verify you're logged in to the right project
firebase projects:list
firebase use <project-id>  # the Wordfall Firebase project
```

**Deploy:**
```bash
firebase deploy --only firestore:rules,firestore:indexes,functions
```

**What success looks like:**
- `✔ functions[validateReceipt(us-central1)]: Successful create operation.` for each of the 13 functions
- `✔ firestore: deployed` (rules + indexes)
- No red lines

**Common failures + fixes:**
- **`ENOENT: no such file or directory, open 'functions/lib/...'`** → run `cd functions && npm run build` first
- **`HTTP Error: 403, The caller does not have permission`** → you're not logged into the right Google account; `firebase login --reauth`
- **`Build failed: ... Cannot find module '@google-cloud/...'`** → run `cd functions && npm ci` to reinstall deps cleanly
- **Quota exceeded on first deploy** → Firebase Blaze quotas are generous; this would only hit if you've previously deployed many test versions

**Rollback:** Each function deploy creates a new revision. To revert: Firebase Console → Functions → select function → Versions tab → "Revert to previous".

---

## 3. EAS Secrets — Production Environment Variables

**Why:** The production AAB falls back to test/dev values for any missing env var. Without these, AdMob shows test ads (no revenue), Sentry doesn't report crashes, and Google Sign-In fails silently.

**Set each secret with `eas secret:create`:**

```bash
# Sentry
eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value "https://abc123@o1234.ingest.sentry.io/5678" --scope project --type string

# Google Sign-In (Web Client ID from Google Cloud Console → Credentials)
eas secret:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "1234567890-abc.apps.googleusercontent.com" --scope project --type string

# AdMob — Android (REAL unit IDs from AdMob Console, NOT test IDs)
eas secret:create --name EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID --value "ca-app-pub-XXX/YYY" --scope project --type string
eas secret:create --name EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID --value "ca-app-pub-XXX/ZZZ" --scope project --type string

# AdMob — iOS (deferred to v1.1 per CLAUDE.md, but stub now to avoid build warnings)
eas secret:create --name EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS --value "ca-app-pub-XXX/AAA" --scope project --type string
eas secret:create --name EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS --value "ca-app-pub-XXX/BBB" --scope project --type string
```

**Verify Firebase env vars are present (already set per CLAUDE.md, but double-check):**
```bash
eas secret:list | grep EXPO_PUBLIC_FIREBASE
# Expect: API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID
```

**Fallback values to be aware of (in `src/constants.ts`):**
- AdMob unit IDs fall back to Google's test units if missing — produces "Test Ad" overlay in production
- Sentry DSN missing → `crashReporter.captureException` becomes a no-op; crashes don't surface
- Google Web Client ID missing → `linkAnonymousToGoogle()` throws and `canLinkGoogle` stays `false`

---

## 4. Play Console — IAP SKU Registration

**Why:** All 60 SKUs in `src/data/shopProducts.ts` must exist in Play Console with matching product IDs, or every purchase attempt returns `ITEM_UNAVAILABLE`.

**Steps (per SKU):**
1. Play Console → **Monetize → Products → In-app products** (or Subscriptions for `vip_weekly` and `season_pass_premium`).
2. **Create product**.
3. **Product ID:** must EXACTLY match the `storeProductId` field in `shopProducts.ts` (e.g., `wordfall_starter_pack`, `wordfall_gems_500`, `wordfall_piggy_bank_break`).
4. **Name + description:** copy the `name` and `description` fields from `shopProducts.ts`.
5. **Default price:** match `fallbackPrice` (e.g., `$1.99`).
6. **Active.**

**Categories to register:**
- One-time products (consumable + non-consumable): all rows in `SHOP_PRODUCTS` with `category` ∈ `{bundles, currency, consumables, premium, piggy_bank}`
- Subscriptions: `vip_weekly` (and `season_pass_premium` if treating as renewable)

**Verification:** Once registered, the in-app shop will show real prices (e.g., `$1.99` instead of fallback). If it shows fallback after install, the SKU IDs don't match.

**Tip:** Use Play Console's CSV bulk-upload feature for speed. Format: ProductID, Name, Description, Price, Status. Generate the CSV from `shopProducts.ts` with a small script if you have many SKUs.

---

## 5. Play Console — Android Publisher Role for Firebase Service Account

**Why:** `validateReceipt` Cloud Function calls Google Play's Android Publisher API to verify purchases server-side. Without this role, every receipt validation returns 403.

**Steps:**
1. Find your Firebase project's default service account: Firebase Console → Project Settings → Service accounts → "Firebase Admin SDK service account" (looks like `<project>@appspot.gserviceaccount.com`).
2. Play Console → **Setup → API access** → Link your Firebase project (if not already).
3. Play Console → **Users and permissions** → **Invite new users** → email = the service account email.
4. **Account permissions:** check "Admin (all permissions)" OR specifically grant:
   - View app information
   - Manage orders and subscriptions
5. **App permissions:** add the Wordfall app, grant "Admin" or specifically "View financial data, orders, and cancellation survey responses" + "Manage orders and subscriptions".
6. Save.

**Verification:** Trigger a sandbox purchase from a tester account; check Cloud Functions logs for `validateReceipt` — should return `{ valid: true }` instead of 403.

---

## 6. Firebase — FCM Server Key (Android Push)

**Why:** `sendPushNotification` Cloud Function uses Expo Push API which talks to FCM. Without the FCM server key registered with Firebase, Android pushes silently drop.

**Steps:**
1. Firebase Console → Project Settings → **Cloud Messaging** tab.
2. If "Cloud Messaging API (Legacy)" shows "Disabled," enable it.
3. Copy the **Server key**.
4. EAS / Expo dashboard → your project → Push notifications → **Add server key** → paste.
5. Verify with: `npx expo push:android:upload --api-key <server-key>` (one-time setup).

**Verification:** Send a test push from EAS dashboard → should arrive on a real device with the production app installed.

---

## 7. AdMob — UMP Consent Form (GDPR)

**Why:** EU/UK users are blocked from seeing ads until they consent. Without a configured UMP form, GDPR-region users see a blank screen where ads should be.

**Steps:**
1. AdMob Console → **Privacy & messaging** → **GDPR**.
2. **Create message** → use the "IAB TCF" template.
3. Configure: app name = Wordfall, languages = EN (+ any localized), purposes = match your privacy policy (typically: Storage and access, Personalization, Measurement).
4. **Publish** to all production app traffic.
5. Code is already wired (`ads.ts` calls `AdsConsent.requestInfoUpdate` + `AdsConsent.showForm`); just needs the message to exist.

**Verification:** VPN to an EU country, open the app — UMP form should appear before any ad surfaces.

---

## 8. Google Sign-In — Final Activation

**Why:** Code is shipped (`src/services/googleAuth.ts`) but the native module isn't installed and the OAuth client ID isn't configured.

**Steps:**
1. **Install native module:**
   ```bash
   npm install --legacy-peer-deps @react-native-google-signin/google-signin
   git add package.json package-lock.json
   git commit -m "Add Google Sign-In native module"
   ```
2. **Create OAuth Web Client ID:**
   - Google Cloud Console → APIs & Services → Credentials (for the same Google project as Firebase)
   - Create credentials → OAuth client ID → Web application
   - Name: "Wordfall Web Client"
   - Copy the Client ID
3. **Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`** in `.env` AND via `eas secret:create` (see step 3 above).
4. **Enable Google provider in Firebase:**
   - Firebase Console → Authentication → Sign-in method → enable Google
   - Paste the Web Client ID into the Google provider settings
5. **Add Play SHA-1 to Firebase Android app:**
   - Play Console → Setup → App signing → copy SHA-1 (different fingerprint than SHA-256!)
   - Firebase Console → Project Settings → Your apps → Android app → Add fingerprint → paste SHA-1
6. **Rebuild dev client:**
   ```bash
   EAS_SKIP_AUTO_FINGERPRINT=1 eas build --profile development --platform android
   ```
   Install the new APK; `AuthContext.canLinkGoogle` autodetects the native module and flips to `true`.

**Verification:** Settings screen → "Sign In with Google" button appears (was hidden); tap it → Google chooser opens → after sign-in, the linked email shows in Settings.

---

## 9. Sentry — DSN Setup

**Why:** Crash reporting is a no-op without a DSN.

**Steps:**
1. Sentry.io → your project → Settings → Client Keys (DSN).
2. Copy the DSN string.
3. Add to `.env` as `EXPO_PUBLIC_SENTRY_DSN=https://...`.
4. Set as EAS secret (see step 3).
5. Trigger a test exception from the dev client (Settings → Debug → "Test crash" button if it exists, or throw from a button handler).
6. Verify in Sentry dashboard within 30 seconds.

---

## 10. Cloudflare Pages — Site Deploy

**Why:** Privacy policy, ToS, support page, and `assetlinks.json` are served from `wordfallgame.app`. If the site isn't deployed, the Play Store listing's policy URL 404s and Android App Links fail.

**Steps:**
1. The `wordfallgamesite/` directory is the static site source.
2. Cloudflare Pages should be configured to deploy from this repo's `main` branch with build command `(none)` and output directory `wordfallgamesite/`.
3. After every commit to `main` that touches `wordfallgamesite/**`, Cloudflare auto-deploys.
4. Verify: `curl -I https://wordfallgame.app/privacy` returns 200, `curl -I https://wordfallgame.app/.well-known/assetlinks.json` returns 200.

---

## 11. Store Listing Submission

**Why:** Final step before going live.

**Source materials in repo:**
- Copy: `agent_docs/store_listing.md`
- Data Safety answers: `agent_docs/data_safety.md`
- Privacy policy URL: `https://wordfallgame.app/privacy`
- Support email: `info@iridescent-games.com`

**Order:**
1. Upload AAB build (from EAS production profile)
2. Fill store listing copy from `store_listing.md`
3. Upload icon (512×512), feature graphic (1024×500), 8 phone screenshots
4. Fill Data Safety form from `data_safety.md`
5. Set content rating (Teen 13+ for gambling-adjacent Mystery Wheel)
6. Set countries — start with PH + CA only (per `soft_launch_plan.md`)
7. Submit for review

---

## 12. Post-Launch Smoke Test

After publish, before announcing, verify on a real Android device:
- [ ] Install from Play Store (not sideload) — confirms Play app signing works
- [ ] Complete onboarding + first puzzle — confirms FTUE
- [ ] Open shop → tap any IAP → see real $ price (not fallback) — confirms SKU registration
- [ ] Sandbox purchase one consumable — confirms IAP + receipt validation
- [ ] Trigger a crash via debug menu — appears in Sentry within 1 min
- [ ] Open referral deep link → opens app directly with no chooser — confirms assetlinks.json
- [ ] Sign in with Google — confirms native module + OAuth wiring
- [ ] Wait 5 minutes, check Firebase Cloud Functions logs — should see successful invocations of `onPuzzleComplete`, `validateReceipt`, etc.

If all 8 pass, you're live.

---

## Emergency Kill Switches

If something goes wrong post-launch, every major feature is behind a Remote Config flag. Flip via Firebase Console → Remote Config → Edit values:

| Feature | Flag | Default |
|---|---|---|
| Hard energy | `hardEnergyEnabled` | `false` |
| Mystery Wheel | `mysteryWheelEnabled` | `true` |
| Clubs | `clubsEnabled` | `true` |
| Prestige | `prestigeEnabled` | `true` |
| Piggy bank | `piggyBankEnabled` | `true` (after Branch 5 lands) |
| Season pass | `seasonPassEnabled` | `true` (after Branch 6 lands) |
| Referral rewards | `referralEnabled` | `true` (after Branch 7 lands) |
| Shared club goals | `sharedClubGoalsEnabled` | `true` (after Branch 8 lands) |
| Friends + leaderboard | `friendsEnabled` | `true` (after Branch 9 lands) |
| Booster combos | `boosterCombosEnabled` | `true` (after Branch 10 lands) |
| Tile bloom particles | `tileBloomEnabled` | `true` (after Branch 11 lands) |

Flag changes propagate to clients within 12 hours (cache TTL in `remoteConfig.ts`). For an immediate flip, also kick a forced fetch by bumping the Remote Config minimum-fetch-interval temporarily.
