/**
 * Pins the achievement-badge art catalog to the achievements catalog: every
 * achievement id must have an explicit bespoke art assignment (accent +
 * emblem), no art entry may outlive its achievement, emblems must be unique
 * per achievement (bespoke, never shared), and the resolver must never
 * return undefined for any id, known or not.
 */
import { ACHIEVEMENTS } from '../../../data/achievements';
import {
  ACHIEVEMENT_BADGE_ART,
  ACHIEVEMENT_FAMILY_ACCENTS,
  DEFAULT_BADGE_ART,
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

  it('falls back to a valid default for unknown ids', () => {
    const fallback = resolveAchievementBadgeArt('some_future_achievement');
    expect(fallback).toEqual(DEFAULT_BADGE_ART);
    expect(fallback.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(fallback.emblem).toBeTruthy();
  });
});
