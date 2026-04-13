# Commercial Hardening and Retention Implementation Plan

Date: 2026-04-13
Spec: `docs/superpowers/specs/2026-04-13-commercial-hardening-and-retention-design.md`
Status: Drafted after approved spec

## Execution strategy

Implement in two ordered milestones:

1. **Phase A: commercial truth layer**
2. **Phase B: retention and polish pass**

Phase B starts only after Phase A is functionally stable and validated.

## Phase A — Commercial truth layer

### Workstream A1 — Entitlement ownership and migration

#### Goal
Make `EconomyContext` the only live source of commercial truth and reduce `SettingsContext` to preferences-only behavior.

#### Tasks
- Add explicit economy-owned entitlement state for:
  - ad removal
  - premium pass
  - VIP subscription
  - daily value pack state
  - starter-pack timing
  - temporary/rental entitlement timestamps where applicable
- Add a migration version and one-time migration from legacy `SettingsContext` purchase booleans.
- Stop reading `settings.premiumPass` and `settings.adsRemoved` as live purchase truth in UI surfaces.
- Keep parental controls and spend tracking in `SettingsContext` as preferences and local controls.
- Lock the concrete Phase A ownership artifacts before broad edits:
  - commerce state shape in `EconomyContext`
  - migration version key and legacy migration rules
  - purchase fulfillment API signature
  - player grant bridge signature for cosmetics/decorations/meta grants

#### Acceptance checks
- Shop and mastery surfaces read purchase truth only from economy/commercial state.
- Existing local users with legacy purchase flags retain access after migration.
- No purchase surface writes new live ownership back into `SettingsContext`.
- All purchase-truth reads and writes are moved under A1 ownership; later workstreams may adjust copy or UI, but not commercial state ownership.

### Workstream A2 — Purchase fulfillment pipeline

#### Goal
Replace ad hoc UI fulfillment with one validated commerce flow.

#### Tasks
- Add a purchase application API in `EconomyContext` for validated purchases and restores.
- Add a narrow grant bridge in `PlayerContext` for decorations, cosmetics, and other non-economy purchase rewards.
- Update `ShopScreen` and `MasteryScreen` to call the new fulfillment flow instead of directly mutating multiple contexts.
- Unify restore-purchase handling under the same fulfillment path.
- Ensure purchase analytics/events fire after validated fulfillment by reusing the existing analytics path rather than inventing a parallel telemetry layer.

#### Acceptance checks
- Successful purchase and restore use the same reward path.
- Decorations/cosmetics granted by purchases arrive through the player grant bridge.
- Premium pass, ad removal, and VIP all resolve to consistent state across screens.

### Workstream A3 — Native billing and receipt validation hardening

#### Goal
Restore a real production billing path with fail-closed behavior.

#### Tasks
- Re-add `react-native-iap` using the package manager.
- Update build/config/plugin setup required by the native dependency.
- Preserve safe dev fallback behavior, but gate production to reject purchases when billing or validation is unavailable.
- Expand `iap.ts` status/reporting so UI can distinguish:
  - billing unavailable
  - validation unavailable
  - launch-ready commerce
- Tighten restore/pending-purchase reconciliation behavior.
- Pass explicit user identity into receipt validation where required by the final flow.

#### Acceptance checks
- The app no longer treats mock success as acceptable launch truth.
- Purchase UI can accurately report unavailable billing vs unavailable validation.
- Receipt validation contract remains strict in production behavior.

### Workstream A4 — Repo deployability and Firebase launch prep

#### Goal
Make the repo operationally ready for commerce/social backend deployment.

#### Tasks
- Add root `firebase.json`.
- Wire Firestore rules and indexes from root config.
- Add root scripts and/or docs for deploying:
  - Firestore rules and indexes
  - `functions/`
  - `cloud-functions/`
- Add a launch-prep doc for required env vars, EAS steps, Firebase deploy steps, and manual external-console tasks.
- Add simple sanity checks for missing production-critical configuration where feasible.

#### Acceptance checks
- Repo contains a concrete documented root deploy flow.
- Firestore rules/indexes are no longer only implied by comments.
- External manual steps are explicitly enumerated, not hidden in tribal knowledge.

### Workstream A5 — Product consistency fixes tied to commerce truth

#### Goal
Remove trust-breaking product inconsistencies revealed by the audit.

#### Tasks
- Fix any residual premium-pass inconsistency across Shop/Mastery/other surfaces that remains after A1-A2 data wiring is complete.
- Resolve prestige surface inconsistency so the UI matches actual functionality or hides incomplete affordances.
- Turn temporary/rental shop items into real timed state if they remain purchasable in this cycle, or clearly remove/disable them.
- Review wording/UI states around unavailable billing and restore flows.

#### Acceptance checks
- No screen shows stale or contradictory premium ownership.
- Prestige and product messaging are no longer misleading.
- Temporary/rental items are either real or clearly not sellable.

#### Start gate
A5 may begin after A1-A2 are merged enough that purchase truth is already owned by economy state. A5 is limited to residual UX, copy, and product affordance cleanup; it must not redefine ownership boundaries already established in A1.

### Phase A validation

#### Automated
- `npm run typecheck`
- `npm test -- --ci --runInBand`
- Add focused tests for:
  - legacy entitlement migration
  - validated purchase fulfillment
  - restore flows
  - premium/ad-removal ownership truth
  - receipt validation behavior

#### Manual
- Shop purchase states
- Mastery premium state
- Restore purchases
- unavailable billing / unavailable validation messaging
- premium/decorations/meta grants

## Phase B — Retention and polish pass

### Workstream B1 — Core-loop clarity

#### Goal
Reduce avoidable friction in gameplay interaction feedback.

#### Tasks
- Revisit non-adjacent selection reset feedback so it reads as correction instead of punishment.
- Tune valid-word confirmation and auto-submit feedback.
- Ensure the grid remains the primary focus during play.

#### Acceptance checks
- Invalid/reset feedback is less misleading.
- Auto-submit still feels fast while reading as intentional.

### Workstream B2 — Interruption density and banner prioritization

#### Goal
Reduce session noise without removing important guidance.

#### Tasks
- Audit banner/offer overlap points in `GameScreen`.
- Introduce clearer priority ordering and suppression where prompts stack.
- Reduce early-session interruption density.

#### Acceptance checks
- Fewer overlapping prompts in common early-game scenarios.
- Important help still appears when needed.

### Workstream B3 — Early-session progression legibility

#### Goal
Improve player understanding of early unlocks and system value.

#### Tasks
- Clarify communication around early unlocks and reward significance.
- Improve presentation of premium/value systems once commercial truth is unified.
- Tighten first-surface messaging for boosters, wheel, pass, and related systems without adding new systems.

#### Acceptance checks
- Early progression feels more legible and less noisy.
- Premium/value surfaces feel trustworthy and coherent.

### Phase B validation

#### Automated
- Re-run Phase A automated checks.
- Add targeted tests only where logic changed materially.

#### Manual
- Record a demo of changed gameplay and purchase surfaces.
- Validate early-session flow, reduced stacking, and premium-state consistency.

## Order of implementation

1. Validate the named Phase A ownership artifacts first:
   - economy entitlement state shape
   - migration version and rules
   - purchase fulfillment API
   - player grant bridge
2. Implement ownership/migration first.
3. Implement purchase fulfillment path second.
4. Restore/harden billing and validation path third.
5. Add repo deployability and launch-prep docs fourth.
6. Fix residual product consistency issues that depend on truth-layer work.
7. Run Phase A validation.
8. Only then execute the narrower Phase B UX/polish changes.

## Risks and mitigations

- **Native billing integration risk**: keep architecture changes narrow and preserve dev fallback during implementation.
- **Entitlement regression risk**: add migration tests and focus restore/ownership paths first.
- **Scope drift**: keep Phase B limited to high-leverage early-session/player-trust improvements.
- **Operational ambiguity**: encode deploy steps and external manual steps in repo docs rather than relying on memory.

## Done criteria

The implementation cycle is done when:

- commercial truth is unified and no longer split across settings and economy
- purchase and restore paths are consistent
- production billing/validation behavior is explicitly fail-closed
- repo deployability for Firebase/rules/functions is concretely documented and configured
- the key product inconsistencies identified in the audit are resolved
- the targeted retention/polish pass is validated with manual evidence
