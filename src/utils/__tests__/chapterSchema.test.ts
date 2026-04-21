/**
 * Runtime-validator tests for the seasonal chapter overlay. Locks in
 * the invariants Ops relies on when publishing new chapters via
 * Remote Config — malformed payloads must be silently discarded so a
 * typo in the Firebase Console never crashes the app.
 */
import { parseRemoteChapters } from '../chapterSchema';

const VALID_CHAPTER = {
  id: 41,
  name: 'Seasonal One',
  theme: 'Summer Solstice',
  description: 'A limited-time seasonal chapter.',
  puzzleCount: 15,
  requiredStars: 120,
  difficulty: 'medium',
  themeWords: ['sun', 'heat', 'wave', 'sand', 'beach'],
  wingId: 'seasonal',
  icon: '☀️',
};

describe('parseRemoteChapters', () => {
  it('returns empty for null / undefined / empty inputs', () => {
    expect(parseRemoteChapters(null)).toEqual([]);
    expect(parseRemoteChapters(undefined)).toEqual([]);
    expect(parseRemoteChapters('')).toEqual([]);
    expect(parseRemoteChapters('   ')).toEqual([]);
  });

  it('returns empty for malformed JSON', () => {
    expect(parseRemoteChapters('{not json')).toEqual([]);
  });

  it('accepts a top-level array', () => {
    const out = parseRemoteChapters(JSON.stringify([VALID_CHAPTER]));
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(41);
  });

  it('accepts a { chapters: [...] } wrapper', () => {
    const out = parseRemoteChapters(
      JSON.stringify({ version: 1, notes: 'summer', chapters: [VALID_CHAPTER] }),
    );
    expect(out).toHaveLength(1);
  });

  it('rejects chapters with id < 41 (overlay is post-static-catalog only)', () => {
    const out = parseRemoteChapters(
      JSON.stringify([{ ...VALID_CHAPTER, id: 3 }]),
    );
    expect(out).toEqual([]);
  });

  it('rejects chapters with missing required fields', () => {
    const broken = { ...VALID_CHAPTER, name: undefined };
    const out = parseRemoteChapters(JSON.stringify([broken]));
    expect(out).toEqual([]);
  });

  it('rejects chapters with invalid difficulty', () => {
    const broken = { ...VALID_CHAPTER, difficulty: 'super_hard' };
    const out = parseRemoteChapters(JSON.stringify([broken]));
    expect(out).toEqual([]);
  });

  it('rejects themeWords containing non-alpha chars', () => {
    const broken = { ...VALID_CHAPTER, themeWords: ['sun', 'bad3!'] };
    const out = parseRemoteChapters(JSON.stringify([broken]));
    expect(out).toEqual([]);
  });

  it('deduplicates by id', () => {
    const out = parseRemoteChapters(
      JSON.stringify([VALID_CHAPTER, { ...VALID_CHAPTER, name: 'Dup' }]),
    );
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Seasonal One');
  });

  it('returns chapters sorted by id', () => {
    const out = parseRemoteChapters(
      JSON.stringify([
        { ...VALID_CHAPTER, id: 43 },
        { ...VALID_CHAPTER, id: 41 },
        { ...VALID_CHAPTER, id: 42 },
      ]),
    );
    expect(out.map((c) => c.id)).toEqual([41, 42, 43]);
  });

  it('skips invalid entries but keeps valid ones in the same payload', () => {
    const out = parseRemoteChapters(
      JSON.stringify([
        VALID_CHAPTER,
        { ...VALID_CHAPTER, id: 'not_a_number' },
        { ...VALID_CHAPTER, id: 42, name: 'Seasonal Two' },
      ]),
    );
    expect(out).toHaveLength(2);
    expect(out.map((c) => c.id)).toEqual([41, 42]);
  });
});
