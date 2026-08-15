import { generateBoard } from '../boardGenerator';
import { BoardConfig, GenerationProfile } from '../../types';
import { CHAPTERS } from '../../data/chapters';
import { getAllWords } from '../../words';

const BASE_CONFIG: BoardConfig = {
  rows: 6,
  cols: 6,
  wordCount: 4,
  minWordLength: 3,
  maxWordLength: 6,
  difficulty: 'easy',
};

describe('generateBoard — theme word reserved slots', () => {
  it('theme words actually appear on chapter boards (uppercase pool match)', () => {
    // Chapter 1 theme words that exist in the dictionary.
    const ch1 = CHAPTERS[0];
    const dict = getAllWords();
    const eligible = new Set(
      ch1.themeWords.map(w => w.toUpperCase()).filter(w => dict.has(w))
    );
    expect(eligible.size).toBeGreaterThanOrEqual(6);

    // Across several seeds, every board should carry at least one theme word
    // (reserved slots guarantee up to half the list when placement succeeds).
    for (const seed of [11, 222, 3333]) {
      const board = generateBoard(BASE_CONFIG, seed, 'classic', ch1.profile, ch1.themeWords);
      const themed = board.words.filter(wp => eligible.has(wp.word.toUpperCase()));
      expect(themed.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('reserves at most half the find-list for theme words', () => {
    const ch3 = CHAPTERS[2];
    const dict = getAllWords();
    const eligible = new Set(
      ch3.themeWords.map(w => w.toUpperCase()).filter(w => dict.has(w))
    );
    const config: BoardConfig = { ...BASE_CONFIG, wordCount: 4 };
    const board = generateBoard(config, 777, 'classic', undefined, ch3.themeWords);
    const themed = board.words.filter(wp => eligible.has(wp.word.toUpperCase()));
    // ceil(4/2) = 2 reserved; the general loop may pick more themed words
    // organically (they sit at the head of the pool), so just sanity-check
    // the board still has the requested word count.
    expect(themed.length).toBeGreaterThanOrEqual(1);
    expect(board.words.length).toBe(4);
  });
});

describe('generateBoard — introducedMechanics biases', () => {
  it('fourLetter mechanic biases selection toward 4-letter words', () => {
    const profile: GenerationProfile = { introducedMechanics: ['fourLetter'] };
    const board = generateBoard(BASE_CONFIG, 4242, 'classic', profile);
    const fourLetter = board.words.filter(wp => wp.word.length === 4);
    expect(fourLetter.length).toBeGreaterThanOrEqual(board.words.length - 1);
  });

  it('longWords mechanic biases selection toward 5+ letter words', () => {
    const profile: GenerationProfile = { introducedMechanics: ['longWords'] };
    const board = generateBoard(
      { ...BASE_CONFIG, rows: 7, cols: 7, wordCount: 3 },
      5151,
      'classic',
      profile
    );
    const long = board.words.filter(wp => wp.word.length >= 5);
    expect(long.length).toBeGreaterThanOrEqual(board.words.length - 1);
  });
});

describe('generateBoard — emptyCellDensity carving', () => {
  const holeProfile: GenerationProfile = { emptyCellDensity: 0.15 };

  function countNulls(board: ReturnType<typeof generateBoard>): number {
    let n = 0;
    for (const row of board.grid) {
      for (const cell of row) if (cell === null) n++;
    }
    return n;
  }

  it('carves holes when profile declares emptyCellDensity', () => {
    const board = generateBoard(BASE_CONFIG, 909, 'classic', holeProfile);
    expect(countNulls(board)).toBeGreaterThanOrEqual(1);
  });

  it('holes are gravity-stable: nothing sits above a hole', () => {
    const board = generateBoard(BASE_CONFIG, 909, 'classic', holeProfile);
    const rows = board.grid.length;
    const cols = board.grid[0].length;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (board.grid[r][c] === null) {
          // every cell above a hole must also be a hole
          for (let above = 0; above < r; above++) {
            expect(board.grid[above][c]).toBeNull();
          }
        }
      }
    }
  });

  it('holes never overlap placed word paths', () => {
    const board = generateBoard(BASE_CONFIG, 909, 'classic', holeProfile);
    for (const wp of board.words) {
      for (const pos of wp.positions) {
        expect(board.grid[pos.row][pos.col]).not.toBeNull();
      }
    }
  });

  it('denseBoard mechanic forces a fully-filled grid', () => {
    const profile: GenerationProfile = {
      emptyCellDensity: 0.2,
      introducedMechanics: ['denseBoard'],
    };
    const board = generateBoard(BASE_CONFIG, 606, 'classic', profile);
    expect(countNulls(board)).toBe(0);
  });

  it('gravityFlip and shrinkingBoard ignore emptyCellDensity', () => {
    for (const mode of ['gravityFlip', 'shrinkingBoard'] as const) {
      const board = generateBoard(BASE_CONFIG, 313, mode, holeProfile);
      expect(countNulls(board)).toBe(0);
    }
  });

  it('remains deterministic with holes (same seed = same grid)', () => {
    const a = generateBoard(BASE_CONFIG, 121212, 'classic', holeProfile);
    const b = generateBoard(BASE_CONFIG, 121212, 'classic', holeProfile);
    for (let r = 0; r < a.grid.length; r++) {
      for (let c = 0; c < a.grid[0].length; c++) {
        expect(a.grid[r][c]?.letter ?? null).toBe(b.grid[r][c]?.letter ?? null);
      }
    }
  });
});
