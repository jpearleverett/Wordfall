/**
 * The Grand Library — canonical wing catalog and story voice.
 *
 * Before this file existed, "a wing" was implied by four disagreeing tables
 * (LIBRARY.wingNames, WING_NAMES, LibraryScreen's private WING_META, and
 * WING_PALETTES). This is now the single source of truth for wing identity,
 * theming, and narrative. Chapters still carry `wingId`; palettes/tile ramps
 * stay in data/chapters.ts because the engine consumes them directly.
 *
 * Story canon: the player is the WORD ARCHITECT, heir to a scattered craft —
 * rebuilding the Grand Library that once held every word ever found. FOLIO,
 * the owl archivist, kept the ruin's catalog alive alone for a very long
 * time; he narrates progress, greets restorations, and fusses over
 * decorations. Every solved puzzle returns words to the shelves; every
 * restored wing relights a hall of the collection.
 */
import { GameIconName } from '../components/icons/GameIcon';

export interface WingDef {
  id: string;
  name: string;
  /** GameIcon name for the wing's emblem. */
  icon: GameIconName;
  /** Primary accent (#rrggbb) — drives alcove light, ribbons, progress. */
  accent: string;
  /** Soft aura used behind panels (rgba). */
  aura: string;
  /** One-line identity shown under the wing name. */
  tagline: string;
  /** 2–3 sentence lore shown in the wing detail panel. */
  lore: string;
  /** Folio's line for this wing's restoration ceremony. */
  restorationLine: string;
  /** First and last chapter ids (inclusive). */
  chapters: [number, number];
}

export const WINGS: WingDef[] = [
  {
    id: 'nature',
    name: 'Nature',
    icon: 'leaf',
    accent: '#35b892',
    aura: 'rgba(53, 184, 146, 0.16)',
    tagline: 'Where words took root.',
    lore:
      'The oldest hall of the Library, grown as much as built — shelves of living oak, ivy for ladders, seed-catalogs that still sprout in spring. The first word ever written down is said to be pressed somewhere in its herbarium.',
    restorationLine:
      '“The oak shelves remember you, Architect. Hear them creak? That is the sound of a forest reading again.” — Folio',
    chapters: [1, 5],
  },
  {
    id: 'science',
    name: 'Science',
    icon: 'flask',
    accent: '#5b8fe8',
    aura: 'rgba(91, 143, 232, 0.16)',
    tagline: 'Answers, filed.',
    lore:
      'Beakers for bookends and a periodic table set in the parquet floor. The Science Wing indexes everything twice — once by what it is, once by what it might become. Its reading lamps are powered by argument.',
    restorationLine:
      '“Hypothesis confirmed: you are exactly who the Library was waiting for. Mind the self-turning pages — they are peer reviewing.” — Folio',
    chapters: [6, 10],
  },
  {
    id: 'mythology',
    name: 'Mythology',
    icon: 'sword',
    accent: '#c84dff',
    aura: 'rgba(200, 77, 255, 0.16)',
    tagline: 'Heroes, at rest.',
    lore:
      'Marble columns, a ceiling of painted constellations, and books that insist on being legends. Careful with the epics on the top shelf — some of them still bite. The dragons filed themselves under D, out of politeness.',
    restorationLine:
      '“The legends are awake and asking for you by name. I told them you prefer ‘Architect’. They wrote it in gold anyway.” — Folio',
    chapters: [11, 15],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    icon: 'wave',
    accent: '#42a5dd',
    aura: 'rgba(66, 165, 221, 0.16)',
    tagline: 'Words run deep.',
    lore:
      'The only wing with a tide. Charts, shanties, and bottled letters line coral shelves, and the reading pools go down further than anyone has followed. Something large returns the books it borrows, always on time.',
    restorationLine:
      '“The tide brought back every last chart, dry as a dune. Whatever lives in the deep stacks — it approves of you.” — Folio',
    chapters: [16, 20],
  },
  {
    id: 'arts',
    name: 'Arts',
    icon: 'palette',
    accent: '#ff2d95',
    aura: 'rgba(255, 45, 149, 0.16)',
    tagline: 'Words learn to sing.',
    lore:
      'Half gallery, half stage, entirely dramatic. The Arts Wing shelves librettos beside their standing ovations and keeps a spotlight warm for whoever restores it. The paintings gossip after closing time.',
    restorationLine:
      '“Bravo! The gallery hung your name tonight — center wall, best light. The paintings have talked of nothing else.” — Folio',
    chapters: [21, 25],
  },
  {
    id: 'space',
    name: 'Space',
    icon: 'planet',
    accent: '#7c5cff',
    aura: 'rgba(124, 92, 255, 0.16)',
    tagline: 'No ceiling here.',
    lore:
      'The dome opens straight onto the cosmos, and the catalog is arranged by constellation. Star charts shelve themselves at dawn. Somewhere in the observatory stacks is the first word spoken to the night sky — filed under “hello.”',
    restorationLine:
      '“The dome is open, the stars are shelved, and the telescope asked me to thank you personally. It sees a bright future.” — Folio',
    chapters: [26, 30],
  },
  {
    id: 'history',
    name: 'History',
    icon: 'scroll',
    accent: '#c99b45',
    aura: 'rgba(201, 155, 69, 0.16)',
    tagline: 'Time, shelved.',
    lore:
      'Scroll racks by the mile and a card catalog older than some empires it describes. The History Wing files every ending next to the beginning it came from. Its dust is archival grade and quietly proud of it.',
    restorationLine:
      '“I have filed this day between two golden ages, Architect. The scrolls insisted. History is watching — wave politely.” — Folio',
    chapters: [31, 35],
  },
  {
    id: 'elements',
    name: 'Elements',
    icon: 'flame',
    accent: '#e0562a',
    aura: 'rgba(224, 86, 42, 0.16)',
    tagline: 'The beating forge.',
    lore:
      'Fire keeps the lamps, water keeps the ink, wind turns the pages, and stone holds the whole thing up. The final wing is the Library’s engine room — restore it, and every other hall burns a little brighter.',
    restorationLine:
      '“Fire, tide, gale and stone — all four bowed at once. In two hundred years of keeping this catalog, I have never seen that. The Library is WHOLE.” — Folio',
    chapters: [36, 40],
  },
];

const WING_BY_ID: Record<string, WingDef> = Object.fromEntries(
  WINGS.map(w => [w.id, w]),
);

/** Seasonal / remote / procedural wings get a graceful themed fallback. */
const FALLBACK_WING: Omit<WingDef, 'id' | 'chapters'> = {
  name: 'Annex',
  icon: 'sparkle',
  accent: '#c84dff',
  aura: 'rgba(200, 77, 255, 0.16)',
  tagline: 'Beyond the blueprints.',
  lore:
    'Past the eight great halls, the Library keeps growing — annexes and reading rooms the blueprints never imagined. Folio numbers them fondly and dusts them all.',
  restorationLine:
    '“Another annex, catalogued and lit. The Library outgrew its blueprints long ago — keep going, Architect.” — Folio',
};

const KNOWN_EXTRA_WINGS: Record<string, Partial<WingDef>> = {
  seasons: {
    name: 'Seasons',
    icon: 'sun',
    accent: '#ffb800',
    aura: 'rgba(255, 184, 0, 0.16)',
    tagline: 'One turning year.',
  },
  wonders: {
    name: 'Wonders',
    icon: 'crystal',
    accent: '#00e5ff',
    aura: 'rgba(0, 229, 255, 0.16)',
    tagline: 'Shelf of the impossible.',
  },
};

/**
 * Resolve a wing definition for ANY wingId — the eight canonical wings,
 * remote seasonal wings, or procedural annexes. Never returns undefined,
 * so no surface can crash or fall back to raw ids.
 */
export function getWing(wingId: string | undefined): WingDef {
  if (wingId && WING_BY_ID[wingId]) return WING_BY_ID[wingId];
  const extra = wingId ? KNOWN_EXTRA_WINGS[wingId] : undefined;
  return {
    id: wingId ?? 'annex',
    chapters: [41, 44],
    ...FALLBACK_WING,
    ...extra,
  };
}

// ─── Decoration silhouettes, rarity & flavor ────────────────────────────────
// The collection grid used to funnel most decorations through GameIcon's
// generic sparkle fallback, so every unlockable read as the same purple
// placeholder. Each decoration now names its own silhouette; unknown ids
// fall back by decoration TYPE so nothing ever shares one generic glyph.

export type DecorationRarity = 'common' | 'rare' | 'epic' | 'legendary';

export const DECORATION_ICONS: Record<string, GameIconName> = {
  // Milestone decorations (levels 5–50) — bespoke illustrations (iconsDecor)
  bookend_oak: 'bookendOak',
  lamp_brass: 'lampBrass',
  globe_antique: 'globeAntique',
  clock_pendulum: 'clockPendulum',
  telescope_mini: 'telescopeMini',
  statue_thinker: 'statueThinker',
  plant_fern: 'fernPot',
  painting_sunset: 'paintingSunset',
  crystal_ball: 'crystalBallDecor',
  crown_wisdom: 'crownWisdom',
  // Furniture — bespoke (iconsDecor2)
  reading_chair: 'armchair',
  oak_desk: 'oakDesk',
  antique_table: 'antiqueTable',
  throne_chair: 'wordThrone',
  crystal_desk: 'crystalDesk',
  // Lighting — bespoke (iconsDecor2)
  candle: 'candleDecor',
  lantern: 'paperLantern',
  chandelier: 'chandelierDecor',
  fireplace: 'fireplaceDecor',
  aurora_lamp: 'auroraLamp',
  fire_sconce: 'fireSconce',
  // Ornaments — bespoke (iconsDecor3/iconsDecor4)
  globe: 'worldGlobe',
  telescope: 'telescopeMini',
  hourglass: 'hourglassDecor',
  golden_shelf: 'goldenShelf',
  crystal_display: 'crystalDisplay',
  speed_trophy: 'speedTrophy',
  diamond_plaque: 'diamondPlaque',
  rally_banner: 'rallyBanner',
  season1_banner: 'bannerDecor',
  cascade_crystal: 'cascadeCrystal',
  mystery_orb: 'mysteryOrb',
  retro_arcade: 'retroArcade',
  nature_painting: 'paintingForest',
  lab_equipment: 'labEquipment',
  ship_wheel: 'shipWheel',
  gauntlet_shield: 'gauntletShield',
  community_statue: 'communityStatue',
  season_throne: 'seasonThrone',
  ocean_globe: 'oceanGlobe',
  nature_plaque: 'naturePlaque',
  // Event-exclusive grants outside the decoration catalog (iconsDecor6)
  community_star: 'communityStar',
  gravity_flip_crystal: 'gravityCrystal',
  blitz_trophy: 'blitzTrophy',
  ocean_wave_deco: 'oceanWave',
  // Books — bespoke (iconsDecor5)
  nature_tome: 'tomeNature',
  science_journal: 'journalScience',
  myth_codex: 'codexMyth',
  ocean_atlas: 'atlasOcean',
  forbidden_book: 'forbiddenBook',
  // Bundle-exclusive — bespoke (iconsDecor5)
  starter_bookend: 'starterBookend',
  chapter_decoration: 'chapterMarker',
  decoration_whale_trophy: 'whaleTrophy',
  decoration_platinum_exclusive: 'platinumDisplay',
  // VIP streak ladder reward (iconsDecor6)
  vip_trophy: 'vipTrophy',
};

/** Per-TYPE fallback so a catalog addition never regresses to sparkle. */
export const DECORATION_TYPE_ICONS: Record<string, GameIconName> = {
  furniture: 'armchair',
  lighting: 'flame',
  ornament: 'trophy',
  book: 'book',
};

export function getDecorationIconName(id: string, type?: string): GameIconName {
  return DECORATION_ICONS[id] ?? (type ? DECORATION_TYPE_ICONS[type] : undefined) ?? 'chest';
}

/**
 * Flavor lines for the milestone decorations (the constants table carries
 * only name/icon/level). Short and in Folio's voice — the collection cards
 * give them two lines.
 */
export const MILESTONE_DECORATION_FLAVOR: Record<string, string> = {
  bookend_oak: 'Holds your first shelf.',
  lamp_brass: 'Light for late hours.',
  globe_antique: 'Spin for a voyage.',
  clock_pendulum: 'Slow, on purpose.',
  telescope_mini: 'For top-shelf titles.',
  statue_thinker: 'Deciding what to read.',
  plant_fern: 'Thrives on lamplight.',
  painting_sunset: 'A sunset without end.',
  crystal_ball: 'Shows your next word.',
  crown_wisdom: 'For word architects.',
};

/** Milestone decorations carry no rarity — derive one from unlock level. */
export function milestoneRarity(level: number): DecorationRarity {
  if (level >= 50) return 'legendary';
  if (level >= 35) return 'epic';
  if (level >= 20) return 'rare';
  return 'common';
}

/** The Library's keeper. One name, everywhere. */
export const LIBRARIAN = {
  name: 'Folio',
  title: 'Folio, Keeper of the Grand Library',
} as const;

/**
 * Folio's ambient lines for the Library screen — picked by situation.
 * Kept short: one sentence, in character, actionable when possible.
 */
export function folioGreeting(args: {
  restoredCount: number;
  nextWingName: string | null;
  chaptersToNextWing: number | null;
  hasUnplacedDecoration: boolean;
}): string {
  const { restoredCount, nextWingName, chaptersToNextWing, hasUnplacedDecoration } = args;
  if (restoredCount >= WINGS.length) {
    return 'Every hall lit, every shelf full. I mostly dust for pleasure now, Architect.';
  }
  if (hasUnplacedDecoration) {
    return 'A new decoration awaits placing — the empty shelf keeps sighing at me.';
  }
  if (chaptersToNextWing === 1 && nextWingName) {
    return `One chapter more and the ${nextWingName} Wing opens its doors. I have already dusted the handle.`;
  }
  if (nextWingName) {
    return `The ${nextWingName} Wing waits in the dark. Every word you find lights another lamp.`;
  }
  return 'Welcome back, Architect. The stacks kept your place.';
}
