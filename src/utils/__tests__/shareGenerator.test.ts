import { generateShareText, generateStreakCard, generateCollectionCard } from '../shareGenerator';
import { Grid, Cell } from '../../types';

function makeCell(letter: string): Cell {
  return { letter, id: `cell_${letter}_${Math.random().toString(36).slice(2, 6)}` };
}

describe('generateShareText', () => {
  const grid: Grid = [
    [makeCell('C'), makeCell('A'), makeCell('T')],
    [makeCell('D'), null, makeCell('G')],
    [makeCell('S'), makeCell('U'), makeCell('N')],
  ];

  it('generates correct header for regular levels', () => {
    const text = generateShareText(grid, 42, 3, 1200, false);
    expect(text).toContain('WORDFALL Level 42');
    expect(text).toContain('★★★');
  });

  it('generates correct header for daily mode', () => {
    const text = generateShareText(grid, 1, 2, 800, true);
    expect(text).toContain('WORDFALL Daily');
    expect(text).toContain('★★☆');
  });

  it('includes star rating', () => {
    const text1 = generateShareText(grid, 1, 1, 500, false);
    expect(text1).toContain('★☆☆');

    const text2 = generateShareText(grid, 1, 2, 500, false);
    expect(text2).toContain('★★☆');

    const text3 = generateShareText(grid, 1, 3, 500, false);
    expect(text3).toContain('★★★');
  });

  it('maps vowels to blue squares and consonants to yellow squares', () => {
    const text = generateShareText(grid, 1, 3, 500, false);
    expect(text).toContain('🟨🟦🟨');
  });

  it('maps null cells to black squares', () => {
    const text = generateShareText(grid, 1, 3, 500, false);
    expect(text).toContain('🟨⬛🟨');
  });

  it('includes score', () => {
    const text = generateShareText(grid, 1, 3, 1500, false);
    expect(text).toContain('Score: 1500');
  });

  it('includes "Flawless" tag when flawless flag is true', () => {
    const text = generateShareText(grid, 1, 3, 1500, false, undefined, true);
    expect(text).toContain('Flawless');
  });

  it('does not include "Flawless" tag when flag is false or omitted', () => {
    const text = generateShareText(grid, 1, 3, 1500, false);
    expect(text).not.toContain('Flawless');
  });

  it('handles empty grid', () => {
    const emptyGrid: Grid = [
      [null, null],
      [null, null],
    ];
    const text = generateShareText(emptyGrid, 1, 0, 0, false);
    expect(text).toContain('⬛⬛');
    expect(text).toContain('WORDFALL Level 1');
  });
});

describe('generateStreakCard', () => {
  it('includes streak count', () => {
    const text = generateStreakCard(7, 14, 100, 20);
    expect(text).toContain('7-Day Streak!');
  });

  it('includes best streak', () => {
    const text = generateStreakCard(5, 14, 100, 20);
    expect(text).toContain('Best: 14');
  });

  it('includes level and total stars', () => {
    const text = generateStreakCard(5, 14, 100, 20);
    expect(text).toContain('Level 20');
    expect(text).toContain('100');
  });

  it('includes flame emojis capped at 10', () => {
    const text = generateStreakCard(15, 15, 100, 20);
    const flames = (text.match(/🔥/g) || []).length;
    expect(flames).toBe(10);
  });

  it('includes correct number of flames for short streak', () => {
    const text = generateStreakCard(3, 5, 50, 10);
    const flames = (text.match(/🔥/g) || []).length;
    expect(flames).toBe(3);
  });

  it('includes hashtag', () => {
    const text = generateStreakCard(1, 1, 10, 1);
    expect(text).toContain('#Wordfall');
  });

  it('includes WORDFALL header', () => {
    const text = generateStreakCard(1, 1, 10, 1);
    expect(text).toContain('WORDFALL');
  });
});

describe('generateCollectionCard', () => {
  it('shows progress squares', () => {
    const text = generateCollectionCard('Nature Words', 3, 5);
    expect(text).toContain('🟩🟩🟩⬜⬜');
  });

  it('shows word count fraction', () => {
    const text = generateCollectionCard('Nature Words', 3, 5);
    expect(text).toContain('3/5 words');
  });

  it('shows COMPLETE! when all words found', () => {
    const text = generateCollectionCard('Nature Words', 5, 5);
    expect(text).toContain('COMPLETE!');
    expect(text).toContain('5/5 words COMPLETE!');
  });

  it('shows trophy emoji when complete', () => {
    const text = generateCollectionCard('Animals', 10, 10);
    expect(text).toContain('🏆');
  });

  it('shows book emoji when incomplete', () => {
    const text = generateCollectionCard('Animals', 5, 10);
    expect(text).toContain('📖');
  });

  it('includes collection name', () => {
    const text = generateCollectionCard('My Collection', 2, 8);
    expect(text).toContain('My Collection');
  });

  it('includes hashtag', () => {
    const text = generateCollectionCard('Test', 1, 5);
    expect(text).toContain('#Wordfall');
  });

  it('handles 0 words found', () => {
    const text = generateCollectionCard('Empty', 0, 10);
    expect(text).toContain('⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜');
    expect(text).toContain('0/10 words found');
  });
});
