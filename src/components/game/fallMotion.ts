/**
 * Gravity-fall motion model.
 *
 * Grid.tsx animates a word-clear FLIP-style: the reducer hands it the
 * post-gravity board in one commit, and the grid reconstructs the motion by
 * seeding every moved tile with its OLD-position offset and animating that
 * offset back to zero on the native driver.
 *
 * Everything about a single tile's fall is captured by `FallRun`, and
 * `sampleFallOffset` evaluates it at an arbitrary instant. That matters for
 * two reasons:
 *
 *  1. **Interruption.** Clearing a second word while the first cascade is
 *     still in the air has to pick each tile up from where it VISUALLY is.
 *     The previous implementation read that position back from the UI thread
 *     with `Animated.Value.addListener`, which (a) forces a per-frame
 *     UI -> JS event for every listening node, dispatched to every other
 *     listening node's subscriber — O(N^2) callbacks per frame — and (b)
 *     lags the true position by several frames, which is itself visible as a
 *     jump. Sampling the same curve the native driver is running is free and
 *     frame-accurate.
 *
 *  2. **Testability.** The timeline is a pure function, so the choreography
 *     can be pinned by unit tests instead of by eye.
 *
 * The curve is deliberately the same one the Animated.sequence below runs:
 *   delay -> `Easing.in(Easing.quad)` fall to rest -> a short rebound BACK
 *   along the travel direction -> settle. Rebounding backwards (rather than
 *   overshooting past the slot) is not cosmetic: the grid container clips its
 *   children, so a bottom-row tile overshooting downward would visibly shear.
 */

export interface FallRun {
  /** Offset in px at t = 0, i.e. (old slot - new slot). Animates to 0. */
  from: { x: number; y: number };
  /** Wall clock (ms) when the sequence was started. */
  startedAt: number;
  /** Hold + per-column stagger before the tile starts moving. */
  delayMs: number;
  /** Free-fall duration. */
  fallMs: number;
  /**
   * How far along an equivalent full drop this tile already was when the run
   * started, in [0, 1). Zero for a tile dropped from rest; non-zero only when
   * an interrupting clear picked the tile up mid-air, in which case the fall
   * curve is the TAIL of a parabola rather than a fresh one — otherwise a tile
   * travelling at speed would decelerate to a stop and start over.
   */
  entryProgress?: number;
  /** Rebound offset at the top of the bounce (points back up-travel). */
  rebound: { x: number; y: number };
  /** Time spent travelling out to `rebound`. */
  reboundOutMs: number;
  /** Time spent settling from `rebound` back to rest. */
  reboundInMs: number;
}

/** Wall clock in ms, monotonic where available. */
export function nowMs(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  return typeof perf?.now === 'function' ? perf.now() : Date.now();
}

/**
 * The fall phase: Easing.in(Easing.quad), optionally entered part-way.
 *
 * `entry` is where on the parabola the tile already is, so the curve is
 * re-normalized to start there and still reach 1 at the end. At entry = 0 this
 * is exactly t^2; above it, the curve starts with the slope the tile is
 * already moving at, which is what stops a mid-air pickup from stalling.
 */
function easeInQuad(t: number, entry: number = 0): number {
  if (entry <= 0) return t * t;
  const a = Math.min(entry, 0.9);
  const base = a * a;
  const shifted = a + (1 - a) * t;
  return (shifted * shifted - base) / (1 - base);
}

/** Easing.out(Easing.quad) — matches the rebound-out phase. */
function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** Easing.inOut(Easing.quad) — matches the settle phase. */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * The tile's translate offset at `now`, in the same pixel space as
 * `FallRun.from`. Returns {0,0} once the run has finished (or for a run
 * whose phases are all zero-length).
 */
export function sampleFallOffset(
  run: FallRun,
  now: number,
): { x: number; y: number } {
  const t = now - run.startedAt;
  if (t <= run.delayMs) return { x: run.from.x, y: run.from.y };

  const fallT = t - run.delayMs;
  if (run.fallMs > 0 && fallT < run.fallMs) {
    const p = easeInQuad(fallT / run.fallMs, run.entryProgress ?? 0);
    return { x: run.from.x * (1 - p), y: run.from.y * (1 - p) };
  }

  const outT = fallT - run.fallMs;
  if (run.reboundOutMs > 0 && outT < run.reboundOutMs) {
    const p = easeOutQuad(outT / run.reboundOutMs);
    return { x: run.rebound.x * p, y: run.rebound.y * p };
  }

  const inT = outT - run.reboundOutMs;
  if (run.reboundInMs > 0 && inT < run.reboundInMs) {
    const p = easeInOutQuad(inT / run.reboundInMs);
    return { x: run.rebound.x * (1 - p), y: run.rebound.y * (1 - p) };
  }

  return { x: 0, y: 0 };
}

/** Total wall time a run occupies, from start() to rest. */
export function fallRunDuration(run: FallRun): number {
  return run.delayMs + run.fallMs + run.reboundOutMs + run.reboundInMs;
}

/**
 * The rebound vector for a fall: magnitude `mag`, pointing back along the
 * direction the tile travelled.
 *
 * Built as a scalar multiple of `from` (rather than per-axis `sign * mag`) so
 * that rebound.x / from.x === rebound.y / from.y. That equality is what lets a
 * single easing curve describe BOTH axes exactly — see buildFallEasing — even
 * for the rare diagonal offset a mid-flight re-scale can produce.
 */
export function reboundVector(
  from: { x: number; y: number },
  mag: number,
): { x: number; y: number } {
  const length = Math.hypot(from.x, from.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: (from.x / length) * mag, y: (from.y / length) * mag };
}

/**
 * Normalized animation progress at `tMs`, i.e. the p for which
 * `offset === from * (1 - p)`. Non-monotonic by design: it passes through 1
 * at touchdown, dips back below 1 for the rebound, and returns to 1 at rest.
 */
/**
 * How far through its fall phase a run is at `tMs`, in [0, 1] — the value to
 * carry into a successor run's `entryProgress` when an interrupting clear
 * picks the tile up. Zero before the fall starts, and zero once it is past
 * touchdown (a rebounding tile is not "falling fast" any more).
 */
export function fallPhaseProgress(run: FallRun, now: number): number {
  if (run.fallMs <= 0) return 0;
  const fallT = now - run.startedAt - run.delayMs;
  if (fallT <= 0 || fallT >= run.fallMs) return 0;
  return easeInQuad(fallT / run.fallMs, run.entryProgress ?? 0);
}

export function fallProgressAt(run: FallRun, tMs: number): number {
  const useY = Math.abs(run.from.y) >= Math.abs(run.from.x);
  const fromMag = useY ? run.from.y : run.from.x;
  if (fromMag === 0) return 1;
  const offset = sampleFallOffset(run, run.startedAt + tMs);
  return 1 - (useY ? offset.y : offset.x) / fromMag;
}

/**
 * The easing curve for the ENTIRE run — hold, fall, rebound and settle — as a
 * single native animation.
 *
 * Why this exists: `Animated.delay`, and the `delay` field of a timing config,
 * are both implemented as a JS-thread `setTimeout`
 * (TimingAnimation.start: `this._timeout = setTimeout(start, this._delay)`),
 * and the native config has no delay of its own. So the old four-segment
 * sequence handed the cascade's lead-in — the hold plus every column's
 * stagger — to the one thread that is busiest at exactly that moment: the
 * word-clear frame is also spawning particles, playing sound, logging
 * analytics and, 350ms later, running the dead-end solver. A stalled timer
 * there is a stalled fall, which is what the cascade stuttering came from. It
 * also cost three native -> JS -> native round trips per tile to advance
 * between segments.
 *
 * RN compiles a timing easing into a frames array
 * (`frames[i] = easing(i / numFrames)`) that the native driver plays back with
 * no JS involvement, and nothing requires those frames to be monotonic. Baking
 * the hold in as a flat lead-in and the rebound as a dip past 1 collapses the
 * whole run into ONE fully native animation with zero JS timers.
 *
 * As a bonus the on-screen curve and `sampleFallOffset` (which an interrupting
 * clear samples to pick a tile up mid-air) are now literally the same
 * function, so they cannot drift apart.
 */
export function buildFallEasing(run: FallRun): (t: number) => number {
  const total = fallRunDuration(run);
  if (total <= 0) return () => 1;
  return (t: number) => fallProgressAt(run, t * total);
}

// ── Choreography ────────────────────────────────────────────────────────────
// These numbers replace a set that had drifted upward across several rounds of
// "blind motion review" — a pipeline that sampled SCREENSHOTS at ~250ms and
// flagged motion it could not see between frames. Every fix in that loop made
// the animation longer so it would register in static sampling, and the result
// (up to ~1.3s from finger-lift to a settled board, with the outermost column
// sitting still for the first ~370ms) reads as laggy in the hand even though it
// photographs well. Tuned back toward what tile falls actually do in the genre
// (~250-450ms end to end): the wave still reads, it just does not dawdle.

/** Beat between the word clearing and the first tile moving. */
export const FALL_HOLD_MS = 45;
/**
 * Offset between successive bands of the cascade, ordered outward from the
 * cleared word. A "band" is a line of tiles that travels together — a column
 * under vertical gravity, a row under horizontal gravity (see fallBandOf).
 */
export const FALL_BAND_STAGGER_MS = 18;
/** Bands beyond this share the last slot's delay, capping total lead-in. */
export const FALL_MAX_STAGGERED_BANDS = 4;
/**
 * Impact rebound. Short and punchy on purpose: the previous 60/90 pairing
 * moved ~4px over 150ms, which is ~1px per frame — below the threshold where
 * it reads as a bounce at all, while still spending a quarter of the run.
 */
export const FALL_REBOUND_OUT_MS = 45;
export const FALL_REBOUND_IN_MS = 75;

/**
 * Which band a tile belongs to, given the direction it is travelling.
 *
 * Tiles that move together must start together. Under downward gravity that
 * is a column, which is what the cascade used to assume unconditionally — but
 * gravityFlip rotates gravity, and under left/right gravity tiles compact
 * along a ROW. Staggering those by column gave neighbours in the same row
 * different start times, so they pulled apart into a half-cell gap and then
 * closed it again: the mode whose whole identity is gravity had the least
 * convincing gravity in the game.
 */
export function fallBandOf(fall: {
  dx: number;
  dy: number;
  row: number;
  col: number;
}): number {
  return Math.abs(fall.dy) >= Math.abs(fall.dx) ? fall.col : fall.row;
}

/**
 * Free-fall duration for a drop of `rowsFallen` slots — which need not be a
 * whole number: a tile re-targeted mid-air may have only a sliver of a cell
 * left to travel.
 *
 * Scales as a power of distance so a long drop takes longer than a short one
 * without the time growing linearly (real free fall is t ~ sqrt(d)), and
 * anchored so a one-row hop lands at ~230ms. Capped so a full-height drop
 * never floats, and floored only at the very short end — an earlier form
 * carried a flat 135ms base, which meant a tile with five pixels left to fall
 * still took the better part of a one-row drop to get there.
 */
export function fallDurationMs(rowsFallen: number): number {
  const rows = Math.max(0, rowsFallen);
  return Math.min(400, Math.max(70, 230 * Math.pow(rows, 0.35)));
}

/** How far a tile kicks back up-travel on impact, scaled by drop distance. */
export function reboundMagnitude(distancePx: number): number {
  return Math.min(9, 3 + distancePx * 0.06);
}

/**
 * The instant the cascade lands — the last tile's touchdown, before any
 * rebound. That, not the end of the run, is when the board reads as having
 * hit bottom, so it is when the landing haptic belongs; waiting for the
 * rebound to finish put the buzz ~120ms after the thud it was describing.
 */
export function cascadeTouchdownAt(runs: Iterable<FallRun>): number {
  let latest = 0;
  for (const run of runs) {
    // Absolute, not relative: an interrupting clear leaves runs from the
    // previous cascade in the air with an earlier startedAt, and they are
    // just as much part of "the board has landed" as the new ones.
    latest = Math.max(latest, run.startedAt + run.delayMs + run.fallMs);
  }
  return latest;
}

/** Delay for the i-th band of the cascade (i ordered outward from centre). */
export function bandDelayMs(index: number): number {
  return Math.min(index, FALL_MAX_STAGGERED_BANDS) * FALL_BAND_STAGGER_MS;
}

/**
 * Roughly how long after `start()` the native driver actually takes its first
 * step: the animated op batch is flushed on a setImmediate and the driver then
 * moves on the next frame. `startedAt` is stamped on the JS side before that,
 * so sampling a run would otherwise credit it with motion it has not made yet.
 * One frame is the right order of magnitude and keeps the error centred — and
 * the whole point of sampling is that it is far more accurate than reading the
 * value back off the UI thread, which lagged reality by several frames.
 */
export const FALL_START_LATENCY_MS = 1000 / 60;
