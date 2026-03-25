import { applyGravity, removeCells, cloneGrid, getActiveCells, isGridEmpty, removeCellsAndApplyGravity } from '../gravity';
import { Grid, Cell } from '../../types';

function makeCell(letter: string, id?: string): Cell {
  return { letter, id: id ?? `cell_${letter}_${Math.random().toString(36).slice(2, 6)}` };
}

function makeGrid(template: (string | null)[][]): Grid {
  return template.map(row =>
    row.map(letter => (letter !== null ? makeCell(letter) : null))
  );
}

function gridLetters(grid: Grid): (string | null)[][] {
  return grid.map(row => row.map(cell => (cell ? cell.letter : null)));
}

describe('applyGravity', () => {
  it('handles an empty grid (all nulls)', () => {
    const grid = makeGrid([
      [null, null],
      [null, null],
    ]);
    const result = applyGravity(grid);
    expect(gridLetters(result)).toEqual([
      [null, null],
      [null, null],
    ]);
  });

  it('returns identical layout for a full grid (no change needed)', () => {
    const grid = makeGrid([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    const result = applyGravity(grid);
    expect(gridLetters(result)).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ]);
  });

  it('drops cells to the bottom when there are gaps', () => {
    const grid = makeGrid([
      ['A', null],
      [null, 'B'],
      [null, null],
    ]);
    const result = applyGravity(grid);
    expect(gridLetters(result)).toEqual([
      [null, null],
      [null, null],
      ['A', 'B'],
    ]);
  });

  it('preserves cell IDs through gravity', () => {
    const cellA = makeCell('A', 'id_a');
    const cellB = makeCell('B', 'id_b');
    const grid: Grid = [
      [cellA, null],
      [null, cellB],
      [null, null],
    ];
    const result = applyGravity(grid);
    expect(result[2][0]?.id).toBe('id_a');
    expect(result[2][1]?.id).toBe('id_b');
  });

  it('handles a single column correctly', () => {
    const grid = makeGrid([
      ['A'],
      [null],
      ['B'],
      [null],
    ]);
    const result = applyGravity(grid);
    expect(gridLetters(result)).toEqual([
      [null],
      [null],
      ['A'],
      ['B'],
    ]);
  });

  it('handles multiple columns independently', () => {
    const grid = makeGrid([
      ['A', null, 'C'],
      [null, 'B', null],
      [null, null, null],
    ]);
    const result = applyGravity(grid);
    expect(gridLetters(result)).toEqual([
      [null, null, null],
      [null, null, null],
      ['A', 'B', 'C'],
    ]);
  });

  it('leaves already-settled grid unchanged', () => {
    const grid = makeGrid([
      [null, null],
      ['A', null],
      ['B', 'C'],
    ]);
    const result = applyGravity(grid);
    expect(gridLetters(result)).toEqual([
      [null, null],
      ['A', null],
      ['B', 'C'],
    ]);
  });

  it('handles grid with scattered gaps in a column', () => {
    const grid = makeGrid([
      ['A'],
      [null],
      ['B'],
      [null],
      ['C'],
    ]);
    const result = applyGravity(grid);
    expect(gridLetters(result)).toEqual([
      [null],
      [null],
      ['A'],
      ['B'],
      ['C'],
    ]);
  });

  it('does not mutate the original grid', () => {
    const grid = makeGrid([
      ['A', null],
      [null, 'B'],
    ]);
    const originalLetters = gridLetters(grid);
    applyGravity(grid);
    expect(gridLetters(grid)).toEqual(originalLetters);
  });
});

describe('removeCells', () => {
  it('removes cells at specified positions', () => {
    const grid = makeGrid([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    const result = removeCells(grid, [{ row: 0, col: 0 }, { row: 1, col: 1 }]);
    expect(gridLetters(result)).toEqual([
      [null, 'B'],
      ['C', null],
    ]);
  });

  it('handles an empty removal list (no change)', () => {
    const grid = makeGrid([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    const result = removeCells(grid, []);
    expect(gridLetters(result)).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ]);
  });

  it('does not mutate the original grid', () => {
    const grid = makeGrid([
      ['A', 'B'],
    ]);
    removeCells(grid, [{ row: 0, col: 0 }]);
    expect(grid[0][0]?.letter).toBe('A');
  });
});

describe('cloneGrid', () => {
  it('creates a deep copy', () => {
    const grid = makeGrid([
      ['A', 'B'],
      [null, 'C'],
    ]);
    const clone = cloneGrid(grid);
    expect(gridLetters(clone)).toEqual(gridLetters(grid));

    // Mutate clone — original should be unaffected
    clone[0][0] = null;
    expect(grid[0][0]?.letter).toBe('A');
  });

  it('clones cell objects (not references)', () => {
    const grid = makeGrid([['X']]);
    const clone = cloneGrid(grid);
    if (clone[0][0]) clone[0][0].letter = 'Z';
    expect(grid[0][0]?.letter).toBe('X');
  });
});

describe('removeCellsAndApplyGravity', () => {
  it('removes cells and applies gravity in one step', () => {
    const grid = makeGrid([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    const result = removeCellsAndApplyGravity(grid, [{ row: 1, col: 0 }]);
    expect(gridLetters(result)).toEqual([
      [null, 'B'],
      ['A', 'D'],
    ]);
  });
});

describe('getActiveCells', () => {
  it('returns all non-null cells with positions', () => {
    const grid = makeGrid([
      ['A', null],
      [null, 'B'],
    ]);
    const active = getActiveCells(grid);
    expect(active).toHaveLength(2);
    expect(active[0]).toMatchObject({ row: 0, col: 0 });
    expect(active[0].cell.letter).toBe('A');
    expect(active[1]).toMatchObject({ row: 1, col: 1 });
    expect(active[1].cell.letter).toBe('B');
  });
});

describe('isGridEmpty', () => {
  it('returns true for empty grid', () => {
    const grid = makeGrid([[null, null], [null, null]]);
    expect(isGridEmpty(grid)).toBe(true);
  });

  it('returns false for non-empty grid', () => {
    const grid = makeGrid([[null, 'A'], [null, null]]);
    expect(isGridEmpty(grid)).toBe(false);
  });
});
