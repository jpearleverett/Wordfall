/**
 * SMART SHUFFLE MUST NOT HAND BACK A DEAD BOARD.
 *
 * The booster re-letters every cell that is not on a remaining word's path.
 * It used to pin only each word's FIRST occurrence, and assert afterwards
 * that every word was still individually findable — an assertion that is
 * true by construction and therefore never failed.
 *
 * Findability is not solvability. The alternative occurrences it overwrote
 * were the board's slack: with them gone each word has exactly one surviving
 * path, so clearing one word can destroy another's only route with nothing to
 * fall back on. Measured over 79 solvable classic boards, the old shuffle left
 * all words findable 79/79 times while leaving the board provably UNWINNABLE
 * 40 times (50.6%) — the player spent a purchased token and got a dead puzzle,
 * and the hint system kept pointing at words because each was still traceable.
 *
 * Pinning every occurrence instead makes it correct by construction (79/79
 * solvable) and still re-letters 36.6% of live cells versus 41.8%, so the
 * booster keeps its visible effect.
 *
 * This suite asserts the property the old assertion should have been: after a
 * shuffle, the board is still winnable.
 */
import { gameReducer, createInitialState } from '../useGame';
import { generateLevelBoard } from '../../engine/boardGenerator';
import { getLevelConfigExtended } from '../../engine/puzzleGenerator';
import { getChapterForLevel } from '../../data/chapters';
import { findWordInGrid } from '../../engine/solver';
import { removeCellsAndApplyGravity } from '../../engine/gravity';
import type { Grid } from '../../types';

/**
 * Exhaustive solvability — EVERY occurrence of every word is explored, which
 * is what the player can actually do. The shipped solver deliberately looks
 * at only the first occurrence to bound branching, so it cannot be used to
 * check this property without assuming the thing under test.
 */
function solvable(grid: Grid, words: string[], depth = 0): boolean {
  if (words.length === 0) return true;
  if (depth > 12) return false;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    for (const pos of findWordInGrid(grid, w, 0)) {
      const rest = [...words.slice(0, i), ...words.slice(i + 1)];
      if (solvable(removeCellsAndApplyGravity(grid, pos), rest, depth + 1)) return true;
    }
  }
  return false;
}

describe('SMART_SHUFFLE preserves solvability', () => {
  it('never turns a winnable classic board into a dead one', () => {
    let shuffled = 0;
    let broken = 0;
    let refused = 0;
    const examples: string[] = [];

    for (let level = 10; level <= 400; level += 5) {
      const config = getLevelConfigExtended(level);
      const chapter = getChapterForLevel(level);
      let board;
      try {
        board = generateLevelBoard(level, config, level * 977 + 13, 'classic', chapter?.profile, chapter?.themeWords);
      } catch {
        continue;
      }
      const words = board.words.map((w) => w.word);
      // Only boards that START winnable can be broken by the shuffle.
      if (!solvable(board.grid, words)) continue;

      let state = createInitialState(board, level, 'classic');
      state = { ...state, boosterCounts: { ...state.boosterCounts, smartShuffle: 1 } };
      const next = gameReducer(state, { type: 'SMART_SHUFFLE' });

      if (next === state || next.board.grid === state.board.grid) {
        // Booster refused — acceptable, and it must not have charged.
        refused++;
        expect(next.boosterCounts.smartShuffle).toBe(1);
        continue;
      }
      shuffled++;
      if (!solvable(next.board.grid, words)) {
        broken++;
        if (examples.length < 5) examples.push(`L${level} (words: ${words.join(',')})`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`\nshuffled ${shuffled} winnable boards, refused ${refused}, broke ${broken}`);
    examples.forEach((e) => console.log('  broken: ' + e));

    // Guard the guard: a run that shuffled nothing would pass vacuously.
    expect(shuffled).toBeGreaterThan(30);
    expect(broken).toBe(0);

    // Refusing is safe but it is not free — the player taps a purchased
    // booster and nothing happens. The solvability check alone would satisfy
    // `broken === 0` by refusing half the boards (measured: 33 refusals of 79
    // when only the first occurrence is pinned, versus 1 when every
    // occurrence is). This bound is what keeps the fix "correct by
    // construction" rather than "correct by giving up".
    expect(refused).toBeLessThan(5);
  }, 900_000);

  it('charges the token only when it actually shuffles', () => {
    const config = getLevelConfigExtended(40);
    const chapter = getChapterForLevel(40);
    const board = generateLevelBoard(40, config, 40 * 977 + 13, 'classic', chapter?.profile, chapter?.themeWords);
    let state = createInitialState(board, 40, 'classic');
    state = { ...state, boosterCounts: { ...state.boosterCounts, smartShuffle: 2 } };

    const next = gameReducer(state, { type: 'SMART_SHUFFLE' });
    if (next.board.grid !== state.board.grid) {
      expect(next.boosterCounts.smartShuffle).toBe(1);
      expect(next.shufflesUsed).toBe(1);
      expect(next.perfectRun).toBe(false);
    } else {
      expect(next.boosterCounts.smartShuffle).toBe(2);
    }
  }, 120_000);

  it('is a no-op with no tokens', () => {
    const config = getLevelConfigExtended(20);
    const board = generateLevelBoard(20, config, 20 * 977 + 13, 'classic');
    const state = createInitialState(board, 20, 'classic');
    expect(state.boosterCounts.smartShuffle).toBe(0);
    expect(gameReducer(state, { type: 'SMART_SHUFFLE' })).toBe(state);
  });
});
