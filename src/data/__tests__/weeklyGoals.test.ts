import {
  WEEKLY_GOAL_TEMPLATES,
  generateWeeklyGoals,
  isNewWeek,
  WeeklyGoalTemplate,
} from '../weeklyGoals';

describe('WEEKLY_GOAL_TEMPLATES data', () => {
  it('contains 24 templates', () => {
    expect(WEEKLY_GOAL_TEMPLATES.length).toBe(24);
  });

  it('every template has a valid structure', () => {
    const validTrackingKeys = [
      'puzzles_solved',
      'total_score',
      'stars_earned',
      'daily_completed',
      'perfect_solves',
      'words_found',
      'modes_played',
    ];

    for (const template of WEEKLY_GOAL_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.target).toBeGreaterThan(0);
      expect(validTrackingKeys).toContain(template.trackingKey);
      expect(template.reward.coins).toBeGreaterThan(0);
      expect(template.reward.gems).toBeGreaterThan(0);
    }
  });

  it('every template has a unique id', () => {
    const ids = WEEKLY_GOAL_TEMPLATES.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('covers all 7 tracking keys', () => {
    const keys = new Set(WEEKLY_GOAL_TEMPLATES.map(t => t.trackingKey));
    expect(keys.size).toBe(7);
    expect(keys).toContain('puzzles_solved');
    expect(keys).toContain('total_score');
    expect(keys).toContain('stars_earned');
    expect(keys).toContain('daily_completed');
    expect(keys).toContain('perfect_solves');
    expect(keys).toContain('words_found');
    expect(keys).toContain('modes_played');
  });

  it('higher targets within same tracking key have higher rewards', () => {
    const byKey: Record<string, WeeklyGoalTemplate[]> = {};
    for (const t of WEEKLY_GOAL_TEMPLATES) {
      if (!byKey[t.trackingKey]) byKey[t.trackingKey] = [];
      byKey[t.trackingKey].push(t);
    }

    for (const templates of Object.values(byKey)) {
      const sorted = [...templates].sort((a, b) => a.target - b.target);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].reward.coins).toBeGreaterThanOrEqual(sorted[i - 1].reward.coins);
      }
    }
  });
});

describe('generateWeeklyGoals', () => {
  it('returns 3 goals', () => {
    const result = generateWeeklyGoals();
    expect(result.goals).toHaveLength(3);
  });

  it('each goal has correct initial state', () => {
    const result = generateWeeklyGoals();
    for (const goal of result.goals) {
      expect(goal.progress).toBe(0);
      expect(goal.completed).toBe(false);
      expect(goal.target).toBeGreaterThan(0);
      expect(goal.templateId).toBeTruthy();
      expect(goal.description).toBeTruthy();
      expect(goal.trackingKey).toBeTruthy();
      expect(goal.reward.coins).toBeGreaterThan(0);
      expect(goal.reward.gems).toBeGreaterThan(0);
    }
  });

  it('goals reference valid templates', () => {
    const result = generateWeeklyGoals();
    const templateIds = new Set(WEEKLY_GOAL_TEMPLATES.map(t => t.id));
    for (const goal of result.goals) {
      expect(templateIds.has(goal.templateId)).toBe(true);
    }
  });

  it('has a weekStart date string in YYYY-MM-DD format', () => {
    const result = generateWeeklyGoals();
    expect(result.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('weekStart is a Monday', () => {
    const result = generateWeeklyGoals();
    const date = new Date(result.weekStart + 'T00:00:00Z');
    // getUTCDay: 0=Sun, 1=Mon
    expect(date.getUTCDay()).toBe(1);
  });

  it('has allCompleteBonus with coins and gems', () => {
    const result = generateWeeklyGoals();
    expect(result.allCompleteBonus.coins).toBeGreaterThan(0);
    expect(result.allCompleteBonus.gems).toBeGreaterThan(0);
  });

  it('selects different goals on different calls (randomness check)', () => {
    // Run 10 times, at least 2 should differ
    const results = Array.from({ length: 10 }, () =>
      generateWeeklyGoals().goals.map(g => g.templateId).sort().join(',')
    );
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe('isNewWeek', () => {
  it('returns false for the current week start', () => {
    const result = generateWeeklyGoals();
    expect(isNewWeek(result.weekStart)).toBe(false);
  });

  it('returns true for a past week', () => {
    expect(isNewWeek('2024-01-01')).toBe(true);
  });

  it('returns true for a future week start', () => {
    // A far-future date would be a different week than now
    expect(isNewWeek('2099-01-01')).toBe(true);
  });
});
