import { Grid, Cell, CellPosition, GravityDirection } from '../types';

/**
 * Apply gravity in any of 4 directions.
 * - down: compact non-null cells to bottom of each column (standard)
 * - up: compact to top of each column
 * - right: compact to right end of each row
 * - left: compact to left end of each row
 */
export function applyGravityInDirection(grid: Grid, direction: GravityDirection): Grid {
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid: Grid = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  if (direction === 'down' || direction === 'up') {
    for (let col = 0; col < cols; col++) {
      const cells: Cell[] = [];
      for (let row = 0; row < rows; row++) {
        if (grid[row][col] !== null) cells.push(grid[row][col]!);
      }
      if (direction === 'down') {
        const startRow = rows - cells.length;
        for (let i = 0; i < cells.length; i++) newGrid[startRow + i][col] = cells[i];
      } else {
        for (let i = 0; i < cells.length; i++) newGrid[i][col] = cells[i];
      }
    }
  } else {
    // left or right — compact within each row
    for (let row = 0; row < rows; row++) {
      const cells: Cell[] = [];
      for (let col = 0; col < cols; col++) {
        if (grid[row][col] !== null) cells.push(grid[row][col]!);
      }
      if (direction === 'right') {
        const startCol = cols - cells.length;
        for (let i = 0; i < cells.length; i++) newGrid[row][startCol + i] = cells[i];
      } else {
        for (let i = 0; i < cells.length; i++) newGrid[row][i] = cells[i];
      }
    }
  }

  return newGrid;
}

/**
 * Apply standard downward gravity. Convenience wrapper.
 */
export function applyGravity(grid: Grid): Grid {
  return applyGravityInDirection(grid, 'down');
}

/**
 * Remove cells and apply gravity in a given direction.
 */
export function removeCellsAndApplyGravityInDirection(
  grid: Grid,
  positions: CellPosition[],
  direction: GravityDirection
): Grid {
  return applyGravityInDirection(removeCells(grid, positions), direction);
}

/**
 * Remove cells at given positions from the grid (set to null).
 * Returns a new grid.
 */
export function removeCells(grid: Grid, positions: CellPosition[]): Grid {
  const newGrid = grid.map(row => [...row]);
  for (const { row, col } of positions) {
    newGrid[row][col] = null;
  }
  return newGrid;
}

/**
 * Remove cells and apply gravity in one step.
 */
export function removeCellsAndApplyGravity(
  grid: Grid,
  positions: CellPosition[]
): Grid {
  return applyGravity(removeCells(grid, positions));
}

/**
 * Clone a grid (deep copy).
 */
export function cloneGrid(grid: Grid): Grid {
  return grid.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

/**
 * Get all non-null cells with their positions.
 */
export function getActiveCells(
  grid: Grid
): { cell: Cell; row: number; col: number }[] {
  const result: { cell: Cell; row: number; col: number }[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col]) {
        result.push({ cell: grid[row][col]!, row, col });
      }
    }
  }
  return result;
}

/**
 * Check if the grid is completely empty.
 */
export function isGridEmpty(grid: Grid): boolean {
  return grid.every(row => row.every(cell => cell === null));
}
