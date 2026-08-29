/**
 * How often does the next level ask for the words you just found?
 *
 * This is the one thing a long session makes obvious and no other test can
 * see. A chapter shipped twelve theme words; its levels ask for seven or
 * eight; theme words sit at the head of the pool. So the same seven words
 * came back level after level — measured over levels 31-105, roughly 60% of
 * each find-list was carried straight over from the previous board, and a
 * chapter's fifteen levels between them used TWELVE distinct words in total.
 * The board changed; the list did not.
 *
 * The lever is the size of the list the chapter can draw from — expected
 * carry-over for k slots from n words is k²/n — but only if the added words
 * are the LENGTHS that chapter's levels actually ask for. Chapters 2 and 6
 * ask mostly for 3-4 letter words, and a first pass that added 5-6 letter
 * ones moved their numbers by nothing at all.
 *
 * WHERE THIS STANDS. Chapter 1 is fixed: its list went from twelve words to
 * twenty-two (it had to, to stop levels 1-2 serving PHI and TUX), and its
 * carry-over fell from 30% to 22% while its distinct count went 14 -> 21.
 * Chapters 2-7 are NOT fixed, and their numbers below are the status quo
 * rather than a target.
 *
 * That is deliberate, because widening a list is not free. Measured over
 * levels 1-105, ten to twelve extra on-theme words per chapter take carry-over
 * from 53% to 31% — and take the RANDOM-player dead-end rate up with it, by
 * five to ten points a chapter (L46-60: 63% -> 73%). A player who plans one
 * move ahead does not feel it at all (mid-game one-ply dead-ends measured 5.3%
 * before and 4.0% after, 720 boards each), so the cost falls entirely on the
 * player who has not learned the ordering rule. Chapter 1 is the exception
 * that proves the rule is not universal: its widening moved BOTH numbers the
 * right way (7.2% -> 3.9% naive dead-ends), because its added words are short
 * and its boards are small.
 *
 * `stuckRate.test.ts` calls the naive number a floor that must not get worse,
 * so widening chapters 2-7 is a design call with a real cost and belongs to
 * whoever owns the difficulty curve, not to a passing fix. The bounds here
 * pin today's behaviour so it cannot silently get worse in the meantime.
 */
import { CHAPTERS } from '../../data/chapters';
import { generateLevelBoard } from '../boardGenerator';
import { getLevelConfigExtended } from '../puzzleGenerator';

/**
 * Play a chapter's fifteen levels the way the app loads them — a fresh seed
 * per level, per session (App.tsx: `Date.now() + level * 1337`), so this
 * measures what a player gets rather than one lucky seed.
 *
 * NOTE for anyone writing their own probe: do NOT seed with a multiple of
 * 7919. That is `generateBoard`'s retry stride (`baseSeed + attempt * 7919`),
 * so consecutive levels land on rng states an earlier level already used and
 * six levels in a row come back with the IDENTICAL list. That is an artifact
 * of the probe, not the game.
 */
function playChapter(chIdx: number, session: number) {
  const ch = CHAPTERS[chIdx];
  const base = 1_770_000_000_000 + session * 987_654_321;
  const lists: string[][] = [];
  for (let level = chIdx * 15 + 1; level <= chIdx * 15 + 15; level++) {
    const board = generateLevelBoard(
      level, getLevelConfigExtended(level), base + level * 1337,
      'classic', ch.profile, ch.themeWords,
    );
    lists.push(board.words.map(w => w.word.toUpperCase()));
  }
  return lists;
}

function variety(chIdx: number, sessions = 3) {
  let carried = 0, pairs = 0, distinct = 0;
  for (let s = 0; s < sessions; s++) {
    const lists = playChapter(chIdx, s);
    for (let i = 1; i < lists.length; i++) {
      carried += lists[i].filter(w => lists[i - 1].includes(w)).length / lists[i].length;
      pairs++;
    }
    distinct += new Set(lists.flat()).size;
  }
  return { carryOver: carried / pairs, distinct: distinct / sessions };
}

// [chapter index, max share carried over from the previous level, min distinct
//  words across the chapter's fifteen levels]
const BOUNDS: [number, number, number][] = [
  [0, 0.28, 18],  // First Sprout  — FIXED, measured 21% / 21
  [1, 0.55, 11],  // Forest Walk   — status quo, measured 49% / 12
  [2, 0.71, 11],  // Garden Bloom  — status quo, measured 65% / 12
  [3, 0.66, 11],  // Wild Meadow   — status quo, measured 60% / 13
  [4, 0.65, 11],  // Mountain Peak — status quo, measured 59% / 19
  [5, 0.55, 11],  // Lab Basics    — status quo, measured 49% / 12
  [6, 0.65, 11],  // Chemistry Set — status quo, measured 59% / 12
];

describe('find-list variety across a chapter', () => {
  it.each(BOUNDS)('chapter %i does not start asking for the same words more often',
    (chIdx, maxCarry, minDistinct) => {
      const { carryOver, distinct } = variety(chIdx);
      expect(carryOver).toBeLessThanOrEqual(maxCarry);
      expect(distinct).toBeGreaterThanOrEqual(minDistinct);
    }, 120000);

  it('chapter 1 is measurably better than the twelve-word list it replaced', () => {
    // Guard the guard: chapter 1's bound above only means something if the
    // list it replaced would actually miss it.
    const ch = CHAPTERS[0];
    const full = ch.themeWords;
    try {
      (ch as { themeWords: string[] }).themeWords = full.slice(0, 12);
      const before = variety(0);
      (ch as { themeWords: string[] }).themeWords = full;
      const after = variety(0);
      // The twelve-word list misses chapter 1's DISTINCT bound outright (it
      // cannot reach 18 distinct words across fifteen levels when it only
      // contains twelve), and is beaten on both axes by the list that
      // replaced it. Carry-over is deliberately NOT the guard here: the
      // generator's forgiveness fix moved the twelve-word list's carry-over
      // to 27%, inside chapter 1's bound, so asserting on it would pin
      // nothing.
      expect(before.distinct).toBeLessThan(18);
      expect(after.carryOver).toBeLessThan(before.carryOver);
      expect(after.distinct).toBeGreaterThan(before.distinct);
    } finally {
      (ch as { themeWords: string[] }).themeWords = full;
    }
  }, 120000);
});
