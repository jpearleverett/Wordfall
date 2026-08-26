/**
 * Post-600 procedural curve — pacing, bounds, and content-variety guard.
 *
 * Contract (mirrors the curated 1-600 cadence, now extended to the
 * infinite tail via getLevelConfigExtended):
 *   - Levels ≤ 600 delegate to getLevelConfig unchanged.
 *   - The tail SEEDS FROM the curated endgame: L601 opens at expert with
 *     L600's 9x7/8-word config and never regresses below it (the old
 *     'hard'-tier on-ramp served the deepest cohort ~90 levels easier
 *     than level 100).
 *   - Every 5th level is a breather: one tier down in a normal chapter, a
 *     config-space dip (one fewer word) inside a breather chapter — never
 *     a double-ease into an unscaled band.
 *   - Spike levels (multiples of 13, RC-gated, breathers win collisions)
 *     add one word, capped at the 10-word bound.
 *   - Board silhouette rotates per procedural chapter (7-way texture; with
 *     the 5-chapter breather rhythm the combined cycle is 35 chapters /
 *     525 levels, not the old exact 300-level loop).
 *   - All configs stay inside the documented bounds forever:
 *     rows 4-10, cols 4-8, wordCount 2-10, word lengths 3-6.
 *   - generateProceduralChapter varies names, theme labels, and theme
 *     words across cycles, and ships a GenerationProfile.
 *   - The pre-staged RC payload (remote-config/chapter-overrides-41-48.json)
 *     passes the real parseRemoteChapters validator.
 */

const mockBooleans = new Map<string, boolean>();

jest.mock('../services/remoteConfig', () => ({
  getRemoteBoolean: (key: string): boolean =>
    mockBooleans.has(key) ? (mockBooleans.get(key) as boolean) : true,
  getRemoteNumber: (_key: string): number => 0,
  getRemoteString: (_key: string): string => '',
}));

import {
  getLevelConfigExtended,
  getBreatherConfigExtended,
  generateProceduralChapter,
} from '../engine/puzzleGenerator';
import { getChapterForLevel, getLastLevelOfChapter } from '../data/chapters';
import { generateBoard } from '../engine/boardGenerator';
import { getLevelConfig, getBreatherConfig, isSpikeLevel } from '../constants';
import { parseRemoteChapters } from '../utils/chapterSchema';
import overridePayload from '../../remote-config/chapter-overrides-41-48.json';

beforeEach(() => {
  mockBooleans.clear();
});

describe('getLevelConfigExtended — curated range delegation', () => {
  it.each([1, 13, 50, 300, 600])('level %i matches getLevelConfig', (level) => {
    expect(getLevelConfigExtended(level)).toEqual(getLevelConfig(level));
  });
});

describe('getLevelConfigExtended — post-600 bounds hold forever', () => {
  const sampleLevels = [
    ...Array.from({ length: 160 }, (_, i) => 601 + i), // first ~11 chapters
    1000, 2500, 5000, 9000,
  ];

  it('every sampled level stays inside the documented bounds', () => {
    for (const level of sampleLevels) {
      const c = getLevelConfigExtended(level);
      expect(c.rows).toBeGreaterThanOrEqual(4);
      expect(c.rows).toBeLessThanOrEqual(10);
      expect(c.cols).toBeGreaterThanOrEqual(4);
      expect(c.cols).toBeLessThanOrEqual(8);
      expect(c.wordCount).toBeGreaterThanOrEqual(2);
      expect(c.wordCount).toBeLessThanOrEqual(10);
      expect(c.minWordLength).toBeGreaterThanOrEqual(3);
      expect(c.maxWordLength).toBeGreaterThanOrEqual(c.minWordLength);
      // Spike levels past BOSS_WORD_MIN_LEVEL may reach the 7-letter
      // boss-word window; everything else holds the 3-6 dictionary core.
      expect(c.maxWordLength).toBeLessThanOrEqual(isSpikeLevel(level) ? 7 : 6);
    }
  });

  it('spike on a max-word chapter never exceeds the 10-word cap', () => {
    // 4004 = 13 × 308, not a multiple of 5, deep in the capped tail.
    const spiked = getLevelConfigExtended(4004);
    expect(spiked.wordCount).toBeLessThanOrEqual(10);
  });
});

describe('getLevelConfigExtended — post-600 seeds from the curated endgame', () => {
  it('L601 never regresses below L600 (the dip that greeted the deepest cohort)', () => {
    const endgame = getLevelConfig(600);
    const tail = getLevelConfigExtended(601);
    expect(tail.difficulty).toBe('expert');
    expect(tail.wordCount).toBeGreaterThanOrEqual(endgame.wordCount);
    expect(tail.rows * tail.cols).toBeGreaterThanOrEqual(endgame.rows * endgame.cols);
  });

  it('non-breather chapters are expert from the first procedural chapter on', () => {
    // Chapters at proceduralIndex 0-4 used to open 'hard' (easier than L100).
    for (const level of [601, 616, 631, 646, 661]) {
      expect(getLevelConfigExtended(level).difficulty).toBe('expert');
    }
  });

  it('deep-tail breather levels never serve an unscaled early-game board', () => {
    // 905 is a breather LEVEL inside a breather CHAPTER (proceduralIndex 20).
    // Double-easing used to land it on the fixed 7x6/5-word (~level-11)
    // config; now it dips one word at the chapter's own (scaled) tier.
    const cfg = getLevelConfigExtended(905);
    expect(cfg.difficulty).toBe('hard');
    expect(cfg.wordCount).toBeGreaterThanOrEqual(7);
    expect(cfg.rows * cfg.cols).toBeGreaterThanOrEqual(56);
  });
});

describe('getLevelConfigExtended — per-level cadence past 600', () => {
  it('breather levels in a normal chapter ease one tier with the standard silhouette', () => {
    // 605 sits in the first procedural chapter (expert) → breather = hard.
    const breather = getLevelConfigExtended(605);
    const plain = getLevelConfigExtended(604);
    expect(breather.difficulty).toBe('hard');
    expect(breather.wordCount).toBeLessThan(plain.wordCount);
  });

  it('breather levels in a breather chapter dip one word at the same tier', () => {
    // 680 is a breather level inside breather chapter proceduralIndex 5.
    // 677 is a plain neighbor (676 is a spike: 13×52).
    const dip = getLevelConfigExtended(680);
    const plain = getLevelConfigExtended(677);
    expect(dip.difficulty).toBe('hard');
    expect(dip.wordCount).toBe(Math.max(4, plain.wordCount - 1));
    expect(plain.difficulty).toBe('hard');
  });

  it('breather wins a spike collision (level 650 = 13×50 and 5×130)', () => {
    const config = getLevelConfigExtended(650);
    expect(config.difficulty).toBe('hard');
    expect(config.wordCount).toBeLessThan(getLevelConfigExtended(649).wordCount);
  });

  it('spike levels add exactly one word over a same-chapter neighbor', () => {
    // 611 = 13 × 47 (spike); 609 is a plain level in the same chapter.
    const spiked = getLevelConfigExtended(611);
    const plain = getLevelConfigExtended(609);
    expect(spiked.wordCount).toBe(plain.wordCount + 1);
  });

  it('spike kill switch: RC off means no word delta', () => {
    mockBooleans.set('spikeLevelsEnabled', false);
    const spikeOff = getLevelConfigExtended(611);
    const plain = getLevelConfigExtended(609);
    expect(spikeOff.wordCount).toBe(plain.wordCount);
  });

  it('board silhouette rotates across consecutive chapters', () => {
    // First non-breather level of procedural chapters 0-3.
    const silhouettes = new Set(
      [601, 616, 631, 646].map((level) => {
        const c = getLevelConfigExtended(level);
        return `${c.rows}x${c.cols}w${c.wordCount}len${c.minWordLength}-${c.maxWordLength}`;
      }),
    );
    expect(silhouettes.size).toBeGreaterThanOrEqual(3);
  });
});

describe('getBreatherConfigExtended', () => {
  it('delegates to getBreatherConfig in the curated range', () => {
    expect(getBreatherConfigExtended(60)).toEqual(getBreatherConfig(60));
  });

  it('eases the procedural tail instead of jumping to the endgame cycle', () => {
    const breather = getBreatherConfigExtended(604);
    const normal = getLevelConfigExtended(604);
    expect(breather.difficulty).toBe('hard');
    expect(breather.wordCount).toBeLessThan(normal.wordCount);
  });

  it('adaptive breather in a breather chapter reaches the SCALED medium band', () => {
    // Chapter proceduralIndex 20 is 'hard'; the adaptive path eases to
    // medium — which now scales instead of returning the fixed 7x6/5 board.
    const cfg = getBreatherConfigExtended(902);
    expect(cfg.difficulty).toBe('medium');
    expect(cfg.rows * cfg.cols).toBeGreaterThanOrEqual(48);
    expect(cfg.wordCount).toBeGreaterThanOrEqual(7);
  });
});

describe('generateProceduralChapter — content variety', () => {
  const chapters = Array.from({ length: 40 }, (_, i) => generateProceduralChapter(41 + i));

  it('names are varied across a 40-chapter stretch', () => {
    const names = new Set(chapters.map((c) => c.name));
    expect(names.size).toBeGreaterThanOrEqual(30);
  });

  it('theme labels rotate per category cycle instead of repeating', () => {
    const first = generateProceduralChapter(41); // cycle 0 of category 0
    const second = generateProceduralChapter(56); // cycle 1 of category 0
    expect(second.theme).not.toBe(first.theme);
  });

  it('repeat category visits draw a different theme-word window', () => {
    const first = generateProceduralChapter(41);
    const second = generateProceduralChapter(56);
    expect(second.themeWords).not.toEqual(first.themeWords);
  });

  it('theme words are always valid dictionary-shaped tokens', () => {
    for (const chapter of chapters) {
      expect(chapter.themeWords.length).toBeLessThanOrEqual(12);
      expect(chapter.themeWords.length).toBeGreaterThan(0);
      for (const word of chapter.themeWords) {
        expect(word).toMatch(/^[a-z]{2,12}$/);
      }
    }
  });

  it('every procedural chapter ships a generation profile', () => {
    for (const chapter of chapters) {
      expect(chapter.profile).toBeDefined();
      expect(chapter.profile?.dictionaryTier).toBeDefined();
    }
  });

  it('finale chapters are dense; breather chapters are airy', () => {
    const finale = generateProceduralChapter(45); // proceduralIndex 4
    expect(finale.profile?.introducedMechanics).toContain('denseBoard');

    const breather = generateProceduralChapter(46); // proceduralIndex 5
    expect(breather.profile?.emptyCellDensity ?? 0).toBeGreaterThanOrEqual(0.1);
  });

  it('star gates keep climbing monotonically', () => {
    for (let i = 1; i < chapters.length; i++) {
      expect(chapters[i].requiredStars).toBeGreaterThan(chapters[i - 1].requiredStars);
    }
  });
});

describe('post-600 boards actually generate', () => {
  const levels = [601, 605, 611, 616, 631, 646, 676, 1000];

  it.each(levels)('level %i produces a playable board', (level) => {
    const config = getLevelConfigExtended(level);
    const chapterId = 41 + Math.floor((level - 601) / 15);
    const chapter = generateProceduralChapter(Math.max(41, chapterId));
    const board = generateBoard(config, level * 31, 'classic', chapter.profile, chapter.themeWords);
    expect(board).toBeDefined();
    expect(board.words.length).toBeGreaterThanOrEqual(2);
    expect(board.grid.length).toBeGreaterThanOrEqual(4);
  }, 30_000);
});

describe('pre-staged RC payload (chapters 41-48)', () => {
  it('passes the real parseRemoteChapters validator intact', () => {
    const parsed = parseRemoteChapters(JSON.stringify(overridePayload));
    expect(parsed.map((c) => c.id)).toEqual([41, 42, 43, 44, 45, 46, 47, 48]);
  });

  it('keeps star gates continuous with chapter 40 (234) and each other', () => {
    const parsed = parseRemoteChapters(JSON.stringify(overridePayload));
    let prev = 234;
    for (const chapter of parsed) {
      expect(chapter.requiredStars).toBeGreaterThan(prev);
      prev = chapter.requiredStars;
    }
  });

  it('carries generation profiles and palettes through the parser', () => {
    const parsed = parseRemoteChapters(JSON.stringify(overridePayload));
    for (const chapter of parsed) {
      expect(chapter.profile).toBeDefined();
      expect(chapter.palette).toBeDefined();
    }
  });
});

describe('procedural chapter boundaries — getChapterForLevel agrees with getLastLevelOfChapter', () => {
  // Both sides of the star-gate clamp must see the same boundary: the clamp
  // holds a gated player at getLastLevelOfChapter(current), which only gates
  // anything if getChapterForLevel still maps that level into the CURRENT
  // chapter. An off-by-one here made every post-600 star gate a no-op.
  it('chapter 41 spans exactly levels 601-615 (no RC overlay)', () => {
    expect(getChapterForLevel(601)!.id).toBe(41);
    expect(getChapterForLevel(615)!.id).toBe(41);
    expect(getChapterForLevel(616)!.id).toBe(42);
    expect(getLastLevelOfChapter(41)).toBe(615);
  });

  it('last level of every procedural chapter belongs to that chapter (ids 41-60)', () => {
    for (let id = 41; id <= 60; id++) {
      const last = getLastLevelOfChapter(id);
      expect(getChapterForLevel(last)!.id).toBe(id);
      expect(getChapterForLevel(last + 1)!.id).toBe(id + 1);
      expect(getChapterForLevel(last - 14)!.id).toBe(id); // first level of the chapter
    }
  });

  it('matches puzzleGenerator\'s chapter indexing for sampled deep levels', () => {
    for (const level of [601, 615, 616, 630, 631, 1000, 5000]) {
      const expectedId = 41 + Math.floor((level - 601) / 15);
      expect(getChapterForLevel(level)!.id).toBe(expectedId);
    }
  });
});
