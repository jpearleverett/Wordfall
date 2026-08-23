# Wordfall Animation, Performance, and Flicker Hardening Design

**Date:** 2026-08-23
**Status:** Approved for specification by the user

## Goal

Repair measurable animation correctness, flicker, rendering-performance,
lifecycle, and motion-accessibility defects across Wordfall while preserving
the existing visual identity, game rules, and intended spring/fade character.

This is a hardening project, not a visual redesign. The work covers every
registered screen, navigation transition, puzzle mode, ceremony variant, and
shared animated surface. Puzzle motion and cross-screen flicker receive
explicit priority.

## Product Constraints

- Preserve Wordfall's current dark neon visual language, spacing, hierarchy,
  and authored visual assets.
- Preserve the word-search-with-gravity rules in
  `agent_docs/game_mechanics.md`.
- Do not reintroduce deleted match-3 combo, chain, cascade, or invalid-word
  feedback systems.
- Keep gravity animation on the native driver unless runtime evidence proves
  a migration is necessary. The legacy driver itself is not a defect.
- Respect the React Compiler and zustand selector architecture. Per-tap
  selection must remain isolated from `GameScreen`.
- Avoid adding dependencies. React Native, Reanimated, worklets, and existing
  navigation APIs are sufficient.
- Reduced motion means no spatial motion, bounce, pulse, particles, shimmer,
  or decorative continuous movement. Static final states remain fully
  informative.
- Normal-motion users retain the intended responsive spring/fade feel.

## Scope Inventory

### Registered screens

The verification matrix covers all 17 screen files and every route that is
actually registered in `App.tsx`:

- Home
- Modes
- Game
- Collections
- Library
- Profile
- Edit Profile
- Settings
- Shop
- Cosmetic Store
- Club
- Leaderboard
- Event
- Onboarding
- Mastery
- Season Pass
- Weekly Leaderboard as an intentionally unreachable file, guarded against
  accidental animation work until it becomes a registered route

The same screen mounted in multiple stacks, such as Settings or Game, is
tested from each entry path because back behavior and covered-screen state
differ.

### Puzzle modes

All 10 live modes are in scope:

- `classic`
- `gravityFlip`
- `timePressure`
- `perfectSolve`
- `shrinkingBoard`
- `daily`
- `weekly`
- `noGravity`
- `expert`
- `relax`

There is no configured move-limited mode. The inert move-counter code is dead
surface area, not a missing puzzle animation.

### Ceremony and overlay surfaces

All 22 `CeremonyItem` variants are in scope, along with:

- puzzle completion and victory-summary rows
- post-loss and fail-breather surfaces
- first-purchase, no-lives, streak-break, and contextual offers
- login calendar, mystery wheel, mock ad, tutorial, and mode tutorial
- session reminders, board-generation notices, sync notices, and gameplay
  banners/flashes

## Flicker Taxonomy

Every fix and test must identify which flicker class it addresses. Broad
"looks smoother" claims are not sufficient.

### F1: Destination flash

A moving tile or card paints at its destination for one frame before its
inverse transform is installed. This is the historical
"flicker then awkward settle" gravity defect.

Required invariant: tile identity and inverse offsets are available during
the same render that commits the new layout.

### F2: Geometry disagreement

Visual position, hit bounds, selection trail, ghost tile, and particle origin
use different geometry. The confirmed `gravityFlip` up phase currently
top-packs rendered tiles while bounds still bottom-pack them.

Required invariant: one pure geometry result drives rendering, hit-testing,
selection paths, gravity diffs, ghosts, glints, and particle origins.

### F3: Competing animation ownership

Two systems animate the same state or hierarchy concurrently, such as:

- stack transition plus `ScreenScaffold` entrance plus repeated
  `ScreenEntrance` cascades
- `LayoutAnimation` plus Grid's own tile inverse-transform pipeline
- duplicate victory card entrance effects

Required invariant: each transition or layout mutation has one animation
owner.

### F4: State-swap flash

Loading, onboarding, result, modal, or route state unmounts one surface and
mounts another without stable background ownership. Typical symptoms are a
one-frame background flash, content disappearing before replacement, or a
hard cut after an otherwise animated flow.

Required invariant: the outgoing and incoming states share an opaque stable
surface, and replacement occurs either atomically or through one intentional
transition.

### F5: Preference-resolution flash

Reduced-motion state defaults to motion-enabled, an animation starts, and the
asynchronous accessibility query then snaps it to rest.

Required invariant: motion preference is resolved once before animated app
surfaces mount. Unknown state is treated as motion-reduced.

### F6: Interrupted-animation snap

An animation is interrupted by another word clear, undo, retry, navigation,
or unmount, but its listener, offset, delayed callback, or successor state is
not transferred or cleaned up.

Required invariant: interruption either hands off the current visual position
to the successor animation or settles cleanly, and all listeners/timeouts are
removed on unmount.

### F7: Identity/remount flicker

Unstable React keys or changing component structure remount visual nodes
during motion. This resets local animation state and can make tiles,
particles, list rows, or modal content blink.

Required invariant: persistent game tiles use stable cell IDs; generated
effects use unique event IDs; list rows use domain IDs; state changes do not
switch between incompatible keyed wrapper trees unnecessarily.

## Architecture

### 1. Single motion-preference source

Replace per-component `AccessibilityInfo` subscriptions with one shared
motion-preference store/provider exposed through the existing
`useReduceMotion()` API.

The provider:

- starts with `{ reduceMotion: true, resolved: false }`, so animated surfaces
  mount in their settled static state instead of waiting behind another splash
- treats unresolved/error state as reduced motion for safety
- owns exactly one `reduceMotionChanged` listener
- exposes a cached synchronous snapshot to all consumers
- removes the listener on provider teardown
- supports live OS setting changes without stale closures
- enables motion only for future interactions after a `false` result; it never
  starts a delayed mount entrance on content that is already visible

Keeping the current hook API minimizes churn while eliminating dozens of
listeners and the startup race.

### 2. Explicit motion ownership

Navigation owns route and tab transitions. Screen bodies do not replay a
second full-page transition on every focus.

- Normal stack push/pop keeps the current spring/fade character.
- Reduced-motion stack transitions are disabled rather than spatially
  shortened.
- Normal tab changes use one consistent transition.
- Reduced-motion tab changes are instant.
- `ScreenScaffold` no longer runs a competing full-body mount entrance when
  the navigator already owns the screen transition.
- Repeated per-section cascades are limited to true content disclosure, run
  once, and never replay on every tab refocus.
- Next-level Game replacement uses an in-place/cross-fade-safe route policy
  rather than a full forward push between identical Game routes.
- Onboarding handoff retains an opaque shared background and avoids a
  conditional hard-cut flash.

### 3. Shared puzzle geometry

Extract pure grid-layout geometry from `Grid.tsx`. Inputs include:

- rows and columns
- cell size and gap
- occupied cells
- layout mode (`fixed` or compacted)
- gravity direction

Outputs include stable bounds by row/column and cell ID. The same result feeds:

- rendered tile slots
- gesture hit-testing
- selection trail points
- fall start/end differences
- ghost and glint positions
- clear-ring and particle coordinate conversion

For compacted vertical layouts:

- down gravity bottom-packs cells
- up gravity top-packs cells

For fixed layouts (`noGravity`, `shrinkingBoard`), row indices remain absolute.
Horizontal gravity remains engine-driven and must not regress into teleporting
or mismatched bounds.

### 4. Interrupt-safe Grid animation lifecycle

Retain stable `cell.id` keys and render-phase inverse transforms. Add explicit
ownership for:

- active fall sequences
- native-driver listener handles
- current visual offsets
- run IDs
- ghost event IDs
- delayed sounds and visual callbacks

Unmount removes every listener and stops every owned animation. An interrupted
fall hands its current offset to the successor run. Undo/retry must not also
apply a competing `LayoutAnimation`.

Any attempt to remove per-frame native-driver listeners requires before/after
profiling because they currently protect interrupted falls from teleporting.
Leak cleanup is mandatory; architectural replacement is evidence-driven.

### 5. Ceremony and overlay contract

Introduce a shared ceremony/overlay contract without restyling individual
reward art:

- modal accessibility semantics and background focus isolation
- one reduced-motion-aware entrance
- one short, consistent exit for normal motion
- instant dismiss under reduced motion
- interaction remains available while decorative motion runs
- animation cancellation and timeout cleanup on unmount
- deferred heavy particle mounts after the card is stable
- deterministic z-index/layer ordering

Economy grants occur exactly once at queue-pop/claim time, never only after an
optional dismissal animation. `quest_step_complete` joins the centralized
grant path and no longer risks losing rewards on process death. Duplicate
reward copy is removed.

### 6. Render isolation

Use existing zustand selectors to constrain high-frequency updates:

- `timePressure` countdown updates only the timer bar/warning subtree
- `GameHeader` does not receive unused `timeRemaining`
- GameScreen word-clear effects use complete dependencies or stable callbacks
- per-tap selection remains in `PlayField`
- heavyweight score/particle layers remain imperatively isolated
- leaderboard rows use a virtualized list while preserving the podium header
- no speculative memoization is added where React Compiler already provides
  stable results

## Workstreams

### A. Puzzle correctness and flicker

1. Add failing geometry tests for up/down/fixed layouts.
2. Fix `gravityFlip` up-phase visual bounds and hit-testing.
3. Verify selection trail, ghost, glint, and particle origins in every
   gravity direction.
4. Add listener/animation cleanup and interrupted-fall tests.
5. Remove overlapping undo/retry `LayoutAnimation`.
6. Ensure fast consecutive clears never flash at destination or snap from an
   obsolete offset.
7. Align last-word chip tension eligibility with BGM/haptic eligibility.
8. Gate found-chip, header, and victory micro-motion under reduced motion.
9. Cancel delayed trace sounds on unmount.
10. Remove unreachable invalid-flash animation code that contradicts the game
    mechanics, while preserving valid-word feedback.

### B. Navigation and screen flicker

1. Make stack and tab options motion-aware.
2. Remove triple-stacked entrances from Modes and Collections.
3. Make tab-root entrance behavior consistent without replaying large
   cascades on every focus.
4. Replace abrupt Game-to-next-Game forward pushes with the selected
   same-route transition.
5. Stabilize onboarding-to-main handoff.
6. Coordinate tab-bar hide/show with Game transition so it does not vanish in
   an unrelated frame.
7. Verify loading/skeleton/content swaps retain opaque backgrounds and stable
   dimensions.
8. Verify modal open/close paths do not hard-unmount before their exit state.

### C. Reduced motion and continuous work

1. Centralize preference resolution/subscription.
2. Gate ambient backdrops, home synthwave elements, onboarding loops,
   tutorial pointers, urgency pulses, reward timers, progress loops, and
   decorative scan/glint effects.
3. Convert all ceremony cards and victory choreography to static final states
   under reduced motion.
4. Gate `LayoutAnimation`, selection bounce, score/progress bounce, found-word
   chip bounce, and post-loss/offer motion.
5. Stop loops when screens blur even if navigation freezing is unavailable.

### D. Lifecycle and rendering performance

1. Clean up Grid listeners and all animation sequences on unmount.
2. Audit every timeout/interval/event listener touched by this project.
3. Isolate timer ticks from GameScreen and GameHeader.
4. Virtualize the global leaderboard rows.
5. Defer prestige and season-pass decoration mounts.
6. Remove confirmed dead animation components only after import/reachability
   tests prove they are unused.
7. Measure before changing intentional legacy native-driver gravity code.

### E. Ceremony correctness and accessibility

1. Add modal semantics and hide background descendants from screen readers.
2. Centralize consistent dismiss behavior.
3. Move quest-step reward delivery to the exactly-once grant path.
4. Remove duplicated quest reward text.
5. Normalize overlay layer ordering.
6. Preserve the 22-of-22 router coverage guard.

## Error Handling

- Failure to query motion preference degrades to reduced motion, never to
  forced animation.
- Animation completion callbacks check `finished` and current run ID before
  mutating state.
- Delayed callbacks are registered with component-owned cancellation.
- Overlay errors continue through `LocalErrorBoundary`; skipping a broken
  visual cannot skip an already-earned reward.
- Geometry helpers reject empty/invalid dimensions with stable centered or
  empty outputs rather than `NaN` transforms.
- Board generation and gameplay state remain source-of-truth; visual failures
  cannot mutate puzzle outcomes.

## Testing Strategy

Implementation follows red-green-refactor. Every behavior change begins with
a failing test that demonstrates the defect.

### Automated tests

- motion preference initial resolution, live updates, and listener cleanup
- navigation options under normal and reduced motion
- grid bounds for down, up, fixed-hole, and all gravity-flip phases
- hit-test agreement with rendered bounds
- stable cell identity across gravity, undo, retry, and rapid clears
- fall listener cleanup on completion, interruption, and unmount
- last-word tension eligibility parity
- timer countdown render isolation
- no `LayoutAnimation` under reduced motion
- PuzzleComplete static choreography under reduced motion
- parameterized ceremony reduced-motion and dismiss contract
- ceremony modal semantics
- quest-step exactly-once reward grant and copy
- overlay timeout/animation cleanup
- ceremony router 22-of-22 parity
- leaderboard virtualization data/header behavior
- screen reachability guard

### Existing suites

Run targeted tests after each workstream, then:

```bash
npm run typecheck
npm test
```

The engine benchmark suites remain mandatory when Grid or mode behavior is
touched:

```bash
npm test -- src/engine/__tests__/boardGen.perf.test.ts
npm test -- src/engine/__tests__/hintPerf.test.ts
npm test -- src/engine/__tests__/modeSolvability.test.ts
```

Production bundling is mandatory because Hermes/worklet failures can pass
typecheck and Jest:

```bash
npx expo export --platform android
```

### Manual motion/flicker matrix

When a compatible dev client/device is available, record:

- all five tab roots and every stack push/pop path
- onboarding completion handoff
- Settings from Home and Profile
- Game from Home and Play
- next-level Game replacement
- each of the 22 ceremony variants through the real `CeremonyRouter` and queue
- every non-ceremony modal/overlay entrance and dismissal
- normal motion and OS reduced motion
- portrait and landscape where supported
- one clean flow in each of the 10 modes
- rapid consecutive clears, undo during/after gravity, retry, stuck rescue,
  timeout, perfect-solve failure, shrink event, and all four gravity
  directions

The critical flicker capture uses high-frame-rate recording and frame-by-frame
review around:

- word resolution
- first committed gravity frame
- mid-fall interruption
- final settle
- result overlay mount
- next-level transition
- screen and modal replacement

If a native device is unavailable in the cloud environment, automated
geometry/lifecycle tests and Android production export remain mandatory, and
the unperformed device-only checks are reported explicitly rather than
claimed.

## Acceptance Criteria

- Every visible tile is tappable at its rendered location during every
  `gravityFlip` direction.
- No tile flashes at its destination before falling, teleports on rapid
  clears, or retains an obsolete transform after undo/retry.
- Selection trails, ghosts, glints, and particles align with their cells.
- No screen exposes a background-color flash during transition or content
  swap.
- No route runs more than one full-screen entrance animation.
- Returning to a tab does not replay a large stagger cascade.
- Reduced motion is honored from the first animated frame and across every
  audited surface.
- No animation listener, loop, timeout, or delayed audio callback survives
  its owner.
- `timePressure` ticks do not reconcile GameScreen or GameHeader.
- Ceremony focus cannot escape to content underneath.
- Earned rewards survive dismissal avoidance or process death and are granted
  once.
- All targeted tests, full Jest, typecheck, engine benchmarks, and Android
  Hermes export pass.
- Normal-motion visuals preserve the existing Wordfall aesthetic and
  gameplay timing unless a timing value is directly responsible for a
  verified defect.

## Non-Goals

- New art direction, colors, typography, screen layouts, or reward concepts
- New puzzle modes or gameplay mechanics
- Reintroducing invalid-word, chain, combo, or cascade feedback
- Wholesale Reanimated migration without measured benefit
- GPU shader/VFX work
- Audio commissioning
- Activating the currently unregistered Weekly Leaderboard route
