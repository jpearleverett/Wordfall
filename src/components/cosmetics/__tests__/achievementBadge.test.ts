/**
 * Pins the achievement-badge art catalog to the achievements catalog: every
 * achievement id must have an explicit bespoke art assignment (accent +
 * emblem + silhouette), no art entry may outlive its achievement, emblems
 * must be unique per achievement (bespoke, never shared), silhouettes must
 * follow the family shape map with all three shapes represented on the wall,
 * the locked-state ghost tint must stay family-colored (never flat slate),
 * and the resolver must never return undefined for any id, known or not.
 */
import { ACHIEVEMENTS } from '../../../data/achievements';
import {
  ACHIEVEMENT_BADGE_ART,
  ACHIEVEMENT_FAMILY_ACCENTS,
  ACHIEVEMENT_FAMILY_SHAPES,
  DEFAULT_BADGE_ART,
  ghostCloth,
  ghostEnamel,
  ghostRamp,
  resolveAchievementBadgeArt,
} from '../achievementBadgeCatalog';

describe('achievementBadge art catalog', () => {
  it('assigns explicit badge art to every achievement in ACHIEVEMENTS', () => {
    const missing = ACHIEVEMENTS.filter((a) => !ACHIEVEMENT_BADGE_ART[a.id]).map((a) => a.id);
    expect(missing).toEqual([]);
  });

  it('has no orphan art entries for ids that left the catalog', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    const orphans = Object.keys(ACHIEVEMENT_BADGE_ART).filter((id) => !ids.has(id));
    expect(orphans).toEqual([]);
  });

  it('gives every achievement a bespoke emblem — none shared', () => {
    const emblems = Object.values(ACHIEVEMENT_BADGE_ART).map((a) => a.emblem);
    expect(new Set(emblems).size).toBe(emblems.length);
  });

  it('every entry has a #rrggbb accent matching its family and resolves', () => {
    for (const achievement of ACHIEVEMENTS) {
      const art = ACHIEVEMENT_BADGE_ART[achievement.id];
      expect(art.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(art.accent).toBe(ACHIEVEMENT_FAMILY_ACCENTS[achievement.category]);
      expect(resolveAchievementBadgeArt(achievement.id)).toEqual(art);
    }
  });

  it("keys every entry's silhouette off the family shape map, using all three shapes", () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_BADGE_ART[achievement.id].shape).toBe(
        ACHIEVEMENT_FAMILY_SHAPES[achievement.category]
      );
    }
    const wallShapes = new Set(Object.values(ACHIEVEMENT_BADGE_ART).map((a) => a.shape));
    expect(wallShapes).toEqual(new Set(['circle', 'shield', 'rosette']));
  });

  it('tints the locked ghost state with each family accent — distinct, never flat slate', () => {
    const accents = Object.values(ACHIEVEMENT_FAMILY_ACCENTS);
    const enamels = accents.map(ghostEnamel);
    const cloths = accents.map(ghostCloth);
    // Mapping the same lit color through each family's ghost ramp must yield
    // family-distinct tints (the ramp carries the accent hue, unlike a gray ramp).
    const litTints = accents.map((accent) => ghostRamp(accent)('#ffffff'));
    const shadowTints = accents.map((accent) => ghostRamp(accent)('#202020'));
    for (const set of [enamels, cloths, litTints, shadowTints]) {
      expect(new Set(set).size).toBe(accents.length);
      for (const hex of set) expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
    // The ramp preserves tonal structure: lit input maps brighter than shadow input.
    litTints.forEach((lit, i) => expect(lit).not.toBe(shadowTints[i]));
  });

  it('falls back to a valid default for unknown ids', () => {
    const fallback = resolveAchievementBadgeArt('some_future_achievement');
    expect(fallback).toEqual(DEFAULT_BADGE_ART);
    expect(fallback.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(fallback.emblem).toBeTruthy();
    expect(['circle', 'shield', 'rosette']).toContain(fallback.shape);
  });
});
