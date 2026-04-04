import { CosmeticTheme, ProfileFrame, ProfileTitle, LibraryDecoration, CurrencyType } from '../types';

// ── Color Themes ────────────────────────────────────────────────────────────

export const COSMETIC_THEMES: CosmeticTheme[] = [
  {
    id: 'default',
    name: 'Outrun Classic',
    description: 'The signature synthwave palette — hot pink, cyan, and purple neon.',
    colors: { bg: '#0a0015', surface: '#1a0a2e', accent: '#ff2d95', cellDefault: '#2a1548', cellSelected: '#ff2d95' },
    owned: true,
    equipped: true,
  },
  {
    id: 'midnight_chrome',
    name: 'Midnight Chrome',
    description: 'Silver and ice blue — a chrome-heavy synthwave variant.',
    colors: { bg: '#080810', surface: '#12121e', accent: '#d4e0f7', cellDefault: '#1a1a2e', cellSelected: '#8a9ab5' },
    cost: { currency: 'gems', amount: 50 },
    owned: false,
    equipped: false,
  },
  {
    id: 'sunset_boulevard',
    name: 'Sunset Boulevard',
    description: 'Warm orange and magenta — the golden hour of synthwave.',
    colors: { bg: '#1a0808', surface: '#2a1210', accent: '#ff6b35', cellDefault: '#3a1a14', cellSelected: '#ff9f43' },
    cost: { currency: 'gems', amount: 50 },
    owned: false,
    equipped: false,
  },
  {
    id: 'digital_ocean',
    name: 'Digital Ocean',
    description: 'Teal and deep blue — ocean waves under neon moonlight.',
    colors: { bg: '#040a12', surface: '#0a1520', accent: '#00f5d4', cellDefault: '#0f2030', cellSelected: '#00e5ff' },
    cost: { currency: 'gems', amount: 75 },
    owned: false,
    equipped: false,
  },
  {
    id: 'neon_tokyo',
    name: 'Neon Tokyo',
    description: 'Red and white neon — rain-soaked streets of a cyberpunk city.',
    colors: { bg: '#0a0008', surface: '#1a0a14', accent: '#ff1744', cellDefault: '#2a1018', cellSelected: '#ff4081' },
    cost: { currency: 'gems', amount: 100 },
    owned: false,
    equipped: false,
  },
  {
    id: 'midnight_blue',
    name: 'Midnight Blue',
    description: 'A calming deep blue palette.',
    colors: { bg: '#0d1b2a', surface: '#1b263b', accent: '#5c9ead', cellDefault: '#2d3a4a', cellSelected: '#5c9ead' },
    cost: { currency: 'coins', amount: 1000 },
    owned: false,
    equipped: false,
  },
  {
    id: 'forest_dark',
    name: 'Enchanted Forest',
    description: 'Deep greens of the mystical woods.',
    colors: { bg: '#0b1a0f', surface: '#1a2e1f', accent: '#4caf50', cellDefault: '#2a4030', cellSelected: '#4caf50' },
    cost: { currency: 'coins', amount: 1500 },
    owned: false,
    equipped: false,
  },
  {
    id: 'volcanic',
    name: 'Volcanic',
    description: 'Fiery reds against dark stone.',
    colors: { bg: '#1a0a0a', surface: '#2a1515', accent: '#ff6b6b', cellDefault: '#3a2020', cellSelected: '#ff6b6b' },
    cost: { currency: 'coins', amount: 1500 },
    owned: false,
    equipped: false,
  },
  {
    id: 'royal_purple',
    name: 'Royal Purple',
    description: 'Regal purple for word royalty.',
    colors: { bg: '#120a1e', surface: '#1e1535', accent: '#a855f7', cellDefault: '#2a2040', cellSelected: '#a855f7' },
    cost: { currency: 'coins', amount: 2000 },
    owned: false,
    equipped: false,
  },
  {
    id: 'golden_age',
    name: 'Golden Age',
    description: 'Luxurious gold on warm dark tones.',
    colors: { bg: '#1a1508', surface: '#2a2210', accent: '#ffd700', cellDefault: '#3a3018', cellSelected: '#ffd700' },
    cost: { currency: 'gems', amount: 50 },
    owned: false,
    equipped: false,
  },
  {
    id: 'ocean_depths',
    name: 'Ocean Depths',
    description: 'Deep sea blues and teals.',
    colors: { bg: '#0a1520', surface: '#152535', accent: '#2ed8a3', cellDefault: '#1a3040', cellSelected: '#2ed8a3' },
    cost: { currency: 'coins', amount: 2000 },
    owned: false,
    equipped: false,
  },
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    description: 'Northern lights dancing across the sky.',
    colors: { bg: '#0a0e1a', surface: '#151a2e', accent: '#00ffaa', cellDefault: '#1a2538', cellSelected: '#00ffaa' },
    cost: { currency: 'gems', amount: 75 },
    owned: false,
    equipped: false,
  },
  {
    id: 'sakura',
    name: 'Cherry Blossom',
    description: 'Soft pinks inspired by sakura season.',
    colors: { bg: '#1a0f14', surface: '#2a1a22', accent: '#ff9ecd', cellDefault: '#3a2530', cellSelected: '#ff9ecd' },
    cost: { currency: 'gems', amount: 75 },
    owned: false,
    equipped: false,
  },
  {
    id: 'neon_city',
    name: 'Neon City',
    description: 'Cyberpunk neon against dark streets.',
    colors: { bg: '#0a0a14', surface: '#14142a', accent: '#ff00ff', cellDefault: '#1e1e38', cellSelected: '#ff00ff' },
    cost: { currency: 'gems', amount: 100 },
    owned: false,
    equipped: false,
  },
  {
    id: 'arctic',
    name: 'Arctic Frost',
    description: 'Cool icy blues of the frozen north.',
    colors: { bg: '#0a1218', surface: '#151e28', accent: '#b9f2ff', cellDefault: '#1a2a35', cellSelected: '#b9f2ff' },
    cost: { currency: 'coins', amount: 2500 },
    owned: false,
    equipped: false,
  },
  {
    id: 'sunset',
    name: 'Desert Sunset',
    description: 'Warm oranges fading into twilight.',
    colors: { bg: '#1a100a', surface: '#2a1a10', accent: '#ff9f43', cellDefault: '#3a2818', cellSelected: '#ff9f43' },
    cost: { currency: 'coins', amount: 2500 },
    owned: false,
    equipped: false,
  },
  // New coin-purchasable themes
  {
    id: 'cherry_blossom',
    name: 'Cherry Blossom',
    description: 'Delicate pinks and whites of spring blossoms in full bloom.',
    colors: { bg: '#1a0a10', surface: '#2a1520', accent: '#ffb7d5', cellDefault: '#3a2030', cellSelected: '#ffb7d5' },
    cost: { currency: 'coins', amount: 2000 },
    owned: false,
    equipped: false,
  },
  {
    id: 'deep_space',
    name: 'Deep Space',
    description: 'The vast darkness between galaxies, lit by distant nebulae.',
    colors: { bg: '#020208', surface: '#0a0a1e', accent: '#7b68ee', cellDefault: '#141428', cellSelected: '#7b68ee' },
    cost: { currency: 'coins', amount: 4000 },
    owned: false,
    equipped: false,
  },
  {
    id: 'underwater',
    name: 'Underwater',
    description: 'Sunlight filtering through deep ocean waters.',
    colors: { bg: '#040e14', surface: '#0a1e28', accent: '#00bcd4', cellDefault: '#102a38', cellSelected: '#00bcd4' },
    cost: { currency: 'coins', amount: 4000 },
    owned: false,
    equipped: false,
  },
  {
    id: 'volcanic_eruption',
    name: 'Volcanic',
    description: 'Molten lava flowing through cracks of cooled obsidian.',
    colors: { bg: '#120404', surface: '#1e0a0a', accent: '#ff4500', cellDefault: '#2e1212', cellSelected: '#ff4500' },
    cost: { currency: 'coins', amount: 6000 },
    owned: false,
    equipped: false,
  },
  {
    id: 'holographic',
    name: 'Holographic',
    description: 'Iridescent rainbow shimmer across a dark chrome surface.',
    colors: { bg: '#0a0a10', surface: '#14142a', accent: '#e0c3fc', cellDefault: '#1e1e38', cellSelected: '#e0c3fc' },
    cost: { currency: 'coins', amount: 8000 },
    owned: false,
    equipped: false,
  },
];

// ── Profile Frames ──────────────────────────────────────────────────────────

export const PROFILE_FRAMES: ProfileFrame[] = [
  { id: 'default', name: 'Basic', rarity: 'common', source: 'Default', owned: true },
  { id: 'bronze_ring', name: 'Bronze Ring', rarity: 'common', source: 'Complete 10 puzzles', owned: false },
  { id: 'silver_ring', name: 'Silver Ring', rarity: 'common', source: 'Complete 50 puzzles', owned: false },
  { id: 'gold_ring', name: 'Gold Ring', rarity: 'rare', source: 'Complete 100 puzzles', owned: false },
  { id: 'diamond_ring', name: 'Diamond Ring', rarity: 'epic', source: 'Complete 500 puzzles', owned: false },
  { id: 'nature_frame', name: 'Verdant Vines', rarity: 'rare', source: 'Complete Nature wing', owned: false },
  { id: 'science_frame', name: 'Lab Tech', rarity: 'rare', source: 'Complete Science wing', owned: false },
  { id: 'ocean_frame', name: 'Coral Crown', rarity: 'rare', source: 'Complete Ocean wing', owned: false },
  { id: 'fire_frame', name: 'Flame Border', rarity: 'epic', source: 'Complete Elements wing', owned: false },
  { id: 'space_frame', name: 'Cosmic Ring', rarity: 'epic', source: 'Complete Space wing', owned: false },
  { id: 'streak_30_frame', name: 'Streak Warrior', rarity: 'epic', source: '30-day streak', owned: false },
  { id: 'perfect_frame', name: 'Flawless', rarity: 'epic', source: '50 perfect solves', owned: false },
  { id: 'legend_frame', name: 'Legend', rarity: 'legendary', source: 'Complete all chapters', owned: false },
  { id: 'season_champion_frame', name: 'Season Champion', rarity: 'legendary', source: 'Win Season Finale event', owned: false },
  { id: 'golden_collector_frame', name: 'Golden Collector', rarity: 'legendary', source: 'Complete Golden Alphabet', owned: false },
  // Coin-purchasable frames
  { id: 'starlight_frame', name: 'Starlight', rarity: 'rare', source: 'Cosmetic Store', owned: false, cost: { currency: 'coins', amount: 1500 } },
  { id: 'inferno_frame', name: 'Inferno', rarity: 'epic', source: 'Cosmetic Store', owned: false, cost: { currency: 'coins', amount: 3000 } },
  { id: 'aurora_borealis_frame', name: 'Aurora Borealis', rarity: 'legendary', source: 'Cosmetic Store', owned: false, cost: { currency: 'coins', amount: 5000 } },
  { id: 'crystal_frame', name: 'Crystal', rarity: 'rare', source: 'Cosmetic Store', owned: false, cost: { currency: 'coins', amount: 1500 } },
  { id: 'obsidian_frame', name: 'Obsidian', rarity: 'epic', source: 'Cosmetic Store', owned: false, cost: { currency: 'coins', amount: 3000 } },
  { id: 'rainbow_prismatic_frame', name: 'Rainbow Prismatic', rarity: 'legendary', source: 'Cosmetic Store', owned: false, cost: { currency: 'coins', amount: 5000 } },
  { id: 'steampunk_gears_frame', name: 'Steampunk Gears', rarity: 'rare', source: 'Cosmetic Store', owned: false, cost: { currency: 'coins', amount: 1500 } },
  { id: 'digital_matrix_frame', name: 'Digital Matrix', rarity: 'epic', source: 'Cosmetic Store', owned: false, cost: { currency: 'coins', amount: 3000 } },
  { id: 'golden_crown_frame', name: 'Golden Crown', rarity: 'legendary', source: 'Cosmetic Store', owned: false, cost: { coins: 5000, gems: 50 } },
  { id: 'celestial_halo_frame', name: 'Celestial Halo', rarity: 'legendary', source: 'Cosmetic Store', owned: false, cost: { coins: 5000, gems: 100 } },
];

// ── Profile Titles ──────────────────────────────────────────────────────────

export const PROFILE_TITLES: ProfileTitle[] = [
  { id: 'title_newcomer', title: 'Newcomer', source: 'Default', owned: true },
  { id: 'title_word_finder', title: 'Word Finder', source: 'Find 100 words', owned: false },
  { id: 'title_puzzle_solver', title: 'Puzzle Solver', source: 'Complete 25 puzzles', owned: false },
  { id: 'title_streak_keeper', title: 'Streak Keeper', source: '7-day streak', owned: false },
  { id: 'title_combo_king', title: 'Combo King', source: 'Achieve 10x combo', owned: false },
  { id: 'title_speed_demon', title: 'Speed Demon', source: 'Complete Time Pressure under 30s', owned: false },
  { id: 'title_perfectionist', title: 'Perfectionist', source: '10 perfect solves', owned: false },
  { id: 'title_scholar', title: 'Scholar', source: 'Complete 3 atlas pages', owned: false },
  { id: 'title_collector', title: 'Collector', source: 'Collect 50 rare tiles', owned: false },
  { id: 'title_explorer', title: 'Explorer', source: 'Play all 10 modes', owned: false },
  { id: 'title_librarian', title: 'Librarian', source: 'Restore 4 library wings', owned: false },
  { id: 'title_champion', title: 'Champion', source: 'Reach Gold tier in events', owned: false },
  { id: 'title_veteran', title: 'Veteran', source: 'Play for 30 days', owned: false },
  { id: 'title_cascade_master', title: 'Cascade Master', source: '20x cascade multiplier', owned: false },
  { id: 'title_word_sage', title: 'Word Sage', source: 'Find 1000 words', owned: false },
  { id: 'streak_60_title', title: 'Dedicated', source: '60-day streak', owned: false },
  { id: 'title_grandmaster', title: 'Grandmaster', source: 'Complete all 40 chapters', owned: false },
  { id: 'title_legend', title: 'Legend', source: '100-day streak + all wings', owned: false },
  // New unlock-based titles
  { id: 'title_the_unstoppable', title: 'The Unstoppable', source: '10-win streak', owned: false },
  { id: 'title_word_wizard', title: 'Word Wizard', source: 'Find 200 words', owned: false },
  { id: 'title_chain_lightning', title: 'Chain Lightning', source: 'Achieve 10x combo', owned: false },
  { id: 'title_the_scholar', title: 'The Scholar', source: 'Complete all library wings', owned: false },
  { id: 'title_speed_demon_50', title: 'Speed Demon', source: 'Complete 50 timed puzzles', owned: false },
  { id: 'title_gem_collector', title: 'Gem Collector', source: 'Spend 500 gems', owned: false },
  { id: 'title_the_generous', title: 'The Generous', source: 'Send 50 gifts', owned: false },
  { id: 'title_night_owl', title: 'Night Owl', source: 'Play 100 puzzles after 10pm', owned: false },
];

// ── Library Decorations ─────────────────────────────────────────────────────

export const LIBRARY_DECORATIONS: LibraryDecoration[] = [
  // Furniture
  { id: 'reading_chair', name: 'Reading Chair', description: 'A cozy chair for word contemplation.', icon: '🪑', type: 'furniture', rarity: 'common', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 50 } },
  { id: 'oak_desk', name: 'Oak Writing Desk', description: 'A sturdy desk for your word discoveries.', icon: '🪵', type: 'furniture', rarity: 'common', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 75 } },
  { id: 'antique_table', name: 'Antique Table', description: 'An elegant table from a bygone era.', icon: '🏛️', type: 'furniture', rarity: 'rare', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 150 } },
  { id: 'throne_chair', name: 'Word Throne', description: 'Sit upon the throne of words.', icon: '👑', type: 'furniture', rarity: 'epic', owned: false, equipped: false, cost: { currency: 'gems', amount: 50 } },
  { id: 'crystal_desk', name: 'Crystal Desk', description: 'A desk carved from pure crystal.', icon: '💎', type: 'furniture', rarity: 'legendary', owned: false, equipped: false, cost: { currency: 'gems', amount: 100 } },

  // Lighting
  { id: 'candle', name: 'Candle', description: 'A warm flickering candle.', icon: '🕯️', type: 'lighting', rarity: 'common', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 30 } },
  { id: 'lantern', name: 'Paper Lantern', description: 'Soft light from an eastern lantern.', icon: '🏮', type: 'lighting', rarity: 'common', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 40 } },
  { id: 'chandelier', name: 'Chandelier', description: 'A grand chandelier that illuminates the wing.', icon: '✨', type: 'lighting', rarity: 'rare', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 120 } },
  { id: 'fireplace', name: 'Fireplace', description: 'A roaring fireplace for cozy reading.', icon: '🔥', type: 'lighting', rarity: 'epic', owned: false, equipped: false, cost: { currency: 'gems', amount: 40 } },
  { id: 'aurora_lamp', name: 'Aurora Lamp', description: 'Projects northern lights onto the ceiling.', icon: '🌌', type: 'lighting', rarity: 'legendary', owned: false, equipped: false, cost: { currency: 'gems', amount: 80 } },

  // Ornaments
  { id: 'globe', name: 'World Globe', description: 'A spinning globe of word knowledge.', icon: '🌍', type: 'ornament', rarity: 'common', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 60 } },
  { id: 'telescope', name: 'Telescope', description: 'Gaze into the universe of words.', icon: '🔭', type: 'ornament', rarity: 'rare', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 100 } },
  { id: 'hourglass', name: 'Hourglass', description: 'Time flows like letters falling.', icon: '⏳', type: 'ornament', rarity: 'rare', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 100 } },
  { id: 'golden_shelf', name: 'Golden Bookshelf', description: 'A shelf of pure gold for your finest tomes.', icon: '🏆', type: 'ornament', rarity: 'legendary', owned: false, equipped: false },
  { id: 'crystal_display', name: 'Crystal Display Case', description: 'Show off rare letter tiles.', icon: '🔮', type: 'ornament', rarity: 'epic', owned: false, equipped: false },

  // Books
  { id: 'nature_tome', name: 'Tome of Nature', description: 'A beautifully illustrated nature book.', icon: '🌿', type: 'book', rarity: 'common', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 40 } },
  { id: 'science_journal', name: 'Science Journal', description: 'Groundbreaking discoveries inside.', icon: '🔬', type: 'book', rarity: 'common', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 40 } },
  { id: 'myth_codex', name: 'Codex of Myths', description: 'Ancient legends compiled in one volume.', icon: '⚡', type: 'book', rarity: 'rare', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 80 } },
  { id: 'ocean_atlas', name: 'Ocean Atlas', description: 'Charts of every sea and ocean.', icon: '🌊', type: 'book', rarity: 'rare', owned: false, equipped: false, cost: { currency: 'libraryPoints', amount: 80 } },
  { id: 'forbidden_book', name: 'Forbidden Book', description: 'Its contents are known only to masters.', icon: '📕', type: 'book', rarity: 'legendary', owned: false, equipped: false },

  // Event rewards (no cost - earned through events)
  { id: 'speed_trophy', name: 'Speed Trophy', description: 'Awarded to the fastest solvers.', icon: '⚡', type: 'ornament', rarity: 'epic', owned: false, equipped: false },
  { id: 'diamond_plaque', name: 'Diamond Plaque', description: 'For achieving perfection.', icon: '💎', type: 'ornament', rarity: 'legendary', owned: false, equipped: false },
  { id: 'rally_banner', name: 'Rally Banner', description: 'Your club\'s rallying symbol.', icon: '🚩', type: 'ornament', rarity: 'epic', owned: false, equipped: false },
  { id: 'cascade_crystal', name: 'Cascade Crystal', description: 'Glows brighter with each chain.', icon: '🔥', type: 'ornament', rarity: 'epic', owned: false, equipped: false },
  { id: 'mystery_orb', name: 'Mystery Orb', description: 'Swirling with unknown words.', icon: '🔮', type: 'ornament', rarity: 'epic', owned: false, equipped: false },
  { id: 'retro_arcade', name: 'Retro Arcade Cabinet', description: 'A blast from the past.', icon: '🕹️', type: 'ornament', rarity: 'epic', owned: false, equipped: false },
  { id: 'nature_painting', name: 'Nature Painting', description: 'A serene landscape painting.', icon: '🖼️', type: 'ornament', rarity: 'rare', owned: false, equipped: false },
  { id: 'lab_equipment', name: 'Lab Equipment', description: 'Bubbling beakers and test tubes.', icon: '🧪', type: 'ornament', rarity: 'rare', owned: false, equipped: false },
  { id: 'ship_wheel', name: 'Ship\'s Wheel', description: 'Navigate the seas of knowledge.', icon: '⚓', type: 'ornament', rarity: 'rare', owned: false, equipped: false },
  { id: 'gauntlet_shield', name: 'Gauntlet Shield', description: 'Survived the Expert Gauntlet.', icon: '🛡️', type: 'ornament', rarity: 'legendary', owned: false, equipped: false },
  { id: 'community_statue', name: 'Community Statue', description: 'A monument to collective achievement.', icon: '🗽', type: 'ornament', rarity: 'legendary', owned: false, equipped: false },
  { id: 'season_throne', name: 'Season Throne', description: 'The ultimate seasonal reward.', icon: '👑', type: 'ornament', rarity: 'legendary', owned: false, equipped: false },
  { id: 'fire_sconce', name: 'Fire Sconce', description: 'Eternal flames light the way.', icon: '🔥', type: 'lighting', rarity: 'epic', owned: false, equipped: false },
  { id: 'ocean_globe', name: 'Ocean Globe', description: 'A miniature ocean in a sphere.', icon: '🌊', type: 'ornament', rarity: 'epic', owned: false, equipped: false },
  { id: 'nature_plaque', name: 'Nature Plaque', description: 'Carved from ancient oak.', icon: '🌳', type: 'ornament', rarity: 'rare', owned: false, equipped: false },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getTheme(id: string): CosmeticTheme | undefined {
  return COSMETIC_THEMES.find((t) => t.id === id);
}

export function getFrame(id: string): ProfileFrame | undefined {
  return PROFILE_FRAMES.find((f) => f.id === id);
}

export function getTitle(id: string): ProfileTitle | undefined {
  return PROFILE_TITLES.find((t) => t.id === id);
}

export function getDecoration(id: string): LibraryDecoration | undefined {
  return LIBRARY_DECORATIONS.find((d) => d.id === id);
}

export function getDecorationsByType(type: LibraryDecoration['type']): LibraryDecoration[] {
  return LIBRARY_DECORATIONS.filter((d) => d.type === type);
}

export function getDecorationsByRarity(rarity: LibraryDecoration['rarity']): LibraryDecoration[] {
  return LIBRARY_DECORATIONS.filter((d) => d.rarity === rarity);
}
