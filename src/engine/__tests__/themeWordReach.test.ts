/**
 * Chapter theme words have to be able to REACH a board.
 *
 * Two independent things used to stop them, and neither said a word about it —
 * the find-list just came back filled from the generic dictionary and the
 * chapter lost its identity:
 *
 *  1. `selectWords` gated theme words on DICTIONARY MEMBERSHIP. 44 of the 480
 *     authored theme words are not in the word buckets at all, so they could
 *     never be picked: chapter 26 "Stargazer" could not draw STAR, chapter 20
 *     "Kraken's Lair" could not draw KRAKEN, and chapter 29 "Deep Space" lost
 *     NOVA, NEBULA, QUASAR, PULSAR and GAMMA — five of twelve.
 *  2. 14 more were authored OUTSIDE the length window their own chapter's
 *     levels span (GRYPHON(7) in a chapter that tops out at 6; ORE(3) in one
 *     that starts at 4), so no config could ever ask for them.
 *
 * The first is fixed in the generator, the second in the data. These tests
 * pin both, and pin the opening of the game, which is where the same class of
 * bug was most visible.
 */
import * as fs from 'fs';
import * as path from 'path';
import { CHAPTERS } from '../../data/chapters';
import { generateBoard, generateLevelBoard } from '../boardGenerator';
import { getLevelConfigExtended } from '../puzzleGenerator';

const chapterOf = (id: number) => CHAPTERS[id - 1];
const levelsOf = (id: number) =>
  Array.from({ length: 15 }, (_, k) => (id - 1) * 15 + 1 + k);

/** Every distinct word the generator produces across a chapter's levels. */
function wordsAcross(id: number, seeds: number): Set<string> {
  const ch = chapterOf(id);
  const seen = new Set<string>();
  for (const level of levelsOf(id)) {
    const config = getLevelConfigExtended(level);
    for (let k = 0; k < seeds; k++) {
      const board = generateLevelBoard(
        level, config, level * 7919 + k * 104729, 'classic', ch.profile, ch.themeWords,
      );
      board.words.forEach(wp => seen.add(wp.word.toUpperCase()));
    }
  }
  return seen;
}

describe('chapter theme words can reach a board', () => {
  it('every authored theme word fits a length its own chapter actually asks for', () => {
    const offenders: string[] = [];
    CHAPTERS.forEach((ch, i) => {
      const lengths = new Set<number>();
      for (const level of levelsOf(i + 1)) {
        const c = getLevelConfigExtended(level);
        for (let n = c.minWordLength; n <= c.maxWordLength; n++) lengths.add(n);
      }
      for (const word of ch.themeWords) {
        if (!lengths.has(word.length)) {
          offenders.push(`ch${ch.id} ${ch.name}: ${word.toUpperCase()} (${word.length}) vs window ${[...lengths].sort().join('/')}`);
        }
      }
    });
    expect(offenders).toEqual([]);
  });

  it.each([
    [20, 'KRAKEN'],
    [26, 'STAR'],
    [29, 'NEBULA'],
  ])('chapter %i can draw its own word %s even though the dictionary has never heard of it',
    (id, word) => {
      // Guard the guard: if the word ever gets added to the dictionary this
      // test stops proving anything, so assert it is still absent by checking
      // that a board generated with NO theme words never produces it.
      const config = getLevelConfigExtended(levelsOf(id as number)[7]);
      const generic = new Set<string>();
      for (let k = 0; k < 12; k++) {
        generateBoard(config, 31 + k * 7717, 'classic', chapterOf(id as number).profile)
          .words.forEach(wp => generic.add(wp.word.toUpperCase()));
      }
      expect(generic.has(word as string)).toBe(false);

      expect(wordsAcross(id as number, 2)).toContain(word);
    });

  it('the first two boards of the game are nature words, not dictionary filler', () => {
    // Levels 1-2 ask for exactly two THREE-letter words. Chapter 1 used to
    // carry exactly one (SUN), so the other slot always came from the generic
    // 3-letter bucket: PHI, TUX, RAH, EKE, CUD, AMI, GIG, BIZ, VEE.
    const ch1 = CHAPTERS[0];
    const theme = new Set(ch1.themeWords.map(w => w.toUpperCase()));
    for (const level of [1, 2]) {
      const config = getLevelConfigExtended(level);
      for (let k = 0; k < 12; k++) {
        const board = generateLevelBoard(
          level, config, level * 1009 + k * 60013, 'classic', ch1.profile, ch1.themeWords,
        );
        for (const wp of board.words) {
          expect(theme).toContain(wp.word.toUpperCase());
        }
      }
    }
  });

  it('alternate modes get the chapter theme too, not the raw dictionary', () => {
    // Relax, No Gravity, Expert and the rest used to resolve their chapter as
    // `mode === 'classic' ? getChapterForLevel(level) : undefined`, so every
    // alt-mode board drew straight from the generic dictionary. Played boards:
    // WAXY/GIRL/SLAG, IRKS/PAX/SUP, PRIG/BAT/FEW, HELM/DREG/FAX.
    const ch = CHAPTERS[0];
    const theme = new Set(ch.themeWords.map(w => w.toUpperCase()));
    for (const mode of ['relax', 'noGravity', 'expert'] as const) {
      let themed = 0;
      let total = 0;
      for (let level = 1; level <= 10; level++) {
        const board = generateLevelBoard(
          level, getLevelConfigExtended(level), level * 1337 + 90210, mode, undefined, ch.themeWords,
        );
        for (const wp of board.words) {
          total++;
          if (theme.has(wp.word.toUpperCase())) themed++;
        }
      }
      // Not 100%: the mode pool filters (timePressure narrows to <= 4 letters)
      // and the variety guards can still reach past the theme. A clear
      // majority is the property that matters.
      expect(themed / total).toBeGreaterThan(0.6);
    }
  }, 120000);

  it('no board-generation call site gates the chapter on classic mode', () => {
    // The bug was one ternary, repeated at four call sites. A behavioural test
    // cannot see App.tsx's wiring, so pin the shape: resolving the chapter is
    // unconditional, and only the PROFILE (difficulty: length clamps,
    // dictionaryTier, emptyCellDensity, mechanics) stays classic-only.
    const app = fs.readFileSync(path.join(__dirname, '../../../App.tsx'), 'utf8');
    expect(app).not.toMatch(/mode === 'classic' \? getChapterForLevel/);
    expect(app.match(/= getChapterForLevel\(/g) ?? []).toHaveLength(4);
    expect(app.match(/mode === 'classic' \? chapter\?\.profile : undefined/g) ?? []).toHaveLength(3);
  });
});