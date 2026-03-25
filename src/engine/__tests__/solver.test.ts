import { findWordInGrid, isWordInGrid, isDeadEnd, getHint, solve, getAvailableWords, isSolvable } from '../solver';
import { Grid, Cell } from '../../types';

function makeCell(letter: string, id?: string): Cell {
  return { letter, id: id ?? `cell_${letter}_${Math.random().toString(36).slice(2, 6)}` };
}

function makeGrid(template: (string | null)[][]): Grid {
  return template.map(row =>
    row.map(letter => (letter !== null ? makeCell(letter) : null))
  );
}

describe('findWordInGrid', () => {
  it('finds a horizontal word', () => {
    const grid = makeGrid([
      ['C', 'A', 'T'],
      ['X', 'Y', 'Z'],
    ]);
    const results = findWordInGrid(grid, 'CAT');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
  });

  it('returns empty array for a word not in the grid', () => {
    const grid = makeGrid([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    const results = findWordInGrid(grid, 'ZZZ');
    expect(results).toEqual([]);
  });

  it('respects limit=1 and returns at most one result', () => {
    const grid = makeGrid([
      ['A', 'B'],
      ['B', 'A'],
    ]);
    // 'AB' can be found in multiple ways
    const results = findWordInGrid(grid, 'AB', 1);
    expect(results).toHaveLength(1);
  });

  it('finds diagonal words', () => {
    const grid = makeGrid([
      ['D', 'X', 'X'],
      ['X', 'O', 'X'],
      ['X', 'X', 'G'],
    ]);
    const results = findWordInGrid(grid, 'DOG');
    expect(results.length).toBeGreaterThan(0);
    const path = results[0];
    expect(path[0]).toEqual({ row: 0, col: 0 });
    expect(path[1]).toEqual({ row: 1, col: 1 });
    expect(path[2]).toEqual({ row: 2, col: 2 });
  });

  it('finds zigzag words (direction changes)', () => {
    // S is at (0,0), U at (1,1), N at (0,2) — zigzag path
    const grid = makeGrid([
      ['S', 'X', 'N'],
      ['X', 'U', 'X'],
      ['X', 'X', 'X'],
    ]);
    const results = findWordInGrid(grid, 'SUN');
    expect(results.length).toBeGreaterThan(0);
    const path = results[0];
    expect(path[0]).toEqual({ row: 0, col: 0 });
    expect(path[1]).toEqual({ row: 1, col: 1 });
    expect(path[2]).toEqual({ row: 0, col: 2 });
  });

  it('does not reuse cells in a single path', () => {
    const grid = makeGrid([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    // 'ABA' would require reusing cell A
    const results = findWordInGrid(grid, 'ABA');
    expect(results).toEqual([]);
  });

  it('handles empty word', () => {
    const grid = makeGrid([['A']]);
    expect(findWordInGrid(grid, '')).toEqual([]);
  });

  it('handles single-letter word', () => {
    const grid = makeGrid([['A', 'B']]);
    const results = findWordInGrid(grid, 'A');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]).toEqual([{ row: 0, col: 0 }]);
  });

  it('handles single-letter word with limit=1', () => {
    const grid = makeGrid([['A', 'B']]);
    const results = findWordInGrid(grid, 'A', 1);
    expect(results).toHaveLength(1);
  });
});

describe('isWordInGrid', () => {
  it('returns true when word exists', () => {
    const grid = makeGrid([
      ['H', 'I'],
      ['X', 'X'],
    ]);
    expect(isWordInGrid(grid, 'HI')).toBe(true);
  });

  it('returns false when word does not exist', () => {
    const grid = makeGrid([
      ['X', 'Y'],
      ['Z', 'W'],
    ]);
    expect(isWordInGrid(grid, 'HI')).toBe(false);
  });
});

describe('isDeadEnd', () => {
  it('returns false when words are findable in order', () => {
    const grid = makeGrid([
      ['G', 'O', 'X'],
      ['X', 'H', 'I'],
    ]);
    expect(isDeadEnd(grid, ['GO', 'HI'])).toBe(false);
  });

  it('returns true when no valid word ordering exists', () => {
    // Grid where words share cells — cannot both be found
    const grid = makeGrid([
      ['A', 'B'],
    ]);
    // If 'AB' and 'BA' share all cells, removing one destroys the other
    // But they need different paths — let's make a truly impossible case
    const grid2 = makeGrid([
      ['Z'],
    ]);
    expect(isDeadEnd(grid2, ['ZAP'])).toBe(true);
  });

  it('returns false for empty remaining words', () => {
    const grid = makeGrid([['A']]);
    expect(isDeadEnd(grid, [])).toBe(false);
  });
});

describe('getHint', () => {
  it('returns a valid hint when solution exists', () => {
    const grid = makeGrid([
      ['C', 'A', 'T'],
      ['D', 'O', 'G'],
    ]);
    const hint = getHint(grid, ['CAT', 'DOG']);
    expect(hint).not.toBeNull();
    expect(['CAT', 'DOG']).toContain(hint!.word);
    expect(hint!.positions.length).toBeGreaterThan(0);
  });

  it('returns null when no words can be found', () => {
    const grid = makeGrid([
      ['Z', 'Z'],
      ['Z', 'Z'],
    ]);
    const hint = getHint(grid, ['CAT']);
    expect(hint).toBeNull();
  });
});

describe('solve', () => {
  it('returns empty array when no words remain', () => {
    const grid = makeGrid([['A']]);
    const result = solve(grid, []);
    expect(result).toEqual([]);
  });

  it('finds a valid solution for a simple board', () => {
    const grid = makeGrid([
      ['G', 'O'],
      ['H', 'I'],
    ]);
    const result = solve(grid, ['GO', 'HI']);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result).toContain('GO');
    expect(result).toContain('HI');
  });

  it('returns null for unsolvable configuration', () => {
    const grid = makeGrid([['X']]);
    const result = solve(grid, ['CAT']);
    expect(result).toBeNull();
  });
});

describe('getAvailableWords', () => {
  it('returns words that are currently findable', () => {
    const grid = makeGrid([
      ['C', 'A', 'T'],
      ['X', 'Y', 'Z'],
    ]);
    const available = getAvailableWords(grid, ['CAT', 'DOG']);
    expect(available).toContain('CAT');
    expect(available).not.toContain('DOG');
  });
});

describe('isSolvable', () => {
  it('returns true for solvable board', () => {
    const grid = makeGrid([
      ['G', 'O'],
      ['H', 'I'],
    ]);
    expect(isSolvable(grid, ['GO', 'HI'])).toBe(true);
  });

  it('returns true for empty word list', () => {
    const grid = makeGrid([['A']]);
    expect(isSolvable(grid, [])).toBe(true);
  });

  it('returns false when words cannot be found', () => {
    const grid = makeGrid([['Z']]);
    expect(isSolvable(grid, ['CAT'])).toBe(false);
  });
});

describe('solver with various grid sizes', () => {
  it('works with 3x3 grid', () => {
    const grid = makeGrid([
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I'],
    ]);
    // 'BED' = B(0,1) -> E(1,1) -> D(1,0) — zigzag, valid adjacency
    expect(isWordInGrid(grid, 'BED')).toBe(true);
  });

  it('works with 1x1 grid', () => {
    const grid = makeGrid([['A']]);
    expect(findWordInGrid(grid, 'A', 1)).toHaveLength(1);
    expect(findWordInGrid(grid, 'AB')).toHaveLength(0);
  });

  it('works with 1xN grid', () => {
    const grid = makeGrid([['A', 'B', 'C', 'D']]);
    expect(isWordInGrid(grid, 'ABCD')).toBe(true);
    expect(isWordInGrid(grid, 'DCBA')).toBe(true);
  });
});
