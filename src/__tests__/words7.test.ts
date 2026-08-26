/**
 * WORDS_7 bucket contract: length, format, uniqueness, and reachability
 * plumbing. The bucket exists to power boss words on spike/finale levels
 * past L300 — configs everywhere else cap maxWordLength at 6, and the
 * theme-word membership check in selectWords drops 7-letter words on any
 * board whose config doesn't allow them.
 */
import { WORD_LISTS, getWordsByLength, getAllWords } from '../words';

describe('WORDS_7 bucket', () => {
  const words7 = WORD_LISTS[7];

  it('exists with a substantial curated pool', () => {
    expect(words7).toBeDefined();
    expect(words7.length).toBeGreaterThanOrEqual(280);
  });

  it('every entry is a 7-letter uppercase token', () => {
    for (const w of words7) {
      expect(w).toMatch(/^[A-Z]{7}$/);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(words7).size).toBe(words7.length);
  });

  it('flows through getWordsByLength and getAllWords', () => {
    const range = getWordsByLength(7, 7);
    expect(range).toEqual(words7);
    const all = getAllWords();
    expect(all.has('RAINBOW')).toBe(true);
    expect(all.has('JOURNEY')).toBe(true);
    expect(all.has('GRAVITY')).toBe(true);
  });

  it('a 3-6 range still excludes the 7-letter bucket (existing configs unchanged)', () => {
    const legacy = getWordsByLength(3, 6);
    for (const w of legacy) {
      expect(w.length).toBeLessThanOrEqual(6);
    }
  });
});
