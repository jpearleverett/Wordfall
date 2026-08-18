/**
 * Pins the frame-art catalog to the cosmetics catalog: every profile frame —
 * including the module-load seeded ones (events, prestige, referrals, VIP,
 * quests, grand challenges, season pass, wheels, login, star milestones) —
 * must have an explicit bespoke art assignment, and the resolver must never
 * return undefined for any id, known or not.
 */
import { PROFILE_FRAMES } from '../../../data/cosmetics';
import { FRAME_ART, resolveFrameArt } from '../frameArtCatalog';

describe('frameArtCatalog', () => {
  it('assigns explicit art to every frame in PROFILE_FRAMES', () => {
    const missing = PROFILE_FRAMES.filter((f) => !FRAME_ART[f.id]).map((f) => f.id);
    expect(missing).toEqual([]);
  });

  it('has no orphan art entries for ids that left the catalog', () => {
    const ids = new Set(PROFILE_FRAMES.map((f) => f.id));
    const orphans = Object.keys(FRAME_ART).filter((id) => !ids.has(id));
    expect(orphans).toEqual([]);
  });

  it('every spec has a design and a #rrggbb accent', () => {
    for (const [id, spec] of Object.entries(FRAME_ART)) {
      expect(spec.design).toBeTruthy();
      expect(spec.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(resolveFrameArt(id)).toEqual(spec);
    }
  });

  it('falls back by rarity for unknown ids and legacy default_frame', () => {
    expect(resolveFrameArt('some_future_seeded_frame').design).toBe('simple');
    expect(resolveFrameArt('default_frame')).toEqual(FRAME_ART.default);
  });
});
