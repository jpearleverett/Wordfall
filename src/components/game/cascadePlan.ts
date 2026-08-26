/**
 * The word-clear cascade, as a pure function.
 *
 * `Grid` reconstructs the gravity animation FLIP-style from a diff of the
 * board before and after the reducer moved it. That reconstruction is the most
 * delicate logic in the game — it decides whether a tile animates, teleports,
 * or is picked up mid-air — and while it lived inline inside a component's
 * render body the only way to check it was to read the source or to assert on
 * the source with a regex, which fails open the moment anything is renamed.
 *
 * Everything except the two side effects (seeding an Animated.Value and
 * starting animations) is decided here, so the invariants can be tested
 * directly: see `__tests__/cascadePlan.test.ts`.
 */
import { Grid } from '../../types';
import {
  type CellBound,
  type GridTransitionUpdateDecision,
  computeGridTransition,
  decideGridTransitionUpdate,
  rescaleBounds,
} from './gridGeometry';
import { type FallRun, fallPhaseProgress, sampleFallOffset } from './fallMotion';

/** One tile's move for the cascade about to start. */
export interface CascadeFall {
  id: string;
  /** Offset from the tile's NEW slot back to where it currently appears. */
  dx: number;
  dy: number;
  row: number;
  col: number;
  /**
   * Where the tile visually was, relative to its PREVIOUS slot, when this plan
   * picked it up mid-air — or null for a tile that was at rest. Non-null means
   * the fall is a continuation, and it is also what the caller records as the
   * freeze so a replayed render seeds the identical offset.
   */
  liveOffset: { x: number; y: number } | null;
  /** Where on its fall curve a continued tile was picked up (0 otherwise). */
  entryProgress: number;
}

/** One tile that left the board and needs a dissolve where it stood. */
export interface CascadeGhost {
  id: string;
  letter: string;
  x: number;
  y: number;
  row: number;
  col: number;
  /**
   * Whether this tile was part of the word the player just traced. False for
   * cells the board removed on its own — shrinkingBoard takes out a whole
   * outer ring in the same commit as a word clear.
   */
  fromWord: boolean;
}

/** A board as the cascade sees it: contents plus the pixel space they sit in. */
export interface CascadeFrame {
  grid: Grid;
  bounds: ReadonlyMap<string, CellBound>;
  cellSize: number;
  rows: number;
  cols: number;
  stride: number;
  padding: number;
}

/** What the engine currently has in the air. */
export interface CascadeState {
  /** In-flight fall descriptors, keyed by cell id. */
  runs: ReadonlyMap<string, FallRun>;
  /** Offsets a previous render already froze tiles at (see planCascade). */
  frozenOffsets: ReadonlyMap<string, { x: number; y: number }>;
  /** Fall-phase progress captured at the same freeze. */
  frozenPhases: ReadonlyMap<string, number>;
  /** Cell id -> index in the last non-empty trace. */
  traceOrder: ReadonlyMap<string, number>;
}

export type CascadePlan =
  /** Board unchanged in every way the cascade cares about. */
  | { kind: 'none' }
  /**
   * The pixel space stopped meaning what it meant (shape change, board
   * replacement) or motion is off: everything snaps to rest.
   */
  | { kind: 'snap' }
  /** Tiles to move and tiles to dissolve. */
  | { kind: 'animate'; falls: CascadeFall[]; ghosts: CascadeGhost[] };

export interface CascadeDecision {
  decision: GridTransitionUpdateDecision;
  plan: CascadePlan;
}

export const EMPTY_CASCADE_STATE: CascadeState = {
  runs: new Map(),
  frozenOffsets: new Map(),
  frozenPhases: new Map(),
  traceOrder: new Map(),
};

/**
 * Decide what the cascade should do to get from `previous` to `next`.
 *
 * Pure and, critically, **replayable**: called twice with the same arguments
 * it returns the same plan. React may render a component without committing it
 * (a concurrent interruption, an error-boundary retry), and the caller seeds
 * animated values from this plan during render, so a plan that drifted between
 * renders would leave tiles seeded for a tree that never appeared. The only
 * clock-dependent input is `now`, and its effect is neutralised by
 * `frozenOffsets`: once the caller has acted on a plan for a tile, it records
 * where it parked that tile, and the next call reads the freeze instead of
 * re-sampling a curve that is no longer playing.
 */
export function planCascade(
  previous: CascadeFrame | null,
  next: CascadeFrame,
  state: CascadeState,
  now: number,
  reduceMotion: boolean,
): CascadeDecision {
  const decision = decideGridTransitionUpdate(
    {
      grid: previous?.grid ?? null,
      cellSize: previous?.cellSize ?? next.cellSize,
      rows: previous?.rows ?? next.rows,
      cols: previous?.cols ?? next.cols,
    },
    { grid: next.grid, cellSize: next.cellSize, rows: next.rows, cols: next.cols },
  );

  if (decision === 'none') return { decision, plan: { kind: 'none' } };

  const animatable =
    (decision === 'transition' || decision === 'resize') &&
    previous !== null &&
    !reduceMotion;

  if (!animatable) {
    // 'initialize' has nothing to animate from and nothing in the air, so it
    // must NOT snap — snapping would clear animated values the very first
    // render creates. Everything else does.
    return {
      decision,
      plan: decision === 'initialize' ? { kind: 'animate', falls: [], ghosts: [] } : { kind: 'snap' },
    };
  }

  const prev = previous!;
  // On a re-scale the previous frame's slots are rebuilt at the NEW pitch
  // (slot indices are pitch-independent) and any in-flight offset is scaled by
  // the same ratio, so the fall continues from where the tile visually is
  // rather than snapping.
  const scale =
    decision === 'resize' && prev.stride > 0 && prev.cellSize > 0
      ? next.stride / prev.stride
      : 1;
  const prevBounds =
    decision === 'resize'
      ? rescaleBounds(prev.bounds, next.stride, next.padding)
      : prev.bounds;

  const liveOffsets = new Map<string, { x: number; y: number }>();
  const livePhase = new Map<string, number>();
  for (const [id, run] of state.runs) {
    const frozen = state.frozenOffsets.get(id);
    const offset = frozen ?? sampleFallOffset(run, now);
    if (offset.x !== 0 || offset.y !== 0) {
      liveOffsets.set(id, { x: offset.x * scale, y: offset.y * scale });
      livePhase.set(id, state.frozenPhases.get(id) ?? fallPhaseProgress(run, now));
    }
  }

  const transition = computeGridTransition(prevBounds, next.bounds, liveOffsets);

  const falls: CascadeFall[] = transition.falls.map(fall => ({
    ...fall,
    row: next.bounds.get(fall.id)?.row ?? 0,
    // A tile re-targeted mid-air is already moving. Making it sit through a
    // fresh hold and stagger would stop it dead and start it again, which is
    // worse than the snap this replaced — and entering the new fall curve
    // part-way keeps its speed instead of decelerating to zero.
    liveOffset: liveOffsets.get(fall.id) ?? null,
    entryProgress: livePhase.get(fall.id) ?? 0,
  }));

  // The last trace the caller saw is the word that just resolved — the reducer
  // empties the selection in the same update that clears the tiles, so this is
  // the only record of it. It answers two questions at once: which vacated
  // cells belong to the player's word (rather than to a board-driven removal),
  // and in what order the player drew them.
  const ghosts: CascadeGhost[] = [];
  for (const ghost of transition.ghosts) {
    const previousBound = prevBounds.get(ghost.id);
    const previousCell = previousBound
      ? prev.grid[previousBound.row]?.[previousBound.col]
      : null;
    if (!previousCell) continue;
    ghosts.push({
      ...ghost,
      letter: previousCell.letter,
      fromWord: state.traceOrder.has(ghost.id),
    });
  }
  // Dissolve along the stroke. Without this a right-to-left or bottom-to-top
  // word bursts backwards against the gesture that made it. Board-removed
  // cells sort after the word, so a shrink ring reads as a consequence of the
  // clear rather than part of it.
  if (ghosts.length > 1) {
    ghosts.sort(
      (a, b) =>
        (state.traceOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (state.traceOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  return { decision, plan: { kind: 'animate', falls, ghosts } };
}
