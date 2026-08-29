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
 * WHERE THIS STANDS. Every chapter now carries 22-24 theme words instead of
 * 12, and carry-over roughly halves across the game: Forest Walk 49% -> 25%,
 * Garden Bloom 65% -> 34%, Open Seas 68% -> 31%, Bedrock 71% -> 41%. The
 * distinct words a chapter's fifteen levels use went from twelve to
 * twenty-plus.
 *
 * Two things had to be true for that to be shippable, and both were measured
 * rather than assumed:
 *
 *  - The added words have to sit in the LENGTH DISTRIBUTION the chapter's
 *    levels actually ask for. A first pass gave Ancient Tales and Stargazer
 *    five- and six-letter words when their levels ask for three and four, and
 *    their numbers barely moved (Stargazer 64% -> 63%). Rebalancing eleven
 *    chapters toward their real distribution is what turned those into
 *    37% and 45%.
 *  - Widening a list makes boards LESS forgiving on its own, by five to ten
 *    points a chapter, because a bigger pool lets the generator pick word sets
 *    that interlock more. That is why this shipped together with the
 *    forgiveness fix in `boardGenerator`/`solver` and not before it: the
 *    generator now gives back six to ten points, so the pair is a net
 *    improvement on both axes rather than a trade. See stuckRate.test.ts.
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
//  words across the chapter's fifteen levels]. Bounds sit a little above what
//  each chapter measures today, so ordinary generator drift does not trip them
//  but a regression to twelve-word lists does.
const BOUNDS: [number, number, number][] = [
  [0, 0.28, 18],   // First Sprout    — measured 21% / 21
  [1, 0.33, 18],   // Forest Walk     — measured 25% / 21
  [2, 0.42, 19],   // Garden Bloom    — measured 34% / 22
  [3, 0.40, 21],   // Wild Meadow     — measured 32% / 24
  [4, 0.40, 21],   // Mountain Peak   — measured 32% / 24
  [5, 0.37, 17],   // Lab Basics      — measured 29% / 20
  [6, 0.39, 18],   // Chemistry Set   — measured 31% / 21
  [10, 0.45, 18],  // Ancient Tales   — measured 37% / 21, after rebalancing
  [25, 0.53, 15],  // Stargazer       — measured 45% / 17, the weakest chapter
];

describe('find-list variety across a chapter', () => {
  it.each(BOUNDS)('chapter %i does not start asking for the same words more often',
    (chIdx, maxCarry, minDistinct) => {
      const { carryOver, distinct } = variety(chIdx);
      expect(carryOver).toBeLessThanOrEqual(maxCarry);
      expect(distinct).toBeGreaterThanOrEqual(minDistinct);
    }, 120000);

  it.each([0, 3, 25])('chapter %i is measurably better than the twelve-word list it replaced', (chIdx) => {
    // Guard the guard: the bounds above only mean something if the lists they
    // replaced would actually miss them.
    const ch = CHAPTERS[chIdx];
    const full = ch.themeWords;
    try {
      (ch as { themeWords: string[] }).themeWords = full.slice(0, 12);
      const before = variety(chIdx);
      (ch as { themeWords: string[] }).themeWords = full;
      const after = variety(chIdx);
      // A twelve-word list misses the DISTINCT bound outright — it cannot
      // reach 15+ distinct words across fifteen levels when it only contains
      // twelve — and is beaten on both axes by the list that replaced it.
      // Carry-over alone is deliberately NOT the guard: the generator's
      // forgiveness fix moved chapter 1's twelve-word carry-over to 27%,
      // inside its own bound, so asserting on it would pin nothing there.
      expect(before.distinct).toBeLessThan(15);
      expect(after.carryOver).toBeLessThan(before.carryOver);
      expect(after.distinct).toBeGreaterThan(before.distinct);
    } finally {
      (ch as { themeWords: string[] }).themeWords = full;
    }
  }, 240000);
});
