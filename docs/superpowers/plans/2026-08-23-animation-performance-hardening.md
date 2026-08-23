# Wordfall Animation, Performance, and Flicker Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate verified puzzle-animation, flicker, rendering-performance, lifecycle, and reduced-motion defects across every live Wordfall surface without redesigning the game.

**Architecture:** Establish one concurrent-safe motion-preference store, make navigation the sole owner of full-screen transitions, and drive every Grid visual/hit-test coordinate from one pure geometry module. Keep the existing native-driver gravity pipeline, but make it direction-correct and interruption-safe. Move high-frequency timer state into selector-connected leaves and standardize ceremony transition/accessibility behavior without changing reward art.

**Tech Stack:** React Native 0.83.4, Expo SDK 55, React 19.2, TypeScript 5.8, React Navigation 7, Reanimated 4.2.1, react-native-worklets 0.7.2, zustand 5, Jest 29/ts-jest.

## Global Constraints

- Preserve Wordfall's current dark neon visual language, authored assets, and game rules.
- Do not reintroduce invalid-word, chain, combo, cascade, move-limit, or tile-spawn mechanics.
- Add no dependencies.
- Keep Grid gravity on native-driven `Animated.ValueXY`; migrate only with measured evidence.
- Unknown or failed OS motion-preference resolution is motion-reduced.
- Reduced motion has no spatial motion, bounce, pulse, particles, shimmer, or decorative loops.
- One transition owner per route/layout mutation; no stacked full-screen entrances.
- Per-tap selection remains isolated from `GameScreen`.
- Every behavior change starts with a failing test.
- Run `npx expo export --platform android` before completion.

## File Structure

New focused modules:

- `src/services/motionPreference.ts` — singleton-safe external motion store and adapter.
- `src/navigation/motionOptions.ts` — pure stack/tab/same-route transition decisions.
- `src/components/game/gridGeometry.ts` — canonical bounds and hit-test calculations.
- `src/hooks/useCeremonyTransition.ts` — shared ceremony entrance/exit policy.
- `src/__tests__/motionCoverage.test.ts` — enumerated cross-screen motion contract.

Existing hot paths stay in place:

- `App.tsx` owns navigator configuration, onboarding handoff, and ceremony background isolation.
- `src/components/Grid.tsx` owns tile animation state and consumes canonical geometry.
- `src/screens/GameScreen.tsx` owns coarse puzzle effects, not timer ticks or per-tap state.
- `src/App/CeremonyRouter.tsx` keeps one explicit render case per `CeremonyItem`.

---

### Task 1: Centralize motion preference without startup flicker

**Files:**
- Create: `src/services/motionPreference.ts`
- Create: `src/services/__tests__/motionPreference.test.ts`
- Modify: `src/hooks/useReduceMotion.ts`
- Modify: `src/__mocks__/react-native.ts`

**Interfaces:**
- Produces: `MotionSnapshot { reduceMotion: boolean; resolved: boolean }`
- Produces: `createMotionPreferenceStore(adapter): MotionPreferenceStore`
- Produces: `useMotionPreference(): MotionSnapshot`
- Preserves: `useReduceMotion(): boolean`

- [ ] **Step 1: Write the failing store tests**

```ts
import { createMotionPreferenceStore } from '../motionPreference';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test('defaults to a settled reduced-motion snapshot until the OS resolves', () => {
  const query = deferred<boolean>();
  const store = createMotionPreferenceStore({
    isReduceMotionEnabled: () => query.promise,
    addReduceMotionListener: () => () => {},
  });
  expect(store.getSnapshot()).toEqual({ reduceMotion: true, resolved: false });
});

test('initializes once, publishes the OS result, and removes one listener', async () => {
  const query = deferred<boolean>();
  const remove = jest.fn();
  const add = jest.fn(() => remove);
  const store = createMotionPreferenceStore({
    isReduceMotionEnabled: () => query.promise,
    addReduceMotionListener: add,
  });
  const first = jest.fn();
  const second = jest.fn();
  const offFirst = store.subscribe(first);
  const offSecond = store.subscribe(second);
  expect(add).toHaveBeenCalledTimes(1);
  query.resolve(false);
  await query.promise;
  await Promise.resolve();
  expect(store.getSnapshot()).toEqual({ reduceMotion: false, resolved: true });
  offFirst();
  expect(remove).not.toHaveBeenCalled();
  offSecond();
  expect(remove).toHaveBeenCalledTimes(1);
});

test('fails motion-safe and ignores late query results after disposal', async () => {
  const query = deferred<boolean>();
  const store = createMotionPreferenceStore({
    isReduceMotionEnabled: () => query.promise,
    addReduceMotionListener: () => () => {},
  });
  const off = store.subscribe(jest.fn());
  off();
  query.resolve(false);
  await query.promise;
  await Promise.resolve();
  expect(store.getSnapshot()).toEqual({ reduceMotion: true, resolved: false });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- src/services/__tests__/motionPreference.test.ts`

Expected: FAIL because `motionPreference.ts` does not exist.

- [ ] **Step 3: Implement the external store**

```ts
export interface MotionSnapshot {
  reduceMotion: boolean;
  resolved: boolean;
}

export interface MotionAccessibilityAdapter {
  isReduceMotionEnabled(): Promise<boolean>;
  addReduceMotionListener(listener: (enabled: boolean) => void): () => void;
}

export interface MotionPreferenceStore {
  getSnapshot(): MotionSnapshot;
  subscribe(listener: () => void): () => void;
}

const INITIAL: MotionSnapshot = { reduceMotion: true, resolved: false };

export function createMotionPreferenceStore(
  adapter: MotionAccessibilityAdapter,
): MotionPreferenceStore {
  let snapshot = INITIAL;
  let initialized = false;
  let generation = 0;
  let removeNativeListener: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const publish = (next: MotionSnapshot) => {
    if (snapshot.reduceMotion === next.reduceMotion && snapshot.resolved === next.resolved) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const initialize = () => {
    if (initialized) return;
    initialized = true;
    const currentGeneration = ++generation;
    removeNativeListener = adapter.addReduceMotionListener((reduceMotion) => {
      if (currentGeneration === generation) publish({ reduceMotion, resolved: true });
    });
    adapter.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (currentGeneration === generation) publish({ reduceMotion, resolved: true });
      })
      .catch(() => {
        if (currentGeneration === generation) publish({ reduceMotion: true, resolved: true });
      });
  };
  const dispose = () => {
    generation += 1;
    initialized = false;
    removeNativeListener?.();
    removeNativeListener = null;
    snapshot = INITIAL;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      initialize();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) dispose();
      };
    },
  };
}
```

Wire the singleton adapter to `AccessibilityInfo`, then implement both hooks with
`useSyncExternalStore`. Extend the RN mock with controllable
`AccessibilityInfo.isReduceMotionEnabled()` and `addEventListener()`.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm test -- src/services/__tests__/motionPreference.test.ts
npm run typecheck
```

Expected: all motion-store tests pass; typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/services/motionPreference.ts src/services/__tests__/motionPreference.test.ts src/hooks/useReduceMotion.ts src/__mocks__/react-native.ts
git commit -m "fix: centralize reduced motion state"
```

---

### Task 2: Give navigation sole ownership of screen transitions

**Files:**
- Create: `src/navigation/motionOptions.ts`
- Create: `src/navigation/__tests__/motionOptions.test.ts`
- Modify: `App.tsx`
- Modify: `src/components/common/ScreenScaffold.tsx`
- Modify: `src/components/navigation/NeonTabBar.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/ModesScreen.tsx`
- Modify: `src/screens/CollectionsScreen.tsx`
- Modify: `src/screens/ShopScreen.tsx`
- Delete: `src/components/ScreenEntrance.tsx`

**Interfaces:**
- Consumes: `useReduceMotion()`
- Produces: `getStackMotionOptions(reduceMotion): StackNavigationOptions`
- Produces: `getTabAnimation(reduceMotion): 'none' | 'shift'`
- Produces: `getGameRouteMotion(sameRoute, reduceMotion): StackNavigationOptions`

- [ ] **Step 1: Write failing pure-option and reachability tests**

```ts
import {
  getGameRouteMotion,
  getStackMotionOptions,
  getTabAnimation,
} from '../motionOptions';

test('reduced motion disables spatial stack and tab transitions', () => {
  expect(getStackMotionOptions(true).animationEnabled).toBe(false);
  expect(getTabAnimation(true)).toBe('none');
});

test('normal motion retains the Wordfall stack spring and tab shift', () => {
  const options = getStackMotionOptions(false);
  expect(options.animationEnabled).not.toBe(false);
  expect(options.cardStyleInterpolator).toBeDefined();
  expect(options.transitionSpec?.open.animation).toBe('spring');
  expect(getTabAnimation(false)).toBe('shift');
});

test('same-route Game replacement uses fade only for normal motion', () => {
  expect(getGameRouteMotion(true, true).animationEnabled).toBe(false);
  expect(getGameRouteMotion(true, false).cardStyleInterpolator).toBeDefined();
  expect(getGameRouteMotion(false, false)).toEqual({});
});
```

Extend `src/__tests__/screenReachability.test.ts`:

```ts
expect(appSource).not.toContain("from './src/components/ScreenEntrance'");
expect(scaffoldSource).not.toContain('Animated.timing(enterAnim');
expect(homeSource).not.toContain('Animated.spring(titleAnim');
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm test -- src/navigation/__tests__/motionOptions.test.ts
npm test -- src/__tests__/screenReachability.test.ts
```

Expected: missing module plus legacy entrance assertions fail.

- [ ] **Step 3: Extract options and wire all six stacks**

Move the existing spring/timing/interpolator values unchanged into
`motionOptions.ts`. Each stack component calls `useReduceMotion()` and passes
`getStackMotionOptions(reduceMotion)` to its navigator. `MainTabs` uses
`animation: getTabAnimation(reduceMotion)`.

For next-level calls, add `sameRouteTransition: true` to the four
`navigation.replace('Game', ...)` payloads. Both Game registrations use:

```tsx
options={({ route }) =>
  getGameRouteMotion(route.params?.sameRouteTransition === true, reduceMotion)
}
```

The normal same-route option uses `CardStyleInterpolators.forFadeFromCenter`
with a 180ms timing spec. Reduced motion disables it.

- [ ] **Step 4: Remove competing full-screen entrances**

- Render `ScreenScaffold` body in a plain `View`; remove `enterAnim`.
- Remove every `ScreenEntrance` wrapper from Modes and Collections.
- Remove Home's `titleAnim`/`contentAnim` mount effect and settled transforms.
- Remove Shop's full-section mount cascade while preserving local card
  interaction animation.
- Delete `ScreenEntrance.tsx` after its import count reaches zero.
- Keep meaningful local state transitions (Library wing reveal, tab pill,
  claim feedback) because they do not animate the whole route.

- [ ] **Step 5: Coordinate custom tab-bar hide/show**

Replace the immediate `return null` with an owned visibility animation:

```ts
const reduceMotion = useReduceMotion();
const hidden = focusedTabBarStyle?.display === 'none';
const [mounted, setMounted] = useState(!hidden);
const visibility = useRef(new Animated.Value(hidden ? 0 : 1)).current;

useEffect(() => {
  if (!hidden) setMounted(true);
  if (reduceMotion) {
    visibility.setValue(hidden ? 0 : 1);
    setMounted(!hidden);
    return;
  }
  const animation = Animated.timing(visibility, {
    toValue: hidden ? 0 : 1,
    duration: hidden ? 140 : 180,
    useNativeDriver: true,
  });
  animation.start(({ finished }) => {
    if (finished && hidden) setMounted(false);
  });
  return () => animation.stop();
}, [hidden, reduceMotion, visibility]);
```

Wrap the bar with opacity/translateY and `pointerEvents={hidden ? 'none' : 'auto'}`.
When `mounted` is false, return `null` only after hooks and exit completion.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -- src/navigation/__tests__/motionOptions.test.ts
npm test -- src/__tests__/screenReachability.test.ts
npm run typecheck
```

Expected: option and reachability tests pass; no `ScreenEntrance` imports.

- [ ] **Step 7: Commit**

```bash
git add App.tsx src/navigation src/components/common/ScreenScaffold.tsx src/components/navigation/NeonTabBar.tsx src/screens/HomeScreen.tsx src/screens/ModesScreen.tsx src/screens/CollectionsScreen.tsx src/screens/ShopScreen.tsx src/components/ScreenEntrance.tsx
git commit -m "fix: unify screen transition ownership"
```

---

### Task 3: Make Grid geometry authoritative in all four gravity directions

**Files:**
- Create: `src/components/game/gridGeometry.ts`
- Create: `src/components/game/__tests__/gridGeometry.test.ts`
- Modify: `src/components/Grid.tsx`
- Modify: `src/screens/game/PlayField.tsx`
- Modify: `src/screens/GameScreen.tsx`
- Modify: `src/components/game/SelectionTrailOverlay.tsx`
- Modify: `src/__tests__/feelPolish.test.ts`

**Interfaces:**
- Produces: `CellBound { row; col; cellId; x; y; w; h }`
- Produces: `computeGridMetrics(rows, cols, maxWidth, maxHeight, gap, frameAllowance)`
- Produces: `computeGridGeometry(grid, cellSize, gap): GridGeometry`
- Produces: `hitTestGridGeometry(geometry, x, y, wildcardMode): CellPosition | null`
- Consumes: engine-owned row/column positions after `applyGravityInDirection`

- [ ] **Step 1: Write failing direction and hit-test tests**

```ts
import { applyGravityInDirection } from '../../../engine/gravity';
import { computeGridGeometry, computeGridMetrics, hitTestGridGeometry } from '../gridGeometry';
import { Grid } from '../../../types';

const cell = (id: string) => ({ id, letter: id });
const source: Grid = [
  [cell('A'), null, cell('C')],
  [null, cell('B'), null],
  [null, null, null],
];

test.each([
  ['down', 2, 0],
  ['up', 0, 0],
] as const)('%s gravity renders and hits the engine row', (direction, row, col) => {
  const grid = applyGravityInDirection(source, direction);
  const geometry = computeGridGeometry(grid, 40, 4);
  const bound = geometry.byCellId.get('A')!;
  expect(bound.row).toBe(row);
  expect(bound.y).toBe(row * 44);
  expect(hitTestGridGeometry(geometry, bound.x + 20, bound.y + 20, false))
    .toEqual({ row, col });
});

test.each([
  ['left', 0],
  ['right', 2],
] as const)('%s gravity preserves the engine row and horizontal slot', (direction, expectedCol) => {
  const grid = applyGravityInDirection(source, direction);
  const geometry = computeGridGeometry(grid, 40, 4);
  const bound = geometry.byCellId.get('C')!;
  expect(bound.row).toBe(0);
  expect(bound.col).toBe(expectedCol);
  expect(bound.x).toBe(2 + expectedCol * 44);
});

test('fixed holes are not collapsed into another visual row', () => {
  const geometry = computeGridGeometry(source, 40, 4);
  expect(geometry.byCellId.get('B')?.y).toBe(44);
  expect(hitTestGridGeometry(geometry, 2 + 44, 20, false)).toBeNull();
});

test('wildcard mode returns the addressed empty slot', () => {
  const geometry = computeGridGeometry(source, 40, 4);
  expect(hitTestGridGeometry(geometry, 2 + 44 + 20, 20, true))
    .toEqual({ row: 0, col: 1 });
});

test('invalid dimensions return stable empty metrics without NaN', () => {
  expect(computeGridMetrics(0, 0, 375, 400, 4, 58)).toEqual({
    cellSize: 0,
    stride: 0,
    gridWidth: 0,
    gridHeight: 0,
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/components/game/__tests__/gridGeometry.test.ts`

Expected: FAIL because the canonical geometry module does not exist.

- [ ] **Step 3: Implement canonical row/column geometry**

```ts
import { CellPosition, Grid } from '../../types';

export interface CellBound {
  row: number;
  col: number;
  cellId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridGeometry {
  rows: number;
  cols: number;
  stride: number;
  padding: number;
  width: number;
  height: number;
  bounds: CellBound[];
  byCellId: Map<string, CellBound>;
  byPosition: Map<string, CellBound>;
}

export interface GridMetrics {
  cellSize: number;
  stride: number;
  gridWidth: number;
  gridHeight: number;
}

export function computeGridMetrics(
  rows: number,
  cols: number,
  maxWidth: number,
  maxHeight: number,
  gap: number,
  frameAllowance: number,
): GridMetrics {
  if (
    rows <= 0 || cols <= 0 || maxWidth <= 0 || maxHeight <= 0 ||
    ![rows, cols, maxWidth, maxHeight, gap, frameAllowance].every(Number.isFinite)
  ) {
    return { cellSize: 0, stride: 0, gridWidth: 0, gridHeight: 0 };
  }
  const widthBased = Math.floor((maxWidth - gap * (cols + 1)) / cols);
  const heightBased = Math.floor((maxHeight - frameAllowance) / rows - gap);
  const cellSize = Math.max(0, Math.min(widthBased, heightBased));
  const stride = cellSize > 0 ? cellSize + gap : 0;
  return {
    cellSize,
    stride,
    gridWidth: stride > 0 ? cols * stride + gap : 0,
    gridHeight: stride > 0 ? rows * stride : 0,
  };
}

export function computeGridGeometry(grid: Grid, cellSize: number, gap: number): GridGeometry {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const stride = cellSize + gap;
  const padding = gap / 2;
  const bounds: CellBound[] = [];
  const byCellId = new Map<string, CellBound>();
  const byPosition = new Map<string, CellBound>();
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const current = grid[row]?.[col];
      if (!current) continue;
      const bound = {
        row,
        col,
        cellId: current.id,
        x: padding + col * stride,
        y: row * stride,
        w: stride,
        h: stride,
      };
      bounds.push(bound);
      byCellId.set(current.id, bound);
      byPosition.set(`${row},${col}`, bound);
    }
  }
  return {
    rows,
    cols,
    stride,
    padding,
    width: cols * stride + gap,
    height: rows * stride,
    bounds,
    byCellId,
    byPosition,
  };
}

export function hitTestGridGeometry(
  geometry: GridGeometry,
  x: number,
  y: number,
  wildcardMode: boolean,
): CellPosition | null {
  if (geometry.stride <= 0 || x < geometry.padding || y < 0) return null;
  const col = Math.floor((x - geometry.padding) / geometry.stride);
  const row = Math.floor(y / geometry.stride);
  if (row < 0 || row >= geometry.rows || col < 0 || col >= geometry.cols) return null;
  const position = { row, col };
  if (wildcardMode) return position;
  return geometry.byPosition.has(`${row},${col}`) ? position : null;
}
```

These helpers centralize the sizing formula currently duplicated in Grid and
GameScreen. Hit-testing derives row/column arithmetically, returns empty slots
only in wildcard mode, and otherwise resolves through `byPosition`.

- [ ] **Step 4: Replace Grid's second layout model**

- Remove compacted-column `cellBounds` calculation.
- Render one slot per engine row, including null placeholders, for every mode.
- Remove `noGravityLayout` and the `columnGravityUp` flex special case.
- Consume `geometry.bounds` for trail, ghosts, glints, fall diffs, and hit-test.
- Use `computeGridMetrics` in both Grid and GameScreen; remove their copied
  cell-size calculations.
- Compute GameScreen particle centers from `computeGridGeometry` plus the
  measured grid area's actual left/top offsets.
- Keep `key={cell.id}` for tiles and `empty-${row}-${col}` for placeholders.
- Pass no layout-mode prop from `PlayField`; the engine grid is authoritative.
- Replace the copied `cellPositionToScreen` formula in `feelPolish.test.ts`
  with assertions against `computeGridGeometry`.

- [ ] **Step 5: Verify GREEN plus mode solvability**

Run:

```bash
npm test -- src/components/game/__tests__/gridGeometry.test.ts
npm test -- src/__tests__/feelPolish.test.ts
npm test -- src/engine/__tests__/modeSolvability.test.ts
npm run typecheck
```

Expected: geometry and existing mode suites pass; no compacted flex branch remains.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/gridGeometry.ts src/components/game/__tests__/gridGeometry.test.ts src/components/Grid.tsx src/screens/game/PlayField.tsx src/screens/GameScreen.tsx src/components/game/SelectionTrailOverlay.tsx src/__tests__/feelPolish.test.ts
git commit -m "fix: align grid geometry in every gravity direction"
```

---

### Task 4: Make gravity and puzzle effects interruption-safe

**Files:**
- Modify: `src/components/game/gridGeometry.ts`
- Modify: `src/components/game/__tests__/gridGeometry.test.ts`
- Modify: `src/components/Grid.tsx`
- Modify: `src/screens/game/PlayField.tsx`
- Modify: `src/screens/GameScreen.tsx`
- Modify: `src/screens/game/GameFlashes.tsx`
- Create: `src/__tests__/gameAnimationLifecycle.test.ts`

**Interfaces:**
- Produces: `computeGridTransition(previous, next, liveOffsets): GridTransition`
- Preserves: current visual offset handoff for interrupted falls
- Removes: unreachable invalid-word animation path

- [ ] **Step 1: Add failing destination-flash and interruption tests**

```ts
import fs from 'fs';
import path from 'path';
import { computeGridTransition } from '../../components/game/gridGeometry';

test('inverse transform paints a moved tile at its previous visual position', () => {
  const previous = new Map([['A', { cellId: 'A', row: 0, col: 0, x: 2, y: 0, w: 44, h: 44 }]]);
  const next = new Map([['A', { cellId: 'A', row: 2, col: 0, x: 2, y: 88, w: 44, h: 44 }]]);
  const diff = computeGridTransition(previous, next, new Map());
  expect(diff.falls).toEqual([{ id: 'A', dx: 0, dy: -88, col: 0 }]);
  expect(next.get('A')!.y + diff.falls[0].dy).toBe(previous.get('A')!.y);
});

test('successor fall starts from an interrupted tile current visual offset', () => {
  const previous = new Map([['A', { cellId: 'A', row: 0, col: 0, x: 2, y: 0, w: 44, h: 44 }]]);
  const next = new Map([['A', { cellId: 'A', row: 2, col: 0, x: 2, y: 88, w: 44, h: 44 }]]);
  const live = new Map([['A', { x: 0, y: 30 }]]);
  expect(computeGridTransition(previous, next, live).falls[0].dy).toBe(-58);
});

test('removed cells become stable ghost entries, not destination tiles', () => {
  const previous = new Map([['A', { cellId: 'A', row: 0, col: 0, x: 2, y: 0, w: 44, h: 44 }]]);
  const diff = computeGridTransition(previous, new Map(), new Map());
  expect(diff.falls).toHaveLength(0);
  expect(diff.ghosts[0]).toMatchObject({ id: 'A', x: 2, y: 0 });
});
```

Add source-contract checks:

```ts
const grid = fs.readFileSync(path.join(__dirname, '../components/Grid.tsx'), 'utf8');
const game = fs.readFileSync(path.join(__dirname, '../screens/GameScreen.tsx'), 'utf8');
expect(grid).toContain('return () => {');
expect(grid).toContain('removeListener(handle)');
expect(game).not.toContain('showInvalidFlashAnim');
expect(game).not.toContain('LayoutAnimation.configureNext');
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm test -- src/components/game/__tests__/gridGeometry.test.ts
npm test -- src/__tests__/gameAnimationLifecycle.test.ts
```

Expected: missing transition helper and lifecycle assertions fail.

- [ ] **Step 3: Extract the render-phase transition diff**

Move the ID-based bounds diff from `Grid.tsx` into
`computeGridTransition()`. Call it during render before commit and immediately
install each returned inverse transform on its stable `Animated.ValueXY`.

Store every started fall sequence:

```ts
const activeFallsRef = useRef(new Map<string, Animated.CompositeAnimation>());
const sequence = Animated.sequence([/* existing hold, fall, rebound, settle */]);
activeFallsRef.current.set(f.id, sequence);
sequence.start(({ finished }) => {
  if (activeFallsRef.current.get(f.id) === sequence) {
    activeFallsRef.current.delete(f.id);
  }
  if (!finished) return;
  // existing run-id guarded settle path
});
```

Add one unmount cleanup that increments `fallRunIdRef`, stops every active
sequence, removes every listener handle from its owning `ValueXY`, and clears
fall/live/listener maps. Give `GhostTile` and glint sequences equivalent
`animation.stop()` cleanups.

- [ ] **Step 4: Remove competing and unreachable effects**

- Remove `LayoutAnimation` from undo and retry; Grid exclusively animates tile
  layout changes.
- Remove `showInvalidFlashAnim`, invalid flash state/value/props, and dead
  `GameFlashes` rendering. Silent trace release remains authoritative.
- Track PlayField's 22ms tap-sound timeout IDs in a Set and clear them on
  unmount.
- Capture every GameScreen word-clear effect dependency explicitly; because
  `prevScoreRef` is updated first, non-score dependency changes safely yield
  `diff === 0` and do not replay a celebration.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- src/components/game/__tests__/gridGeometry.test.ts
npm test -- src/__tests__/gameAnimationLifecycle.test.ts
npm test -- src/__tests__/feelPolish.test.ts
npm run typecheck
```

Expected: inverse-position, interruption, cleanup, and source contracts pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/gridGeometry.ts src/components/game/__tests__/gridGeometry.test.ts src/components/Grid.tsx src/screens/game/PlayField.tsx src/screens/GameScreen.tsx src/screens/game/GameFlashes.tsx src/__tests__/gameAnimationLifecycle.test.ts
git commit -m "fix: prevent puzzle animation flicker and leaks"
```

---

### Task 5: Isolate timer ticks and align gameplay motion policy

**Files:**
- Create: `src/utils/gameMotion.ts`
- Create: `src/utils/__tests__/gameMotion.test.ts`
- Create: `src/screens/game/TimerMovesBars.tsx`
- Modify: `src/screens/GameScreen.tsx`
- Modify: `src/screens/game/PlayField.tsx`
- Modify: `src/components/GameHeader.tsx`
- Modify: `src/components/LetterCell.tsx`
- Modify: `src/components/WordBank.tsx`
- Create: `src/__tests__/gameRenderIsolation.test.ts`

**Interfaces:**
- Produces: `isLastWordTensionActive(totalWords, remainingWords, status): boolean`
- Produces: `ConnectedTimerMovesBars`
- Consumes: `useGameStore(s => s.timeRemaining)` only inside timer leaf

- [ ] **Step 1: Write failing policy and source-isolation tests**

```ts
import { isLastWordTensionActive } from '../gameMotion';

test.each([
  [2, 1, 'playing', false],
  [3, 1, 'playing', false],
  [4, 1, 'playing', true],
  [8, 2, 'playing', false],
  [8, 1, 'complete', false],
] as const)(
  'tension eligibility total=%s remaining=%s status=%s',
  (total, remaining, status, expected) => {
    expect(isLastWordTensionActive(total, remaining, status)).toBe(expected);
  },
);
```

`gameRenderIsolation.test.ts` reads the relevant files and asserts:

```ts
expect(gameScreenSource).not.toContain('useStore(store, s => s.timeRemaining)');
expect(gameScreenSource).not.toContain('timeRemaining={timeRemaining}');
expect(gameHeaderSource).not.toContain('timeRemaining?: number');
expect(timerSource).toContain('useGameStore(s => s.timeRemaining)');
expect(playFieldSource).toContain('isLastWordTensionActive');
expect(gameScreenSource).toContain('isLastWordTensionActive');
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm test -- src/utils/__tests__/gameMotion.test.ts
npm test -- src/__tests__/gameRenderIsolation.test.ts
```

Expected: helper/connected timer missing and GameScreen still owns timer state.

- [ ] **Step 3: Extract the connected timer leaf**

Move `TimerMovesBarsMemo` into `TimerMovesBars.tsx` and export:

```tsx
export const ConnectedTimerMovesBars = React.memo(function ConnectedTimerMovesBars({
  hasTimer,
  hasMoveLimit,
  totalSeconds,
  maxMoves,
}: {
  hasTimer: boolean;
  hasMoveLimit: boolean;
  totalSeconds: number;
  maxMoves: number;
}) {
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const moves = useGameStore((state) => state.moves);
  // Existing threshold refs/effect and exact visual markup.
});
```

Remove GameScreen's `timeRemaining` selector. Remove the unused prop from
`GameHeader`. Keep `moves` in GameScreen because the header displays it and it
changes only per completed word, not per timer tick.

- [ ] **Step 4: Share tension eligibility**

```ts
export function isLastWordTensionActive(
  totalWords: number,
  remainingWords: number,
  status: string,
): boolean {
  return totalWords >= 4 && remainingWords === 1 && status === 'playing';
}
```

Use it in both GameScreen's BGM/haptic effect and ConnectedWordBank's
`tensionActive`. This removes the 2–3-word visual/audio mismatch.

- [ ] **Step 5: Gate gameplay micro-motion**

- Replace GameScreen's local `AccessibilityInfo` subscription with
  `useReduceMotion()`.
- Use that value for auto-advance timing instead of a second async OS query.
- In `LetterCell`, set `scaleAnim.value = 1` and skip the selection sequence
  under reduced motion.
- In `GameHeader`, skip flawless, score, and progress springs; set final shared
  values directly.
- In `WordBank`, show the found state immediately and skip the three-spring
  found-chip bounce under reduced motion.
- Preserve static selected/valid/found/tension colors and borders.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -- src/utils/__tests__/gameMotion.test.ts
npm test -- src/__tests__/gameRenderIsolation.test.ts
npm test -- src/__tests__/feelPolish.test.ts
npm run typecheck
```

Expected: timer ownership and tension parity tests pass; typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/utils/gameMotion.ts src/utils/__tests__/gameMotion.test.ts src/screens/game/TimerMovesBars.tsx src/screens/GameScreen.tsx src/screens/game/PlayField.tsx src/components/GameHeader.tsx src/components/LetterCell.tsx src/components/WordBank.tsx src/__tests__/gameRenderIsolation.test.ts
git commit -m "fix: isolate timer ticks and gameplay motion"
```

---

### Task 6: Standardize victory and ceremony motion, focus, and rewards

**Files:**
- Create: `src/hooks/useCeremonyTransition.ts`
- Create: `src/hooks/__tests__/ceremonyTransition.test.ts`
- Modify: `src/components/PuzzleComplete.tsx`
- Modify: `src/components/victory/NeonStarBurst.tsx`
- Modify: `src/components/FeatureUnlockCeremony.tsx`
- Modify: `src/components/ModeUnlockCeremony.tsx`
- Modify: `src/components/AchievementCeremony.tsx`
- Modify: `src/components/StreakMilestoneCeremony.tsx`
- Modify: `src/components/CollectionCompleteCeremony.tsx`
- Modify: `src/components/MilestoneCeremony.tsx`
- Modify: `src/components/PrestigeResetCeremony.tsx`
- Modify: `src/components/SeasonPassCompleteCeremony.tsx`
- Modify: `src/components/FirstPurchaseOfferModal.tsx`
- Modify: `src/App/CeremonyRouter.tsx`
- Modify: `src/utils/ceremonyGrants.ts`
- Modify: `src/utils/__tests__/ceremonyGrants.test.ts`
- Modify: `src/__tests__/ceremonyCoverage.test.ts`
- Modify: `App.tsx`

**Interfaces:**
- Produces: `getCeremonyMotionPlan(reduceMotion): CeremonyMotionPlan`
- Produces: `useCeremonyTransition(onDismiss)`
- Consumes: `scheduleOnRN` for normal-motion exit completion
- Changes: `quest_step_complete` joins `ceremonyEconomyGrant`

- [ ] **Step 1: Write failing transition and reward tests**

```ts
import { getCeremonyMotionPlan } from '../useCeremonyTransition';

test('reduced motion uses settled values and instant dismissal', () => {
  expect(getCeremonyMotionPlan(true)).toEqual({
    initialOpacity: 1,
    initialScale: 1,
    enterDurationMs: 0,
    exitDurationMs: 0,
    animateDecorations: false,
  });
});

test('normal motion keeps one concise entrance and faster exit', () => {
  const plan = getCeremonyMotionPlan(false);
  expect(plan.initialOpacity).toBe(0);
  expect(plan.initialScale).toBeLessThan(1);
  expect(plan.enterDurationMs).toBeGreaterThan(plan.exitDurationMs);
  expect(plan.animateDecorations).toBe(true);
});
```

Add to `ceremonyGrants.test.ts`:

```ts
test('quest step rewards are credited at pop time', () => {
  expect(ceremonyEconomyGrant({
    type: 'quest_step_complete',
    data: { rewardCoins: 75, rewardGems: 4 },
  })).toEqual({ coins: 75, gems: 4, hintTokens: 0, rareTile: false });
});
```

Add router source contracts:

```ts
expect(routerSource).not.toContain('economy.addCoins');
expect(routerSource).not.toContain('economy.addGems');
expect(routerSource).not.toContain('rewardLabel={activeCeremony.data.description}');
expect(appSource).toContain('importantForAccessibility=');
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm test -- src/hooks/__tests__/ceremonyTransition.test.ts
npm test -- src/utils/__tests__/ceremonyGrants.test.ts
npm test -- src/__tests__/ceremonyCoverage.test.ts
```

Expected: transition helper missing; quest grant and router contracts fail.

- [ ] **Step 3: Implement one ceremony transition policy**

```ts
export interface CeremonyMotionPlan {
  initialOpacity: number;
  initialScale: number;
  enterDurationMs: number;
  exitDurationMs: number;
  animateDecorations: boolean;
}

export function getCeremonyMotionPlan(reduceMotion: boolean): CeremonyMotionPlan {
  return reduceMotion
    ? { initialOpacity: 1, initialScale: 1, enterDurationMs: 0, exitDurationMs: 0, animateDecorations: false }
    : { initialOpacity: 0, initialScale: 0.94, enterDurationMs: 260, exitDurationMs: 160, animateDecorations: true };
}
```

`useCeremonyTransition(onDismiss)` owns overlay opacity/card scale, starts one
entrance, cancels both shared values on cleanup, and returns
`{ reduceMotion, animateDecorations, overlayStyle, cardStyle, requestDismiss }`.
`requestDismiss` calls immediately under reduced motion; otherwise it fades
and scales once, then uses `scheduleOnRN(onDismiss)` only when `finished`.

Replace each active ceremony component's duplicate root fade/scale and direct
dismiss callback with this hook. Gate icon/glow/fire loops on
`animateDecorations`. Preserve component-specific colors, copy, and art.

- [ ] **Step 4: Consolidate PuzzleComplete choreography**

- Replace the two competing card entrance effects with one owned
  `Animated.parallel`.
- Under reduced motion, set backdrop/card/ribbon/stats/actions/star values to
  their final state synchronously; do not run glitch, spring, stagger,
  `NeonStarBurst`, confetti, rays, drizzle, or star bounces.
- Under normal motion, retain the current durations in one sequence.
- Store the returned composite animation and stop it on unmount.
- Reuse `reduceMotion` for auto-advance; remove direct AccessibilityInfo query.
- Add a `reduceMotion` prop to `NeonStarBurst` and return a static final star
  treatment without its repeat loop.

- [ ] **Step 5: Fix ceremony focus and reward timing**

- Add `quest_step_complete` to `ceremonyEconomyGrant`.
- Drive its displayed label through `ceremonyGrantLabel`.
- Remove `economy` from `CeremonyRouterProps` and the router call site.
- Wrap the NavigationContainer region with:

```tsx
<View
  style={styles.navigationLayer}
  importantForAccessibility={activeCeremony ? 'no-hide-descendants' : 'auto'}
>
  <NavigationContainer>{/* existing navigators */}</NavigationContainer>
</View>
```

- Give every ceremony overlay `accessibilityViewIsModal`,
  `accessibilityRole="alert"`, and a descriptive label.
- Standardize ceremony z-index through one exported layer constant.
- Defer Prestige and Season Pass particles with the existing
  `useDeferredMount(280)` pattern.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -- src/hooks/__tests__/ceremonyTransition.test.ts
npm test -- src/utils/__tests__/ceremonyGrants.test.ts
npm test -- src/__tests__/ceremonyCoverage.test.ts
npm test -- src/__tests__/ceremonyQueue.test.ts
npm run typecheck
```

Expected: 22 router cases remain covered, grants are pop-time exactly once,
and all transition tests pass.

- [ ] **Step 7: Commit**

```bash
git add App.tsx src/hooks/useCeremonyTransition.ts src/hooks/__tests__/ceremonyTransition.test.ts src/components/PuzzleComplete.tsx src/components/victory/NeonStarBurst.tsx src/components/*Ceremony.tsx src/components/FirstPurchaseOfferModal.tsx src/App/CeremonyRouter.tsx src/utils/ceremonyGrants.ts src/utils/__tests__/ceremonyGrants.test.ts src/__tests__/ceremonyCoverage.test.ts
git commit -m "fix: standardize ceremony and victory motion"
```

---

### Task 7: Close reduced-motion and flicker gaps across screens and overlays

**Files:**
- Create: `src/__tests__/motionCoverage.test.ts`
- Modify: `src/components/common/AmbientBackdrop.tsx`
- Modify: `src/components/home/SynthwaveHomeBackdrop.tsx`
- Modify: `src/components/home/NeonHighwayProgress.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/OnboardingScreen.tsx`
- Modify: `src/components/TutorialOverlay.tsx`
- Modify: `src/components/ContextualOffer.tsx`
- Modify: `src/components/SessionEndReminder.tsx`
- Modify: `src/components/PostLossModal.tsx`
- Modify: `src/components/FailBreatherOffer.tsx`
- Modify: `src/components/NoLivesModal.tsx`
- Modify: `src/components/PostStreakBreakOffer.tsx`
- Modify: `src/components/LoginCalendar.tsx`
- Modify: `src/components/DailyRewardTimers.tsx`
- Modify: `src/components/common/ScanLineOverlay.tsx`
- Modify: `src/screens/EventScreen.tsx`

**Interfaces:**
- Consumes: centralized `useReduceMotion()`
- Preserves: static semantic states, focus gates, and all user actions
- Produces: one enumerated automated coverage ledger for every audited surface

- [ ] **Step 1: Write the failing coverage ledger**

```ts
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const REQUIRED = [
  'components/common/AmbientBackdrop.tsx',
  'components/home/SynthwaveHomeBackdrop.tsx',
  'components/home/NeonHighwayProgress.tsx',
  'screens/HomeScreen.tsx',
  'screens/OnboardingScreen.tsx',
  'components/TutorialOverlay.tsx',
  'components/ContextualOffer.tsx',
  'components/SessionEndReminder.tsx',
  'components/PostLossModal.tsx',
  'components/FailBreatherOffer.tsx',
  'components/NoLivesModal.tsx',
  'components/PostStreakBreakOffer.tsx',
  'components/LoginCalendar.tsx',
  'components/DailyRewardTimers.tsx',
  'components/common/ScanLineOverlay.tsx',
  'screens/EventScreen.tsx',
];

test.each(REQUIRED)('%s consumes the centralized motion policy', (relative) => {
  const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  expect(source).toMatch(/useReduceMotion|reduceMotion/);
});

test('no screen or component queries AccessibilityInfo motion state directly', () => {
  const allowed = path.join(ROOT, 'services/motionPreference.ts');
  const offenders: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== '__mocks__') visit(target);
      else if (/\.(ts|tsx)$/.test(entry.name) && target !== allowed) {
        const source = fs.readFileSync(target, 'utf8');
        if (source.includes('isReduceMotionEnabled(')) offenders.push(target);
      }
    }
  };
  visit(ROOT);
  expect(offenders).toEqual([]);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/__tests__/motionCoverage.test.ts`

Expected: listed surfaces without policy imports and direct OS queries fail.

- [ ] **Step 3: Gate continuous backdrop and progress work**

- `AmbientBackdrop`: use `ambientActive = isFocused && !reduceMotion`; render
  static gradients/images when false.
- `SynthwaveHomeBackdrop`: accept `focused={isFocused && !reduceMotion}` so
  stars, sun pulse, and flowing grid do not mount.
- `NeonHighwayProgress`: combine focus and reduced motion for both loops;
  cancel Reanimated values and reset to final state when disabled.
- `ScanLineOverlay`: force its animated sweep off while retaining static lines.
- Every loop cleanup calls `stop()` or `cancelAnimation()` and restores the
  settled value.

- [ ] **Step 4: Make onboarding phase swaps flicker-safe**

- Initialize welcome values settled when reduced motion is active.
- Skip the welcome pulse and omit `VideoBackground` under reduced motion,
  retaining the opaque image/gradient background.
- `transitionTo(nextPhase)` sets phase synchronously under reduced motion.
- Under normal motion, own one fade-out/fade-in composite and stop it before a
  successor transition or unmount.
- Track the tutorial's 500ms word-resolution timeout and cancel on unmount.
- Make `TutorialOverlay` pointer static under reduced motion.
- Keep one opaque root background mounted across welcome/tutorial/celebrate
  branches so phase replacement never exposes the app root for one frame.

- [ ] **Step 5: Gate overlays and local claims**

- `ContextualOffer`: no slide or urgency pulse under reduced motion; keep
  countdown text and expiry behavior.
- `SessionEndReminder` and `PostLossModal`: settled entrance and instant exit
  under reduced motion; stop composites on unmount.
- RN Modal surfaces select `animationType={reduceMotion ? 'none' : 'fade'}`.
- Login/reward ready states keep their color/checkmark but skip pulse loops.
- Event tier claims apply final claimed style immediately under reduced motion.
- All changed timeouts and intervals retain cleanup and use stable callbacks.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -- src/__tests__/motionCoverage.test.ts
npm test -- src/__tests__/screenReachability.test.ts
npm run typecheck
```

Expected: every listed surface consumes the policy; only
`motionPreference.ts` queries the OS API directly.

- [ ] **Step 7: Commit**

```bash
git add src/__tests__/motionCoverage.test.ts src/components/common/AmbientBackdrop.tsx src/components/home/SynthwaveHomeBackdrop.tsx src/components/home/NeonHighwayProgress.tsx src/screens/HomeScreen.tsx src/screens/OnboardingScreen.tsx src/components/TutorialOverlay.tsx src/components/ContextualOffer.tsx src/components/SessionEndReminder.tsx src/components/PostLossModal.tsx src/components/FailBreatherOffer.tsx src/components/NoLivesModal.tsx src/components/PostStreakBreakOffer.tsx src/components/LoginCalendar.tsx src/components/DailyRewardTimers.tsx src/components/common/ScanLineOverlay.tsx src/screens/EventScreen.tsx
git commit -m "fix: honor motion policy across every screen"
```

---

### Task 8: Virtualize the leaderboard and remove proven dead animation code

**Files:**
- Modify: `src/screens/LeaderboardScreen.tsx`
- Create: `src/__tests__/animationReachability.test.ts`
- Modify: `src/__tests__/screenReachability.test.ts`
- Delete: `src/components/LevelUpCeremony.tsx`
- Delete: `src/components/DifficultyTransitionCeremony.tsx`
- Delete: `src/components/common/Modal.tsx`
- Delete: `src/components/common/CRTModal.tsx`
- Delete: `src/components/game/GravityTrailEffect.tsx`
- Delete: `src/components/victory/GridDissolveEffect.tsx`
- Delete: `src/components/common/SynthwaveBackdrop.tsx`
- Modify: `agent_docs/architecture/screens.md`
- Modify: `agent_docs/gotchas.md`

**Interfaces:**
- Produces: virtualized `FlatList` rows with unchanged podium/header/footer
- Preserves: pull-to-refresh, friend actions, current-player footer, empty/loading states
- Removes: files with zero production import sites

- [ ] **Step 1: Write failing reachability and virtualization tests**

```ts
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');
const DEAD = [
  'components/LevelUpCeremony.tsx',
  'components/DifficultyTransitionCeremony.tsx',
  'components/common/Modal.tsx',
  'components/common/CRTModal.tsx',
  'components/game/GravityTrailEffect.tsx',
  'components/victory/GridDissolveEffect.tsx',
  'components/common/SynthwaveBackdrop.tsx',
];

test.each(DEAD)('%s is removed after proving zero imports', (relative) => {
  expect(fs.existsSync(path.join(SRC, relative))).toBe(false);
});

test('leaderboard rows are virtualized', () => {
  const source = fs.readFileSync(path.join(SRC, 'screens/LeaderboardScreen.tsx'), 'utf8');
  expect(source).toContain('<FlatList');
  expect(source).not.toContain('entries.slice(3).map(');
  expect(source).toContain('keyExtractor');
  expect(source).toContain('ListHeaderComponent');
  expect(source).toContain('ListFooterComponent');
});
```

Before deleting, search each basename across `src/`; the test's RED state must
show each file exists while import search reports no consumer.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- src/__tests__/animationReachability.test.ts`

Expected: dead files still exist and leaderboard still maps rows in ScrollView.

- [ ] **Step 3: Convert leaderboard content to FlatList**

Use `data={entries.slice(3)}` with:

```tsx
renderItem={({ item, index }) => (
  <LeaderboardRow
    entry={item}
    isCurrentUser={item.id === currentUserId}
    showDivider={index > 0}
    showGift={scope === 'friends' || friendIds.includes(item.id)}
    alternate={index % 2 === 1}
    onChallenge={handleChallenge}
  />
)}
keyExtractor={(item) => item.id}
initialNumToRender={12}
maxToRenderPerBatch={12}
windowSize={7}
removeClippedSubviews={Platform.OS === 'android'}
```

Move referral cards, empty/loading state, and podium into
`ListHeaderComponent`; move the current-user bar and bottom spacer into
`ListFooterComponent`. Keep refresh control on the FlatList and preserve scroll
content padding. Memoize render/header/footer callbacks only where needed for
FlatList identity; do not duplicate React Compiler work elsewhere.

- [ ] **Step 4: Delete only confirmed unreachable files**

Delete the seven files after a fresh `rg` confirms no import. Update animation
counts and intentional legacy-Animated exceptions in the two architecture
documents. Do not delete `WordBank`, `ParticleSystem`, or active Grid gravity
code.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- src/__tests__/animationReachability.test.ts
npm test -- src/__tests__/screenReachability.test.ts
npm run typecheck
```

Expected: list contract passes, deleted basenames have no production references,
and docs match the live inventory.

- [ ] **Step 6: Commit**

```bash
git add src/screens/LeaderboardScreen.tsx src/__tests__/animationReachability.test.ts src/__tests__/screenReachability.test.ts agent_docs/architecture/screens.md agent_docs/gotchas.md
git add -u src/components
git commit -m "perf: virtualize rankings and remove dead motion code"
```

---

### Task 9: Full regression, production bundle, and motion walkthrough

**Files:**
- Modify only if verification exposes a defect
- Artifact: `/opt/cursor/artifacts/animation_hardening_verification.log`
- Artifact: minimal successful screenshots/videos for native UI testing

**Interfaces:**
- Consumes: all prior task deliverables
- Produces: reproducible automated and manual evidence

- [ ] **Step 1: Confirm environment setup state**

Check `/tmp/cursor/async-install/install-user.status` if present. If setup is
still running, wait on its exact PID without killing it. Do not reinstall
dependencies over an active setup.

- [ ] **Step 2: Commit and push the pre-verification revision**

```bash
git status --short
git add -A
git commit -m "test: complete animation hardening coverage"
git push -u origin cursor/fix-animation-performance-c943
```

If the working tree is already clean, do not create an empty commit. Update
the existing draft PR description with the implemented workstreams before
starting final verification.

- [ ] **Step 3: Run targeted animation suites**

```bash
npm test -- src/services/__tests__/motionPreference.test.ts
npm test -- src/navigation/__tests__/motionOptions.test.ts
npm test -- src/components/game/__tests__/gridGeometry.test.ts
npm test -- src/__tests__/gameAnimationLifecycle.test.ts
npm test -- src/utils/__tests__/gameMotion.test.ts
npm test -- src/__tests__/gameRenderIsolation.test.ts
npm test -- src/hooks/__tests__/ceremonyTransition.test.ts
npm test -- src/utils/__tests__/ceremonyGrants.test.ts
npm test -- src/__tests__/ceremonyCoverage.test.ts
npm test -- src/__tests__/motionCoverage.test.ts
npm test -- src/__tests__/animationReachability.test.ts
npm test -- src/__tests__/screenReachability.test.ts
npm test -- src/__tests__/feelPolish.test.ts
```

Expected: every command passes with zero leaked-handle warnings.

- [ ] **Step 4: Run full static and behavioral verification**

```bash
npm run typecheck
npm test
```

Expected: TypeScript exits 0; all suites pass.

- [ ] **Step 5: Run game-feel regression benchmarks**

```bash
npm test -- src/engine/__tests__/boardGen.perf.test.ts
npm test -- src/engine/__tests__/stuckRate.test.ts
npm test -- src/engine/__tests__/skilledPlay.test.ts
npm test -- src/engine/__tests__/hintPerf.test.ts
npm test -- src/engine/__tests__/modeSolvability.test.ts
npm test -- src/__tests__/rewardCadence.test.ts
npm test -- src/__tests__/curveProfile.test.ts
npm test -- src/__tests__/spikeLevels.test.ts
```

Expected: existing benchmark thresholds remain green; `modeSolvability` reports
zero unsolvable boards.

- [ ] **Step 6: Build the Android production bundle**

```bash
npx expo export --platform android
```

Expected: Metro bundles successfully and Hermes compilation reports no invalid
worklet/import expression.

- [ ] **Step 7: Run the native motion matrix when a dev client is available**

Start Metro in a tmux-backed session:

```bash
npx expo start --dev-client
```

Use the computer-use agent for GUI interaction. Validate:

- five tab roots, every registered push/pop, Settings from both stacks, and
  Game from Home and Play
- onboarding handoff, tab-bar hide/show, next-level same-route transition,
  loading/content swaps, and modal enter/exit
- all 10 modes, including all four `gravityFlip` directions
- rapid clears, clear during an active fall, undo, retry, stuck rescue,
  timeout, perfect-solve failure, and shrinking-board ring removal
- normal motion and OS reduced motion
- real queued examples of every dedicated ceremony component; automated
  router tests cover all 22 data variants
- TalkBack/VoiceOver focus isolation for a ceremony

Enable `EXPO_PUBLIC_FORCE_PERF_LOGS=1` for the profiling pass. Confirm one tap
does not reconcile GameScreen, timer ticks do not reconcile GameScreen or
GameHeader, and cell render count remains within the existing per-tap budget.

- [ ] **Step 8: Record and review flicker evidence**

For each critical native flow, start recording immediately before the action
and stop immediately after:

- word clear → first gravity frame → settle
- interrupted gravity → successor settle
- `gravityFlip` up/left/right tracing
- screen push/pop and next-level replacement
- victory and ceremony enter/exit
- reduced-motion equivalents

Save only successful minimal recordings. Review every saved video with the
video-review agent, asking it to verify there is no destination flash,
background flash, teleport, stale transform, or hard-unmount blink. Discard
failed recordings, fix the defect test-first, and repeat.

If native computer use is unavailable, run the web QA build only as a
supplemental layout check; do not claim it proves native-driver gravity or
Android frame pacing. Report the native-only gap explicitly.

- [ ] **Step 9: Clean temporary diagnostics and re-verify**

Remove any temporary debug route, forced flag, log, or fixture used for
inspection. Keep automated tests and permanent instrumentation. Then rerun:

```bash
npm run typecheck
npm test
npx expo export --platform android
git diff --check
git status --short
```

Expected: all verification is green; no temporary code or untracked cache is
present.

- [ ] **Step 10: Request review, commit fixes, push, and update PR**

Invoke the requesting-code-review skill. Address only evidence-backed findings
with new failing tests. Then:

```bash
git add -A
git commit -m "fix: resolve animation verification findings"
git push -u origin cursor/fix-animation-performance-c943
```

Skip the commit if review/testing required no changes. Update the draft PR
with final test commands and walkthrough artifacts. Invoke
verification-before-completion and inspect fresh command output before making
any completion claim.

---

## Execution Protocol

For each task:

1. Commit and push the new failing regression test before executing its RED
   command.
2. Confirm the test fails for the intended missing behavior, not syntax or
   setup.
3. Implement the smallest complete fix.
4. Commit and push the implementation before executing its GREEN command.
5. Update the draft PR after each pushed revision.
6. If GREEN exposes another defect, add a new failing test before changing
   production code.

This protocol supersedes the abbreviated placement of the per-task “Commit”
step where necessary and satisfies both red-green-refactor and the cloud
pre-testing revision requirement.
