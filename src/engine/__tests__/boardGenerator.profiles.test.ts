import { generateBoard } from '../boardGenerator';
import { BoardConfig, GenerationProfile } from '../../types';
import { CHAPTERS } from '../../data/chapters';

const BASE_CONFIG: BoardConfig = {
  rows: 6,
  cols: 6,
  wordCount: 3,
  minWordLength: 3,
  maxWordLength: 6,
  difficulty: 'easy',
};

describe('generateBoard — GenerationProfile honor', () => {
  it('clamps maxWordLength when profile tightens it', () => {
    const profile: GenerationProfile = { maxWordLength: 4, dictionaryTier: 'common' };
    const board = generateBoard(BASE_CONFIG, 1001, 'classic', profile);
    // Primary attempts must produce only words ≤ 4 letters. Fallback
    // attempts (after 80 retries) may loosen, so we test with a seed that
    // succeeds in the primary pass — which the vast majority do.
    for (const wp of board.words) {
      expect(wp.word.length).toBeLessThanOrEqual(4);
    }
  });

  it('honors minWordLength from profile', () => {
    const profile: GenerationProfile = { minWordLength: 4 };
    const board = generateBoard(BASE_CONFIG, 2002, 'classic', profile);
    for (const wp of board.words) {
      expect(wp.word.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('is deterministic: same seed + profile produces same board', () => {
    const profile: GenerationProfile = { maxWordLength: 5, dictionaryTier: 'common' };
    const a = generateBoard(BASE_CONFIG, 314159, 'classic', profile);
    const b = generateBoard(BASE_CONFIG, 314159, 'classic', profile);
    expect(a.words.map(w => w.word)).toEqual(b.words.map(w => w.word));
    // Grid letters must match cell-for-cell.
    for (let r = 0; r < a.grid.length; r++) {
      for (let c = 0; c < a.grid[0].length; c++) {
        expect(a.grid[r][c]?.letter).toBe(b.grid[r][c]?.letter);
      }
    }
  });

  it('falls back gracefully when profile range is empty', () => {
    // Profile min > max — generator should ignore profile clamp and still produce a board.
    const profile: GenerationProfile = { minWordLength: 9, maxWordLength: 2 };
    const board = generateBoard(BASE_CONFIG, 7777, 'classic', profile);
    expect(board.words.length).toBeGreaterThanOrEqual(2);
  });

  it('chapter 1 profile (common, len ≤ 4) produces valid board', () => {
    const ch1 = CHAPTERS[0];
    expect(ch1.profile).toBeDefined();
    const board = generateBoard(BASE_CONFIG, 12345, 'classic', ch1.profile);
    expect(board.words.length).toBeGreaterThanOrEqual(2);
    for (const wp of board.words) {
      expect(wp.word.length).toBeLessThanOrEqual(4);
    }
  });

  it('chapter 5 profile (len 4-6) produces valid board with expected length bounds', () => {
    const ch5 = CHAPTERS[4];
    expect(ch5.profile).toBeDefined();
    const board = generateBoard(BASE_CONFIG, 54321, 'classic', ch5.profile);
    for (const wp of board.words) {
      expect(wp.word.length).toBeGreaterThanOrEqual(4);
      expect(wp.word.length).toBeLessThanOrEqual(6);
    }
  });

  it('generation without profile still works (regression safety)', () => {
    const board = generateBoard(BASE_CONFIG, 9999, 'classic');
    expect(board.words.length).toBeGreaterThanOrEqual(2);
  });
});
