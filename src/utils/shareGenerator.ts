import { Grid } from '../types';

/**
 * Generate a Wordle-style shareable emoji grid from the game state.
 * Filled cells become colored squares, empty cells become dark squares.
 */
export function generateShareText(
  grid: Grid,
  level: number,
  stars: number,
  score: number,
  combo: number,
  isDaily: boolean,
): string {
  const starEmojis = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  const header = isDaily
    ? `WORDFALL Daily ${new Date().toISOString().split('T')[0]} ${starEmojis}`
    : `WORDFALL Level ${level} ${starEmojis}`;

  const gridEmojis = grid.map((row) =>
    row
      .map((cell) => {
        if (!cell) return '⬛';
        // Color based on letter type (vowels vs consonants)
        const vowels = 'AEIOU';
        return vowels.includes(cell.letter) ? '🟦' : '🟨';
      })
      .join(''),
  ).join('\n');

  const stats = [`Score: ${score}`];
  if (combo > 1) stats.push(`Combo: ${combo}x`);

  return `${header}\n${gridEmojis}\n${stats.join(' | ')}`;
}

/**
 * Generate a shareable streak card text.
 */
export function generateStreakCard(
  currentStreak: number,
  bestStreak: number,
  totalStars: number,
  level: number,
): string {
  const flames = '🔥'.repeat(Math.min(currentStreak, 10));
  return [
    `WORDFALL ${flames}`,
    `${currentStreak}-Day Streak!`,
    `Best: ${bestStreak} | Level ${level} | ⭐ ${totalStars}`,
    '',
    '#Wordfall #WordPuzzle',
  ].join('\n');
}

/**
 * Generate a shareable collection completion card text.
 */
export function generateCollectionCard(
  collectionName: string,
  wordsFound: number,
  totalWords: number,
): string {
  const progress = '🟩'.repeat(wordsFound) + '⬜'.repeat(totalWords - wordsFound);
  const complete = wordsFound >= totalWords;
  return [
    `WORDFALL ${complete ? '🏆' : '📖'} ${collectionName}`,
    progress,
    `${wordsFound}/${totalWords} words ${complete ? 'COMPLETE!' : 'found'}`,
    '',
    '#Wordfall #WordPuzzle',
  ].join('\n');
}
