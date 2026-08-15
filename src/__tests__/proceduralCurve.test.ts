/**
 * Post-600 procedural curve — pacing, bounds, and content-variety guard.
 *
 * Contract (mirrors the curated 1-600 cadence, now extended to the
 * infinite tail via getLevelConfigExtended):
 *   - Levels ≤ 600 delegate to getLevelConfig unchanged.
 *   - Every 5th level is a breather: standard silhouette one tier down.
 *   - Spike levels (multiples of 13, RC-gated, breathers win collisions)
 *     add one word, capped at the 10-word bound.
 *   - Board silhouette rotates per procedural chapter (4-way texture).
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
import { generateBoard } from '../engine/boardGenerator';
import { getLevelConfig, getBreatherConfig } from '../constants';
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
      expect(c.maxWordLength).toBeLessThanOrEqual(6);
    }
  });

  it('spike on a max-word chapter never exceeds the 10-word cap', () => {
    // 4004 = 13 × 308, not a multiple of 5, deep in the capped tail.
    const spiked = getLevelConfigExtended(4004);
    expect(spiked.wordCount).toBeLessThanOrEqual(10);
  });
});

describe('getLevelConfigExtended — per-level cadence past 600', () => {
  it('breather levels ease one tier with the standard silhouette', () => {
    // 605 sits in the first procedural chapter (hard) → breather = medium.
    const breather = getLevelConfigExtended(605);
    expect(breather.difficulty).toBe('medium');
    expect(breather.wordCount).toBe(5);
    expect(breather.maxWordLength).toBe(5);
  });

  it('breather wins a spike collision (level 650 = 13×50 and 5×130)', () => {
    const config = getLevelConfigExtended(650);
    expect(config.difficulty).toBe('medium');
    expect(config.wordCount).toBe(5);
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
    expect(breather.difficulty).toBe('medium');
    expect(breather.wordCount).toBeLessThanOrEqual(normal.wordCount);
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
