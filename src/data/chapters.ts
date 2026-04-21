import { Chapter, Difficulty } from '../types';

/**
 * 40 chapters across 8 library wings (5 chapters per wing).
 * Each chapter has a curated set of theme words used for board generation.
 */
export const CHAPTERS: Chapter[] = [
  // ── Wing 1: Nature (Chapters 1-5) ─────────────────────────────────────────
  {
    id: 1,
    name: 'First Sprout',
    theme: 'Beginner Nature',
    description: 'Learn the basics with simple nature words.',
    puzzleCount: 15,
    requiredStars: 0,
    difficulty: 'easy',
    themeWords: ['tree', 'leaf', 'sun', 'rain', 'seed', 'root', 'stem', 'bark', 'soil', 'vine', 'fern', 'moss'],
    wingId: 'nature',
    icon: '🌱',
    profile: {
      minWordLength: 3,
      maxWordLength: 4,
      introducedMechanics: ['gravityCascade'],
      emptyCellDensity: 0.15,
      dictionaryTier: 'common',
    },
  },
  {
    id: 2,
    name: 'Forest Walk',
    theme: 'Forest',
    description: 'Explore the woodland vocabulary.',
    puzzleCount: 15,
    requiredStars: 6,
    difficulty: 'easy',
    themeWords: ['pine', 'oak', 'elm', 'fox', 'deer', 'owl', 'nest', 'bush', 'glen', 'dale', 'hare', 'crow'],
    wingId: 'nature',
    icon: '🌲',
    profile: {
      minWordLength: 3,
      maxWordLength: 4,
      introducedMechanics: ['fourLetter', 'gravityCascade'],
      emptyCellDensity: 0.1,
      dictionaryTier: 'common',
    },
  },
  {
    id: 3,
    name: 'Garden Bloom',
    theme: 'Garden',
    description: 'Words bloom like flowers in a garden.',
    puzzleCount: 15,
    requiredStars: 12,
    difficulty: 'easy',
    themeWords: ['rose', 'lily', 'tulip', 'daisy', 'petal', 'bloom', 'bud', 'herb', 'sage', 'mint', 'plot', 'gate'],
    wingId: 'nature',
    icon: '🌷',
    profile: {
      minWordLength: 3,
      maxWordLength: 5,
      introducedMechanics: ['fourLetter'],
      emptyCellDensity: 0.08,
      dictionaryTier: 'common',
    },
  },
  {
    id: 4,
    name: 'Wild Meadow',
    theme: 'Meadow',
    description: 'Open fields of challenging words.',
    puzzleCount: 15,
    requiredStars: 18,
    difficulty: 'medium',
    themeWords: ['field', 'grass', 'creek', 'pond', 'ridge', 'trail', 'grove', 'marsh', 'brook', 'cliff', 'bluff', 'vale'],
    wingId: 'nature',
    icon: '🌾',
    profile: {
      minWordLength: 3,
      maxWordLength: 6,
      introducedMechanics: ['denseBoard'],
      emptyCellDensity: 0.05,
      dictionaryTier: 'standard',
    },
  },
  {
    id: 5,
    name: 'Mountain Peak',
    theme: 'Mountain',
    description: 'Scale the heights of nature vocabulary.',
    puzzleCount: 15,
    requiredStars: 24,
    difficulty: 'medium',
    themeWords: ['peak', 'stone', 'cloud', 'wind', 'storm', 'snow', 'frost', 'eagle', 'crest', 'slope', 'ledge', 'range'],
    wingId: 'nature',
    icon: '🏔️',
    profile: {
      minWordLength: 4,
      maxWordLength: 6,
      introducedMechanics: ['longWords', 'denseBoard'],
      emptyCellDensity: 0.03,
      dictionaryTier: 'standard',
    },
  },

  // ── Wing 2: Science (Chapters 6-10) ────────────────────────────────────────
  {
    id: 6,
    name: 'Lab Basics',
    theme: 'Basic Science',
    description: 'Elementary science terms to get started.',
    puzzleCount: 15,
    requiredStars: 30,
    difficulty: 'easy',
    themeWords: ['atom', 'cell', 'gene', 'mass', 'wave', 'lens', 'core', 'volt', 'tube', 'beam', 'data', 'test'],
    wingId: 'science',
    icon: '🧪',
  },
  {
    id: 7,
    name: 'Chemistry Set',
    theme: 'Chemistry',
    description: 'Mix up some chemical vocabulary.',
    puzzleCount: 15,
    requiredStars: 36,
    difficulty: 'medium',
    themeWords: ['acid', 'base', 'bond', 'salt', 'iron', 'zinc', 'gold', 'lead', 'neon', 'oxide', 'ionic', 'mole'],
    wingId: 'science',
    icon: '⚗️',
  },
  {
    id: 8,
    name: 'Biology Lab',
    theme: 'Biology',
    description: 'Living words for living things.',
    puzzleCount: 15,
    requiredStars: 42,
    difficulty: 'medium',
    themeWords: ['organ', 'nerve', 'spine', 'brain', 'heart', 'lung', 'bone', 'skin', 'vein', 'blood', 'limb', 'joint'],
    wingId: 'science',
    icon: '🔬',
  },
  {
    id: 9,
    name: 'Physics Engine',
    theme: 'Physics',
    description: 'Forces and motion in word form.',
    puzzleCount: 15,
    requiredStars: 48,
    difficulty: 'hard',
    themeWords: ['force', 'speed', 'light', 'sound', 'heat', 'power', 'orbit', 'field', 'pulse', 'spark', 'quark', 'flux'],
    wingId: 'science',
    icon: '⚡',
  },
  {
    id: 10,
    name: 'Discovery',
    theme: 'Advanced Science',
    description: 'Push the boundaries of scientific language.',
    puzzleCount: 15,
    requiredStars: 54,
    difficulty: 'hard',
    themeWords: ['prism', 'laser', 'radar', 'sonar', 'phase', 'probe', 'clone', 'surge', 'fuse', 'alloy', 'dense', 'vapor'],
    wingId: 'science',
    icon: '🔭',
  },

  // ── Wing 3: Mythology (Chapters 11-15) ─────────────────────────────────────
  {
    id: 11,
    name: 'Ancient Tales',
    theme: 'Myth Basics',
    description: 'Begin your mythological journey.',
    puzzleCount: 15,
    requiredStars: 60,
    difficulty: 'medium',
    themeWords: ['myth', 'hero', 'sage', 'fate', 'lore', 'epic', 'bard', 'rune', 'omen', 'tome', 'ward', 'oath'],
    wingId: 'mythology',
    icon: '📜',
  },
  {
    id: 12,
    name: 'Greek Legends',
    theme: 'Greek Mythology',
    description: 'Words from the age of Olympus.',
    puzzleCount: 15,
    requiredStars: 66,
    difficulty: 'medium',
    themeWords: ['titan', 'hydra', 'muse', 'oracle', 'helm', 'bolt', 'aegis', 'forge', 'lyre', 'styx', 'chaos', 'atlas'],
    wingId: 'mythology',
    icon: '🏛️',
  },
  {
    id: 13,
    name: 'Norse Sagas',
    theme: 'Norse Mythology',
    description: 'Viking words from the frozen north.',
    puzzleCount: 15,
    requiredStars: 72,
    difficulty: 'hard',
    themeWords: ['rune', 'thor', 'odin', 'frost', 'wolf', 'raven', 'axe', 'mead', 'hall', 'shield', 'forge', 'fjord'],
    wingId: 'mythology',
    icon: '⚔️',
  },
  {
    id: 14,
    name: 'Eastern Fables',
    theme: 'Asian Mythology',
    description: 'Words from Eastern legendary traditions.',
    puzzleCount: 15,
    requiredStars: 78,
    difficulty: 'hard',
    themeWords: ['jade', 'silk', 'lotus', 'crane', 'pearl', 'tiger', 'scroll', 'honor', 'fate', 'spirit', 'dawn', 'moon'],
    wingId: 'mythology',
    icon: '🐉',
  },
  {
    id: 15,
    name: 'Legendary Beasts',
    theme: 'Mythical Creatures',
    description: 'Words of the creatures of legend.',
    puzzleCount: 15,
    requiredStars: 84,
    difficulty: 'hard',
    themeWords: ['drake', 'gryphon', 'pixie', 'troll', 'imp', 'ogre', 'elf', 'sprite', 'golem', 'wraith', 'fiend', 'beast'],
    wingId: 'mythology',
    icon: '🦄',
  },

  // ── Wing 4: Ocean (Chapters 16-20) ─────────────────────────────────────────
  {
    id: 16,
    name: 'Tide Pool',
    theme: 'Shore',
    description: 'Gentle words from the shoreline.',
    puzzleCount: 15,
    requiredStars: 90,
    difficulty: 'medium',
    themeWords: ['tide', 'sand', 'shell', 'wave', 'reef', 'surf', 'cove', 'bay', 'kelp', 'clam', 'crab', 'foam'],
    wingId: 'ocean',
    icon: '🐚',
  },
  {
    id: 17,
    name: 'Open Seas',
    theme: 'Sailing',
    description: 'Set sail with nautical vocabulary.',
    puzzleCount: 15,
    requiredStars: 96,
    difficulty: 'medium',
    themeWords: ['sail', 'hull', 'mast', 'helm', 'port', 'keel', 'deck', 'bow', 'stern', 'rig', 'crew', 'knot'],
    wingId: 'ocean',
    icon: '⛵',
  },
  {
    id: 18,
    name: 'Deep Blue',
    theme: 'Deep Sea',
    description: 'Plunge into the depths of the ocean.',
    puzzleCount: 15,
    requiredStars: 102,
    difficulty: 'hard',
    themeWords: ['depth', 'abyss', 'coral', 'squid', 'shark', 'whale', 'eel', 'drift', 'trench', 'murky', 'plunge', 'dive'],
    wingId: 'ocean',
    icon: '🐋',
  },
  {
    id: 19,
    name: 'Coral Kingdom',
    theme: 'Marine Life',
    description: 'The colorful world beneath the waves.',
    puzzleCount: 15,
    requiredStars: 108,
    difficulty: 'hard',
    themeWords: ['coral', 'fish', 'ray', 'seal', 'otter', 'pearl', 'bloom', 'reef', 'prawn', 'gull', 'heron', 'shore'],
    wingId: 'ocean',
    icon: '🐠',
  },
  {
    id: 20,
    name: 'Kraken\'s Lair',
    theme: 'Ocean Legends',
    description: 'Face the most challenging ocean words.',
    puzzleCount: 15,
    requiredStars: 114,
    difficulty: 'expert',
    themeWords: ['kraken', 'siren', 'trident', 'anchor', 'tempest', 'voyage', 'pirate', 'plank', 'fleet', 'harbor', 'storm', 'wreck'],
    wingId: 'ocean',
    icon: '🦑',
  },

  // ── Wing 5: Arts (Chapters 21-25) ──────────────────────────────────────────
  {
    id: 21,
    name: 'Sketch Pad',
    theme: 'Drawing',
    description: 'Basic art vocabulary.',
    puzzleCount: 15,
    requiredStars: 120,
    difficulty: 'medium',
    themeWords: ['line', 'shade', 'tone', 'form', 'hue', 'ink', 'pen', 'brush', 'clay', 'mold', 'frame', 'draft'],
    wingId: 'arts',
    icon: '✏️',
  },
  {
    id: 22,
    name: 'Gallery Walk',
    theme: 'Visual Arts',
    description: 'Explore the gallery of word art.',
    puzzleCount: 15,
    requiredStars: 126,
    difficulty: 'medium',
    themeWords: ['paint', 'color', 'blend', 'style', 'mural', 'easel', 'pastel', 'vivid', 'bold', 'canvas', 'oil', 'wash'],
    wingId: 'arts',
    icon: '🎨',
  },
  {
    id: 23,
    name: 'Music Room',
    theme: 'Music',
    description: 'Words that make melodies.',
    puzzleCount: 15,
    requiredStars: 132,
    difficulty: 'hard',
    themeWords: ['note', 'chord', 'beat', 'tempo', 'bass', 'drum', 'flute', 'harp', 'tune', 'song', 'hymn', 'jazz'],
    wingId: 'arts',
    icon: '🎵',
  },
  {
    id: 24,
    name: 'Stage Light',
    theme: 'Theater',
    description: 'All the world\'s a word puzzle.',
    puzzleCount: 15,
    requiredStars: 138,
    difficulty: 'hard',
    themeWords: ['stage', 'scene', 'act', 'role', 'plot', 'drama', 'mask', 'mime', 'cast', 'prop', 'cue', 'bow'],
    wingId: 'arts',
    icon: '🎭',
  },
  {
    id: 25,
    name: 'Masterpiece',
    theme: 'Art Mastery',
    description: 'Create your word masterpiece.',
    puzzleCount: 15,
    requiredStars: 144,
    difficulty: 'expert',
    themeWords: ['craft', 'vision', 'motif', 'genre', 'medium', 'opus', 'avant', 'etch', 'carve', 'sculpt', 'fresco', 'muse'],
    wingId: 'arts',
    icon: '🖼️',
  },

  // ── Wing 6: Space (Chapters 26-30) ─────────────────────────────────────────
  {
    id: 26,
    name: 'Stargazer',
    theme: 'Night Sky',
    description: 'Look up and find the words in the stars.',
    puzzleCount: 15,
    requiredStars: 150,
    difficulty: 'medium',
    themeWords: ['star', 'moon', 'sky', 'night', 'glow', 'dawn', 'dusk', 'beam', 'ray', 'haze', 'mist', 'void'],
    wingId: 'space',
    icon: '⭐',
  },
  {
    id: 27,
    name: 'Lunar Landing',
    theme: 'Moon',
    description: 'One small step for word puzzles.',
    puzzleCount: 15,
    requiredStars: 156,
    difficulty: 'hard',
    themeWords: ['lunar', 'crater', 'orbit', 'phase', 'eclipse', 'tide', 'rock', 'dust', 'land', 'base', 'module', 'suit'],
    wingId: 'space',
    icon: '🌙',
  },
  {
    id: 28,
    name: 'Solar System',
    theme: 'Planets',
    description: 'Traverse the solar system of words.',
    puzzleCount: 15,
    requiredStars: 162,
    difficulty: 'hard',
    themeWords: ['mars', 'venus', 'earth', 'ring', 'core', 'giant', 'dwarf', 'comet', 'belt', 'solar', 'flare', 'probe'],
    wingId: 'space',
    icon: '🪐',
  },
  {
    id: 29,
    name: 'Deep Space',
    theme: 'Galaxy',
    description: 'Journey beyond our solar system.',
    puzzleCount: 15,
    requiredStars: 168,
    difficulty: 'expert',
    themeWords: ['nova', 'nebula', 'quasar', 'pulsar', 'cosmic', 'gamma', 'warp', 'rift', 'void', 'black', 'hole', 'dark'],
    wingId: 'space',
    icon: '🌌',
  },
  {
    id: 30,
    name: 'Final Frontier',
    theme: 'Space Exploration',
    description: 'The ultimate space vocabulary challenge.',
    puzzleCount: 15,
    requiredStars: 174,
    difficulty: 'expert',
    themeWords: ['rocket', 'launch', 'thrust', 'fuel', 'dock', 'relay', 'signal', 'array', 'mission', 'crew', 'cargo', 'titan'],
    wingId: 'space',
    icon: '🚀',
  },

  // ── Wing 7: History (Chapters 31-35) ───────────────────────────────────────
  {
    id: 31,
    name: 'Ancient Script',
    theme: 'Ancient History',
    description: 'Decipher words from the ancient world.',
    puzzleCount: 15,
    requiredStars: 180,
    difficulty: 'hard',
    themeWords: ['king', 'queen', 'crown', 'reign', 'throne', 'court', 'noble', 'lord', 'dame', 'knight', 'serf', 'realm'],
    wingId: 'history',
    icon: '🏺',
  },
  {
    id: 32,
    name: 'Medieval Times',
    theme: 'Medieval',
    description: 'Words from the age of castles and knights.',
    puzzleCount: 15,
    requiredStars: 186,
    difficulty: 'hard',
    themeWords: ['castle', 'moat', 'tower', 'gate', 'wall', 'siege', 'sword', 'armor', 'lance', 'steed', 'banner', 'herald'],
    wingId: 'history',
    icon: '🏰',
  },
  {
    id: 33,
    name: 'Age of Sail',
    theme: 'Exploration Era',
    description: 'Navigate the words of discovery.',
    puzzleCount: 15,
    requiredStars: 192,
    difficulty: 'expert',
    themeWords: ['trade', 'route', 'spice', 'silk', 'port', 'chart', 'compass', 'voyage', 'colony', 'fleet', 'cargo', 'fort'],
    wingId: 'history',
    icon: '🗺️',
  },
  {
    id: 34,
    name: 'Revolution',
    theme: 'Modern History',
    description: 'Words that changed the world.',
    puzzleCount: 15,
    requiredStars: 198,
    difficulty: 'expert',
    themeWords: ['revolt', 'reform', 'liberty', 'rights', 'vote', 'press', 'union', 'treaty', 'peace', 'law', 'code', 'pact'],
    wingId: 'history',
    icon: '⚖️',
  },
  {
    id: 35,
    name: 'Modern Age',
    theme: 'Contemporary',
    description: 'Words from the modern era.',
    puzzleCount: 15,
    requiredStars: 204,
    difficulty: 'expert',
    themeWords: ['radio', 'film', 'media', 'press', 'globe', 'urban', 'steel', 'rail', 'bridge', 'motor', 'flight', 'wire'],
    wingId: 'history',
    icon: '🏙️',
  },

  // ── Wing 8: Elements (Chapters 36-40) ──────────────────────────────────────
  {
    id: 36,
    name: 'Ember',
    theme: 'Fire',
    description: 'Words that burn bright.',
    puzzleCount: 15,
    requiredStars: 210,
    difficulty: 'hard',
    themeWords: ['fire', 'flame', 'blaze', 'ember', 'spark', 'ash', 'smoke', 'coal', 'burn', 'heat', 'torch', 'glow'],
    wingId: 'elements',
    icon: '🔥',
  },
  {
    id: 37,
    name: 'Torrent',
    theme: 'Water',
    description: 'Words that flow like water.',
    puzzleCount: 15,
    requiredStars: 216,
    difficulty: 'hard',
    themeWords: ['water', 'river', 'lake', 'rain', 'flood', 'steam', 'ice', 'snow', 'mist', 'pool', 'dam', 'falls'],
    wingId: 'elements',
    icon: '💧',
  },
  {
    id: 38,
    name: 'Gale',
    theme: 'Air',
    description: 'Words carried on the wind.',
    puzzleCount: 15,
    requiredStars: 222,
    difficulty: 'expert',
    themeWords: ['wind', 'gust', 'gale', 'breeze', 'draft', 'storm', 'cloud', 'sky', 'air', 'blow', 'whirl', 'swirl'],
    wingId: 'elements',
    icon: '💨',
  },
  {
    id: 39,
    name: 'Bedrock',
    theme: 'Earth',
    description: 'Grounded in solid vocabulary.',
    puzzleCount: 15,
    requiredStars: 228,
    difficulty: 'expert',
    themeWords: ['stone', 'rock', 'sand', 'clay', 'iron', 'ore', 'gem', 'quartz', 'slate', 'flint', 'dust', 'soil'],
    wingId: 'elements',
    icon: '⛰️',
  },
  {
    id: 40,
    name: 'Convergence',
    theme: 'All Elements',
    description: 'Master all elements in the ultimate challenge.',
    puzzleCount: 15,
    requiredStars: 234,
    difficulty: 'expert',
    themeWords: ['primal', 'force', 'energy', 'spirit', 'chaos', 'order', 'cycle', 'balance', 'surge', 'calm', 'apex', 'prime'],
    wingId: 'elements',
    icon: '✨',
  },
];

export function getChaptersByWing(wingId: string): Chapter[] {
  return CHAPTERS.filter((ch) => ch.wingId === wingId);
}

export function getChapter(id: number): Chapter | undefined {
  return CHAPTERS.find((ch) => ch.id === id);
}

export function getNextChapter(currentId: number): Chapter | undefined {
  return CHAPTERS.find((ch) => ch.id === currentId + 1);
}

/**
 * Returns the highest level number that still belongs to the given chapter.
 * Used by progression-gating to clamp a player's advancement at the end of
 * the currently-unlocked chapter when the next chapter's star gate isn't met.
 */
export function getLastLevelOfChapter(chapterId: number): number {
  let cumulative = 0;
  for (const chapter of CHAPTERS) {
    cumulative += chapter.puzzleCount;
    if (chapter.id === chapterId) return cumulative;
  }
  // Past authored content — approximate via 15 puzzles/chapter convention.
  const tail = CHAPTERS[CHAPTERS.length - 1];
  return cumulative + (chapterId - tail.id) * 15;
}

export function getChapterForLevel(level: number): Chapter | undefined {
  if (level <= 0) return CHAPTERS[0];

  // Chapters define their own puzzle counts; map level to chapter by cumulative total.
  let cumulativeLevels = 0;
  for (const chapter of CHAPTERS) {
    cumulativeLevels += chapter.puzzleCount;
    if (level <= cumulativeLevels) {
      return chapter;
    }
  }

  // Past authored content: use procedural chapter generation
  // Import dynamically to avoid circular dependency
  const proceduralLevel = level - cumulativeLevels;
  const chapterId = CHAPTERS.length + 1 + Math.floor(proceduralLevel / 15);
  try {
    const { generateProceduralChapter } = require('../engine/puzzleGenerator');
    return generateProceduralChapter(chapterId);
  } catch {
    // Fallback: clamp to final chapter
    return CHAPTERS[CHAPTERS.length - 1];
  }
}
