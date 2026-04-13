# Commercial Hardening and Retention Design

Date: 2026-04-13
Status: Approved in chat, pending spec review and user review
Scope: Phase A commercial truth layer, followed by Phase B retention/polish improvements

## Summary

This design hardens Wordfall for a credible soft launch without rewriting the app's core architecture. The first phase restores real commercial truth: native billing, server-backed receipt validation, entitlement unification, Firebase deployability, and product consistency across purchase surfaces. The second phase uses that stabilized foundation to tighten first-session retention and perceived polish through focused gameplay and UX improvements.

The design intentionally avoids a large architectural rewrite, a full backend consolidation, and broad art/audio redesign. It focuses on turning the current ambitious feature set into a safer, more trustworthy, and more coherent launch candidate.

## Goals

- Restore real store-native billing for launch builds.
- Make commercial ownership and fulfillment consistent across all UI surfaces.
- Make production billing and validation fail closed instead of relying on mock success.
- Add repo-level Firebase and deploy structure for commerce and social backends.
- Remove or finish the most obvious product inconsistencies that reduce player trust.
- Improve first-session clarity, interruption density, and early-session polish after the truth layer is stable.

## Non-goals

- Full app-wide commerce or state-management rewrite.
- Full merger of `functions/` and `cloud-functions/`.
- Rebalancing the entire economy from scratch.
- Replacing all art or synthesized audio assets.
- Full UI redesign across every screen.
- Executing store-console setup, secret provisioning, or external account actions from the repo.

## Architecture and Ownership Boundaries

### Core principle

Keep the existing app structure and harden it by enforcing single ownership for each kind of truth:

- `EconomyContext`: authoritative commercial state.
- `PlayerContext`: authoritative progression and meta state.
- `SettingsContext`: user preferences only.
- `services/iap.ts`: native billing bridge.
- `services/receiptValidation.ts` plus Firebase Functions: validation truth.
- `shopProducts.ts` and related catalog files: product configuration only.

### Ownership boundaries

`EconomyContext` becomes the single source of truth for:

- premium pass ownership
- ad removal
- VIP/subscription state
- purchase history
- starter pack and daily value pack timing
- monetized consumables and commercial booster entitlements
- time-bound commercial effects and rentals

`PlayerContext` continues to own:

- level, chapter, and star progression
- cosmetics and decorations actually unlocked
- prestige state
- missions, quests, social, and meta loops

`SettingsContext` becomes preferences-only. Existing commerce booleans remain as migration input only and are never treated as live ownership after migration.

### Runtime purchase flow

All purchase-affecting surfaces use one shared flow:

1. UI requests purchase using internal product ID.
2. `iapManager` maps to the store product and starts native billing.
3. Purchase result is sent to `receiptValidation`.
4. Server validates and returns canonical product and transaction truth.
5. App records a local fulfilled transaction.
6. `EconomyContext` applies economy entitlements and commercial balances.
7. `PlayerContext` receives validated meta grants through a narrow bridge.
8. Analytics fire from the fulfilled result, not from the button press.

This same path must handle purchase, restore, pending purchase recovery, and subscription reconciliation.

## Entitlement and Data Model

### Canonical model

Separate three concepts:

- Catalog item: what the store sells.
- Transaction: what was purchased, restored, or renewed.
- Entitlement: what the player currently owns or can claim/use.

The app must stop inferring ownership from scattered booleans.

### Entitlement categories

The fulfillment layer classifies products as:

- Permanent entitlements
  - ad removal
  - premium pass for the active season
- Time-bound entitlements
  - VIP subscription
  - daily value pack
  - starter pack availability window
  - temporary effects and rentals
- Consumable grants
  - coins
  - gems
  - hint tokens
  - undo tokens
  - booster tokens
- Player/meta grants
  - cosmetics
  - decorations
  - season or progression-linked unlocks that belong in `PlayerContext`

### File-level changes

#### `SettingsContext`

- Remove `premiumPass` and `adsRemoved` as live ownership state.
- Keep one-time migration support only.

#### `EconomyContext`

Own:

- entitlement flags
- subscription expiry
- season pass ownership metadata
- fulfilled purchase history
- consumable balances
- rental/effect expiry timestamps

Add narrow APIs such as:

- `applyValidatedPurchase(...)`
- `restoreEntitlements(...)`
- `migrateLegacyEntitlements(...)`

#### `PlayerContext`

Add a narrow, commerce-facing grant bridge such as:

- `grantPurchasedCosmetic(...)`
- `grantPurchasedDecoration(...)`
- `grantMetaRewardBundle(...)`

`PlayerContext` must never decide whether a purchase is valid. It only receives already-validated grants.

### Startup and restore

On app startup:

1. Load local economy state.
2. Run legacy migration from `SettingsContext`.
3. Initialize IAP manager.
4. Restore active purchases and pending purchases if store billing is available.
5. Reconcile subscriptions and receipts.
6. Expose `commerceReady`/`billingReady` style UI state so purchase screens can react correctly.

### Migration

Add a one-time migration version. If legacy settings indicate `premiumPass` or `adsRemoved` and economy state does not yet reflect them:

- migrate once into economy state
- record migration version
- stop using settings flags as live truth

This protects existing local users and test accounts from losing ownership during the transition.

## Backend, Native Billing, and Deployability

### Native billing restoration

Restore real billing with the smallest-risk change set:

- re-add `react-native-iap`
- keep the dynamic import and safe native-module detection pattern
- add the required Expo config plugin/native patch path to resolve the Android integration issue documented in the repo
- keep mock mode for development fallback only

Production builds must never treat mock success as commercial truth.

### Production gating

Introduce explicit runtime state for:

- `billingAvailable`: native store billing is available
- `validationAvailable`: receipt validation endpoint is configured and reachable
- `commerceLaunchReady`: production-required commerce conditions are met

Production behavior:

- if validation is unavailable, purchases are rejected
- if billing is unavailable, purchase UI is disabled or clearly unavailable
- restore flows attempt reconciliation instead of silently succeeding

### Firebase and functions structure

Do not merge the two functions folders in this pass. Keep responsibilities separate:

- `functions/`: commerce, receipts, subscriptions, related authority
- `cloud-functions/`: social, push, events

But standardize root deployability:

- add root `firebase.json`
- wire `firestore.rules` and `firestore.indexes.json`
- add clear root-level scripts or docs for validating and deploying both function directories
- define the environment contract and launch checks in repo documentation

### Receipt validation path

Receipt validation should:

- post receipt/token, product ID, platform, and user ID to the commerce function
- return canonical normalized product, validity, transaction ID, and expiry/subscription data
- reject product mismatches
- protect against replay/double-granting
- handle restore and subscription reconciliation cleanly
- fail closed in production when validation is unavailable

### Deploy and ops prep

Aggressive launch prep in repo includes:

- `firebase.json`
- root deploy/validation scripts
- launch-prep documentation covering env vars, build profiles, store prerequisites, Firebase deploys, and post-deploy checks
- sanity checks for missing production-critical configuration

### EAS/build path

Since native billing returns in scope, the repo should clearly document and support:

- when a fresh dev client / EAS build is required
- app/plugin configuration for the restored native dependency
- the production build path that matches launch prep instead of only preview/dev flows

## Retention and Polish Phase

Phase B starts only after the commercial truth layer is stable.

### Objectives

- improve the first 30 minutes and early repeat sessions
- reduce confusion and interruption density
- improve trust in offers, rewards, and premium messaging
- raise perceived polish in the most important early loops

### High-leverage changes

#### Reduce core-loop ambiguity

- Clarify or soften non-adjacent reset behavior so it reads as selection change instead of punishment.
- Tune valid-word confirmation and auto-submit presentation so it feels intentional.
- Keep the grid primary by tightening banner and prompt timing.

#### Make early progression more legible

- Improve communication around early unlocks and why they matter.
- Clarify the value and ownership state of premium products once truth is unified.
- Improve first-surface explanations of boosters, wheel, pass, and related systems using existing systems rather than adding new ones.

#### Fix trust-breaking placeholder states

- Prestige should either be fully usable in UI or not surfaced as active functionality.
- Temporary effects and rentals should behave as real timed entitlements if sold.
- Premium pass ownership should be consistent across Shop, Mastery, and any other entry points.

#### Reduce interruption density

- Reduce stacked banners, offers, and ceremonies in a single puzzle/session.
- Apply clearer priority ordering to prompts.
- Preserve early-game pacing so the game feels premium rather than pushy.

### Intended code surfaces

Primary files likely touched during phase B:

- `GameScreen`
- `GameBanners`
- `GameFlashes`
- early progression and reward wiring
- `ShopScreen`
- `MasteryScreen`
- profile/product messaging surfaces
- onboarding/tutorial edges where commercial and progression systems first surface

### Non-goals for phase B

- broad app re-skin
- net-new progression system creation
- full economy rebalance
- replacing all media assets
- rewriting all tutorials

## Testing, Validation, and Rollout

### Success state

The work is not done unless:

- the app still typechecks
- existing automated tests pass
- new commercial truth logic is covered with focused tests
- entitlement truth is consistent across relevant UI surfaces
- production gating is explicit
- Firebase deploy structure exists and is documented
- key purchase and restore flows can be exercised as far as the environment allows
- the retention/polish changes are visibly working

### Automated validation

Run and/or add focused coverage for:

- entitlement migration
- fulfilled purchase application
- premium pass source-of-truth logic
- timed entitlements and temporary effects if implemented
- receipt validation behavior in development vs production conditions

High-signal baseline checks:

- `npm run typecheck`
- `npm test -- --ci --runInBand`

### Manual validation

Commercial validation:

- shop ownership states
- premium pass consistency across Shop, Mastery, Settings-adjacent views, and any other purchase surface
- unavailable billing and restore behavior
- temporary/rental behavior if implemented
- prestige/product messaging consistency

Gameplay/polish validation:

- selection/reset clarity
- valid-word feedback and auto-submit responsiveness
- reduced banner/offer stacking
- improved early-session progression comprehension

### Artifact expectations

Implementation should produce:

- terminal evidence for automated checks
- a demo video of key changed UI flows
- screenshots where entitlement consistency or UX state comparison is useful

### Rollout strategy

Recommended rollout sequence:

1. stabilize commercial truth and deploy structure
2. validate in internal/dev-client builds
3. soft-launch style limited rollout
4. use retention and monetization data to tune Phase B further

### Manual external steps that remain outside repo

Even after aggressive repo prep, these still require external actions:

- store product setup
- signing/submission setup
- Firebase credentials and secrets
- APNs/FCM credentials
- domain ownership / Universal Links
- final production deployment execution in target accounts

## Implementation boundaries for planning

This spec is intentionally scoped to a single planning effort by limiting the work to:

- commercial truth and entitlement hardening
- repo-level backend/deploy readiness
- a targeted retention/polish pass

It excludes any broader redesign or long-tail optimization that does not materially improve launch readiness for the next implementation cycle.
