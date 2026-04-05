import { LOADING_TIPS, getRandomTip } from '../../data/loadingTips';

describe('Loading Tips', () => {
  it('has tips across all categories', () => {
    const categories = new Set(LOADING_TIPS.map((t) => t.category));
    expect(categories.has('gameplay')).toBe(true);
    expect(categories.has('strategy')).toBe(true);
    expect(categories.has('lore')).toBe(true);
    expect(categories.has('fun_fact')).toBe(true);
  });

  it('has at least 20 tips', () => {
    expect(LOADING_TIPS.length).toBeGreaterThanOrEqual(20);
  });

  it('all tips have required fields', () => {
    for (const tip of LOADING_TIPS) {
      expect(tip.id).toBeTruthy();
      expect(tip.text).toBeTruthy();
      expect(tip.text.length).toBeGreaterThan(10);
      expect(tip.minLevel).toBeGreaterThanOrEqual(1);
      expect(['gameplay', 'strategy', 'lore', 'fun_fact']).toContain(tip.category);
    }
  });

  it('has unique IDs', () => {
    const ids = LOADING_TIPS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getRandomTip returns a tip for level 1', () => {
    const tip = getRandomTip(1);
    expect(tip).toBeDefined();
    expect(tip.minLevel).toBeLessThanOrEqual(1);
  });

  it('getRandomTip returns level-appropriate tips', () => {
    // At level 1, should only get tips with minLevel <= 1
    for (let i = 0; i < 20; i++) {
      const tip = getRandomTip(1);
      expect(tip.minLevel).toBeLessThanOrEqual(1);
    }
  });

  it('getRandomTip at high level can return all tips', () => {
    const highLevelTips = LOADING_TIPS.filter((t) => t.minLevel <= 100);
    expect(highLevelTips.length).toBe(LOADING_TIPS.length);
  });

  it('has some tips gated behind higher levels', () => {
    const highLevelTips = LOADING_TIPS.filter((t) => t.minLevel >= 10);
    expect(highLevelTips.length).toBeGreaterThan(0);
  });
});
