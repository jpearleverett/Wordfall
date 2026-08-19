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
