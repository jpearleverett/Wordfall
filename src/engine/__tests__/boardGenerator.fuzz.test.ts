import { generateBoard } from '../boardGenerator';
import { isSolvable } from '../solver';
import { BoardConfig } from '../../types';
import { CHAPTERS } from '../../data/chapters';

/**
 * Fuzz test: run many seeds through the tutorial-arc chapters and assert
 * every generated board is solvable. Catches regressions where a profile
 * tightens generation so far that the solver can't unpack the resulting
 * grid.
 *
 * Sized for CI: 200 seeds × 5 chapters = 1000 boards (~2-8s wall clock).
 * Plan targets 10,000 seeds — run manually with FUZZ_SEEDS=10000 for the
 * full battery.
 */
const FUZZ_SEEDS = Number(process.env.FUZZ_SEEDS ?? 200);

const TUTORIAL_CONFIG: BoardConfig = {
  rows: 6,
  cols: 6,
  wordCount: 3,
  minWordLength: 3,
  maxWordLength: 6,
  difficulty: 'easy',
};

describe('generateBoard — fuzz across chapter profiles', () => {
  const tutorialChapters = CHAPTERS.slice(0, 5);

  for (const chapter of tutorialChapters) {
    it(`chapter ${chapter.id} (${chapter.name}): ${FUZZ_SEEDS} seeds all solvable`, () => {
      let solvable = 0;
      let unsolvable = 0;
      const unsolvableSeeds: number[] = [];

      for (let seed = 1; seed <= FUZZ_SEEDS; seed++) {
        const board = generateBoard(TUTORIAL_CONFIG, seed, 'classic', chapter.profile);
        const wordStrings = board.words.map(w => w.word);
        const wordPositions = new Map(board.words.map(w => [w.word, w.positions]));
        if (isSolvable(board.grid, wordStrings, wordPositions)) {
          solvable++;
        } else {
          unsolvable++;
          if (unsolvableSeeds.length < 5) unsolvableSeeds.push(seed);
        }
      }

      // The generator only returns boards that passed its internal solvability
      // check, so this should be 100% solvable. If it's not, something is
      // broken in the generation loop.
      expect(unsolvable).toBe(0);
      expect(solvable).toBe(FUZZ_SEEDS);
    }, 60_000);
  }
});
