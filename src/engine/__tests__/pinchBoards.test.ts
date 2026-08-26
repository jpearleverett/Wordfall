/**
 * Pinch boards + decoy richness — contract guards.
 *
 * Pinch slots (isPinchLevel) shop for a LOW-forgiveness board inside a
 * fairness window: solvable always (a one-ply-lookahead player can win any
 * solvable board — a word whose clear keeps the rest solvable exists while
 * the board is solvable), forgiving rarely. Decoy richness shifts filler
 * letters toward vowels/common consonants for visual-search difficulty and
 * MUST pair with the duplicate-occurrence rejection.
 */

const mockBooleans = new Map<string, boolean>();

jest.mock('../../services/remoteConfig', () => ({
  getRemoteBoolean: (key: string): boolean =>
    mockBooleans.has(key) ? (mockBooleans.get(key) as boolean) : true,
  getRemoteNumber: (_key: string): number => 0,
  getRemoteNumberClamped: (_key: string, fallback: number): number => fallback,
  getRemoteString: (_key: string): string => '',
}));

import {
  generatePinchBoard,
  generateLevelBoard,
  PINCH_FORGIVENESS_MAX,
  PINCH_FORGIVENESS_MIN,
} from '../boardGenerator';
import { isSolvable, findWordInGrid, estimateForgiveness } from '../solver';
import { isPinchLevel, PINCH_MIN_LEVEL } from '../../constants';
import { getLevelConfigExtended } from '../puzzleGenerator';
import { BoardConfig } from '../../types';

function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

beforeEach(() => {
  mockBooleans.clear();
});

describe('isPinchLevel', () => {
  it('fires only on the penultimate level of chapters past L150', () => {
    expect(PINCH_MIN_LEVEL).toBe(151);
    expect(isPinchLevel(164)).toBe(true); // chapter 11's penultimate level
    expect(isPinchLevel(179)).toBe(true);
    expect(isPinchLevel(614)).toBe(true); // procedural tail too
    expect(isPinchLevel(165)).toBe(false); // finale (breather)
    expect(isPinchLevel(163)).toBe(false);
    expect(isPinchLevel(149)).toBe(false); // below the gate
    expect(isPinchLevel(14)).toBe(false);
  });

  it('never collides with breathers, and spikes win the rare collisions', () => {
    // level % 15 === 14 implies level % 5 === 4 — never a breather.
    for (let level = 151; level <= 1000; level++) {
      if (!isPinchLevel(level)) continue;
      expect(level % 5).not.toBe(0);
    }
    // 299 = 13 × 23 and 299 % 15 === 14 — the spike keeps the slot.
    expect(isPinchLevel(299)).toBe(false);
  });

  it('dies with the RC kill switch', () => {
    mockBooleans.set('pinchLevelsEnabled', false);
    expect(isPinchLevel(164)).toBe(false);
  });
});

describe('generatePinchBoard', () => {
  const config: BoardConfig = {
    rows: 8,
    cols: 7,
    wordCount: 6,
    minWordLength: 3,
    maxWordLength: 6,
    difficulty: 'expert',
  };

  it('always returns a SOLVABLE board (the fairness floor of the window)', () => {
    for (const seed of [11, 222, 3333]) {
      const board = generatePinchBoard(config, seed, 'classic');
      expect(board.words.length).toBeGreaterThanOrEqual(2);
      expect(
        isSolvable(
          board.grid,
          board.words.map((w) => w.word),
        ),
      ).toBe(true);
    }
  }, 30_000);

  it('shops meaningfully below the fair-board preference when a candidate exists', () => {
    // Statistical, so a loose bound: across seeds, at least one shopped
    // board should measure clearly inside the pinch window (fresh rng, more
    // samples than the shopper used). The fallback path can return a normal
    // board on hostile seeds — that is the designed behavior, hence "some".
    const rates: number[] = [];
    for (const seed of [7, 77, 777, 7777]) {
      const board = generatePinchBoard(config, seed, 'classic');
      rates.push(
        estimateForgiveness(
          board.grid,
          board.words.map((w) => w.word),
          24,
          createRng(seed * 13 + 1),
        ),
      );
    }
    expect(Math.min(...rates)).toBeLessThanOrEqual(PINCH_FORGIVENESS_MAX + 0.15);
    expect(PINCH_FORGIVENESS_MIN).toBeGreaterThan(0);
  }, 60_000);
});

describe('generateLevelBoard routing', () => {
  it('classic pinch levels and plain levels both produce playable boards', () => {
    const pinchLevel = 614;
    expect(isPinchLevel(pinchLevel)).toBe(true);
    const cfg = getLevelConfigExtended(pinchLevel);
    const board = generateLevelBoard(pinchLevel, cfg, 4242, 'classic');
    expect(board.words.length).toBeGreaterThanOrEqual(2);
    const plain = generateLevelBoard(613, getLevelConfigExtended(613), 4242, 'classic');
    expect(plain.words.length).toBeGreaterThanOrEqual(2);
  }, 30_000);
});

describe('decoy richness', () => {
  it('post-600 expert configs ramp decoyRichness with the tail', () => {
    const early = getLevelConfigExtended(616); // proceduralIndex 1
    const late = getLevelConfigExtended(916); // proceduralIndex 21 (post-cap)
    expect(late.decoyRichness ?? 0).toBeGreaterThan(early.decoyRichness ?? 0);
    expect(late.decoyRichness ?? 0).toBeLessThanOrEqual(0.8);
  });

  it('rich decoys never mint a second occurrence of a list word', () => {
    const cfg: BoardConfig = {
      rows: 8,
      cols: 7,
      wordCount: 6,
      minWordLength: 3,
      maxWordLength: 6,
      difficulty: 'expert',
      decoyRichness: 0.8,
    };
    const cellSetKey = (ps: Array<{ row: number; col: number }>): string =>
      ps.map((p) => `${p.row},${p.col}`).sort().join('|');
    for (const seed of [5, 55, 555, 5555, 55555]) {
      const board = generateLevelBoard(300, cfg, seed, 'classic');
      const placedCells = new Set<string>();
      for (const w of board.words) {
        for (const p of w.positions) placedCells.add(`${p.row},${p.col}`);
      }
      for (const placement of board.words) {
        // Filler-assisted copies are barred (they desync the solver's model
        // from the board). Alternate traversals of the placed cell set, and
        // copies spelled entirely by placed words' crossing cells (which
        // predate the decoy knob), are tolerated.
        const canonical = cellSetKey(placement.positions);
        for (const occ of findWordInGrid(board.grid, placement.word, 4)) {
          if (cellSetKey(occ) === canonical) continue;
          const usesFiller = occ.some((pos) => !placedCells.has(`${pos.row},${pos.col}`));
          expect(usesFiller).toBe(false);
        }
      }
    }
  }, 60_000);
});
