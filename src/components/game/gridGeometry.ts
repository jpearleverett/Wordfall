import { CellPosition, Grid } from '../../types';

export const GRID_FRAME_ALLOWANCE = 58;

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

export interface GridPoint {
  x: number;
  y: number;
}

export interface GridTransitionFall {
  id: string;
  dx: number;
  dy: number;
  col: number;
}

export interface GridTransitionGhost {
  id: string;
  x: number;
  y: number;
  row: number;
  col: number;
}

export interface GridTransition {
  falls: GridTransitionFall[];
  ghosts: GridTransitionGhost[];
}

export interface GridTransitionRenderState {
  grid: Grid | null;
  cellSize: number;
  rows: number;
  cols: number;
}

export type GridTransitionUpdateDecision =
  | 'none'
  | 'initialize'
  | 'reset'
  | 'resize'
  | 'transition';

const EMPTY_METRICS: GridMetrics = {
  cellSize: 0,
  stride: 0,
  gridWidth: 0,
  gridHeight: 0,
};

function emptyGridGeometry(): GridGeometry {
  return {
    rows: 0,
    cols: 0,
    stride: 0,
    padding: 0,
    width: 0,
    height: 0,
    bounds: [],
    byCellId: new Map(),
    byPosition: new Map(),
  };
}

/**
 * True when two non-empty grids have no cell ID in common — i.e. the board
 * was REPLACED rather than mutated. Cell IDs are globally unique, so a
 * word-clear/gravity step always preserves the surviving tiles' IDs, while
 * hydrating a saved snapshot over a freshly generated board (re-entering a
 * level with a snapshot, OS-kill relaunch) shares none.
 */
function gridsShareNoCellIds(previous: Grid, next: Grid): boolean {
  const previousIds = new Set<string>();
  for (const row of previous) {
    for (const cell of row) {
      if (cell) previousIds.add(cell.id);
    }
  }
  if (previousIds.size === 0) return false;
  let nextHasCells = false;
  for (const row of next) {
    for (const cell of row) {
      if (cell) {
        nextHasCells = true;
        if (previousIds.has(cell.id)) return false;
      }
    }
  }
  // An emptied grid is a legitimate final clear (ghost dissolve), not a
  // replacement — only a DIFFERENT populated board counts.
  return nextHasCells;
}

export function decideGridTransitionUpdate(
  previous: GridTransitionRenderState,
  next: GridTransitionRenderState,
): GridTransitionUpdateDecision {
  if (previous.grid === null) return 'initialize';
  if (previous.rows !== next.rows || previous.cols !== next.cols) {
    // The engine's slot space changed shape (board shrink, mode swap). Any
    // in-flight offset is meaningless — snap.
    return 'reset';
  }
  if (previous.cellSize !== next.cellSize) {
    // A pure re-scale: same slots, different pixel pitch. This used to be
    // lumped in with 'reset', which SNAPPED every in-flight gravity tile to
    // its final slot. It fires far more often than it looks — the word band
    // re-measures whenever a chip changes state, and the resulting grid-area
    // height change lands one to three frames after the word-clear commit,
    // i.e. while the fall is still in its hold. Callers rebuild the previous
    // bounds at the new pitch instead and keep animating.
    return 'resize';
  }
  if (previous.grid === next.grid) return 'none';
  // Wholesale board replacement must not run the clear transition: every
  // on-screen tile would ghost (a ~2.4s full-board green dissolve storm
  // over the incoming board). Route it through 'reset', which snaps values
  // and clears animation resources atomically.
  if (next.grid !== null && gridsShareNoCellIds(previous.grid, next.grid)) {
    return 'reset';
  }
  return 'transition';
}

/**
 * Re-express a bounds map at a new cell pitch. Slot indices (row/col) are
 * pitch-independent, so the previous frame's geometry can be reconstructed
 * exactly under a new cellSize — which is what lets a mid-fall re-scale
 * continue the animation instead of snapping it.
 */
export function rescaleBounds(
  bounds: ReadonlyMap<string, CellBound>,
  stride: number,
  padding: number,
): Map<string, CellBound> {
  const rescaled = new Map<string, CellBound>();
  for (const [id, bound] of bounds) {
    rescaled.set(id, {
      ...bound,
      x: padding + bound.col * stride,
      y: bound.row * stride,
      w: stride,
      h: stride,
    });
  }
  return rescaled;
}

export function computeGridTransition(
  previous: ReadonlyMap<string, CellBound>,
  next: ReadonlyMap<string, CellBound>,
  liveOffsets: ReadonlyMap<string, GridPoint>,
): GridTransition {
  const falls: GridTransitionFall[] = [];
  const ghosts: GridTransitionGhost[] = [];

  for (const [id, bound] of next) {
    const previousBound = previous.get(id);
    if (!previousBound) continue;
    const live = liveOffsets.get(id);
    const dx = previousBound.x + (live?.x ?? 0) - bound.x;
    const dy = previousBound.y + (live?.y ?? 0) - bound.y;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      falls.push({ id, dx, dy, col: bound.col });
    }
  }

  for (const [id, bound] of previous) {
    if (!next.has(id)) {
      const live = liveOffsets.get(id);
      ghosts.push({
        id,
        x: bound.x + (live?.x ?? 0),
        y: bound.y + (live?.y ?? 0),
        row: bound.row,
        col: bound.col,
      });
    }
  }

  return { falls, ghosts };
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
    rows <= 0 ||
    cols <= 0 ||
    maxWidth <= 0 ||
    maxHeight <= 0 ||
    ![rows, cols, maxWidth, maxHeight, gap, frameAllowance].every(Number.isFinite)
  ) {
    return { ...EMPTY_METRICS };
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

export function computeGridGeometry(
  grid: Grid,
  cellSize: number,
  gap: number,
): GridGeometry {
  if (
    cellSize < 0 ||
    gap < 0 ||
    !Number.isFinite(cellSize) ||
    !Number.isFinite(gap)
  ) {
    return emptyGridGeometry();
  }

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
      const bound: CellBound = {
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

export function gridSlotCenter(
  geometry: GridGeometry,
  row: number,
  col: number,
): GridPoint | null {
  if (
    geometry.stride <= 0 ||
    !Number.isInteger(row) ||
    !Number.isInteger(col) ||
    row < 0 ||
    row >= geometry.rows ||
    col < 0 ||
    col >= geometry.cols
  ) {
    return null;
  }

  const bound = geometry.byPosition.get(`${row},${col}`);
  if (bound) {
    return {
      x: bound.x + bound.w / 2,
      y: bound.y + bound.h / 2,
    };
  }
  return {
    x: geometry.padding + col * geometry.stride + geometry.stride / 2,
    y: row * geometry.stride + geometry.stride / 2,
  };
}

export function hitTestGridGeometry(
  geometry: GridGeometry,
  x: number,
  y: number,
  wildcardMode: boolean,
): CellPosition | null {
  if (
    geometry.stride <= 0 ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < geometry.padding ||
    y < 0
  ) {
    return null;
  }

  const col = Math.floor((x - geometry.padding) / geometry.stride);
  const row = Math.floor(y / geometry.stride);
  if (row < 0 || row >= geometry.rows || col < 0 || col >= geometry.cols) {
    return null;
  }

  const position = { row, col };
  if (wildcardMode) return position;
  return geometry.byPosition.has(`${row},${col}`) ? position : null;
}
