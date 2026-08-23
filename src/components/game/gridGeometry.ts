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

export function decideGridTransitionUpdate(
  previous: GridTransitionRenderState,
  next: GridTransitionRenderState,
): GridTransitionUpdateDecision {
  if (previous.grid === null) return 'initialize';
  if (
    previous.cellSize !== next.cellSize ||
    previous.rows !== next.rows ||
    previous.cols !== next.cols
  ) {
    return 'reset';
  }
  return previous.grid === next.grid ? 'none' : 'transition';
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
