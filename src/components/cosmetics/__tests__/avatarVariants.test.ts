/**
 * Pins the avatar portrait contract: four distinct characters, a stable
 * hash so a frame always hosts the same figure, and complete silhouette
 * geometry for every hood style (a missing entry would render a faceless
 * blob — the exact failure this art replaced).
 */
import {
  AVATAR_VARIANTS,
  AVATAR_VARIANT_ORDER,
  hashAvatarSeed,
  resolveAvatarVariant,
} from '../avatarVariants';
import { FACE, HOOD_SHAPES } from '../avatarPortraitShapes';

describe('avatar variants', () => {
  it('exposes every variant in the rotation order exactly once', () => {
    expect(AVATAR_VARIANT_ORDER).toHaveLength(4);
    expect(new Set(AVATAR_VARIANT_ORDER).size).toBe(4);
    AVATAR_VARIANT_ORDER.forEach((id) => {
      expect(AVATAR_VARIANTS[id].id).toBe(id);
    });
  });

  it('gives each variant a distinct silhouette and cloth palette', () => {
    const hoods = AVATAR_VARIANT_ORDER.map((id) => AVATAR_VARIANTS[id].hood);
    const cloths = AVATAR_VARIANT_ORDER.map((id) => AVATAR_VARIANTS[id].cloth);
    const skins = AVATAR_VARIANT_ORDER.map((id) => AVATAR_VARIANTS[id].skin);
    expect(new Set(hoods).size).toBe(4);
    expect(new Set(cloths).size).toBe(4);
    expect(new Set(skins).size).toBe(4);
  });

  it('keeps skin tones mid-to-light so the face never reads as a dark blob', () => {
    AVATAR_VARIANT_ORDER.forEach((id) => {
      const skin = AVATAR_VARIANTS[id].skin;
      expect(skin).toMatch(/^#[0-9a-f]{6}$/i);
      const n = parseInt(skin.slice(1), 16);
      const luma =
        0.299 * ((n >> 16) & 0xff) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff);
      expect(luma).toBeGreaterThan(110);
    });
  });

  it('resolves explicit ids, defaults, and hashes unknown seeds stably', () => {
    expect(resolveAvatarVariant('oracle').id).toBe('oracle');
    expect(resolveAvatarVariant(undefined).id).toBe('architect');
    expect(resolveAvatarVariant('').id).toBe('architect');
    expect(resolveAvatarVariant('gold_ring').id).toBe(
      resolveAvatarVariant('gold_ring').id,
    );
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
    expect(seen.size).toBeGreaterThanOrEqual(3);
    // The base frame keeps the canonical Word Architect.
    expect(resolveAvatarVariant('default').id).toBe('architect');
  });

  it('has closed silhouette geometry for every hood style', () => {
    AVATAR_VARIANT_ORDER.forEach((id) => {
      const shapes = HOOD_SHAPES[AVATAR_VARIANTS[id].hood];
      expect(shapes).toBeDefined();
      [shapes.hood, shapes.crest, shapes.drapeL, shapes.drapeR, shapes.cloak, shapes.collar].forEach(
        (d) => {
          expect(d.startsWith('M')).toBe(true);
          expect(d.trim().endsWith('Z')).toBe(true);
        },
      );
      // Rim lights are open strokes, never closed shapes.
      expect(shapes.rimHead.trim().endsWith('Z')).toBe(false);
      expect(shapes.rimShoulder.trim().endsWith('Z')).toBe(false);
    });
    expect(FACE.trim().endsWith('Z')).toBe(true);
  });
});
