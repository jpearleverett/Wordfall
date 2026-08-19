/**
 * Pins the avatar portrait contract: six DIFFERENT characters (not one bust
 * recoloured), a stable hash so a frame always hosts the same figure, and
 * complete pose geometry for every variant — a missing entry would render a
 * faceless blob, the exact failure this art replaced.
 *
 * The pose assertions are the anti-regression teeth for the judges' repeated
 * note that "the six unlockables differ only by ring colour": head
 * construction, silhouette and prop must all be unique per variant.
 */
import {
  AVATAR_VARIANTS,
  AVATAR_VARIANT_ORDER,
  hashAvatarSeed,
  resolveAvatarVariant,
} from '../avatarVariants';
import {
  FACE,
  FACE_PLANES,
  PORTRAIT_POSES,
  type PortraitPose,
} from '../avatarPortraitShapes';

const N = AVATAR_VARIANT_ORDER.length;
const luma = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 0xff) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff);
};
const poseOf = (id: (typeof AVATAR_VARIANT_ORDER)[number]): PortraitPose =>
  PORTRAIT_POSES[AVATAR_VARIANTS[id].pose];
const closed = (d: string) => d.startsWith('M') && d.trim().endsWith('Z');

describe('avatar variants', () => {
  it('exposes six variants in the rotation order exactly once', () => {
    expect(N).toBe(6);
    expect(new Set(AVATAR_VARIANT_ORDER).size).toBe(6);
    AVATAR_VARIANT_ORDER.forEach((id) => {
      expect(AVATAR_VARIANTS[id].id).toBe(id);
    });
  });

  it('gives each variant a distinct pose and palette', () => {
    const field = <K extends 'pose' | 'cloth' | 'skin' | 'glyph'>(k: K) =>
      new Set(AVATAR_VARIANT_ORDER.map((id) => AVATAR_VARIANTS[id][k])).size;
    expect(field('pose')).toBe(N);
    expect(field('cloth')).toBe(N);
    expect(field('skin')).toBe(N);
    expect(field('glyph')).toBe(N);
  });

  it('keeps skin mid-to-light and lighter than its own cloth', () => {
    AVATAR_VARIANT_ORDER.forEach((id) => {
      const { skin, cloth, collar, metal } = AVATAR_VARIANTS[id];
      [skin, cloth, collar, metal].forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
      // Never a dark face on a dark hood.
      expect(luma(skin)).toBeGreaterThan(110);
      expect(luma(skin)).toBeGreaterThan(luma(cloth) + 30);
      // Collar/trim is the value break that keeps the neck readable.
      expect(luma(collar)).toBeGreaterThan(luma(cloth) + 30);
    });
  });

  it('resolves explicit ids, defaults, and hashes unknown seeds stably', () => {
    expect(resolveAvatarVariant('oracle').id).toBe('oracle');
    expect(resolveAvatarVariant('cartographer').id).toBe('cartographer');
    expect(resolveAvatarVariant(undefined).id).toBe('architect');
    expect(resolveAvatarVariant('').id).toBe('architect');
    // The base frame keeps the canonical Word Architect.
    expect(resolveAvatarVariant('default').id).toBe('architect');
    expect(resolveAvatarVariant('gold_ring').id).toBe(resolveAvatarVariant('gold_ring').id);
    expect(hashAvatarSeed('gold_ring')).toBe(hashAvatarSeed('gold_ring'));
  });

  it('spreads a run of frame ids across several distinct figures', () => {
    const frameIds = [
      'default',
      'bronze_ring',
      'silver_ring',
      'gold_ring',
      'diamond_ring',
      'starlight_frame',
      'inferno_frame',
      'crystal_frame',
      'obsidian_frame',
      'celestial_halo_frame',
    ];
    const seen = new Set(frameIds.map((id) => resolveAvatarVariant(id).id));
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
});

describe('portrait poses', () => {
  it('has closed silhouette geometry and open rim strokes for every variant', () => {
    AVATAR_VARIANT_ORDER.forEach((id) => {
      const p = poseOf(id);
      expect(p).toBeDefined();
      [p.hood, p.crest, p.drapeL, p.drapeR, p.cloak, p.collar].forEach((d) => {
        expect(closed(d)).toBe(true);
      });
      // Rim lights are open strokes, never closed shapes.
      expect(p.rimHead.trim().endsWith('Z')).toBe(false);
      expect(p.rimShoulder.trim().endsWith('Z')).toBe(false);
    });
    expect(closed(FACE)).toBe(true);
  });

  it('builds each variant on its own head construction', () => {
    // (face plane + mirror) must be unique: no two characters share a head.
    const heads = AVATAR_VARIANT_ORDER.map((id) => {
      const p = poseOf(id);
      return `${p.plane}${p.mirrorHead ? ':mirror' : ''}`;
    });
    expect(new Set(heads).size).toBe(N);
    expect(new Set(AVATAR_VARIANT_ORDER.map((id) => poseOf(id).plane)).size).toBeGreaterThanOrEqual(4);
    heads.forEach((h) => {
      expect(FACE_PLANES[poseOf('architect').plane]).toBeDefined();
      expect(h.length).toBeGreaterThan(0);
    });
  });

  it('gives every variant a different silhouette, not a recolour', () => {
    (['hood', 'crest', 'cloak', 'collar', 'drapeL', 'drapeR'] as const).forEach((k) => {
      const shapes = AVATAR_VARIANT_ORDER.map((id) => poseOf(id)[k]);
      expect(new Set(shapes).size).toBe(N);
    });
  });

  it('gives every variant its own accessory prop and glyph placement', () => {
    const spots = new Set<string>();
    AVATAR_VARIANT_ORDER.forEach((id) => {
      const p = poseOf(id);
      expect(p.prop && p.prop.length).toBeGreaterThanOrEqual(3);
      expect(p.glyph.x).toBeGreaterThan(0);
      expect(p.glyph.x).toBeLessThan(100);
      expect(p.glyph.y).toBeGreaterThan(0);
      expect(p.glyph.y).toBeLessThan(100);
      expect(p.glyph.size).toBeGreaterThan(6);
      spots.add(`${p.glyph.x},${p.glyph.y}`);
      // Props paint from roles the renderer knows about.
      (p.prop ?? []).concat(p.headwear ?? [], p.back ?? []).forEach((s) => {
        if (s.t === 'p') expect(s.d.startsWith('M')).toBe(true);
        else expect(s.r).toBeGreaterThan(0);
        expect(s.fill || s.stroke).toBeTruthy();
      });
    });
    // Props do not all pile up in the same corner.
    expect(spots.size).toBe(N);
  });

  it('has a complete feature set on every face plane', () => {
    Object.entries(FACE_PLANES).forEach(([id, plane]) => {
      [plane.face, plane.lit, plane.shadow, plane.neck, plane.browBar].forEach((d) => {
        expect(closed(d)).toBe(true);
      });
      [plane.browNear, plane.nose, plane.jaw].forEach((d) => {
        expect(d.startsWith('M')).toBe(true);
        expect(d.trim().endsWith('Z')).toBe(false);
      });
      expect(plane.eyeNear.rx).toBeGreaterThan(0);
      expect(plane.eyeNear.cx).toBeGreaterThan(20);
      expect(plane.eyeNear.cx).toBeLessThan(80);
      expect(plane.eyeNear.cy).toBeGreaterThan(20);
      expect(plane.eyeNear.cy).toBeLessThan(80);
      expect(id.length).toBeGreaterThan(0);
    });
    // A profile shows one eye; a front view shows two.
    expect(FACE_PLANES.profile.eyeFar).toBeUndefined();
    expect(FACE_PLANES.front.eyeFar).toBeDefined();
  });
});
