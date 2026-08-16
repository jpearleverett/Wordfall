/**
 * DEAD-END MESSAGING — the loss has to teach something.
 *
 * A dead board is one of only three real fail states, and it is the only one
 * with no visible cause: nothing on screen says which word should have been
 * cleared first. The banner previously read "Stuck? Tap here to undo your
 * last move", which asks a question the player can already answer and
 * explains nothing. A player who cannot connect "I cleared the wrong word
 * first" to "the board is now unsolvable" concludes the puzzle was broken,
 * and that is a churn event, not a difficulty curve.
 *
 * The banner now names a word that gravity buried, and the first dead end
 * ever also gets the rule behind it. These tests pin the properties that make
 * that messaging TRUE rather than merely present — a message that names the
 * wrong thing is worse than no message.
 */
import { generateBoard } from '../engine/boardGenerator';
import { getLevelConfigExtended } from '../engine/puzzleGenerator';
import { findWordInGrid, isDeadEnd } from '../engine/solver';
import { removeCellsAndApplyGravity } from '../engine/gravity';
import type { Grid } from '../types';

/**
 * Mirrors the headline construction in GameBanners. Kept as a pure function
 * here so the invariants below test the logic rather than a React tree.
 */
function strandedHeadline(strandedWords: string[]): string {
  const shortest = strandedWords.reduce<string | null>(
    (best, w) => (best === null || w.length < best.length ? w : best),
    null,
  );
  if (shortest === null) return 'No order finishes this board';
  return strandedWords.length === 1
    ? `${shortest} is cut off`
    : `${shortest} and ${strandedWords.length - 1} more are cut off`;
}

/** Mirrors the filter GameScreen applies before handing words to the banner. */
function computeStranded(grid: Grid, remainingWords: string[]): string[] {
  return remainingWords.filter((w) => findWordInGrid(grid, w, 1).length === 0);
}

describe('stranded-word headline', () => {
  it('names the word when exactly one remains', () => {
    expect(strandedHeadline(['CANYON'])).toBe('CANYON is cut off');
  });

  it('names one word and counts the rest', () => {
    expect(strandedHeadline(['CANYON', 'RIDGE', 'MESA'])).toBe(
      'MESA and 2 more are cut off',
    );
  });

  it('picks the SHORTEST remaining word', () => {
    // The shortest word is the most checkable example: the player can scan
    // for three letters far faster than for eight, so it is the one most
    // likely to make "oh, those letters are gone" land.
    expect(strandedHeadline(['ELABORATE', 'ICE', 'PLANET'])).toBe(
      'ICE and 2 more are cut off',
    );
  });

  it('falls back to the honest generic line when nothing is buried', () => {
    // A board can be stuck with every word still individually traceable —
    // no ORDER finishes it. Claiming a word is "cut off" there would be
    // visibly false, on the exact screen where the player already suspects
    // the game is broken.
    expect(strandedHeadline([])).toBe('No order finishes this board');
  });
});

describe('the headline is true on real dead boards', () => {
  it('never names a word the player could still trace', () => {
    // This is the invariant that makes the message trustworthy, and it is
    // NOT implied by isStuck: the solver reports a dead end when no clearing
    // order completes the board, which leaves plenty of dead boards where
    // some words remain findable. Pointing at one of those as "cut off"
    // would teach the wrong lesson and read as a bug — so the caller filters
    // to genuinely unreachable words, and this pins that it must.
    let deadBoardsChecked = 0;
    let boardsWithTraceableWords = 0;

    for (let level = 15; level <= 120 && deadBoardsChecked < 10; level += 3) {
      const config = getLevelConfigExtended(level);
      const board = generateBoard(config, level * 811 + 37, 'classic');

      let grid: Grid = board.grid;
      let remaining = board.words.map((w) => w.word);

      // Worst-case play: always clear the LAST findable word, which is the
      // ordering most likely to strand the rest.
      while (remaining.length > 0) {
        const findable = remaining.filter((w) => findWordInGrid(grid, w, 1).length > 0);
        if (findable.length === 0) break;
        const pick = findable[findable.length - 1];
        const occ = findWordInGrid(grid, pick, 1);
        grid = removeCellsAndApplyGravity(grid, occ[0]);
        remaining = remaining.filter((w) => w !== pick);
        if (remaining.length > 0 && isDeadEnd(grid, remaining)) break;
      }

      if (remaining.length === 0 || !isDeadEnd(grid, remaining)) continue;
      deadBoardsChecked++;

      const stranded = computeStranded(grid, remaining);
      if (stranded.length < remaining.length) boardsWithTraceableWords++;

      // Every word the banner could name must be genuinely unfindable.
      for (const word of stranded) {
        expect(findWordInGrid(grid, word, 1)).toHaveLength(0);
      }

      const headline = strandedHeadline(stranded);
      if (stranded.length > 0) {
        expect(stranded.some((w) => headline.startsWith(w))).toBe(true);
      } else {
        expect(headline).toBe('No order finishes this board');
      }
      // Nothing still traceable may appear in the headline.
      for (const word of remaining.filter((w) => !stranded.includes(w))) {
        expect(headline).not.toContain(word);
      }
    }

    // The test is only meaningful if it actually found dead boards to check.
    expect(deadBoardsChecked).toBeGreaterThan(0);
    // And it is only guarding against something real if the "stuck but some
    // words still traceable" case actually occurs — it does, which is why
    // the naive version of this message was wrong.
    expect(boardsWithTraceableWords).toBeGreaterThan(0);
  }, 120_000);
});
