/**
 * Word Categories for Themed Puzzle Generation
 *
 * Each category contains 30+ words (3-6 letters) that exist in the main word list.
 * Used by the puzzle generator to create themed puzzles and procedural chapters.
 * All words are UPPERCASE to match the word list format.
 */

export interface WordCategory {
  id: string;
  name: string;
  icon: string;
  words: string[];
}

export const WORD_CATEGORIES: WordCategory[] = [
  {
    id: 'nature',
    name: 'Nature',
    icon: '\u{1F333}',
    words: [
      'TREE', 'LEAF', 'RAIN', 'SUN', 'WIND', 'LAKE', 'SEED', 'ROOT',
      'STEM', 'BARK', 'SOIL', 'VINE', 'FERN', 'MOSS', 'PINE', 'OAK',
      'ELM', 'FOX', 'DEER', 'OWL', 'NEST', 'BUSH', 'GLEN', 'DALE',
      'HARE', 'CROW', 'ROSE', 'LILY', 'BUD', 'HERB', 'SAGE', 'MINT',
      'FIELD', 'GRASS', 'CREEK', 'POND', 'RIDGE', 'TRAIL', 'GROVE',
      'MARSH', 'BROOK', 'CLIFF', 'PEAK', 'STONE', 'CLOUD', 'STORM',
      'SNOW', 'FROST', 'EAGLE', 'BLOOM',
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: '\u{1F354}',
    words: [
      'CAKE', 'RICE', 'SOUP', 'FISH', 'MEAT', 'CORN', 'BEEF', 'PORK',
      'LAMB', 'BREW', 'SALT', 'MEAL', 'DISH', 'COOK', 'BAKE', 'STEW',
      'LOAF', 'PLUM', 'PEAR', 'LIME', 'DATE', 'BEAN', 'NUT', 'JAM',
      'PIE', 'HAM', 'EGG', 'OAT', 'RYE', 'TEA', 'ALE', 'YAM',
      'FEAST', 'TOAST', 'CREAM', 'SUGAR', 'SPICE', 'HONEY', 'BROTH',
      'CRUST', 'GRAVY', 'ROAST', 'SAUCE', 'CANDY', 'JUICE',
    ],
  },
  {
    id: 'science',
    name: 'Science',
    icon: '\u{1F52C}',
    words: [
      'ATOM', 'CELL', 'GENE', 'STAR', 'MASS', 'WAVE', 'LENS', 'CORE',
      'VOLT', 'TUBE', 'BEAM', 'DATA', 'TEST', 'ACID', 'BASE', 'BOND',
      'SALT', 'IRON', 'ZINC', 'GOLD', 'LEAD', 'NEON', 'MOLE', 'NERVE',
      'BRAIN', 'HEART', 'LUNG', 'BONE', 'SKIN', 'VEIN', 'FORCE', 'SPEED',
      'LIGHT', 'SOUND', 'HEAT', 'POWER', 'ORBIT', 'FIELD', 'PULSE', 'SPARK',
      'PRISM', 'LASER', 'RADAR', 'SONAR', 'PHASE', 'PROBE', 'CLONE', 'SURGE',
      'FUSE', 'DENSE',
    ],
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: '\u{26BD}',
    words: [
      'GOAL', 'KICK', 'RUN', 'SWIM', 'BALL', 'RACE', 'TEAM', 'GAME',
      'PLAY', 'SHOT', 'PASS', 'JUMP', 'DIVE', 'BOUT', 'RIDE', 'SAIL',
      'SURF', 'GOLF', 'RINK', 'RING', 'CLUB', 'GRIP', 'PACE', 'LANE',
      'DRAW', 'DASH', 'MEET', 'BOUT', 'BOUT', 'CREW', 'FEAT', 'LEAD',
      'PUNT', 'SPAR', 'LAPS', 'HITS', 'NETS', 'BATS', 'ACES', 'RANK',
      'COACH', 'SCORE', 'MEDAL', 'MATCH', 'TRACK', 'FIELD', 'VAULT',
    ],
  },
  {
    id: 'music',
    name: 'Music',
    icon: '\u{1F3B5}',
    words: [
      'SONG', 'DRUM', 'BEAT', 'TUNE', 'NOTE', 'BASS', 'HARP', 'JAZZ',
      'HYMN', 'BAND', 'SOLO', 'DUET', 'TRIO', 'HORN', 'BELL', 'TONE',
      'MUTE', 'RIFF', 'VIBE', 'ECHO', 'CLEF', 'REST', 'LYRE', 'REED',
      'FIFE', 'GONG', 'LUTE', 'PIPE', 'CHIME', 'CHOIR', 'TEMPO',
      'CHORD', 'FLUTE', 'OPERA', 'LYRIC', 'VOCAL', 'VIOLA', 'CELLO',
      'PIANO', 'ORGAN', 'SYNTH',
    ],
  },
  {
    id: 'animals',
    name: 'Animals',
    icon: '\u{1F43E}',
    words: [
      'CAT', 'DOG', 'FOX', 'OWL', 'BAT', 'PIG', 'COW', 'HEN', 'EEL',
      'ELK', 'EMU', 'EWE', 'RAM', 'YAK', 'APE', 'BUG', 'ANT', 'BEE',
      'FLY', 'JAY', 'BEAR', 'DEER', 'DUCK', 'FAWN', 'FISH', 'FROG',
      'GOAT', 'HARE', 'HAWK', 'LAMB', 'LION', 'MOLE', 'MOTH', 'MULE',
      'NEWT', 'SEAL', 'SWAN', 'TOAD', 'WOLF', 'WREN', 'CROW', 'CRAB',
      'CRANE', 'EAGLE', 'HORSE', 'MOOSE', 'MOUSE', 'OTTER', 'SHARK',
      'SNAKE', 'TIGER', 'WHALE',
    ],
  },
  {
    id: 'weather',
    name: 'Weather',
    icon: '\u{26C5}',
    words: [
      'RAIN', 'SNOW', 'WIND', 'HAIL', 'GUST', 'GALE', 'MIST', 'HAZE',
      'SMOG', 'CALM', 'COLD', 'COOL', 'WARM', 'HEAT', 'DAMP', 'DARK',
      'DAWN', 'DUSK', 'GLOW', 'SKY', 'SUN', 'ICE', 'FOG', 'DEW',
      'AIR', 'DRY', 'WET', 'RAY', 'STORM', 'CLOUD', 'FROST', 'SLEET',
      'FLOOD', 'BLAZE', 'BREEZE', 'FREEZE', 'THAW', 'DRAFT', 'SHINE',
      'HUMID', 'MUGGY',
    ],
  },
  {
    id: 'home',
    name: 'Home & Living',
    icon: '\u{1F3E0}',
    words: [
      'BED', 'MUG', 'CUP', 'RUG', 'PAN', 'POT', 'KEY', 'FAN', 'PEG',
      'MOP', 'JAR', 'LID', 'TIN', 'BOX', 'MAT', 'TAB', 'DOOR', 'WALL',
      'ROOF', 'ROOM', 'LAMP', 'DESK', 'SOFA', 'BATH', 'SINK', 'OVEN',
      'FORK', 'BOWL', 'VASE', 'TILE', 'KNOB', 'LOCK', 'BELL', 'WIRE',
      'COZY', 'HOME', 'SHED', 'YARD', 'GATE', 'PATH', 'SHELF', 'TABLE',
      'CHAIR', 'CLOCK', 'TOWEL', 'BROOM', 'STOVE',
    ],
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: '\u{2708}\u{FE0F}',
    words: [
      'MAP', 'BAG', 'BUS', 'CAB', 'CAR', 'VAN', 'JET', 'SEA', 'BAY',
      'INN', 'ROAD', 'PATH', 'TRIP', 'TOUR', 'SAIL', 'RIDE', 'TREK',
      'PORT', 'DOCK', 'PIER', 'TAXI', 'RAIL', 'BOAT', 'SHIP', 'HELM',
      'DECK', 'CREW', 'MILE', 'LANE', 'VISA', 'PACK', 'GEAR', 'CAMP',
      'ROUTE', 'TRAIL', 'FERRY', 'LODGE', 'BEACH', 'COAST', 'GLOBE',
      'CARGO', 'FLEET',
    ],
  },
  {
    id: 'magic',
    name: 'Magic & Fantasy',
    icon: '\u{2728}',
    words: [
      'ELF', 'IMP', 'ORB', 'OAK', 'AXE', 'BOW', 'GEM', 'WAND', 'RUNE',
      'MYTH', 'HERO', 'SAGE', 'FATE', 'LORE', 'EPIC', 'BARD', 'OMEN',
      'TOME', 'WARD', 'OATH', 'HELM', 'BOLT', 'MUSE', 'TROLL', 'PIXIE',
      'OGRE', 'DRAKE', 'SPELL', 'QUEST', 'CHARM', 'FAIRY', 'WITCH',
      'GHOST', 'DEMON', 'GIANT', 'DWARF', 'BLADE', 'CROWN', 'BEAST',
      'FIEND', 'GOLEM',
    ],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    icon: '\u{1F30A}',
    words: [
      'SEA', 'BAY', 'FIN', 'EEL', 'OAR', 'TIDE', 'SAND', 'WAVE', 'REEF',
      'SURF', 'COVE', 'KELP', 'CLAM', 'CRAB', 'FOAM', 'SAIL', 'HULL',
      'MAST', 'HELM', 'PORT', 'KEEL', 'DECK', 'BOW', 'KNOT', 'CREW',
      'CORAL', 'SQUID', 'SHARK', 'WHALE', 'DRIFT', 'DIVE', 'FISH',
      'SEAL', 'PEARL', 'SHORE', 'DEPTH', 'SHELL', 'STERN', 'PLUNGE',
      'ANCHOR', 'HARBOR',
    ],
  },
  {
    id: 'space',
    name: 'Space',
    icon: '\u{1F680}',
    words: [
      'SUN', 'SKY', 'STAR', 'MOON', 'GLOW', 'DAWN', 'DUSK', 'BEAM',
      'RAY', 'HAZE', 'MIST', 'VOID', 'MARS', 'RING', 'CORE', 'COMET',
      'BELT', 'SOLAR', 'FLARE', 'PROBE', 'NOVA', 'WARP', 'RIFT', 'DARK',
      'HOLE', 'ORBIT', 'PHASE', 'LUNAR', 'DUST', 'LAND', 'BASE', 'FUEL',
      'DOCK', 'RELAY', 'ARRAY', 'CREW', 'CARGO', 'TITAN', 'ROCKET',
      'LAUNCH', 'THRUST',
    ],
  },
  {
    id: 'body',
    name: 'Human Body',
    icon: '\u{1F9D1}',
    words: [
      'ARM', 'EAR', 'EYE', 'GUM', 'HIP', 'JAW', 'LEG', 'LIP', 'RIB',
      'TOE', 'BACK', 'BONE', 'CHIN', 'FACE', 'FOOT', 'HAIR', 'HAND',
      'HEAD', 'HEEL', 'KNEE', 'LUNG', 'NAIL', 'NECK', 'NOSE', 'PALM',
      'SHIN', 'SKIN', 'VEIN', 'WAIST', 'WRIST', 'BRAIN', 'HEART',
      'NERVE', 'SPINE', 'JOINT', 'SKULL', 'THUMB', 'ELBOW', 'CHEST',
      'TORSO',
    ],
  },
  {
    id: 'colors',
    name: 'Colors & Art',
    icon: '\u{1F3A8}',
    words: [
      'RED', 'TAN', 'DYE', 'HUE', 'INK', 'PEN', 'ART', 'BLUE', 'GOLD',
      'GREY', 'JADE', 'LIME', 'PINK', 'RUBY', 'RUST', 'SAGE', 'TONE',
      'LINE', 'FORM', 'CLAY', 'MOLD', 'WASH', 'DRAW', 'BOLD', 'DARK',
      'PALE', 'RICH', 'VIVID', 'SHADE', 'BLEND', 'STYLE', 'PAINT',
      'COLOR', 'BRUSH', 'FRAME', 'DRAFT', 'MURAL', 'CRAFT',
      'SKETCH', 'PASTEL',
    ],
  },
  {
    id: 'tech',
    name: 'Technology',
    icon: '\u{1F4BB}',
    words: [
      'APP', 'BIT', 'BUG', 'CPU', 'NET', 'WEB', 'USB', 'RAM', 'LOG',
      'PIN', 'TAG', 'KEY', 'BYTE', 'CHIP', 'CODE', 'DATA', 'DISK',
      'FILE', 'GAME', 'HACK', 'HOST', 'ICON', 'JAVA', 'LINK', 'LOAD',
      'MENU', 'MODE', 'NODE', 'PAGE', 'PORT', 'SCAN', 'SITE', 'SYNC',
      'TEXT', 'USER', 'WIFI', 'ZOOM', 'PIXEL', 'CLOUD', 'INPUT',
      'MOUSE', 'VIRUS', 'CACHE', 'DEBUG',
    ],
  },
];

/**
 * Get a word category by its ID.
 */
export function getCategory(id: string): WordCategory | undefined {
  return WORD_CATEGORIES.find(c => c.id === id);
}

/**
 * Get all category IDs.
 */
export function getCategoryIds(): string[] {
  return WORD_CATEGORIES.map(c => c.id);
}

/**
 * Get words from a category that match a length range.
 */
export function getCategoryWords(categoryId: string, minLen: number, maxLen: number): string[] {
  const category = getCategory(categoryId);
  if (!category) return [];
  return category.words.filter(w => w.length >= minLen && w.length <= maxLen);
}

/**
 * Get a random category, optionally excluding some.
 */
export function getRandomCategory(exclude: string[] = []): WordCategory {
  const available = WORD_CATEGORIES.filter(c => !exclude.includes(c.id));
  if (available.length === 0) return WORD_CATEGORIES[0];
  return available[Math.floor(Math.random() * available.length)];
}
