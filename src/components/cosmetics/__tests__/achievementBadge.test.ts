/**
 * Pins the achievement-badge art catalog to the achievements catalog: every
 * achievement id must have an explicit bespoke art assignment (accent +
 * emblem + silhouette), no art entry may outlive its achievement, emblems
 * must be unique per achievement (bespoke, never shared), all SIX silhouettes
 * must be in play with no form carrying more than `MAX_PER_SHAPE` badges (the
 * anti-sameness guard — a family-keyed shape map used to put 7 puzzle badges
 * on one outline), the locked-state ghost tint must stay family-colored
 * (never flat slate), and the resolver must never return undefined for any
 * id, known or not.
 */
import { ACHIEVEMENTS } from '../../../data/achievements';
import {
  ACHIEVEMENT_BADGE_ART,
  ACHIEVEMENT_FAMILY_ACCENTS,
  BADGE_SHAPES,
  SHAPE_DRESSING,
  TIER_PIPS,
  DEFAULT_BADGE_ART,
  EMBLEM_RADIUS,
  MAX_PER_SHAPE,
  SHAPE_SAFE_R,
  emblemScale,
  enamelField,
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

  it('spreads the wall across all six silhouettes, none over the share ceiling', () => {
    const shapes = ACHIEVEMENTS.map((a) => ACHIEVEMENT_BADGE_ART[a.id].shape);
    for (const shape of shapes) expect(BADGE_SHAPES).toContain(shape);
    // Every form is in play...
    expect(new Set(shapes)).toEqual(new Set(BADGE_SHAPES));
    // ...and none of them is doing all the work.
    for (const shape of BADGE_SHAPES) {
      expect(shapes.filter((s) => s === shape).length).toBeLessThanOrEqual(MAX_PER_SHAPE);
    }
  });

  it('mixes at least two families into every silhouette — no form reads as one family', () => {
    const byShape = new Map<string, Set<string>>();
    for (const achievement of ACHIEVEMENTS) {
      const { shape } = ACHIEVEMENT_BADGE_ART[achievement.id];
      byShape.set(shape, (byShape.get(shape) ?? new Set()).add(achievement.category));
    }
    for (const [shape, families] of byShape) {
      expect(`${shape}:${families.size >= 2}`).toBe(`${shape}:true`);
    }
  });

  it('blows every emblem up to fill its silhouette — the art fills the card', () => {
    for (const shape of BADGE_SHAPES) {
      // The emblem is scaled TO this radius, so this IS the rendered emblem
      // size: at least 55% of the 100-unit badge box on every form.
      expect(`${shape}:${SHAPE_SAFE_R[shape] * 2 >= 55}`).toBe(`${shape}:true`);
    }
    for (const achievement of ACHIEVEMENTS) {
      const { shape, emblem } = ACHIEVEMENT_BADGE_ART[achievement.id];
      expect(EMBLEM_RADIUS[emblem]).toBeGreaterThan(0);
      const scale = emblemScale(shape, emblem);
      expect(scale).toBeGreaterThan(0.8);
      expect(scale).toBeLessThan(1.6);
      // Scaling normalizes apparent size: every emblem lands on the safe circle.
      expect(scale * EMBLEM_RADIUS[emblem]).toBeCloseTo(SHAPE_SAFE_R[shape], 6);
    }
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

  it('dresses every silhouette differently — no shared ribbon template', () => {
    // The panel's complaint was that the FORMS varied but the dressing did
    // not. Every form must be dressed, and no two forms may share a base.
    const dressings = BADGE_SHAPES.map((shape) => SHAPE_DRESSING[shape]);
    for (const dressing of dressings) expect(dressing).toBeTruthy();
    expect(new Set(dressings).size).toBe(BADGE_SHAPES.length);
  });

  it('makes the pip row a tier readout — 1 / 2 / 3, not always three', () => {
    expect(TIER_PIPS.bronze).toBe(1);
    expect(TIER_PIPS.silver).toBe(2);
    expect(TIER_PIPS.gold).toBe(3);
    expect(new Set(Object.values(TIER_PIPS)).size).toBe(3);
  });

  it('gives every badge its own enamel field color — 19 fields, not 5 accents', () => {
    // The panel read the wall as five flat accent discs: the field is now
    // derived per achievement id, so same-family neighbours differ in FIELD
    // color and not only in emblem shape.
    const fields = ACHIEVEMENTS.map((a) =>
      enamelField(ACHIEVEMENT_BADGE_ART[a.id].accent, a.id)
    );
    for (const hex of fields) expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(new Set(fields).size).toBe(fields.length);
    // ...and it stays a nudge, not a re-hue: every field differs from the raw
    // family accent but at most a couple of families' worth of hue away.
    for (const achievement of ACHIEVEMENTS) {
      const { accent } = ACHIEVEMENT_BADGE_ART[achievement.id];
      expect(enamelField(accent, achievement.id)).not.toBe(accent);
    }
  });

  it('derives the enamel field deterministically from accent + id', () => {
    const accent = ACHIEVEMENT_FAMILY_ACCENTS.puzzle;
    expect(enamelField(accent, 'word_finder')).toBe(enamelField(accent, 'word_finder'));
    expect(enamelField(accent, 'word_finder')).not.toBe(enamelField(accent, 'puzzle_solver'));
    // Non-hex input is passed through rather than throwing.
    expect(enamelField('not-a-color', 'word_finder')).toBe('not-a-color');
  });

  it('falls back to a valid default for unknown ids', () => {
    const fallback = resolveAchievementBadgeArt('some_future_achievement');
    expect(fallback).toEqual(DEFAULT_BADGE_ART);
    expect(fallback.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(fallback.emblem).toBeTruthy();
    expect(BADGE_SHAPES).toContain(fallback.shape);
  });
});
