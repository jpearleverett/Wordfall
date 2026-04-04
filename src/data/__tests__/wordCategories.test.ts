import {
  WORD_CATEGORIES,
  getCategory,
  getCategoryIds,
  getCategoryWords,
  getRandomCategory,
} from '../wordCategories';

describe('WORD_CATEGORIES data', () => {
  it('contains exactly 15 categories', () => {
    expect(WORD_CATEGORIES.length).toBe(15);
  });

  it('every category has id, name, and icon', () => {
    for (const category of WORD_CATEGORIES) {
      expect(category.id).toBeTruthy();
      expect(category.name).toBeTruthy();
      expect(category.icon).toBeTruthy();
    }
  });

  it('every category has unique id', () => {
    const ids = WORD_CATEGORIES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every category has at least 30 words', () => {
    for (const category of WORD_CATEGORIES) {
      expect(category.words.length).toBeGreaterThanOrEqual(30);
    }
  });

  it('all words are uppercase', () => {
    for (const category of WORD_CATEGORIES) {
      for (const word of category.words) {
        expect(word).toBe(word.toUpperCase());
      }
    }
  });

  it('all words are between 2 and 6 letters', () => {
    for (const category of WORD_CATEGORIES) {
      for (const word of category.words) {
        expect(word.length).toBeGreaterThanOrEqual(2);
        expect(word.length).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('getCategory', () => {
  it('returns the correct category by id', () => {
    const nature = getCategory('nature');
    expect(nature).toBeDefined();
    expect(nature!.name).toBe('Nature');
  });

  it('returns undefined for unknown id', () => {
    expect(getCategory('nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getCategory('')).toBeUndefined();
  });

  it('returns the food category', () => {
    const food = getCategory('food');
    expect(food).toBeDefined();
    expect(food!.name).toBe('Food & Drink');
  });
});

describe('getCategoryIds', () => {
  it('returns an array of all category IDs', () => {
    const ids = getCategoryIds();
    expect(ids.length).toBe(WORD_CATEGORIES.length);
  });

  it('contains known category IDs', () => {
    const ids = getCategoryIds();
    expect(ids).toContain('nature');
    expect(ids).toContain('food');
    expect(ids).toContain('science');
    expect(ids).toContain('sports');
    expect(ids).toContain('music');
  });

  it('returns strings', () => {
    const ids = getCategoryIds();
    for (const id of ids) {
      expect(typeof id).toBe('string');
    }
  });
});

describe('getCategoryWords', () => {
  it('returns words filtered by min and max length', () => {
    const words = getCategoryWords('nature', 4, 5);
    for (const word of words) {
      expect(word.length).toBeGreaterThanOrEqual(4);
      expect(word.length).toBeLessThanOrEqual(5);
    }
    expect(words.length).toBeGreaterThan(0);
  });

  it('returns only 3-letter words when filtered', () => {
    const words = getCategoryWords('animals', 3, 3);
    for (const word of words) {
      expect(word.length).toBe(3);
    }
    expect(words.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown category', () => {
    const words = getCategoryWords('nonexistent', 3, 6);
    expect(words).toEqual([]);
  });

  it('returns empty array when no words match length range', () => {
    const words = getCategoryWords('nature', 10, 15);
    expect(words).toEqual([]);
  });

  it('returns all words when range covers all lengths', () => {
    const category = getCategory('nature')!;
    const words = getCategoryWords('nature', 1, 10);
    expect(words.length).toBe(category.words.length);
  });
});

describe('getRandomCategory', () => {
  it('returns a valid category', () => {
    const category = getRandomCategory();
    expect(category).toBeDefined();
    expect(category.id).toBeTruthy();
    expect(category.name).toBeTruthy();
    expect(category.words.length).toBeGreaterThan(0);
  });

  it('respects exclude list', () => {
    const exclude = ['nature', 'food', 'science'];
    const category = getRandomCategory(exclude);
    expect(exclude).not.toContain(category.id);
  });

  it('returns a category even when most are excluded', () => {
    const allIds = getCategoryIds();
    const exclude = allIds.slice(1); // exclude all but the first
    const category = getRandomCategory(exclude);
    expect(category).toBeDefined();
    expect(category.id).toBe(allIds[0]);
  });

  it('falls back to first category when all are excluded', () => {
    const allIds = getCategoryIds();
    const category = getRandomCategory(allIds);
    expect(category).toBeDefined();
    expect(category.id).toBe(WORD_CATEGORIES[0].id);
  });

  it('returns different categories over multiple calls (probabilistic)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(getRandomCategory().id);
    }
    // With 15 categories and 50 tries, we should see at least 2 different ones
    expect(seen.size).toBeGreaterThan(1);
  });
});
