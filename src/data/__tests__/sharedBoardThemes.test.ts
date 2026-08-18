/**
 * Authoring contract for the shared-board theme calendar.
 *
 * Theme words that aren't in the dictionary are silently dropped by
 * selectWords — the theme still "works" but ships fewer curated words than
 * authored, and nothing ever says so. These tests make a dead authored word
 * a test failure instead of a silent quality leak, and pin the length-band
 * coverage that lets every theme survive every daily variant's bounds.
 */
import {
  DAILY_THEMES,
  WEEKLY_THEMES,
  getDailyTheme,
  getWeeklyTheme,
} from '../sharedBoardThemes';
import { getWordsByLength } from '../../words';

const DICT = new Set(getWordsByLength(3, 8));

describe('shared board themes — authoring contract', () => {
  const allThemes = [...DAILY_THEMES, ...WEEKLY_THEMES];

  it.each(allThemes.map((t) => [t.name, t] as const))(
    '%s: every word is in the dictionary',
    (_name, theme) => {
      const missing = theme.words.filter((w) => !DICT.has(w.toUpperCase()));
      expect(missing).toEqual([]);
    },
  );

  it.each(allThemes.map((t) => [t.name, t] as const))(
    '%s: has 12 unique words, all 3-6 letters',
    (_name, theme) => {
      expect(theme.words).toHaveLength(12);
      expect(new Set(theme.words.map((w) => w.toUpperCase())).size).toBe(12);
      for (const w of theme.words) {
        expect(w.length).toBeGreaterThanOrEqual(3);
        expect(w.length).toBeLessThanOrEqual(6);
      }
    },
  );

  it.each(DAILY_THEMES.map((t) => [t.name, t] as const))(
    '%s: covers both length bands (3-4 and 5-6) so every weekday variant gets theme words',
    (_name, theme) => {
      // Sunday/Monday run 3-4 only; Wednesday runs 5-6 only. A theme with
      // ≥3 words in each band contributes visibly to all seven variants.
      const short = theme.words.filter((w) => w.length <= 4);
      const long = theme.words.filter((w) => w.length >= 5);
      expect(short.length).toBeGreaterThanOrEqual(3);
      expect(long.length).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(WEEKLY_THEMES.map((t) => [t.name, t] as const))(
    '%s: carries at least 5 words in the 5-6 band (weekly runs the hard config)',
    (_name, theme) => {
      expect(theme.words.filter((w) => w.length >= 5).length).toBeGreaterThanOrEqual(5);
    },
  );

  it('DAILY_THEMES length is not a multiple of 7 (weekday variants must drift across themes)', () => {
    expect(DAILY_THEMES.length % 7).not.toBe(0);
  });
});

describe('theme rotation determinism', () => {
  it('same date → same daily theme; consecutive days differ', () => {
    expect(getDailyTheme('2026-08-17')).toBe(getDailyTheme('2026-08-17'));
    expect(getDailyTheme('2026-08-17')).not.toBe(getDailyTheme('2026-08-18'));
  });

  it('daily rotation cycles the whole bank', () => {
    const seen = new Set<string>();
    const start = Date.parse('2026-01-01T00:00:00Z');
    for (let d = 0; d < DAILY_THEMES.length; d++) {
      const date = new Date(start + d * 86_400_000).toISOString().slice(0, 10);
      seen.add(getDailyTheme(date).name);
    }
    expect(seen.size).toBe(DAILY_THEMES.length);
  });

  it('malformed inputs fall back instead of throwing', () => {
    expect(getDailyTheme('garbage')).toBe(DAILY_THEMES[0]);
    expect(getWeeklyTheme('garbage')).toBe(WEEKLY_THEMES[0]);
  });

  it('same week id → same weekly theme; adjacent weeks differ', () => {
    expect(getWeeklyTheme('2026_W33')).toBe(getWeeklyTheme('2026_W33'));
    expect(getWeeklyTheme('2026_W33')).not.toBe(getWeeklyTheme('2026_W34'));
  });
});

describe('theme words actually reach the shared boards', () => {
  // The full pipeline: generateDailyBoard/-WeeklyBoard pass the theme list
  // into board generation, which reserves up to half the find-list for it.
  // Assert a real overlap so a broken plumbing change can't silently revert
  // the boards to generic words.
  const { generateDailyBoard, generateWeeklyBoard } = jest.requireActual(
    '../../engine/boardGenerator',
  );

  it('the daily board contains words from its theme', () => {
    const date = '2026-08-18';
    const theme = new Set(getDailyTheme(date).words.map((w) => w.toUpperCase()));
    const board = generateDailyBoard(date);
    const themed = board.words.filter((w: { word: string }) => theme.has(w.word));
    expect(themed.length).toBeGreaterThanOrEqual(1);
  });

  it('the weekly board contains words from its theme', () => {
    const weekId = '2026_W34';
    const theme = new Set(getWeeklyTheme(weekId).words.map((w) => w.toUpperCase()));
    const board = generateWeeklyBoard(weekId);
    const themed = board.words.filter((w: { word: string }) => theme.has(w.word));
    expect(themed.length).toBeGreaterThanOrEqual(1);
  });
});
