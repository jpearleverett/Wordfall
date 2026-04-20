import { Grid } from '../types';
import { buildReferralLink, buildDailyLink } from './deepLinking';

/**
 * Generate a Wordle-style shareable emoji grid from the game state.
 * Filled cells become colored squares, empty cells become dark squares.
 * When referralCode is provided, includes a referral deep link in the CTA.
 */
export function generateShareText(
  grid: Grid,
  level: number,
  stars: number,
  score: number,
  isDaily: boolean,
  referralCode?: string,
  flawless?: boolean,
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
  if (flawless) stats.push('Flawless');

  const link = referralCode ? buildReferralLink(referralCode) : buildDailyLink();
  return `${header}\n${gridEmojis}\n${stats.join(' | ')}\nPlay Wordfall! ${link}`;
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
    'Join me on Wordfall!',
  ].join('\n');
}

/**
 * Generate a competitive challenge share text for friend challenges.
 */
export function generateChallengeShareText(
  level: number,
  score: number,
  stars: number,
  mode: string,
  challengeId?: string,
): string {
  const starEmojis = '\u2b50'.repeat(stars);
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  const link = challengeId
    ? `wordfall://challenge/${challengeId}`
    : buildDailyLink();
  return [
    '\ud83c\udfaf WORDFALL CHALLENGE',
    `Level ${level} | ${modeLabel} Mode`,
    `My Score: ${score} ${starEmojis}`,
    'Think you can beat me?',
    link,
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
