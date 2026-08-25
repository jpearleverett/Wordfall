/**
 * Main-event ladder pacing + gem budget (August 2026 retune).
 *
 * Score-authored ladders used to top out at 5,000–20,000 while a single
 * puzzle scores ~1,000–2,500 — every tier including diamond fell inside the
 * first session, then the event sat inert for six days. The retuned contract:
 *
 *  - Model player: ~15 puzzles/day at ~1,500 points → 157,500 pts/week.
 *  - Bronze reachable on day one (<= one day's play).
 *  - Diamond a genuine chase: between ~40% and ~120% of the full week.
 *  - Count-authored ladders (perfectClear = perfect clears, mysteryWords =
 *    words found) pinned on the same model in their own units.
 *  - Gems halved: diamond within [25, 50]; a typical (gold-reaching) week
 *    pays <= 30 gems across bronze+silver+gold, matching the collapsed
 *    faucet economy (flawless cap 5/day).
 */

import { EVENT_TEMPLATES } from '../events';

const PUZZLES_PER_DAY = 15;
const POINTS_PER_PUZZLE = 1500;
const WORDS_PER_PUZZLE = 8;
const WEEK_POINTS = PUZZLES_PER_DAY * 7 * POINTS_PER_PUZZLE; // 157,500
const DAY_POINTS = PUZZLES_PER_DAY * POINTS_PER_PUZZLE; // 22,500
const WEEK_WORDS = PUZZLES_PER_DAY * 7 * WORDS_PER_PUZZLE; // 840
const DAY_WORDS = PUZZLES_PER_DAY * WORDS_PER_PUZZLE; // 120

const COUNT_AUTHORED = new Set(['perfectClear', 'mysteryWords']);

const scoreTemplates = EVENT_TEMPLATES.filter((t) => !COUNT_AUTHORED.has(t.type));
const perfectClear = EVENT_TEMPLATES.find((t) => t.type === 'perfectClear')!;
const mysteryWords = EVENT_TEMPLATES.find((t) => t.type === 'mysteryWords')!;

function tiersOf(template: (typeof EVENT_TEMPLATES)[number]) {
  const byName = new Map(template.rewards.map((r) => [r.tier, r]));
  return {
    bronze: byName.get('bronze')!,
    silver: byName.get('silver')!,
    gold: byName.get('gold')!,
    diamond: byName.get('diamond')!,
  };
}

describe('score-authored main-event ladders', () => {
  it('covers every template except the two count-authored ones', () => {
    expect(scoreTemplates.length).toBe(EVENT_TEMPLATES.length - 2);
  });

  it.each(scoreTemplates.map((t) => [t.name, t] as const))(
    '%s: bronze lands day one, diamond is a 40–120%% week-long chase',
    (_name, template) => {
      const { bronze, diamond } = tiersOf(template);
      expect(bronze.threshold).toBeLessThanOrEqual(DAY_POINTS);
      expect(diamond.threshold).toBeGreaterThanOrEqual(WEEK_POINTS * 0.4);
      expect(diamond.threshold).toBeLessThanOrEqual(WEEK_POINTS * 1.2);
    },
  );

  it('every ladder ascends strictly bronze → diamond', () => {
    for (const template of EVENT_TEMPLATES) {
      for (let i = 1; i < template.rewards.length; i++) {
        expect(template.rewards[i].threshold).toBeGreaterThan(
          template.rewards[i - 1].threshold,
        );
      }
    }
  });
});

describe('count-authored main-event ladders', () => {
  it('perfectClear: bronze within a day of flawless play, diamond a multi-day run', () => {
    const { bronze, diamond } = tiersOf(perfectClear);
    // Perfect clears are a SUBSET of solves — even a strong player converts
    // roughly half. Bronze must fit inside one day of mixed play; diamond
    // should take several days but stay inside the week for a ~50% rate.
    expect(bronze.threshold).toBeLessThanOrEqual(PUZZLES_PER_DAY / 2);
    expect(diamond.threshold).toBeGreaterThanOrEqual(15);
    expect(diamond.threshold).toBeLessThanOrEqual((PUZZLES_PER_DAY * 7) / 2);
  });

  it('mysteryWords: bronze within a day of words, diamond 40–120% of the week', () => {
    const { bronze, diamond } = tiersOf(mysteryWords);
    expect(bronze.threshold).toBeLessThanOrEqual(DAY_WORDS);
    expect(diamond.threshold).toBeGreaterThanOrEqual(WEEK_WORDS * 0.4);
    expect(diamond.threshold).toBeLessThanOrEqual(WEEK_WORDS * 1.2);
  });
});

describe('event gem budget (collapsed economy)', () => {
  it('diamond pays 25–50 gems (halved from the 50–100 originals)', () => {
    for (const template of EVENT_TEMPLATES) {
      const { diamond } = tiersOf(template);
      expect(diamond.rewards.gems ?? 0).toBeGreaterThanOrEqual(25);
      expect(diamond.rewards.gems ?? 0).toBeLessThanOrEqual(50);
    }
  });

  it('a typical (gold-reaching) week pays <= 30 gems', () => {
    for (const template of EVENT_TEMPLATES) {
      const { bronze, silver, gold } = tiersOf(template);
      const typicalWeek =
        (bronze.rewards.gems ?? 0) +
        (silver.rewards.gems ?? 0) +
        (gold.rewards.gems ?? 0);
      expect(typicalWeek).toBeLessThanOrEqual(30);
    }
  });

  it('full-clear total stays under 80 gems per event (was up to 205)', () => {
    for (const template of EVENT_TEMPLATES) {
      const total = template.rewards.reduce(
        (sum, tier) => sum + (tier.rewards.gems ?? 0),
        0,
      );
      expect(total).toBeLessThanOrEqual(80);
    }
  });
});
