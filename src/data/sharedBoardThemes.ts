/**
 * Hand-authored theme word lists for the SHARED boards (Daily / Weekly
 * challenges) — the one surface where every player sees the same puzzle, so
 * curated flavor is most visible. Same authoring contract as chapter
 * themeWords in `chapters.ts`: lowercase, validated against the dictionary
 * pool by the generator (missing words are silently dropped), placed at the
 * head of the selection pool with up to half the find-list reserved.
 *
 * Every list mixes 3–4 letter and 5–6 letter words so a theme survives
 * every daily variant's length bounds (Sunday's 3–4 "Zen Garden" through
 * Wednesday's 5–6 "Long Haul"). `sharedBoardThemes.test.ts` pins that every
 * word is really in the dictionary and that each list covers both length
 * bands — an authored word that silently never appears is a wasted slot.
 *
 * Rotation is deterministic from the UTC date / week id, preserving the
 * "same board for every player" guarantee the shared leaderboards rely on.
 * DAILY_THEMES has 20 entries (not a multiple of 7) so weekday variants and
 * themes drift against each other instead of locking Sunday to 4 themes.
 */

export interface SharedBoardTheme {
  name: string;
  words: string[];
}

export const DAILY_THEMES: ReadonlyArray<SharedBoardTheme> = [
  { name: 'Ocean Drift', words: ['sea', 'fish', 'wave', 'tide', 'sand', 'reef', 'shell', 'coral', 'pearl', 'whale', 'shore', 'spray'] },
  { name: 'Campfire Glow', words: ['log', 'ash', 'ember', 'spark', 'flame', 'smoke', 'wood', 'tent', 'camp', 'glow', 'char', 'burn'] },
  { name: 'Night Sky', words: ['sky', 'moon', 'comet', 'orbit', 'dusk', 'dawn', 'space', 'lunar', 'solar', 'beam', 'galaxy', 'shine'] },
  { name: 'Bakery Morning', words: ['pie', 'bun', 'cake', 'loaf', 'bread', 'crust', 'dough', 'flour', 'sugar', 'glaze', 'tart', 'yeast'] },
  { name: 'Rainstorm', words: ['rain', 'drop', 'pour', 'storm', 'cloud', 'flood', 'mist', 'gust', 'wind', 'bolt', 'damp', 'soak'] },
  { name: 'Jungle Trek', words: ['vine', 'fern', 'moss', 'snake', 'tiger', 'palm', 'cane', 'wild', 'roar', 'claw', 'prowl', 'viper'] },
  { name: 'Deep Winter', words: ['ice', 'snow', 'frost', 'chill', 'sled', 'skate', 'polar', 'igloo', 'thaw', 'cold', 'numb', 'icicle'] },
  { name: 'Harvest Home', words: ['corn', 'wheat', 'barn', 'crop', 'plow', 'seed', 'grain', 'apple', 'cider', 'straw', 'field', 'farm'] },
  { name: 'Concert Hall', words: ['song', 'tune', 'note', 'drum', 'chord', 'tempo', 'viola', 'flute', 'organ', 'band', 'fiddle', 'opera'] },
  { name: 'Launch Pad', words: ['ship', 'crew', 'fuel', 'rocket', 'launch', 'pilot', 'cargo', 'radar', 'probe', 'dock', 'void', 'warp'] },
  { name: 'Garden Path', words: ['rose', 'lily', 'tulip', 'daisy', 'petal', 'bloom', 'bud', 'herb', 'sage', 'mint', 'soil', 'stem'] },
  { name: 'Desert Trail', words: ['dune', 'cactus', 'oasis', 'camel', 'heat', 'arid', 'dust', 'rock', 'sun', 'canyon', 'mesa', 'coyote'] },
  { name: 'Big Top', words: ['ring', 'clown', 'lion', 'tamer', 'stilt', 'magic', 'wand', 'show', 'stunt', 'jester', 'arena', 'stage'] },
  { name: "Chef's Table", words: ['pan', 'pot', 'stove', 'knife', 'spoon', 'whisk', 'grill', 'roast', 'simmer', 'dice', 'chop', 'broth'] },
  { name: 'Reading Room', words: ['book', 'page', 'shelf', 'quill', 'ink', 'novel', 'poem', 'story', 'index', 'cover', 'spine', 'read'] },
  { name: 'Set Sail', words: ['mast', 'sail', 'deck', 'rope', 'anchor', 'helm', 'port', 'buoy', 'wharf', 'keel', 'galley', 'moor'] },
  { name: 'High Peaks', words: ['peak', 'ridge', 'cliff', 'slope', 'summit', 'trail', 'cave', 'ledge', 'climb', 'stone', 'apex', 'goat'] },
  { name: 'Fairground', words: ['ride', 'game', 'prize', 'candy', 'float', 'mask', 'parade', 'music', 'dance', 'crowd', 'booth', 'fun'] },
  { name: 'Orchard Rows', words: ['pear', 'plum', 'peach', 'mango', 'grove', 'fruit', 'ripe', 'pick', 'crate', 'jam', 'berry', 'lemon'] },
  { name: 'Tool Bench', words: ['nail', 'bolt', 'drill', 'saw', 'plane', 'vise', 'lathe', 'gear', 'tool', 'bench', 'file', 'wrench'] },
];

export const WEEKLY_THEMES: ReadonlyArray<SharedBoardTheme> = [
  { name: 'Deep Sea', words: ['squid', 'shark', 'coral', 'brine', 'lagoon', 'kelp', 'foam', 'gill', 'diver', 'hulk', 'sunken', 'abyss'] },
  { name: 'Castle Keep', words: ['moat', 'king', 'queen', 'crown', 'tower', 'knight', 'sword', 'shield', 'throne', 'banner', 'gate', 'wall'] },
  { name: 'Grand Voyage', words: ['map', 'trek', 'globe', 'route', 'coast', 'cargo', 'ferry', 'canoe', 'barge', 'pier', 'roam', 'haven'] },
  { name: 'Old Forest', words: ['cedar', 'birch', 'maple', 'thorn', 'shrub', 'twig', 'sap', 'loam', 'glade', 'willow', 'bough', 'grove'] },
  { name: 'Storm Front', words: ['squall', 'gale', 'sleet', 'hail', 'surge', 'gloom', 'murky', 'windy', 'rumble', 'strike', 'gusty', 'deluge'] },
  { name: 'Feast Day', words: ['roast', 'gravy', 'honey', 'melon', 'olive', 'bacon', 'salmon', 'butter', 'pastry', 'cocoa', 'toast', 'stew'] },
  { name: 'Gem Vault', words: ['jewel', 'opal', 'topaz', 'amber', 'jade', 'agate', 'garnet', 'gild', 'facet', 'pearl', 'luster', 'amulet'] },
  { name: 'Safari Plains', words: ['zebra', 'rhino', 'hyena', 'gnu', 'mane', 'tusk', 'herd', 'pride', 'fauna', 'plain', 'lion', 'cobra'] },
  { name: 'Frozen North', words: ['tundra', 'frigid', 'igloo', 'fjord', 'husky', 'seal', 'snowy', 'arctic', 'chill', 'drift', 'thaw', 'glare'] },
  { name: 'Meadowland', words: ['poppy', 'pollen', 'hive', 'wasp', 'finch', 'robin', 'wren', 'lark', 'dew', 'bloom', 'violet', 'petal'] },
  { name: 'Volcano Rim', words: ['lava', 'magma', 'crater', 'vent', 'fume', 'molten', 'scald', 'erupt', 'spew', 'smoke', 'ridge', 'ember'] },
  { name: 'Bazaar Lane', words: ['stall', 'trade', 'spice', 'silk', 'coin', 'vend', 'wares', 'cart', 'deal', 'kiosk', 'crate', 'booth'] },
  { name: 'Star Chart', words: ['galaxy', 'lunar', 'solar', 'orbit', 'comet', 'planet', 'cosmic', 'zenith', 'sky', 'beam', 'gleam', 'flare'] },
  { name: 'River Run', words: ['delta', 'eddy', 'otter', 'trout', 'perch', 'heron', 'reeds', 'bank', 'ford', 'creek', 'brook', 'stream'] },
  { name: 'Stage Night', words: ['stage', 'actor', 'drama', 'scene', 'usher', 'velvet', 'prop', 'cue', 'bow', 'mimic', 'lyric', 'debut'] },
  { name: 'Treasure Hunt', words: ['chest', 'gold', 'loot', 'relic', 'tomb', 'medal', 'gem', 'coin', 'map', 'cave', 'torch', 'amulet'] },
];

/**
 * Daily theme for a UTC date string (YYYY-MM-DD). Rotates through
 * DAILY_THEMES by days-since-epoch, so every player worldwide gets the same
 * theme and consecutive days differ. Falls back to the first theme when the
 * date can't be parsed (mirrors getDailyVariant's fallback posture).
 */
export function getDailyTheme(dateString: string): SharedBoardTheme {
  const ms = Date.parse(`${dateString}T00:00:00Z`);
  if (Number.isNaN(ms)) return DAILY_THEMES[0];
  const dayIndex = Math.floor(ms / 86_400_000);
  return DAILY_THEMES[((dayIndex % DAILY_THEMES.length) + DAILY_THEMES.length) % DAILY_THEMES.length];
}

/**
 * Weekly theme for a week id ("2026_W33"). Deterministic for every player
 * in the same week; year folds in so week 33 doesn't repeat its theme every
 * year.
 */
export function getWeeklyTheme(weekId: string): SharedBoardTheme {
  const match = /^(\d{4})_W(\d{2})$/.exec(weekId);
  if (!match) return WEEKLY_THEMES[0];
  const year = Number(match[1]);
  const week = Number(match[2]);
  const index = (year * 53 + week) % WEEKLY_THEMES.length;
  return WEEKLY_THEMES[index];
}
