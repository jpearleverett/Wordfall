/**
 * F7: stars are assist tiers, not a hidden boolean.
 *
 * The pre-F7 formula's `moves <= totalWords` clause was ALWAYS true on a
 * win (moves only increments on a successful find), so stars had silently
 * reduced to "used a hint or not" — 3★ and FLAWLESS fired together on
 * every hint-free win. These pins keep the three tiers real, and pin the
 * shuffle-counts-as-an-assist rule the mechanics doc always claimed
 * ("no hints, no undos, no shuffle") but the reducer never enforced.
 */
import { gameReducer, createInitialState, computeStars } from '../useGame';
import { Board, Cell, Grid, WordPlacement } from '../../types';

describe('computeStars', () => {
  it('is a three-tier assist ladder on a win', () => {
    expect(computeStars('won', 0)).toBe(3);
    expect(computeStars('won', 1)).toBe(2);
    expect(computeStars('won', 2)).toBe(1);
    expect(computeStars('won', 7)).toBe(1);
  });

  it('is 0 for any non-won status', () => {
    expect(computeStars('playing', 0)).toBe(0);
    expect(computeStars('failed', 0)).toBe(0);
    expect(computeStars('timeout', 0)).toBe(0);
  });
});

describe('shuffle counts as an assist', () => {
  function makeCell(letter: string, id: string): Cell {
    return { letter, id };
  }

  function makeBoard(): Board {
    // 3x3 with GO placed; filler letters elsewhere so the shuffle has
    // non-word cells to randomise.
    const grid: Grid = [
      [makeCell('G', 'g1'), makeCell('O', 'o1'), makeCell('X', 'x1')],
      [makeCell('Q', 'q1'), makeCell('Z', 'z1'), makeCell('K', 'k1')],
      [makeCell('B', 'b1'), makeCell('D', 'd1'), makeCell('F', 'f1')],
    ];
    const words: WordPlacement[] = [
      {
        word: 'GO',
        positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        direction: 'horizontal',
        found: false,
      },
    ];
    return {
      grid,
      words,
      config: {
        rows: 3,
        cols: 3,
        wordCount: 1,
        minWordLength: 2,
        maxWordLength: 2,
        difficulty: 'easy',
      },
    };
  }

  it('SMART_SHUFFLE increments shufflesUsed and breaks perfectRun', () => {
    let state = createInitialState(makeBoard(), 1, 'classic');
    state = { ...state, boosterCounts: { ...state.boosterCounts, smartShuffle: 1 } };
    expect(state.shufflesUsed).toBe(0);
    expect(state.perfectRun).toBe(true);

    const next = gameReducer(state, { type: 'SMART_SHUFFLE' });
    expect(next.shufflesUsed).toBe(1);
    expect(next.perfectRun).toBe(false);
  });

  it('a shuffled-then-solved puzzle is 2★, not 3★', () => {
    let state = createInitialState(makeBoard(), 1, 'classic');
    state = { ...state, boosterCounts: { ...state.boosterCounts, smartShuffle: 1 } };
    state = gameReducer(state, { type: 'SMART_SHUFFLE' });
    const assists = state.hintsUsed + state.undosUsed + state.shufflesUsed;
    expect(computeStars('won', assists)).toBe(2);
  });
});
