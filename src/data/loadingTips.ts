export interface LoadingTip {
  id: string;
  category: 'gameplay' | 'strategy' | 'lore' | 'fun_fact';
  text: string;
  minLevel: number; // minimum player level to show this tip
}

export const LOADING_TIPS: LoadingTip[] = [
  // Gameplay tips (levels 1-10)
  { id: 'tip_gravity', category: 'gameplay', text: 'When you clear a word, letters above fall down. Plan your moves to open new paths!', minLevel: 1 },
  { id: 'tip_chains', category: 'gameplay', text: 'Clearing a word near the bottom lets the whole board cascade. Use gravity to reach trapped letters.', minLevel: 3 },
  { id: 'tip_diagonal', category: 'gameplay', text: 'Words can be traced in any direction - including diagonals! Look for hidden paths.', minLevel: 1 },
  { id: 'tip_hints', category: 'gameplay', text: 'Stuck on a puzzle? Use a hint to reveal one of the remaining words.', minLevel: 5 },
  { id: 'tip_undo', category: 'gameplay', text: 'Made a mistake? Undo your last move to try a different approach.', minLevel: 3 },
  { id: 'tip_stars', category: 'gameplay', text: 'Earn 3 stars by completing puzzles without hints and with a high score!', minLevel: 1 },

  // Strategy tips (levels 5-20)
  { id: 'tip_long_words', category: 'strategy', text: 'Longer words score more. Clear them late — when gravity exposes more letters, long words become easier to spot.', minLevel: 5 },
  { id: 'tip_corners', category: 'strategy', text: 'Corner letters are harder to chain. Clear corner words first to open up the board.', minLevel: 8 },
  { id: 'tip_gravity_flip', category: 'strategy', text: 'In Gravity Flip mode, gravity rotates 90 degrees after each word. Plan ahead!', minLevel: 10 },
  { id: 'tip_shrinking', category: 'strategy', text: 'In Shrinking Board, the outer ring disappears every 2 words. Work inward!', minLevel: 5 },
  { id: 'tip_perfect', category: 'strategy', text: 'Perfect Solve mode gives 2x score but no hints or undos. Think carefully!', minLevel: 12 },
  { id: 'tip_boosters', category: 'strategy', text: 'Smart Shuffle rearranges the board while keeping placed words intact. Great for dead ends!', minLevel: 10 },

  // Lore/world-building (levels 1+)
  { id: 'lore_library', category: 'lore', text: 'The Grand Library once held every word ever spoken. Help restore its wings to their former glory.', minLevel: 1 },
  { id: 'lore_atlas', category: 'lore', text: 'The Word Atlas maps language across 12 realms. Each word you find adds to its pages.', minLevel: 3 },
  { id: 'lore_rare_tiles', category: 'lore', text: 'Rare letter tiles are fragments of the ancient alphabet. Collect them all to unlock forgotten knowledge.', minLevel: 5 },
  { id: 'lore_gravity', category: 'lore', text: 'In the world of Wordfall, letters obey the pull of meaning. Clear one word, and others fall into place.', minLevel: 1 },
  { id: 'lore_prestige', category: 'lore', text: 'Legends say those who master all words can reset the cycle, gaining wisdom that persists across lifetimes.', minLevel: 30 },
  { id: 'lore_daily', category: 'lore', text: 'Each day brings a new puzzle from the Oracle. Every player in the world faces the same challenge.', minLevel: 1 },

  // Fun facts (all levels)
  { id: 'fact_words', category: 'fun_fact', text: 'The English language has over 170,000 words in current use. How many can you find?', minLevel: 1 },
  { id: 'fact_longest', category: 'fun_fact', text: 'The longest English word in common use is "pneumonoultramicroscopicsilicovolcanoconiosis" at 45 letters!', minLevel: 1 },
  { id: 'fact_vowels', category: 'fun_fact', text: 'The most common letter in English is E, appearing in about 11% of all words.', minLevel: 1 },
  { id: 'fact_pangram', category: 'fun_fact', text: '"The quick brown fox jumps over the lazy dog" uses every letter of the alphabet.', minLevel: 1 },
  { id: 'fact_scrabble', category: 'fun_fact', text: 'The highest-scoring word in Scrabble is OXYPHENBUTAZONE, worth 1,778 points on a perfect board.', minLevel: 10 },
  { id: 'fact_combo', category: 'fun_fact', text: 'The world record for the longest word chain is over 50 consecutive words found in a single puzzle!', minLevel: 15 },
];

export function getRandomTip(playerLevel: number): LoadingTip {
  const eligible = LOADING_TIPS.filter(t => t.minLevel <= playerLevel);
  return eligible[Math.floor(Math.random() * eligible.length)] || LOADING_TIPS[0];
}
