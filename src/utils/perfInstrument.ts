/**
 * Dev-only performance instrumentation for the gameplay hot path.
 *
 * WHAT TO LOOK FOR IN LOGS
 * ────────────────────────
 *
 * Open React Native DevTools (press `j` in Metro) → Console tab. You'll see
 * four log prefixes:
 *
 *   [perf:reducer]      — A reducer action took >= REDUCER_THRESHOLD_MS
 *   [perf:render]       — A React commit took >= RENDER_THRESHOLD_MS
 *   [perf:tap]          — Time from a tap/drag cell-press to React commit
 *   [perf:drag]         — Drag session summary (dispatches + duration)
 *
 * EXPECTED vs BAD NUMBERS (on modern hardware, 60fps budget = 16.67ms/frame)
 *
 *   Reducer actions        : < 1ms     (SELECT_CELL should be ~0ms)
 *   GameScreen render      : < 8ms
 *   Grid render            : < 4ms
 *   Tap-to-commit latency  : < 16ms    (otherwise a tap skips a frame)
 *   Drag dispatch rate     : 8–15/s    (matches cell crossings, not gesture frames)
 *
 * If any single number is >> the budget, that's your culprit. If all are
 * individually fine but gameplay still feels bad, the problem is stacking
 * (too many fine commits back-to-back) — open the Profiler tab in DevTools.
 *
 * HOW TO DISABLE
 * ──────────────
 * Set PERF_ENABLED to false below. This is dev-only and compiled out in
 * production (gated on __DEV__) but you can also force-disable it to
 * compare timings with instrumentation off.
 */

const PERF_ENABLED = __DEV__;

// Thresholds — only log entries that exceed these, so the console doesn't
// drown in noise. Adjust if you want more/fewer events.
export const REDUCER_THRESHOLD_MS = 1;
export const RENDER_THRESHOLD_MS = 4;
export const TAP_LATENCY_THRESHOLD_MS = 16;

/**
 * Time a synchronous function. Logs `[perf] <label>: <ms>ms` if the
 * duration is at or above `threshold` ms.
 */
export function timed<T>(label: string, fn: () => T, threshold = 1): T {
  if (!PERF_ENABLED) return fn();
  const start = performance.now();
  const result = fn();
  const dur = performance.now() - start;
  if (dur >= threshold) {
    // eslint-disable-next-line no-console
    console.log(`[perf] ${label}: ${dur.toFixed(1)}ms`);
  }
  return result;
}

// Simple named mark store. Used for measuring "start event → commit event"
// latencies across component boundaries.
const marks = new Map<string, number>();

export function perfMark(label: string): void {
  if (!PERF_ENABLED) return;
  marks.set(label, performance.now());
}

/**
 * Read and clear a mark. Returns ms elapsed since the mark was set, or
 * undefined if no mark was set.
 */
export function perfConsume(label: string): number | undefined {
  if (!PERF_ENABLED) return undefined;
  const start = marks.get(label);
  if (start == null) return undefined;
  marks.delete(label);
  return performance.now() - start;
}

/**
 * React.Profiler onRender callback — logs slow commits.
 * Usage:
 *   <React.Profiler id="GameScreen" onRender={profilerOnRender}>...</React.Profiler>
 */
export function profilerOnRender(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  _startTime: number,
  _commitTime: number,
): void {
  if (!PERF_ENABLED) return;

  // When Grid commits, flush the LetterCell render count so we can see how
  // many cells actually re-rendered during this commit. If memoization is
  // working, this should be 0-2 on a typical tap.
  let cellCountSuffix = '';
  if (id === 'Grid') {
    const cells = perfGetAndResetCellCount();
    cellCountSuffix = ` cells=${cells}`;
  }

  if (actualDuration >= RENDER_THRESHOLD_MS) {
    // eslint-disable-next-line no-console
    console.log(
      `[perf:render] ${id} ${phase}: actual=${actualDuration.toFixed(
        1,
      )}ms base=${baseDuration.toFixed(1)}ms${cellCountSuffix}`,
    );
  }

  // Also report tap-to-commit latency if a tap is pending.
  const tapStart = marks.get('tap');
  if (tapStart != null && id === 'GameScreen') {
    const latency = performance.now() - tapStart;
    marks.delete('tap');
    if (latency >= TAP_LATENCY_THRESHOLD_MS) {
      // eslint-disable-next-line no-console
      console.log(`[perf:tap] latency=${latency.toFixed(1)}ms`);
    }
  }
}

// ── Drag session tracking ────────────────────────────────────────────────
// Measures how many cell-dispatches happen during a drag and how long the
// drag lasted, so we can compute dispatches/sec. The reducer runs on every
// cell crossing, so this should match the number of cells traversed.

let dragStartAt: number | null = null;
let dragDispatchCount = 0;

export function perfDragStart(): void {
  if (!PERF_ENABLED) return;
  dragStartAt = performance.now();
  dragDispatchCount = 0;
}

export function perfDragDispatch(): void {
  if (!PERF_ENABLED) return;
  dragDispatchCount += 1;
}

export function perfDragEnd(): void {
  if (!PERF_ENABLED) return;
  if (dragStartAt == null) return;
  const dur = performance.now() - dragStartAt;
  const rate = dur > 0 ? (dragDispatchCount / dur) * 1000 : 0;
  // eslint-disable-next-line no-console
  console.log(
    `[perf:drag] dispatches=${dragDispatchCount} duration=${dur.toFixed(
      0,
    )}ms rate=${rate.toFixed(1)}/s`,
  );
  dragStartAt = null;
  dragDispatchCount = 0;
}

// ── Cell render counter ────────────────────────────────────────────────
// Counts LetterCell renders between Grid commits so we can see if React.memo
// is actually working. If memoization is effective, we expect 0-2 cells to
// re-render per tap. If 10+ re-render, the memoization is broken somewhere.

let cellRenderCount = 0;

export function perfCountCellRender(): void {
  if (!PERF_ENABLED) return;
  cellRenderCount += 1;
}

export function perfGetAndResetCellCount(): number {
  if (!PERF_ENABLED) return 0;
  const n = cellRenderCount;
  cellRenderCount = 0;
  return n;
}

// ── Reducer timing ───────────────────────────────────────────────────────

/**
 * Wrap a reducer so actions that take >= REDUCER_THRESHOLD_MS get logged.
 * Use like: `const timedReducer = instrumentReducer(gameReducer);`
 */
export function instrumentReducer<S, A extends { type: string }>(
  reducer: (state: S, action: A) => S,
): (state: S, action: A) => S {
  if (!PERF_ENABLED) return reducer;
  return (state: S, action: A): S => {
    const start = performance.now();
    const next = reducer(state, action);
    const dur = performance.now() - start;
    if (dur >= REDUCER_THRESHOLD_MS) {
      // eslint-disable-next-line no-console
      console.log(`[perf:reducer] ${action.type}: ${dur.toFixed(1)}ms`);
    }
    return next;
  };
}
