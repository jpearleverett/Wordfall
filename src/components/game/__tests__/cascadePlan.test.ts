/**
 * Executable guards for the word-clear cascade.
 *
 * These drive planCascade directly with real grids and real gravity, so they
 * pin behaviour rather than source text: renaming anything here breaks the
 * compile instead of quietly passing.
 */
import { applyGravityInDirection, removeCells } from '../../../engine/gravity';
import { Cell, Grid, GravityDirection } from '../../../types';
import { computeGridGeometry } from '../gridGeometry';
import {
  EMPTY_CASCADE_STATE,
  type CascadeFrame,
  type CascadeState,
  planCascade,
} from '../cascadePlan';
import {
  type FallRun,
  FALL_HOLD_MS,
  FALL_REBOUND_IN_MS,
  FALL_REBOUND_OUT_MS,
  cascadeTouchdownAt,
  fallDurationMs,
  reboundMagnitude,
  reboundVector,
  sampleFallOffset,
} from '../fallMotion';

const GAP = 4;
const CELL = 50;
const STRIDE = CELL + GAP;

let nextId = 0;
function cell(letter: string): Cell {
  return { id: `c${nextId++}`, letter } as Cell;
}

/**
 * A dense rows x cols board of distinct tiles. Ids restart per board unless
 * `freshIds` is set, so two boards built here share ids (the same board
 * mutated) — pass freshIds for a genuinely different board.
 */
function board(rows: number, cols: number, freshIds = false): Grid {
  if (!freshIds) nextId = 0;
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => cell('A')),
  );
}

function frameOf(grid: Grid, cellSize = CELL): CascadeFrame {
  const geometry = computeGridGeometry(grid, cellSize, GAP);
  return {
    grid,
    bounds: geometry.byCellId,
    cellSize,
    rows: grid.length,
    cols: grid[0]?.length ?? 0,
    stride: geometry.stride,
    padding: geometry.padding,
  };
}

function clearAt(
  grid: Grid,
  positions: Array<[number, number]>,
  direction: GravityDirection = 'down',
): Grid {
  return applyGravityInDirection(
    removeCells(grid, positions.map(([row, col]) => ({ row, col }))),
    direction,
  );
}

/** Absolute pixel position of a tile in a frame, including any live offset. */
function screenPos(frame: CascadeFrame, id: string, offset = { x: 0, y: 0 }) {
  const b = frame.bounds.get(id)!;
  return { x: b.x + offset.x, y: b.y + offset.y };
}

function stateWith(partial: Partial<CascadeState>): CascadeState {
  return { ...EMPTY_CASCADE_STATE, ...partial };
}

// ── (a) A fall is never lost ────────────────────────────────────────────────

describe('every tile that moved gets a fall', () => {
  const directions: GravityDirection[] = ['down', 'up', 'left', 'right'];

  it.each(directions)('%s gravity', direction => {
    const before = board(6, 5);
    const cleared: Array<[number, number]> = [
      [2, 1],
      [2, 2],
      [3, 2],
      [4, 3],
    ];
    const after = clearAt(before, cleared, direction);
    const prev = frameOf(before);
    const next = frameOf(after);

    const { decision, plan } = planCascade(prev, next, EMPTY_CASCADE_STATE, 0, false);
    expect(decision).toBe('transition');
    if (plan.kind !== 'animate') throw new Error('expected an animate plan');

    // Ground truth, computed independently of the diff: every surviving tile
    // whose pixel slot changed.
    const moved = new Set<string>();
    for (const [id, bound] of next.bounds) {
      const was = prev.bounds.get(id)!;
      if (was.x !== bound.x || was.y !== bound.y) moved.add(id);
    }

    expect(new Set(plan.falls.map(f => f.id))).toEqual(moved);
    expect(moved.size).toBeGreaterThan(0);
  });

  it('seeds every fall to exactly where the tile already is', () => {
    const before = board(6, 5);
    const after = clearAt(before, [[3, 0], [3, 1], [3, 2]]);
    const prev = frameOf(before);
    const next = frameOf(after);
    const { plan } = planCascade(prev, next, EMPTY_CASCADE_STATE, 0, false);
    if (plan.kind !== 'animate') throw new Error('expected an animate plan');

    for (const fall of plan.falls) {
      const seeded = screenPos(next, fall.id, { x: fall.dx, y: fall.dy });
      expect(seeded).toEqual(screenPos(prev, fall.id));
    }
  });

  it('ghosts exactly the tiles that left, and no others', () => {
    const before = board(5, 5);
    const cleared: Array<[number, number]> = [[1, 1], [1, 2], [1, 3]];
    const ids = cleared.map(([r, c]) => before[r][c]!.id);
    const after = clearAt(before, cleared);
    const { plan } = planCascade(frameOf(before), frameOf(after), EMPTY_CASCADE_STATE, 0, false);
    if (plan.kind !== 'animate') throw new Error('expected an animate plan');

    expect(new Set(plan.ghosts.map(g => g.id))).toEqual(new Set(ids));
    expect(plan.falls.some(f => ids.includes(f.id))).toBe(false);
  });
});

// ── (b) No tile is left with a stranded offset ──────────────────────────────

describe('no tile is left stranded', () => {
  it('every fall targets rest, and an unmoved tile is never seeded', () => {
    const before = board(6, 6);
    const after = clearAt(before, [[4, 0], [4, 1]]);
    const prev = frameOf(before);
    const next = frameOf(after);
    const { plan } = planCascade(prev, next, EMPTY_CASCADE_STATE, 0, false);
    if (plan.kind !== 'animate') throw new Error('expected an animate plan');

    const seeded = new Set(plan.falls.map(f => f.id));
    for (const [id, bound] of next.bounds) {
      const was = prev.bounds.get(id)!;
      const stationary = was.x === bound.x && was.y === bound.y;
      expect(seeded.has(id)).toBe(!stationary);
    }
    // Nothing is seeded to a non-zero resting place: the animation always ends
    // at the slot, so the run's target is rest by construction.
    for (const fall of plan.falls) {
      const run = runFromFall(fall.dx, fall.dy);
      expect(sampleFallOffset(run, Number.MAX_SAFE_INTEGER)).toEqual({ x: 0, y: 0 });
    }
  });

  it('a settled board replans to nothing', () => {
    const grid = board(5, 5);
    const frame = frameOf(grid);
    const { decision, plan } = planCascade(frame, frame, EMPTY_CASCADE_STATE, 0, false);
    expect(decision).toBe('none');
    expect(plan.kind).toBe('none');
  });

  it('a pure re-scale on a settled board moves nothing', () => {
    const grid = board(5, 5);
    const { decision, plan } = planCascade(
      frameOf(grid, CELL),
      frameOf(grid, CELL - 6),
      EMPTY_CASCADE_STATE,
      0,
      false,
    );
    expect(decision).toBe('resize');
    if (plan.kind !== 'animate') throw new Error('expected an animate plan');
    expect(plan.falls).toEqual([]);
    expect(plan.ghosts).toEqual([]);
  });
});

function runFromFall(dx: number, dy: number, startedAt = 0, delayMs = FALL_HOLD_MS): FallRun {
  const from = { x: dx, y: dy };
  const dist = Math.hypot(dx, dy);
  return {
    from,
    startedAt,
    delayMs,
    fallMs: fallDurationMs(dist / STRIDE),
    rebound: reboundVector(from, reboundMagnitude(dist)),
    reboundOutMs: FALL_REBOUND_OUT_MS,
    reboundInMs: FALL_REBOUND_IN_MS,
  };
}

// ── (c) Interruption keeps continuity ───────────────────────────────────────

describe('interrupting a cascade keeps every tile where it is', () => {
  it('re-seeds a mid-air tile to its current screen position, not its slot', () => {
    const before = board(7, 5);
    const mid = clearAt(before, [[6, 2], [6, 3]]);
    const prev = frameOf(before);
    const midFrame = frameOf(mid);

    const first = planCascade(prev, midFrame, EMPTY_CASCADE_STATE, 0, false);
    if (first.plan.kind !== 'animate') throw new Error('expected an animate plan');
    const airborne = first.plan.falls[0];
    expect(airborne).toBeDefined();

    const runs = new Map<string, FallRun>();
    for (const fall of first.plan.falls) {
      runs.set(fall.id, runFromFall(fall.dx, fall.dy));
    }

    // Halfway through the first cascade, clear a second word.
    const run = runs.get(airborne.id)!;
    const now = run.delayMs + run.fallMs * 0.5;
    const inAir = sampleFallOffset(run, now);
    expect(inAir.y).toBeLessThan(0);

    const after = clearAt(mid, [[6, 0], [6, 1]]);
    const nextFrame = frameOf(after);
    const second = planCascade(midFrame, nextFrame, stateWith({ runs }), now, false);
    if (second.plan.kind !== 'animate') throw new Error('expected an animate plan');

    const reseeded = second.plan.falls.find(f => f.id === airborne.id);
    expect(reseeded).toBeDefined();
    // The tile does not move a pixel at the moment of the hand-off.
    expect(screenPos(nextFrame, airborne.id, { x: reseeded!.dx, y: reseeded!.dy }))
      .toEqual(screenPos(midFrame, airborne.id, inAir));
    // And it carries on instead of restarting from rest.
    expect(reseeded!.liveOffset).not.toBeNull();
    expect(reseeded!.entryProgress).toBeGreaterThan(0);
  });

  it('carries a mid-air tile through a re-scale instead of snapping it', () => {
    const before = board(7, 5);
    const after = clearAt(before, [[6, 2]]);
    const prev = frameOf(before);
    const next = frameOf(after);
    const first = planCascade(prev, next, EMPTY_CASCADE_STATE, 0, false);
    if (first.plan.kind !== 'animate') throw new Error('expected an animate plan');

    const runs = new Map<string, FallRun>();
    for (const fall of first.plan.falls) runs.set(fall.id, runFromFall(fall.dx, fall.dy));
    const tracked = first.plan.falls[0];
    const run = runs.get(tracked.id)!;
    const now = run.delayMs + run.fallMs * 0.4;

    // The word band re-wraps mid-fall and the grid area shrinks.
    const smaller = frameOf(after, CELL - 6);
    const second = planCascade(next, smaller, stateWith({ runs }), now, false);

    expect(second.decision).toBe('resize');
    if (second.plan.kind !== 'animate') throw new Error('expected an animate plan');
    const continued = second.plan.falls.find(f => f.id === tracked.id);
    expect(continued).toBeDefined();
    expect(continued!.liveOffset).not.toBeNull();
    // Still above its slot, by the same fraction of a cell, at the new pitch.
    const ratio = smaller.stride / next.stride;
    expect(continued!.dy).toBeCloseTo(sampleFallOffset(run, now).y * ratio, 6);
  });

  it('is replayable: the same inputs plan the same seeds', () => {
    const before = board(6, 4);
    const after = clearAt(before, [[5, 1], [5, 2]]);
    const prev = frameOf(before);
    const next = frameOf(after);
    const first = planCascade(prev, next, EMPTY_CASCADE_STATE, 0, false);
    if (first.plan.kind !== 'animate') throw new Error('expected an animate plan');

    const runs = new Map<string, FallRun>();
    for (const fall of first.plan.falls) runs.set(fall.id, runFromFall(fall.dx, fall.dy));
    const tracked = first.plan.falls[0];
    const run = runs.get(tracked.id)!;
    const pickup = run.delayMs + run.fallMs * 0.5;

    const later = clearAt(after, [[5, 0]]);
    const laterFrame = frameOf(later);
    const a = planCascade(next, laterFrame, stateWith({ runs }), pickup, false);
    if (a.plan.kind !== 'animate') throw new Error('expected an animate plan');

    // React discarded that render. It comes back 20ms later, and the caller
    // has recorded where it parked each tile.
    const frozenOffsets = new Map<string, { x: number; y: number }>();
    const frozenPhases = new Map<string, number>();
    for (const fall of a.plan.falls) {
      if (fall.liveOffset) {
        frozenOffsets.set(fall.id, fall.liveOffset);
        frozenPhases.set(fall.id, fall.entryProgress);
      }
    }
    const b = planCascade(
      next,
      laterFrame,
      stateWith({ runs, frozenOffsets, frozenPhases }),
      pickup + 20,
      false,
    );
    if (b.plan.kind !== 'animate') throw new Error('expected an animate plan');
    expect(b.plan.falls).toEqual(a.plan.falls);
  });
});

// ── (d) Horizontal gravity is a move, not a remount ─────────────────────────

describe('horizontal gravity', () => {
  it('produces cross-column falls that keep tile identity', () => {
    const before = board(4, 6);
    const cleared: Array<[number, number]> = [[1, 1], [1, 2]];
    const survivor = before[1][0]!.id;
    const after = clearAt(before, cleared, 'right');

    const prev = frameOf(before);
    const next = frameOf(after);
    const { plan } = planCascade(prev, next, EMPTY_CASCADE_STATE, 0, false);
    if (plan.kind !== 'animate') throw new Error('expected an animate plan');

    const fall = plan.falls.find(f => f.id === survivor);
    expect(fall).toBeDefined();
    // The tile changed COLUMN. It is still the same cell id on both sides of
    // the diff, which is what lets it animate rather than unmount and remount.
    expect(prev.bounds.get(survivor)!.col).not.toBe(next.bounds.get(survivor)!.col);
    expect(fall!.dy).toBe(0);
    expect(Math.abs(fall!.dx)).toBeGreaterThan(0);
  });

  it('never reports a diagonal move for single-axis gravity', () => {
    for (const direction of ['down', 'up', 'left', 'right'] as GravityDirection[]) {
      const before = board(5, 5);
      const after = clearAt(before, [[2, 2], [2, 3]], direction);
      const { plan } = planCascade(frameOf(before), frameOf(after), EMPTY_CASCADE_STATE, 0, false);
      if (plan.kind !== 'animate') throw new Error('expected an animate plan');
      for (const fall of plan.falls) {
        expect(fall.dx === 0 || fall.dy === 0).toBe(true);
      }
    }
  });
});

// ── (e) The settle report ───────────────────────────────────────────────────

describe('the settle report', () => {
  it('is one instant for the whole cascade, at the last touchdown', () => {
    const before = board(7, 5);
    const after = clearAt(before, [[6, 1], [6, 2], [6, 3]]);
    const { plan } = planCascade(frameOf(before), frameOf(after), EMPTY_CASCADE_STATE, 0, false);
    if (plan.kind !== 'animate') throw new Error('expected an animate plan');

    const runs = plan.falls.map((f, i) => runFromFall(f.dx, f.dy, 0, FALL_HOLD_MS + i * 18));
    const touchdown = cascadeTouchdownAt(runs);

    // Every tile has landed by then...
    for (const run of runs) {
      expect(run.startedAt + run.delayMs + run.fallMs).toBeLessThanOrEqual(touchdown);
    }
    // ...and at least one lands exactly then, so it is not early or late.
    expect(runs.some(r => r.startedAt + r.delayMs + r.fallMs === touchdown)).toBe(true);
    // Reported before the rebound finishes, which is the point.
    const runEnds = runs.map(
      r => r.startedAt + r.delayMs + r.fallMs + r.reboundOutMs + r.reboundInMs,
    );
    expect(touchdown).toBeLessThan(Math.max(...runEnds));
  });
});

// ── Reduce motion, resets, and the shrink ring ──────────────────────────────

describe('plans that must not animate', () => {
  it('reduce motion snaps instead of falling', () => {
    const before = board(5, 5);
    const after = clearAt(before, [[4, 1], [4, 2]]);
    const { plan } = planCascade(frameOf(before), frameOf(after), EMPTY_CASCADE_STATE, 0, true);
    expect(plan.kind).toBe('snap');
  });

  it('a wholesale board replacement snaps rather than ghosting every tile', () => {
    const first = board(5, 5);
    const second = board(5, 5, true);
    const { decision, plan } = planCascade(
      frameOf(first),
      frameOf(second),
      EMPTY_CASCADE_STATE,
      0,
      false,
    );
    expect(decision).toBe('reset');
    expect(plan.kind).toBe('snap');
  });

  it('a shape change snaps', () => {
    const before = board(5, 5);
    const shrunk = board(4, 5);
    const { plan } = planCascade(frameOf(before), frameOf(shrunk), EMPTY_CASCADE_STATE, 0, false);
    expect(plan.kind).toBe('snap');
  });

  it('the first frame initializes without snapping anything', () => {
    const { decision, plan } = planCascade(
      null,
      frameOf(board(5, 5)),
      EMPTY_CASCADE_STATE,
      0,
      false,
    );
    expect(decision).toBe('initialize');
    if (plan.kind !== 'animate') throw new Error('expected an animate plan');
    expect(plan.falls).toEqual([]);
    expect(plan.ghosts).toEqual([]);
  });
});

describe('ghost attribution', () => {
  it('dissolves along the stroke and marks board-removed cells apart', () => {
    const before = board(5, 5);
    // The player traced right-to-left; the board also took out a far corner.
    const word: Array<[number, number]> = [[2, 3], [2, 2], [2, 1]];
    const boardRemoved: Array<[number, number]> = [[0, 0]];
    const traceOrder = new Map(word.map(([r, c], i) => [before[r][c]!.id, i]));
    const ringId = before[0][0]!.id;

    const after = clearAt(before, [...word, ...boardRemoved]);
    const { plan } = planCascade(
      frameOf(before),
      frameOf(after),
      stateWith({ traceOrder }),
      0,
      false,
    );
    if (plan.kind !== 'animate') throw new Error('expected an animate plan');

    const wordGhosts = plan.ghosts.filter(g => g.fromWord);
    expect(wordGhosts.map(g => g.id)).toEqual(word.map(([r, c]) => before[r][c]!.id));
    const ring = plan.ghosts.find(g => g.id === ringId)!;
    expect(ring.fromWord).toBe(false);
    // Board-removed cells come after the whole word.
    expect(plan.ghosts.indexOf(ring)).toBe(plan.ghosts.length - 1);
  });
});

describe('board identity across app launches', () => {
  test('generated cell ids are unique per session, so a restored snapshot is a swap', async () => {
    // A puzzle snapshot persists its tiles' ids. With a plain per-process
    // counter, relaunching and restoring a snapshot from the FIRST board of a
    // previous session hands back ids identical to the board just generated
    // for this one — and planCascade would read that swap as a transition,
    // animating a full board's worth of bogus falls over the incoming grid.
    const { generateBoard } = await import('../../../engine/boardGenerator');
    const { getLevelConfig } = await import('../../../constants');
    const config = getLevelConfig(1);
    const first = generateBoard(config, 12345);
    const second = generateBoard(config, 67890);

    const idsOf = (g: Grid) =>
      new Set(g.flat().filter(Boolean).map(c => c!.id));
    const a = idsOf(first.grid);
    const b = idsOf(second.grid);
    expect(a.size).toBeGreaterThan(0);
    for (const id of a) expect(b.has(id)).toBe(false);

    // And an id carries something session-scoped, not just an ordinal — a bare
    // counter would restart at 1 on the next launch.
    const sample = [...a][0];
    expect(sample).toMatch(/^cell_[a-z0-9]+_\d+$/);
  }, 30000);
});
