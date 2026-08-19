/**
 * Pins the seasonal-stamp art map to the stamp catalog. The blind panel's
 * complaint was twofold: stamps rendered stock system emoji, and several
 * rendered art that CONTRADICTED their label (an apple on 'Ice Cream', a
 * pine tree on 'Tropical'). So: every stamp id must have bespoke art, no
 * entry may outlive its stamp, the resolver must be total over the catalog,
 * and the historically-wrong pairs are pinned by name.
 */
import { SEASONAL_ALBUMS } from '../../../data/collections';
import { STAMP_ICON_BY_ID, stampIconName } from '../../icons/stampArtMap';
import { isMatteStamp, sheenVector, stampSheen, stampSheenIndex } from '../stampSheen';

const STAMPS = SEASONAL_ALBUMS.flatMap((a) => a.stamps);

describe('seasonal stamp art map', () => {
  it('assigns bespoke art to every stamp in SEASONAL_ALBUMS', () => {
    const missing = STAMPS.filter((s) => !STAMP_ICON_BY_ID[s.id]).map((s) => s.id);
    expect(missing).toEqual([]);
    expect(STAMPS.length).toBe(80);
  });

  it('has no orphan entries for stamps that left the catalog', () => {
    const ids = new Set(STAMPS.map((s) => s.id));
    expect(Object.keys(STAMP_ICON_BY_ID).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('names motifs, never raw emoji, for every stamp', () => {
    for (const s of STAMPS) {
      const motif = stampIconName(s.id);
      expect(motif).toMatch(/^stamp[A-Z]/);
    }
  });

  it('returns null for unknown ids and undefined so callers can fall back', () => {
    expect(stampIconName(undefined)).toBeNull();
    expect(stampIconName('not_a_stamp')).toBeNull();
  });

  it('matches art to the stamp NAME on the pairs the panel flagged', () => {
    const byName = new Map(STAMPS.map((s) => [s.name, s.id]));
    const expected: Record<string, string> = {
      'Ice Cream': 'stampIceCream',
      Tropical: 'stampPalm',
      Sandcastle: 'stampSandcastle',
      'Apple Harvest': 'stampApple',
      'Harvest Moon': 'stampHarvestMoon',
      Acorn: 'stampAcorn',
      Snowman: 'stampSnowman',
      'Hot Cocoa': 'stampCocoa',
      'Sleigh Ride': 'stampSled',
      'Pine Forest': 'stampEvergreen',
      Mushroom: 'stampMushroom',
      Butterfly: 'stampButterfly',
      'Flower Crown': 'stampFlowerCrown',
      'Corn Maze': 'stampCorn',
      Lemonade: 'stampLemonade',
      'Coral Reef': 'stampCoral',
      'Surf Rider': 'stampSurfboard',
      'Northern Light': 'stampAurora',
      'Bird Song': 'stampSongbird',
      'Muddy Paws': 'stampPaw',
    };
    for (const [name, motif] of Object.entries(expected)) {
      const id = byName.get(name);
      expect(id).toBeDefined();
      expect(stampIconName(id)).toBe(motif);
    }
  });

  it('spreads the album across many distinct motifs (anti-sameness)', () => {
    for (const album of SEASONAL_ALBUMS) {
      const motifs = new Set(album.stamps.map((s) => stampIconName(s.id)));
      // 20 stamps per album; near-synonym names may share, but a season must
      // never collapse onto a handful of repeated plates.
      expect(motifs.size).toBeGreaterThanOrEqual(15);
    }
    expect(new Set(Object.values(STAMP_ICON_BY_ID)).size).toBeGreaterThanOrEqual(45);
  });
});

/**
 * The panel's other sameness complaint: "every single card carries the
 * identical diagonal gloss streak in the same position". The streak is now
 * derived from the sheet position.
 */
describe('stamp foil sheen', () => {
  const SHEET = Array.from({ length: 20 }, (_, i) => i);

  it('never gives two adjacent stamps the same streak', () => {
    for (let i = 0; i < 60; i++) {
      const a = stampSheen(i);
      const b = stampSheen(i + 1);
      if (!a || !b) continue; // one of them is matte — trivially different
      expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
      expect(a.angle).not.toBe(b.angle);
    }
  });

  it('mattes roughly one stamp in three, never two in a row', () => {
    const matte = SHEET.filter(isMatteStamp);
    expect(matte.length).toBeGreaterThanOrEqual(SHEET.length / 4);
    expect(matte.length).toBeLessThanOrEqual(SHEET.length / 2);
    for (let i = 0; i < 60; i++) {
      expect(isMatteStamp(i) && isMatteStamp(i + 1)).toBe(false);
    }
    for (const i of matte) expect(stampSheen(i)).toBeNull();
  });

  it('varies angle, width, offset and opacity across an album page', () => {
    const specs = SHEET.map(stampSheen).filter((s): s is NonNullable<typeof s> => !!s);
    expect(new Set(specs.map((s) => s.angle)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(specs.map((s) => s.width)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(specs.map((s) => s.center)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(specs.map((s) => s.opacity)).size).toBeGreaterThanOrEqual(4);
    // Streaks run both ways, not one baked-in diagonal.
    expect(specs.some((s) => s.angle > 0)).toBe(true);
    expect(specs.some((s) => s.angle < 0)).toBe(true);
  });

  it('falls back to a stable id hash when no sheet index is given', () => {
    const ids = SEASONAL_ALBUMS[0].stamps.map((s) => s.id);
    for (const id of ids) {
      const i = stampSheenIndex(undefined, id);
      expect(Number.isInteger(i)).toBe(true);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(stampSheenIndex(undefined, id)).toBe(i);
    }
    expect(new Set(ids.map((id) => stampSheenIndex(undefined, id))).size).toBeGreaterThan(1);
    expect(stampSheenIndex(7, 'su26_1')).toBe(7);
  });

  it('emits a centered gradient vector for any angle', () => {
    for (const angle of [-68, -24, 0, 12, 38, 80]) {
      const v = sheenVector(angle);
      expect((v.x1 + v.x2) / 2).toBeCloseTo(0.5, 6);
      expect((v.y1 + v.y2) / 2).toBeCloseTo(0.5, 6);
      for (const n of [v.x1, v.y1, v.x2, v.y2]) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(1);
      }
    }
  });
});
