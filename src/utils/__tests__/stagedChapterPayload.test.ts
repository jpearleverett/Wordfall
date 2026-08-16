/**
 * THE STAGED CHAPTER PAYLOAD MUST ACTUALLY VALIDATE.
 *
 * remote-config/chapter-overrides-41-48.json is the seasonal content meant to
 * be pasted into the `chapterOverrideJson` Remote Config key. Until Remote
 * Config was wired up it could not reach a player at all, so nothing had ever
 * checked it against the parser.
 *
 * Now it can — and parseRemoteChapters fails SILENTLY by design: an invalid
 * chapter is skipped, a malformed payload yields an empty array, and the game
 * carries on with the 40 authored chapters. That is the right runtime
 * behaviour and exactly why a typo here would never be noticed. The file is
 * checked in, so check it at build time instead.
 */
import fs from 'fs';
import path from 'path';
import { parseRemoteChapters } from '../chapterSchema';
import { getWordsByLength } from '../../words';

const PAYLOAD_PATH = path.join(__dirname, '../../../remote-config/chapter-overrides-41-48.json');

describe('staged chapter override payload', () => {
  const raw = fs.readFileSync(PAYLOAD_PATH, 'utf8');

  it('is valid JSON', () => {
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('survives the parser that will actually consume it', () => {
    const chapters = parseRemoteChapters(raw);
    // The file is named for chapters 41-48. If the parser silently drops
    // some, the player gets a short season and nothing reports it.
    expect(chapters).toHaveLength(8);
  });

  it('publishes exactly ids 41-48, in order', () => {
    // Ids <= 40 are rejected by the schema (they would collide with the
    // authored chapters); a gap or a duplicate means a chapter that never
    // ships or one that shadows another.
    const ids = parseRemoteChapters(raw).map((c) => c.id);
    expect(ids).toEqual([41, 42, 43, 44, 45, 46, 47, 48]);
  });

  it('every chapter carries the content a player will see', () => {
    for (const ch of parseRemoteChapters(raw)) {
      expect(ch.name.trim().length).toBeGreaterThan(0);
      expect(ch.puzzleCount).toBeGreaterThan(0);
      // The theme list is what the boards are built from — an empty one
      // falls back to generic vocabulary and the season loses its identity.
      expect(Array.isArray(ch.themeWords)).toBe(true);
      expect(ch.themeWords!.length).toBeGreaterThan(0);
    }
  });

  it('theme words are shaped like placeable words', () => {
    // Board generation places single A-Z letters, and selectWords uppercases
    // before the pool lookup — so casing is free, but a space, hyphen, digit
    // or accent makes the word unplaceable and it is dropped in silence.
    for (const ch of parseRemoteChapters(raw)) {
      for (const word of ch.themeWords ?? []) {
        expect(word).toMatch(/^[A-Za-z]+$/);
        expect(word.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('most theme words actually survive the pool filter', () => {
    // This is the assertion that matters, and the one that is invisible at
    // runtime. selectWords keeps only theme words present in the dictionary
    // pool (`themeWords.filter(w => poolSet.has(w))`) — anything else is
    // dropped without a warning and the chapter quietly falls back to generic
    // vocabulary, losing the seasonal identity it exists for.
    //
    // The authored chapters 1-40 land at 90%, which is the practical ceiling
    // (some flavour words genuinely aren't in the dictionary). The floor here
    // is set below the staged payload's measured 83% so a future season can't
    // ship mostly-decorative theme lists.
    const pool = new Set(getWordsByLength(3, 8).map((w) => w.toUpperCase()));
    const chapters = parseRemoteChapters(raw);
    let total = 0;
    let inPool = 0;
    for (const ch of chapters) {
      for (const word of ch.themeWords ?? []) {
        total++;
        if (pool.has(word.toUpperCase())) inPool++;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(inPool / total).toBeGreaterThan(0.75);

    // And no single chapter may be mostly filler, which an overall average
    // can hide.
    for (const ch of chapters) {
      const words = ch.themeWords ?? [];
      const hits = words.filter((w) => pool.has(w.toUpperCase())).length;
      expect(hits / words.length).toBeGreaterThan(0.5);
    }
  });

  it('continues the level curve without a gap or overlap', () => {
    // Chapters 1-40 cover levels 1-600. The overlay is appended, and
    // getChapterForLevel walks cumulative puzzleCount — so any chapter with a
    // zero or missing count would swallow a level range.
    const chapters = parseRemoteChapters(raw);
    const total = chapters.reduce((sum, c) => sum + c.puzzleCount, 0);
    expect(total).toBeGreaterThan(0);
    for (const ch of chapters) {
      expect(Number.isInteger(ch.puzzleCount)).toBe(true);
    }
  });
});
