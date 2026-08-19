/**
 * Pins the per-index panel wash. The blind panel's regression was: "six of the
 * nine stamps share the same amber/orange gradient, so the grid reads as one
 * uniform colour block" — family-keyed washes collapsed the Summer album,
 * which is almost entirely warm-family motifs (sun, heat, beach, ice cream,
 * tropical), onto a single hue.
 *
 * So these tests run the REAL album catalog through the real wash derivation
 * and assert the sheet is polychrome: adjacent stamps (in reading order AND in
 * the album's 3-column grid) never share a wash, and a page of nine spans
 * several distinct hue bands.
 */
import { SEASONAL_ALBUMS } from '../../../data/collections';
import { stampIconName } from '../../icons/stampArtMap';
import {
  FAMILY_TINT_DEG,
  HUE_STEP_DEG,
  WASH_HUE_STEPS,
  familyTint,
  hexToHsl,
  hslToHex,
  hueDistance,
  stampWashColor,
  stampWashHue,
  stampWashPalette,
} from '../stampWash';

const FALLBACK = '#8b5cf6';
const GRID_COLS = 3;

/** Wash hue actually printed for stamp `i` of an album. */
function albumHues(album: (typeof SEASONAL_ALBUMS)[number]): number[] {
  return album.stamps.map((s, i) =>
    stampWashHue(stampWashColor(stampIconName(s.id), FALLBACK), i),
  );
}

describe('hsl round-trip', () => {
  it('preserves a colour through hex → hsl → hex', () => {
    for (const hex of ['#f2a12c', '#1f9fc4', '#e87fb0', '#3fa25a', '#d8483f', '#8b74e8']) {
      const { h, s, l } = hexToHsl(hex);
      expect(hueDistance(hexToHsl(hslToHex(h, s, l)).h, h)).toBeLessThan(2);
    }
  });

  it('degrades non-hex input to a mid gray instead of throwing', () => {
    expect(hexToHsl('rebeccapurple')).toEqual({ h: 0, s: 0, l: 0.5 });
    expect(hslToHex(720, 2, -1)).toBe('#000000');
  });
});

describe('per-index wash rotation', () => {
  it('keeps every touching ring offset far apart on the wheel', () => {
    // k=1 horizontal, k=3 vertical, k=2/k=4 diagonal on a 3-column page.
    for (const k of [1, 2, 3, 4]) {
      expect(hueDistance(k * HUE_STEP_DEG, 0)).toBeGreaterThanOrEqual(HUE_STEP_DEG);
    }
    expect(WASH_HUE_STEPS).toHaveLength(5);
  });

  it('caps how far any family can pull the wash off the ring', () => {
    // This cap is the whole guarantee: two touching stamps can be from any
    // two families, so family influence must stay under the index step.
    for (const family of ['#f2a12c', '#1f9fc4', '#e87fb0', '#3fa25a', '#d8483f', '#6fbfe8']) {
      expect(Math.abs(familyTint(family))).toBeLessThanOrEqual(FAMILY_TINT_DEG);
    }
    expect(2 * FAMILY_TINT_DEG).toBeLessThan(HUE_STEP_DEG - 30);
  });

  it('turns one amber family into amber, mint, teal, violet and rose', () => {
    const hues = [0, 1, 2, 3, 4].map((i) => stampWashHue('#f2a12c', i));
    // Five clearly separate bands of the wheel — not five ambers.
    for (let a = 0; a < hues.length; a++) {
      for (let b = a + 1; b < hues.length; b++) {
        expect(hueDistance(hues[a], hues[b])).toBeGreaterThanOrEqual(60);
      }
    }
    expect(new Set(hues.map((h) => Math.floor(h / 60))).size).toBeGreaterThanOrEqual(4);
  });

  it('alternates light and deep print value so repeats still differ', () => {
    for (let i = 0; i < 12; i++) {
      expect(stampWashPalette('#f2a12c', i).lightValue).toBe(i % 2 === 0);
    }
    // The hue cycle repeats every 5 — the value cycle must break the tie.
    const a = stampWashPalette('#f2a12c', 0);
    const b = stampWashPalette('#f2a12c', 5);
    expect(a.hue).toBeCloseTo(b.hue, 6);
    expect(a.base).not.toBe(b.base);
    expect(hexToHsl(a.base).l).toBeGreaterThan(hexToHsl(b.base).l);
  });

  it('keeps every stop inside a printable saturation/lightness band', () => {
    for (const family of ['#f2a12c', '#1f9fc4', '#e87fb0', '#cfa15c', '#d8483f']) {
      for (let i = 0; i < 20; i++) {
        const p = stampWashPalette(family, i);
        const base = hexToHsl(p.base);
        expect(base.s).toBeGreaterThanOrEqual(0.35);
        expect(base.s).toBeLessThanOrEqual(0.81);
        expect(base.l).toBeGreaterThanOrEqual(0.35);
        expect(base.l).toBeLessThanOrEqual(0.67);
        // light → base → deep must be a monotone descent, or the panel has
        // no modelling and reads flat again.
        expect(hexToHsl(p.light).l).toBeGreaterThan(base.l);
        expect(base.l).toBeGreaterThan(hexToHsl(p.deep).l);
        expect(hexToHsl(p.deep).l).toBeGreaterThan(hexToHsl(p.ink).l);
      }
    }
  });

  it('is deterministic and tolerates negative / fractional indices', () => {
    expect(stampWashPalette('#f2a12c', 3)).toEqual(stampWashPalette('#f2a12c', 3));
    expect(stampWashPalette('#f2a12c', -3)).toEqual(stampWashPalette('#f2a12c', 3));
    expect(stampWashPalette('#f2a12c', 3.8)).toEqual(stampWashPalette('#f2a12c', 3));
  });
});

describe('real seasonal albums are polychrome', () => {
  it('never repeats a wash between stamps that touch on the album page', () => {
    for (const album of SEASONAL_ALBUMS) {
      const hues = albumHues(album);
      // Reading order, plus the 3-column grid's vertical and diagonal
      // neighbours — every offset the eye can compare side by side.
      for (const step of [1, GRID_COLS - 1, GRID_COLS, GRID_COLS + 1]) {
        for (let i = 0; i + step < hues.length; i++) {
          const gap = hueDistance(hues[i], hues[i + step]);
          expect([album.id, i, i + step, gap >= 30]).toEqual([album.id, i, i + step, true]);
        }
      }
    }
  });

  it('spreads any page of nine across at least four hue families', () => {
    for (const album of SEASONAL_ALBUMS) {
      const hues = albumHues(album);
      for (let start = 0; start + 9 <= hues.length; start += 3) {
        const page = hues.slice(start, start + 9);
        const counts = new Map<number, number>();
        for (const h of page) {
          const b = Math.floor(h / 45);
          counts.set(b, (counts.get(b) ?? 0) + 1);
        }
        // Four separate hue bands per visible page, and no single band may
        // own the majority — that majority WAS the regression.
        expect([album.id, start, counts.size >= 4]).toEqual([album.id, start, true]);
        expect([album.id, start, Math.max(...counts.values()) <= 4]).toEqual([
          album.id,
          start,
          true,
        ]);
      }
    }
  });

  it('no longer collapses the warm-heavy Summer album onto one hue', () => {
    const summer = SEASONAL_ALBUMS.find((a) => /summer/i.test(a.season));
    expect(summer).toBeDefined();
    const hues = albumHues(summer!);
    // The exact complaint: amber/orange panels dominating the sheet. Summer
    // is almost entirely warm-family motifs, so under the old family-keyed
    // rule this was effectively every stamp.
    const amber = hues.filter((h) => h >= 15 && h <= 65).length;
    expect(amber).toBeLessThanOrEqual(Math.ceil(hues.length / 3));
    expect(new Set(hues.map((h) => Math.floor(h / 45))).size).toBeGreaterThanOrEqual(4);
  });
});
