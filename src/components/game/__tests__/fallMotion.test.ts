import * as fs from 'fs';
import * as path from 'path';
import {
  buildFallEasing,
  columnDelayMs,
  FALL_COL_STAGGER_MS,
  FALL_HOLD_MS,
  FALL_MAX_STAGGERED_COLS,
  FALL_REBOUND_IN_MS,
  FALL_REBOUND_OUT_MS,
  fallDurationMs,
  fallRunDuration,
  nowMs,
  reboundMagnitude,
  reboundVector,
  sampleFallOffset,
  type FallRun,
} from '../fallMotion';

const STRIDE = 54;

function runFor(rowsFallen: number, startedAt = 0, colIndex = 0): FallRun {
  const from = { x: 0, y: -rowsFallen * STRIDE };
  return {
    from,
    startedAt,
    delayMs: FALL_HOLD_MS + columnDelayMs(colIndex),
    fallMs: fallDurationMs(rowsFallen),
    rebound: reboundVector(from, reboundMagnitude(Math.abs(from.y))),
    reboundOutMs: FALL_REBOUND_OUT_MS,
    reboundInMs: FALL_REBOUND_IN_MS,
  };
}

describe('fall sampling', () => {
  const run = runFor(3);

  test('holds at the start offset through the delay', () => {
    expect(sampleFallOffset(run, -10)).toEqual(run.from);
    expect(sampleFallOffset(run, 0)).toEqual(run.from);
    expect(sampleFallOffset(run, run.delayMs)).toEqual(run.from);
  });

  test('accelerates: the first half of the fall covers less than the second', () => {
    const mid = sampleFallOffset(run, run.delayMs + run.fallMs / 2).y;
    const travelledFirstHalf = Math.abs(mid - run.from.y);
    const travelledSecondHalf = Math.abs(mid);
    expect(travelledFirstHalf).toBeLessThan(travelledSecondHalf);
    // Easing.in(Easing.quad) at t=0.5 has covered exactly a quarter.
    expect(mid).toBeCloseTo(run.from.y * 0.75, 6);
  });

  test('is monotonic toward rest for the whole fall phase', () => {
    let previous = Infinity;
    for (let t = run.delayMs; t <= run.delayMs + run.fallMs; t += 4) {
      const magnitude = Math.abs(sampleFallOffset(run, t).y);
      expect(magnitude).toBeLessThanOrEqual(previous + 1e-9);
      previous = magnitude;
    }
  });

  test('rebounds back along the travel direction, never past the slot', () => {
    const peak = sampleFallOffset(run, run.delayMs + run.fallMs + FALL_REBOUND_OUT_MS - 0.001).y;
    // Falling DOWN means from.y is negative; the rebound kicks back up, so it
    // shares that sign. Overshooting the other way would push a bottom-row
    // tile under the grid container's clip.
    expect(Math.sign(peak)).toBe(Math.sign(run.from.y));
    expect(Math.abs(peak)).toBeLessThanOrEqual(Math.abs(run.rebound.y) + 1e-9);
    expect(Math.abs(peak)).toBeLessThan(STRIDE);
  });

  test('settles to exactly zero and stays there', () => {
    const total = fallRunDuration(run);
    expect(sampleFallOffset(run, total)).toEqual({ x: 0, y: 0 });
    expect(sampleFallOffset(run, total + 5000)).toEqual({ x: 0, y: 0 });
  });

  test('is continuous across every phase boundary', () => {
    const boundaries = [
      run.delayMs,
      run.delayMs + run.fallMs,
      run.delayMs + run.fallMs + FALL_REBOUND_OUT_MS,
      fallRunDuration(run),
    ];
    for (const b of boundaries) {
      const before = sampleFallOffset(run, b - 0.001);
      const after = sampleFallOffset(run, b + 0.001);
      expect(Math.abs(after.y - before.y)).toBeLessThan(0.5);
    }
  });

  test('samples horizontal falls identically (gravityFlip left/right)', () => {
    const horizontalFrom = { x: -3 * STRIDE, y: 0 };
    const horizontal: FallRun = {
      ...run,
      from: horizontalFrom,
      rebound: reboundVector(horizontalFrom, reboundMagnitude(3 * STRIDE)),
    };
    const mid = sampleFallOffset(horizontal, horizontal.delayMs + horizontal.fallMs / 2);
    expect(mid.y).toBe(0);
    expect(mid.x).toBeCloseTo(horizontal.from.x * 0.75, 6);
  });
});

describe('interruption continuity', () => {
  test('a tile picked up mid-air resumes from where it visually is', () => {
    // Second word cleared while the first cascade is still in the air. The
    // successor seeds from the sampled offset, so the tile must not jump.
    const run = runFor(4, 1000);
    const interruptAt = 1000 + run.delayMs + run.fallMs * 0.6;
    const live = sampleFallOffset(run, interruptAt);

    expect(live.y).toBeLessThan(0);
    expect(live.y).toBeGreaterThan(run.from.y);

    // A successor whose slot is one further down: dx/dy are measured from the
    // tile's CURRENT visual position, so the seed equals what is on screen.
    const previousSlotY = 0;
    const nextSlotY = STRIDE;
    const seededDy = previousSlotY + live.y - nextSlotY;
    expect(seededDy).toBeCloseTo(live.y - STRIDE, 6);
  });

  test('sampling a settled run contributes no offset', () => {
    const run = runFor(1, 0);
    expect(sampleFallOffset(run, fallRunDuration(run) + 1)).toEqual({ x: 0, y: 0 });
  });
});

describe('choreography budget', () => {
  test('a one-row hop is quick but still legible', () => {
    const ms = fallDurationMs(1);
    expect(ms).toBeGreaterThanOrEqual(180);
    expect(ms).toBeLessThanOrEqual(260);
  });

  test('fall time grows with distance but is capped', () => {
    expect(fallDurationMs(4)).toBeGreaterThan(fallDurationMs(1));
    expect(fallDurationMs(20)).toBeLessThanOrEqual(400);
  });

  test('the cascade lead-in stays short even across a full-width word', () => {
    // Every moved column of a 10-column clear, worst case.
    const lastColumnStart = FALL_HOLD_MS + columnDelayMs(9);
    expect(lastColumnStart).toBeLessThanOrEqual(140);
    expect(columnDelayMs(9)).toBe(FALL_MAX_STAGGERED_COLS * FALL_COL_STAGGER_MS);
  });

  test('the whole board settles well inside the genre budget', () => {
    // Worst realistic case: widest cascade, longest drop.
    const worst =
      FALL_HOLD_MS +
      columnDelayMs(9) +
      fallDurationMs(12) +
      FALL_REBOUND_OUT_MS +
      FALL_REBOUND_IN_MS;
    expect(worst).toBeLessThanOrEqual(700);

    // Typical: three moved columns, a two-row drop.
    const typical =
      FALL_HOLD_MS +
      columnDelayMs(2) +
      fallDurationMs(2) +
      FALL_REBOUND_OUT_MS +
      FALL_REBOUND_IN_MS;
    expect(typical).toBeLessThanOrEqual(520);
  });

  test('the rebound is visible without being a hop', () => {
    expect(reboundMagnitude(STRIDE)).toBeGreaterThan(2);
    expect(reboundMagnitude(STRIDE * 8)).toBeLessThanOrEqual(7);
  });
});

describe('native easing curve', () => {
  // RN compiles a timing easing into a frames array the native driver plays
  // back with no JS involvement. These pin that the compiled curve reproduces
  // sampleFallOffset EXACTLY, which is the whole point: the on-screen motion
  // and the offset an interrupting clear seeds from are one function.
  function replay(run: FallRun, t01: number) {
    const p = buildFallEasing(run)(t01);
    return { x: run.from.x * (1 - p), y: run.from.y * (1 - p) };
  }

  test('the compiled curve reproduces the sampled offset at every point', () => {
    const run = runFor(3, 0, 2);
    const total = fallRunDuration(run);
    for (let i = 0; i <= 64; i++) {
      const t01 = i / 64;
      const replayed = replay(run, t01);
      const sampled = sampleFallOffset(run, t01 * total);
      expect(replayed.x).toBeCloseTo(sampled.x, 6);
      expect(replayed.y).toBeCloseTo(sampled.y, 6);
    }
  });

  test('a diagonal offset stays exact on BOTH axes', () => {
    // Reachable when a re-scale lands on a tile already mid-flight sideways.
    const from = { x: -40, y: -120 };
    const run: FallRun = {
      from,
      startedAt: 0,
      delayMs: FALL_HOLD_MS,
      fallMs: fallDurationMs(2),
      rebound: reboundVector(from, reboundMagnitude(Math.hypot(from.x, from.y))),
      reboundOutMs: FALL_REBOUND_OUT_MS,
      reboundInMs: FALL_REBOUND_IN_MS,
    };
    const total = fallRunDuration(run);
    for (let i = 0; i <= 32; i++) {
      const t01 = i / 32;
      const replayed = replay(run, t01);
      const sampled = sampleFallOffset(run, t01 * total);
      expect(replayed.x).toBeCloseTo(sampled.x, 6);
      expect(replayed.y).toBeCloseTo(sampled.y, 6);
    }
  });

  test('the curve starts held and ends exactly at rest', () => {
    const run = runFor(2, 0, 3);
    const easing = buildFallEasing(run);
    expect(easing(0)).toBeCloseTo(0, 9);
    expect(easing(run.delayMs / fallRunDuration(run))).toBeCloseTo(0, 9);
    expect(easing(1)).toBeCloseTo(1, 9);
  });

  test('the curve dips past 1 for the rebound, then returns', () => {
    const run = runFor(4);
    const easing = buildFallEasing(run);
    const total = fallRunDuration(run);
    const atTouchdown = (run.delayMs + run.fallMs) / total;
    const atReboundPeak = (run.delayMs + run.fallMs + FALL_REBOUND_OUT_MS) / total;
    expect(easing(atTouchdown)).toBeCloseTo(1, 6);
    expect(easing(atReboundPeak)).toBeLessThan(1);
    expect(easing(1)).toBeCloseTo(1, 9);
  });
});

describe('wiring', () => {
  const GRID_SOURCE = fs.readFileSync(
    path.resolve(__dirname, '../../Grid.tsx'),
    'utf8',
  );

  test('nowMs returns a finite, non-decreasing clock', () => {
    const a = nowMs();
    const b = nowMs();
    expect(Number.isFinite(a)).toBe(true);
    expect(b).toBeGreaterThanOrEqual(a);
  });

  test('Grid never streams native animated values back to JS', () => {
    // addListener on a native-driven Animated.Value turns on per-frame
    // UI -> JS value propagation, and every listening node's event is
    // dispatched to every other listening node's subscriber — O(N^2) JS
    // callbacks per frame for an N-tile cascade. The fall is sampled from its
    // run descriptor instead; this must not come back.
    const code = GRID_SOURCE
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain('addListener');
    expect(code).not.toContain('removeListener');
    expect(GRID_SOURCE).toContain('sampleFallOffset');
  });

  test('Grid drives the fall on the native driver', () => {
    expect(GRID_SOURCE).toContain('useNativeDriver: true');
  });

  test('no part of the fall is scheduled on a JS-thread timer', () => {
    // Animated.delay — and the `delay` field of a timing config — are both a
    // setTimeout on the JS thread; the native animation config has no delay of
    // its own. Scheduling the hold and the column stagger there put the
    // cascade's lead-in on the busiest thread at the busiest moment. The whole
    // run is one native animation now; this must not regress.
    const code = GRID_SOURCE
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const fallBlock = code.slice(code.indexOf('for (const f of falls)'));
    expect(fallBlock).not.toContain('Animated.delay');
    expect(fallBlock).not.toContain('Animated.sequence');
    expect(fallBlock).toContain('buildFallEasing(run)');
  });

  test('the fall baseline is promoted on commit, not during render', () => {
    // Advancing prevGridRef during render lets a render React discards eat a
    // fall outright: the next real render diffs the new grid against itself.
    const renderPhase = GRID_SOURCE.slice(
      GRID_SOURCE.indexOf('const transitionDecision = decideGridTransitionUpdate('),
      GRID_SOURCE.indexOf('useLayoutEffect(() => {'),
    );
    expect(renderPhase).not.toContain('prevGridRef.current =');
    expect(renderPhase).not.toContain('prevBoundsRef.current =');
    expect(GRID_SOURCE).toContain('pendingBaselineRef');
  });
});
