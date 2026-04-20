import { CosmeticTheme, ProfileFrame, ProfileTitle, LibraryDecoration, CurrencyType, CosmeticBonuses } from '../types';
import { ECONOMY, STAR_MILESTONES } from '../constants';
import { EVENT_TEMPLATES } from './events';
import { GRAND_CHALLENGES } from './grandChallenges';
import { PRESTIGE_LEVELS } from './prestigeSystem';
import { REFERRAL_MILESTONES } from './referralSystem';
import { SEASON_PASS_TIERS } from './seasonPass';
import { SEASONAL_QUESTS } from './seasonalQuests';
import { SEASONAL_WHEELS } from './seasonalWheels';
import { VIP_STREAK_BONUSES } from './vipBenefits';

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
  // ── Exclusive Rotating Shop themes (purchased with gems via rotating shop) ──
  {
    id: 'theme_aurora',
    name: 'Aurora Borealis (Exclusive)',
    description: 'Northern lights shimmer across every tile — exclusive rotating shop variant.',
    colors: { bg: '#0a0e1a', surface: '#151a2e', accent: '#00ffaa', cellDefault: '#1a2538', cellSelected: '#00ffaa' },
    cost: { currency: 'gems', amount: 200 },
    owned: false,
    equipped: false,
  },
  {
    id: 'theme_neon_city',
    name: 'Neon City (Exclusive)',
    description: 'Cyberpunk glow on every surface — exclusive rotating shop variant.',
    colors: { bg: '#0a0a14', surface: '#14142a', accent: '#ff00ff', cellDefault: '#1e1e38', cellSelected: '#ff00ff' },
    cost: { currency: 'gems', amount: 120 },
    owned: false,
    equipped: false,
  },
  {
    id: 'theme_sakura',
    name: 'Sakura Bloom (Exclusive)',
    description: 'Petals drift across a warm twilight — exclusive rotating shop variant.',
    colors: { bg: '#1a0f14', surface: '#2a1a22', accent: '#ff9ecd', cellDefault: '#3a2530', cellSelected: '#ff9ecd' },
    cost: { currency: 'gems', amount: 130 },
    owned: false,
    equipped: false,
  },
  // ── Bundle-exclusive themes (IAP purchases) ──
  {
    id: 'theme_whale_exclusive',
    name: 'Whale Exclusive',
    description: 'A deep ocean palette reserved for the most dedicated supporters.',
    colors: { bg: '#0a0a1e', surface: '#141432', accent: '#00d4ff', cellDefault: '#1e1e46', cellSelected: '#00d4ff' },
    owned: false,
    equipped: false,
  },
  {
    id: 'theme_legendary_neon',
    name: 'Legendary Neon',
    description: 'Blazing neon legends — an ultimate reward for true collectors.',
    colors: { bg: '#0a0014', surface: '#1a0a28', accent: '#ff00e5', cellDefault: '#2a1438', cellSelected: '#ff00e5' },
    owned: false,
    equipped: false,
  },
];

// ── Profile Frames ──────────────────────────────────────────────────────────

const BASE_PROFILE_FRAMES: ProfileFrame[] = [
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
  // ── Exclusive Rotating Shop frames ──
  { id: 'frame_celestial', name: 'Celestial', rarity: 'epic', source: 'Exclusive Rotating Shop', owned: false },
  { id: 'frame_dragonscale', name: 'Dragonscale', rarity: 'legendary', source: 'Exclusive Rotating Shop', owned: false },
  { id: 'frame_frozen_ivy', name: 'Frozen Ivy', rarity: 'rare', source: 'Exclusive Rotating Shop', owned: false },
  // ── Bundle-exclusive frames (IAP purchases) ──
  { id: 'frame_champion_exclusive', name: 'Champion', rarity: 'legendary', source: 'Champion Pack', owned: false },
  { id: 'frame_royal_legendary', name: 'Royal', rarity: 'legendary', source: 'Royal Collection', owned: false },
  { id: 'frame_whale_legendary', name: 'Whale', rarity: 'legendary', source: 'Ultimate Whale Pack', owned: false },
  { id: 'frame_whale_diamond', name: 'Whale Diamond', rarity: 'legendary', source: 'Ultimate Whale Pack', owned: false },
  { id: 'frame_event_exclusive', name: 'Event Exclusive', rarity: 'epic', source: 'Event Special', owned: false },
  { id: 'frame_season_exclusive', name: 'Season Exclusive', rarity: 'legendary', source: 'Season Pass Bundle', owned: false },
  { id: 'frame_super_bundle', name: 'Super Bundle', rarity: 'epic', source: 'Super Bundle', owned: false },
  { id: 'frame_diamond_epic', name: 'Diamond', rarity: 'epic', source: 'Diamond Collection', owned: false },
  { id: 'frame_diamond_legendary', name: 'Diamond Elite', rarity: 'legendary', source: 'Diamond Collection', owned: false },
  { id: 'frame_platinum_epic', name: 'Platinum', rarity: 'epic', source: 'Platinum Pack', owned: false },
  { id: 'frame_platinum_legendary', name: 'Platinum Elite', rarity: 'legendary', source: 'Platinum Pack', owned: false },
  { id: 'frame_platinum_mythic', name: 'Platinum Mythic', rarity: 'legendary', source: 'Platinum Pack', owned: false },
  { id: 'frame_vip_exclusive', name: 'VIP Exclusive', rarity: 'epic', source: 'VIP Weekly', owned: false },
  { id: 'frame_gold_mega', name: 'Gold Mega', rarity: 'epic', source: 'Gold Mega Bundle', owned: false },
  { id: 'frame_diamond_mega', name: 'Diamond Mega', rarity: 'legendary', source: 'Diamond Mega Bundle', owned: false },
  { id: 'frame_legendary_ultimate', name: 'Ultimate Legend', rarity: 'legendary', source: 'Ultimate Bundle', owned: false },
];

// ── Profile Titles ──────────────────────────────────────────────────────────

const BASE_PROFILE_TITLES: ProfileTitle[] = [
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
  // ── Exclusive Rotating Shop titles ──
  { id: 'title_wordsmith', title: 'Grand Wordsmith', source: 'Exclusive Rotating Shop', owned: false },
  // ── Bundle-exclusive titles (IAP purchases) ──
  { id: 'title_royal_collector', title: 'Royal Collector', source: 'Royal Collection', owned: false },
  { id: 'title_whale_supreme', title: 'Whale Supreme', source: 'Ultimate Whale Pack', owned: false },
  { id: 'title_season_champion', title: 'Season Champion', source: 'Season Pass Bundle', owned: false },
  { id: 'title_diamond_collector', title: 'Diamond Collector', source: 'Diamond Collection', owned: false },
  { id: 'title_platinum_elite', title: 'Platinum Elite', source: 'Platinum Pack', owned: false },
  { id: 'title_platinum_supreme', title: 'Platinum Supreme', source: 'Platinum Pack', owned: false },
  { id: 'title_ultimate_solver', title: 'Ultimate Solver', source: 'Ultimate Bundle', owned: false },
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

  // Bundle-exclusive decorations (IAP purchases)
  { id: 'starter_bookend', name: 'Starter Bookend', description: 'A commemorative bookend for early supporters.', icon: '📚', type: 'ornament', rarity: 'rare', owned: false, equipped: false },
  { id: 'chapter_decoration', name: 'Chapter Decoration', description: 'A decorative chapter marker for your library.', icon: '🔖', type: 'ornament', rarity: 'rare', owned: false, equipped: false },
  { id: 'decoration_whale_trophy', name: 'Whale Trophy', description: 'A legendary trophy for the most dedicated supporters.', icon: '🐋', type: 'ornament', rarity: 'legendary', owned: false, equipped: false },
  { id: 'decoration_platinum_exclusive', name: 'Platinum Display', description: 'An exclusive platinum display case.', icon: '🏆', type: 'ornament', rarity: 'legendary', owned: false, equipped: false },
];

type FrameSeed = Omit<ProfileFrame, 'owned'> & { owned?: boolean };
type TitleSeed = Omit<ProfileTitle, 'owned'> & { owned?: boolean };

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function titleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.toUpperCase() === 'VIP') return 'VIP';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function humanizeCosmeticId(id: string): string {
  return titleCase(
    id
      .replace(/^(frame|title|theme|set|deco)_/, '')
      .replace(/_/g, ' ')
      .trim(),
  );
}

function inferCosmeticKind(id?: string): 'frame' | 'title' | null {
  if (!id) return null;
  if (id.startsWith('title_') || id.endsWith('_title') || id === 'vip_champion' || id === 'gauntlet_survivor' || id === 'blitz_warrior') {
    return 'title';
  }
  if (
    id.startsWith('frame_') ||
    id.endsWith('_frame') ||
    id === 'streak_30_frame' ||
    id === 'season_champion_frame' ||
    id === 'cosmic_frame' ||
    id === 'vip_silver' ||
    id === 'vip_gold' ||
    id === 'frame_speed'
  ) {
    return 'frame';
  }
  return null;
}

function inferFrameRarity(index: number): ProfileFrame['rarity'] {
  if (index >= 25) return 'legendary';
  if (index >= 12) return 'epic';
  if (index >= 5) return 'rare';
  return 'common';
}

function inferTitleRaritySource(source: string): string {
  return source;
}

function frameSeed(id: string, name: string, rarity: ProfileFrame['rarity'], source: string): FrameSeed {
  return {
    id,
    name,
    rarity,
    source,
    owned: false,
  };
}

function titleSeed(id: string, title: string, source: string): TitleSeed {
  return {
    id,
    title,
    source: inferTitleRaritySource(source),
    owned: false,
  };
}

const EVENT_FRAME_SEEDS: FrameSeed[] = EVENT_TEMPLATES
  .filter((event) => event.exclusiveReward?.type === 'frame')
  .map((event) =>
    frameSeed(
      event.exclusiveReward!.id,
      event.exclusiveReward!.name,
      event.exclusiveReward!.rarity,
      `${event.name} event`,
    ),
  );

const EVENT_TITLE_SEEDS: TitleSeed[] = EVENT_TEMPLATES
  .filter((event) => event.exclusiveReward?.type === 'title')
  .map((event) =>
    titleSeed(
      event.exclusiveReward!.id,
      event.exclusiveReward!.name,
      `${event.name} event`,
    ),
  );

const PRESTIGE_FRAME_SEEDS: FrameSeed[] = PRESTIGE_LEVELS
  .filter((level) => level.cosmeticReward.type === 'frame')
  .map((level, index) =>
    frameSeed(
      level.cosmeticReward.id,
      `${level.label} Frame`,
      inferFrameRarity(index + 1),
      `${level.label} prestige reward`,
    ),
  );

const PRESTIGE_TITLE_SEEDS: TitleSeed[] = PRESTIGE_LEVELS
  .filter((level) => level.cosmeticReward.type === 'title')
  .map((level) =>
    titleSeed(
      level.cosmeticReward.id,
      humanizeCosmeticId(level.cosmeticReward.id),
      `${level.label} prestige reward`,
    ),
  );

const REFERRAL_FRAME_SEEDS: FrameSeed[] = REFERRAL_MILESTONES
  .filter((milestone) => milestone.rewards.cosmeticType === 'frame' && milestone.rewards.cosmeticId)
  .map((milestone, index) =>
    frameSeed(
      milestone.rewards.cosmeticId!,
      milestone.label,
      inferFrameRarity(index + 5),
      `${milestone.count} referrals`,
    ),
  );

const REFERRAL_TITLE_SEEDS: TitleSeed[] = REFERRAL_MILESTONES
  .filter((milestone) => milestone.rewards.cosmeticType === 'title' && milestone.rewards.cosmeticId)
  .map((milestone) =>
    titleSeed(
      milestone.rewards.cosmeticId!,
      milestone.label,
      `${milestone.count} referrals`,
    ),
  );

const VIP_FRAME_SEEDS: FrameSeed[] = VIP_STREAK_BONUSES
  .filter((bonus) => bonus.extraReward?.type === 'frame' && bonus.extraReward.id)
  .map((bonus, index) =>
    frameSeed(
      bonus.extraReward!.id!,
      bonus.label,
      inferFrameRarity(index + 7),
      `${bonus.weeksRequired}-week VIP streak`,
    ),
  );

const VIP_TITLE_SEEDS: TitleSeed[] = VIP_STREAK_BONUSES
  .filter((bonus) => bonus.extraReward?.type === 'title' && bonus.extraReward.id)
  .map((bonus) =>
    titleSeed(
      bonus.extraReward!.id!,
      bonus.label,
      `${bonus.weeksRequired}-week VIP streak`,
    ),
  );

const QUEST_FRAME_SEEDS: FrameSeed[] = SEASONAL_QUESTS
  .filter((quest) => quest.finalReward.cosmetic?.type === 'frame' && quest.finalReward.cosmetic.id)
  .map((quest, index) =>
    frameSeed(
      quest.finalReward.cosmetic!.id,
      humanizeCosmeticId(quest.finalReward.cosmetic!.id),
      inferFrameRarity(index + 9),
      `${quest.name} seasonal quest`,
    ),
  );

const GRAND_CHALLENGE_FRAME_SEEDS: FrameSeed[] = GRAND_CHALLENGES
  .filter((challenge) => inferCosmeticKind(challenge.reward.cosmetic) === 'frame')
  .map((challenge) =>
    frameSeed(
      challenge.reward.cosmetic!,
      challenge.name,
      challenge.difficulty === 'legendary' ? 'legendary' : challenge.difficulty === 'hard' ? 'epic' : 'rare',
      challenge.name,
    ),
  );

const GRAND_CHALLENGE_TITLE_SEEDS: TitleSeed[] = GRAND_CHALLENGES
  .filter((challenge) => inferCosmeticKind(challenge.reward.cosmetic) === 'title')
  .map((challenge) =>
    titleSeed(
      challenge.reward.cosmetic!,
      challenge.name,
      challenge.name,
    ),
  );

const SEASON_PASS_FRAME_SEEDS: FrameSeed[] = SEASON_PASS_TIERS
  .filter((tier) => inferCosmeticKind(tier.premiumReward.cosmeticId) === 'frame')
  .map((tier) =>
    frameSeed(
      tier.premiumReward.cosmeticId!,
      tier.premiumReward.label.replace(/\s*Frame$/i, ''),
      tier.level >= 40 ? 'legendary' : tier.level >= 20 ? 'epic' : 'rare',
      `Season Pass tier ${tier.level}`,
    ),
  );

const SEASON_PASS_TITLE_SEEDS: TitleSeed[] = SEASON_PASS_TIERS
  .filter((tier) => inferCosmeticKind(tier.premiumReward.cosmeticId) === 'title')
  .map((tier) =>
    titleSeed(
      tier.premiumReward.cosmeticId!,
      tier.premiumReward.label.replace(/\s*Title$/i, ''),
      `Season Pass tier ${tier.level}`,
    ),
  );

const SEASONAL_WHEEL_FRAME_SEEDS: FrameSeed[] = Object.values(SEASONAL_WHEELS)
  .flat()
  .filter((segment) => inferCosmeticKind(segment.reward.cosmetic) === 'frame')
  .map((segment) =>
    frameSeed(
      segment.reward.cosmetic!,
      segment.label,
      segment.rarity === 'legendary' ? 'legendary' : segment.rarity === 'epic' ? 'epic' : 'rare',
      'Seasonal wheel reward',
    ),
  );

const SEASONAL_WHEEL_TITLE_SEEDS: TitleSeed[] = Object.values(SEASONAL_WHEELS)
  .flat()
  .filter((segment) => inferCosmeticKind(segment.reward.cosmetic) === 'title')
  .map((segment) =>
    titleSeed(
      segment.reward.cosmetic!,
      segment.label,
      'Seasonal wheel reward',
    ),
  );

const LOGIN_FRAME_SEEDS: FrameSeed[] = ECONOMY.loginRewards
  .filter((reward) => inferCosmeticKind(reward.cosmetic) === 'frame')
  .map((reward, index) =>
    frameSeed(
      reward.cosmetic!,
      reward.day === 21 ? 'Login Master' : humanizeCosmeticId(reward.cosmetic!),
      index === 0 ? 'rare' : 'legendary',
      `Login reward day ${reward.day}`,
    ),
  );

const LOGIN_TITLE_SEEDS: TitleSeed[] = ECONOMY.loginRewards
  .filter((reward) => inferCosmeticKind(reward.cosmetic) === 'title')
  .map((reward) =>
    titleSeed(
      reward.cosmetic!,
      humanizeCosmeticId(reward.cosmetic!),
      `Login reward day ${reward.day}`,
    ),
  );

const STAR_MILESTONE_FRAME_SEEDS: FrameSeed[] = STAR_MILESTONES
  .filter((milestone) => milestone.type === 'frame')
  .map((milestone, index) =>
    frameSeed(
      milestone.reward,
      milestone.name.replace(/\s*Frame$/i, ''),
      inferFrameRarity(index + 3),
      `${milestone.stars} stars`,
    ),
  );

const STAR_MILESTONE_TITLE_SEEDS: TitleSeed[] = STAR_MILESTONES
  .filter((milestone) => milestone.type === 'title')
  .map((milestone) =>
    titleSeed(
      milestone.reward,
      milestone.name,
      `${milestone.stars} stars`,
    ),
  );

export const PROFILE_FRAMES: ProfileFrame[] = dedupeById([
  ...BASE_PROFILE_FRAMES,
  ...EVENT_FRAME_SEEDS,
  ...PRESTIGE_FRAME_SEEDS,
  ...REFERRAL_FRAME_SEEDS,
  ...VIP_FRAME_SEEDS,
  ...QUEST_FRAME_SEEDS,
  ...GRAND_CHALLENGE_FRAME_SEEDS,
  ...SEASON_PASS_FRAME_SEEDS,
  ...SEASONAL_WHEEL_FRAME_SEEDS,
  ...LOGIN_FRAME_SEEDS,
  ...STAR_MILESTONE_FRAME_SEEDS,
]).map((frame) => ({ ...frame, owned: frame.owned ?? false }));

export const PROFILE_TITLES: ProfileTitle[] = dedupeById([
  ...BASE_PROFILE_TITLES,
  ...EVENT_TITLE_SEEDS,
  ...PRESTIGE_TITLE_SEEDS,
  ...REFERRAL_TITLE_SEEDS,
  ...VIP_TITLE_SEEDS,
  ...GRAND_CHALLENGE_TITLE_SEEDS,
  ...SEASON_PASS_TITLE_SEEDS,
  ...SEASONAL_WHEEL_TITLE_SEEDS,
  ...LOGIN_TITLE_SEEDS,
  ...STAR_MILESTONE_TITLE_SEEDS,
]).map((title) => ({ ...title, owned: title.owned ?? false }));

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

export function hasTheme(id: string): boolean {
  return COSMETIC_THEMES.some((theme) => theme.id === id);
}

export function hasFrame(id: string): boolean {
  return PROFILE_FRAMES.some((frame) => frame.id === id);
}

export function hasTitle(id: string): boolean {
  return PROFILE_TITLES.some((title) => title.id === id);
}

export function hasDecoration(id: string): boolean {
  return LIBRARY_DECORATIONS.some((decoration) => decoration.id === id);
}

export function isProfileCosmeticId(id: string): boolean {
  return hasTheme(id) || hasFrame(id) || hasTitle(id);
}

export function resolveLegacyCosmeticId(id: string): string {
  if (id === 'default_theme' || id === 'default_frame') return 'default';
  return id;
}

export function resolveTitleId(value: string): string | undefined {
  const normalized = resolveLegacyCosmeticId(value);
  return getTitle(normalized)?.id ?? PROFILE_TITLES.find((title) => title.title === value)?.id;
}

export function getTitleLabel(value: string): string {
  const resolvedId = resolveTitleId(value);
  return resolvedId ? getTitle(resolvedId)?.title ?? value : value;
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

// ─── Cosmetic Perks ─────────────────────────────────────────────────────────
// Rarity-driven bonuses applied when a frame or title is equipped. Stacking is
// additive (frame + title); total capped downstream at +10% per currency to
// prevent whale runaway. An explicit `bonuses` field on the definition always
// wins over the rarity-based default.

const RARITY_FRAME_BONUSES: Record<ProfileFrame['rarity'], CosmeticBonuses> = {
  common: {},
  rare: { coinMultiplier: 0.02 },
  epic: { coinMultiplier: 0.03, gemMultiplier: 0.01 },
  legendary: { coinMultiplier: 0.05, gemMultiplier: 0.02, xpMultiplier: 0.01 },
};

const RARITY_TITLE_BONUSES: Record<NonNullable<ProfileTitle['rarity']>, CosmeticBonuses> = {
  common: {},
  rare: { coinMultiplier: 0.01 },
  epic: { coinMultiplier: 0.02, xpMultiplier: 0.01 },
  legendary: { coinMultiplier: 0.03, gemMultiplier: 0.01, xpMultiplier: 0.02 },
};

export function getFrameBonuses(id: string): CosmeticBonuses {
  const frame = getFrame(id);
  if (!frame) return {};
  if (frame.bonuses) return frame.bonuses;
  return RARITY_FRAME_BONUSES[frame.rarity] ?? {};
}

export function getTitleBonuses(id: string): CosmeticBonuses {
  const title = getTitle(id);
  if (!title) return {};
  if (title.bonuses) return title.bonuses;
  return RARITY_TITLE_BONUSES[title.rarity ?? 'common'] ?? {};
}

/** Total equipped multiplier (capped 0.10 per currency to prevent runaway). */
export function computeEquippedBonuses(frameId: string, titleId: string): CosmeticBonuses {
  const f = getFrameBonuses(frameId);
  const t = getTitleBonuses(titleId);
  const cap = (n: number | undefined) => (n ? Math.min(0.10, n) : 0);
  return {
    coinMultiplier: cap((f.coinMultiplier ?? 0) + (t.coinMultiplier ?? 0)),
    gemMultiplier: cap((f.gemMultiplier ?? 0) + (t.gemMultiplier ?? 0)),
    xpMultiplier: cap((f.xpMultiplier ?? 0) + (t.xpMultiplier ?? 0)),
  };
}
