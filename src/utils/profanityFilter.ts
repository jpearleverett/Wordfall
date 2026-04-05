/**
 * Chat profanity filter for club chat and social features.
 * Uses word-boundary matching to avoid false positives.
 * Handles common letter substitutions.
 */

// Common profane words (abbreviated list - extend as needed)
const PROFANE_WORDS: string[] = [
  'ass', 'asshole', 'bastard', 'bitch', 'bloody', 'bollocks', 'bullshit',
  'crap', 'cunt', 'damn', 'dick', 'douche', 'dumbass', 'fag', 'faggot',
  'fuck', 'fucking', 'fucker', 'goddamn', 'hell', 'idiot', 'jackass',
  'jerk', 'moron', 'motherfucker', 'nigger', 'nigga', 'piss', 'prick',
  'pussy', 'retard', 'retarded', 'shit', 'shitty', 'slut', 'stfu',
  'stupid', 'twat', 'wanker', 'whore', 'wtf',
];

// Letter substitution map for bypasses
const SUBSTITUTIONS: Record<string, string> = {
  '@': 'a',
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '$': 's',
  '!': 'i',
  '5': 's',
  '7': 't',
  '4': 'a',
};

/**
 * Normalize text by replacing common letter substitutions.
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  for (const [sub, replacement] of Object.entries(SUBSTITUTIONS)) {
    normalized = normalized.split(sub).join(replacement);
  }
  return normalized;
}

/**
 * Build a regex pattern for a word that matches word boundaries.
 */
function buildPattern(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'gi');
}

/**
 * Build a leet-speak aware regex for a word.
 * Matches the word even with common character substitutions inline.
 */
function buildLeetPattern(word: string): RegExp {
  const leetMap: Record<string, string> = {
    a: '[a@4]', e: '[e3]', i: '[i1!]', o: '[o0]', s: '[s$5]', t: '[t7]',
  };
  const pattern = word.split('').map((ch) => leetMap[ch] ?? ch).join('');
  return new RegExp(`(?:^|[\\s.,!?])${pattern}(?:[\\s.,!?]|$)`, 'gi');
}

/**
 * Check if a text string contains profanity.
 * Case-insensitive, handles common letter substitutions.
 */
export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PROFANE_WORDS.some(
    (word) => buildPattern(word).test(lower) || buildLeetPattern(word).test(lower),
  );
}

/**
 * Filter profanity from text, replacing profane words with asterisks.
 * Preserves original letter casing and spacing.
 */
export function filterMessage(text: string): string {
  const normalized = normalizeText(text);
  let result = text;

  for (const word of PROFANE_WORDS) {
    const pattern = buildPattern(word);
    let match: RegExpExecArray | null;

    // Find matches in normalized text, replace in original
    while ((match = pattern.exec(normalized)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const replacement = '*'.repeat(match[0].length);
      result = result.substring(0, start) + replacement + result.substring(end);
    }
  }

  return result;
}
