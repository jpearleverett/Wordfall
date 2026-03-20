import { WordAtlasPage, SeasonalAlbum, CollectionReward } from '../types';

// ── Word Atlas Pages ────────────────────────────────────────────────────────

export const ATLAS_PAGES: WordAtlasPage[] = [
  {
    id: 'animals',
    category: 'Animals',
    icon: '🐾',
    words: ['bear', 'wolf', 'hawk', 'deer', 'fox', 'lion', 'elk', 'lynx', 'hare', 'dove', 'swan', 'mole', 'otter', 'crane', 'eagle', 'raven', 'shark', 'whale', 'seal', 'crab'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'animal_lover' },
  },
  {
    id: 'food',
    category: 'Food & Drink',
    icon: '🍎',
    words: ['cake', 'bread', 'soup', 'rice', 'meat', 'fish', 'salt', 'herb', 'wine', 'brew', 'plum', 'pear', 'corn', 'bean', 'stew', 'roast', 'tart', 'pie', 'jam', 'ale'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'foodie' },
  },
  {
    id: 'weather',
    category: 'Weather',
    icon: '⛅',
    words: ['rain', 'snow', 'hail', 'fog', 'mist', 'wind', 'gust', 'storm', 'frost', 'sleet', 'cloud', 'heat', 'cold', 'dew', 'ice', 'gale', 'bolt', 'haze', 'warm', 'chill'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'weather_watcher' },
  },
  {
    id: 'home',
    category: 'Home & Living',
    icon: '🏠',
    words: ['door', 'wall', 'roof', 'lamp', 'desk', 'chair', 'bed', 'rug', 'shelf', 'tile', 'glass', 'brick', 'lock', 'key', 'room', 'hall', 'yard', 'fence', 'gate', 'shed'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'home_maker' },
  },
  {
    id: 'body',
    category: 'Human Body',
    icon: '🫀',
    words: ['bone', 'skin', 'vein', 'lung', 'hand', 'foot', 'knee', 'back', 'neck', 'eye', 'ear', 'jaw', 'rib', 'hip', 'arm', 'toe', 'lip', 'palm', 'shin', 'nail'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'anatomist' },
  },
  {
    id: 'colors',
    category: 'Colors & Light',
    icon: '🌈',
    words: ['red', 'blue', 'gold', 'pink', 'gray', 'tan', 'jade', 'ruby', 'hue', 'dye', 'tint', 'glow', 'beam', 'ray', 'dark', 'pale', 'dim', 'bold', 'rich', 'soft'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'colorist' },
  },
  {
    id: 'emotions',
    category: 'Emotions',
    icon: '💭',
    words: ['joy', 'fear', 'hope', 'love', 'calm', 'rage', 'awe', 'glee', 'dread', 'bliss', 'pride', 'shame', 'envy', 'zeal', 'woe', 'peace', 'grief', 'spite', 'trust', 'doubt'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'empath' },
  },
  {
    id: 'tools',
    category: 'Tools & Craft',
    icon: '🔧',
    words: ['saw', 'axe', 'nail', 'bolt', 'wire', 'rope', 'hook', 'drill', 'clamp', 'file', 'pin', 'screw', 'tape', 'glue', 'lathe', 'anvil', 'forge', 'mold', 'vice', 'gauge'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'craftsman' },
  },
  {
    id: 'music',
    category: 'Music',
    icon: '🎵',
    words: ['song', 'beat', 'note', 'tune', 'bass', 'drum', 'harp', 'horn', 'bell', 'pipe', 'reed', 'choir', 'hymn', 'jazz', 'rock', 'folk', 'soul', 'riff', 'tone', 'solo'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'musician' },
  },
  {
    id: 'travel',
    category: 'Travel',
    icon: '✈️',
    words: ['trip', 'road', 'path', 'rail', 'port', 'dock', 'pier', 'camp', 'hike', 'tour', 'trek', 'ride', 'sail', 'fly', 'roam', 'stay', 'inn', 'map', 'pack', 'gear'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'traveler' },
  },
  {
    id: 'space_atlas',
    category: 'Space',
    icon: '🚀',
    words: ['star', 'moon', 'mars', 'nova', 'orbit', 'comet', 'void', 'dark', 'ring', 'dust', 'core', 'flare', 'beam', 'pulse', 'warp', 'rift', 'dock', 'fuel', 'crew', 'hull'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'astronaut' },
  },
  {
    id: 'magic',
    category: 'Magic & Fantasy',
    icon: '✨',
    words: ['wand', 'spell', 'rune', 'orb', 'cloak', 'gem', 'charm', 'hex', 'ward', 'staff', 'tome', 'brew', 'vial', 'aura', 'elf', 'imp', 'fey', 'mage', 'sage', 'lore'],
    foundWords: [],
    reward: { coins: 500, gems: 10, hintTokens: 5, badge: 'wizard' },
  },
];

// ── Rare Tile Sets ──────────────────────────────────────────────────────────

export interface RareTileSet {
  theme: string;
  icon: string;
  description: string;
  letters: string[];
  completionReward: CollectionReward;
}

export const RARE_TILE_SETS: RareTileSet[] = [
  {
    theme: 'Golden Alphabet',
    icon: '🏆',
    description: 'Collect all 26 golden letter tiles.',
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    completionReward: { coins: 5000, gems: 100, hintTokens: 20, decoration: 'golden_shelf', badge: 'golden_collector' },
  },
  {
    theme: 'Vowel Masters',
    icon: '💎',
    description: 'Collect premium vowel tiles.',
    letters: ['A', 'E', 'I', 'O', 'U'],
    completionReward: { coins: 1000, gems: 25, hintTokens: 10, badge: 'vowel_master' },
  },
  {
    theme: 'Rare Consonants',
    icon: '🔮',
    description: 'Find the rarest consonant tiles.',
    letters: ['Q', 'X', 'Z', 'J', 'K'],
    completionReward: { coins: 2000, gems: 50, hintTokens: 15, decoration: 'crystal_display', badge: 'rare_finder' },
  },
  {
    theme: 'Nature Set',
    icon: '🌿',
    description: 'Tiles adorned with nature motifs.',
    letters: ['T', 'R', 'E', 'L', 'F', 'S', 'N'],
    completionReward: { coins: 1500, gems: 30, hintTokens: 10, decoration: 'nature_plaque' },
  },
  {
    theme: 'Fire Set',
    icon: '🔥',
    description: 'Blazing letter tiles.',
    letters: ['F', 'I', 'R', 'E', 'B', 'L', 'A', 'Z'],
    completionReward: { coins: 1500, gems: 30, hintTokens: 10, decoration: 'fire_sconce' },
  },
  {
    theme: 'Ocean Set',
    icon: '🌊',
    description: 'Tiles from the deep blue.',
    letters: ['W', 'A', 'V', 'E', 'S', 'H', 'L'],
    completionReward: { coins: 1500, gems: 30, hintTokens: 10, decoration: 'ocean_globe' },
  },
];

// ── Seasonal Albums ─────────────────────────────────────────────────────────

export const SEASONAL_ALBUMS: SeasonalAlbum[] = [
  {
    id: 'spring_2026',
    season: 'Spring',
    year: 2026,
    startDate: '2026-03-01',
    endDate: '2026-05-31',
    stamps: [
      { id: 'sp26_1', name: 'First Bloom', icon: '🌸', earned: false },
      { id: 'sp26_2', name: 'Spring Rain', icon: '🌧️', earned: false },
      { id: 'sp26_3', name: 'Garden Party', icon: '🌻', earned: false },
      { id: 'sp26_4', name: 'Butterfly', icon: '🦋', earned: false },
      { id: 'sp26_5', name: 'Green Thumb', icon: '🌱', earned: false },
      { id: 'sp26_6', name: 'Spring Streak', icon: '🔥', earned: false },
      { id: 'sp26_7', name: 'Nature Walk', icon: '🌿', earned: false },
      { id: 'sp26_8', name: 'Spring Master', icon: '🏆', earned: false },
    ],
  },
  {
    id: 'summer_2026',
    season: 'Summer',
    year: 2026,
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    stamps: [
      { id: 'su26_1', name: 'Sunshine', icon: '☀️', earned: false },
      { id: 'su26_2', name: 'Beach Day', icon: '🏖️', earned: false },
      { id: 'su26_3', name: 'Ocean Wave', icon: '🌊', earned: false },
      { id: 'su26_4', name: 'Ice Cream', icon: '🍦', earned: false },
      { id: 'su26_5', name: 'Stargazer', icon: '⭐', earned: false },
      { id: 'su26_6', name: 'Summer Heat', icon: '🔥', earned: false },
      { id: 'su26_7', name: 'Tropical', icon: '🌴', earned: false },
      { id: 'su26_8', name: 'Summer King', icon: '👑', earned: false },
    ],
  },
  {
    id: 'autumn_2026',
    season: 'Autumn',
    year: 2026,
    startDate: '2026-09-01',
    endDate: '2026-11-30',
    stamps: [
      { id: 'au26_1', name: 'Falling Leaf', icon: '🍂', earned: false },
      { id: 'au26_2', name: 'Harvest', icon: '🎃', earned: false },
      { id: 'au26_3', name: 'Cozy Night', icon: '🕯️', earned: false },
      { id: 'au26_4', name: 'Pumpkin Spice', icon: '☕', earned: false },
      { id: 'au26_5', name: 'Fog Walker', icon: '🌫️', earned: false },
      { id: 'au26_6', name: 'Autumn Wind', icon: '💨', earned: false },
      { id: 'au26_7', name: 'Golden Hour', icon: '🌅', earned: false },
      { id: 'au26_8', name: 'Autumn Legend', icon: '🏅', earned: false },
    ],
  },
  {
    id: 'winter_2026',
    season: 'Winter',
    year: 2026,
    startDate: '2026-12-01',
    endDate: '2027-02-28',
    stamps: [
      { id: 'wi26_1', name: 'First Snow', icon: '❄️', earned: false },
      { id: 'wi26_2', name: 'Warm Hearth', icon: '🔥', earned: false },
      { id: 'wi26_3', name: 'Gift Giver', icon: '🎁', earned: false },
      { id: 'wi26_4', name: 'Ice Crystal', icon: '💎', earned: false },
      { id: 'wi26_5', name: 'Snow Angel', icon: '👼', earned: false },
      { id: 'wi26_6', name: 'Midnight', icon: '🌙', earned: false },
      { id: 'wi26_7', name: 'Frost King', icon: '🧊', earned: false },
      { id: 'wi26_8', name: 'Winter Champion', icon: '🏆', earned: false },
    ],
  },
];

export function getCurrentSeasonAlbum(): SeasonalAlbum | undefined {
  const now = new Date().toISOString().split('T')[0];
  return SEASONAL_ALBUMS.find(
    (album) => now >= album.startDate && now <= album.endDate,
  );
}

export function getAtlasPage(id: string): WordAtlasPage | undefined {
  return ATLAS_PAGES.find((page) => page.id === id);
}
