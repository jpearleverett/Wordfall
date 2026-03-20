import { Grid, Cell, CellPosition } from '../types';

/**
 * Apply gravity to the grid: for each column, compact non-null cells
 * to the bottom rows. Returns a new grid.
 */
export function applyGravity(grid: Grid): Grid {
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid: Grid = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  for (let col = 0; col < cols; col++) {
    // Collect non-null cells from this column, top to bottom
    const cells: Cell[] = [];
    for (let row = 0; row < rows; row++) {
      if (grid[row][col] !== null) {
        cells.push(grid[row][col]!);
      }
    }
    // Place them at the bottom of the column
    const startRow = rows - cells.length;
    for (let i = 0; i < cells.length; i++) {
      newGrid[startRow + i][col] = cells[i];
    }
  }

  return newGrid;
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
