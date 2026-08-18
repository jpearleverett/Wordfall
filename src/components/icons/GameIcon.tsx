/**
 * GameIcon — the single entry point for Wordfall's custom SVG icon set.
 *
 * Usage:
 *   <GameIcon name="coin" size={20} />
 *   <GameIcon glyph={item.icon} size={20} />   // item.icon may be an emoji
 *
 * Data catalogs (collections, chapters, achievements, shop items…) store
 * emoji strings as icon ids. Rather than migrating every catalog, `glyph`
 * resolves an emoji to its bespoke SVG through EMOJI_TO_NAME; anything
 * unmapped renders the sparkle fallback — so no surface can ever show a
 * raw stock emoji again. Variation selectors (FE0F) are stripped before
 * lookup.
 */
import React from 'react';
import { IconProps } from './IconBase';
import {
  BellIcon, BoltIcon, CalendarIcon, CheckIcon, ChestIcon, CloverIcon, CoinIcon,
  CrossIcon, CrownIcon, DiceIcon, EyeIcon, FlameIcon, GemIcon, GiftIcon,
  HeartIcon, HintBulbIcon, HourglassIcon, InfinityIcon, KeyIcon, LockIcon,
  MedalIcon, ShuffleIcon, SparkleIcon, StarIcon, TargetIcon, TicketIcon,
  TrophyIcon, UndoIcon, WheelIcon,
} from './iconsCore';
import {
  BookIcon, BookOpenIcon, DropletIcon, FlaskIcon, FlowerIcon, FrameIcon,
  GlobeIcon, LeafIcon, MasksIcon, MoonIcon, MountainIcon, MusicNoteIcon,
  PaletteIcon, PlanetIcon, RocketIcon, ScrollIcon, SnowflakeIcon, SunIcon,
  TelescopeIcon, TreeIcon, WaveIcon,
} from './iconsWorld';
import {
  AppleIcon, BrainIcon, ButterflyIcon, CastleIcon, ChatIcon, CrystalBallIcon,
  GamepadIcon, GearIcon, HandshakeIcon, HouseIcon, LinkIcon, MagnifierIcon,
  OwlIcon, PawIcon, PencilIcon, PeopleIcon, PuzzleIcon, RainbowIcon,
  RunnerIcon, ShieldIcon, SwordIcon,
} from './iconsMisc';
import {
  ArmchairIcon, BannerIcon, BookendOakIcon, ChandelierIcon,
  ClockPendulumIcon, CrownWisdomIcon, CrystalBallDecorIcon, FernPotIcon,
  GlobeAntiqueIcon, LampBrassIcon, PaintingSunsetIcon, StatueThinkerIcon,
  TelescopeMiniIcon,
} from './iconsDecor';
import {
  AntiqueTableIcon, AuroraLampIcon, CandleDecorIcon, CrystalDeskIcon,
  FireplaceDecorIcon, FireSconceIcon, OakDeskIcon, PaperLanternIcon,
  WordThroneIcon,
} from './iconsDecor2';
import {
  CascadeCrystalIcon, CrystalDisplayIcon, DiamondPlaqueIcon, GoldenShelfIcon,
  HourglassDecorIcon, MysteryOrbIcon, RallyBannerIcon, SpeedTrophyIcon,
  WorldGlobeIcon,
} from './iconsDecor3';
import {
  CommunityStatueIcon, GauntletShieldIcon, LabEquipmentIcon, NaturePlaqueIcon,
  OceanGlobeIcon, PaintingForestIcon, RetroArcadeIcon, SeasonThroneIcon,
  ShipWheelIcon,
} from './iconsDecor4';
import {
  AtlasOceanIcon, ChapterMarkerIcon, CodexMythIcon, ForbiddenBookIcon,
  JournalScienceIcon, PlatinumDisplayIcon, StarterBookendIcon, TomeNatureIcon,
  WhaleTrophyIcon,
} from './iconsDecor5';
import {
  BlitzTrophyIcon, CommunityStarIcon, GravityCrystalIcon, OceanWaveIcon,
  PiggyJarIcon, VipLaurelIcon, VipTrophyIcon,
} from './iconsDecor6';
import {
  BoosterCrateIcon, ChestBronzeIcon, ChestGoldIcon, CoinPileIcon,
  CoinSmallIcon, CoinStackIcon, GemClusterIcon, GemHoardIcon, GemSingleIcon,
  HintBulbRewardIcon,
} from './iconsRewards';

export type GameIconName = keyof typeof REGISTRY;

const REGISTRY = {
  coin: CoinIcon, gem: GemIcon, hint: HintBulbIcon, star: StarIcon,
  sparkle: SparkleIcon, trophy: TrophyIcon, medal: MedalIcon, flame: FlameIcon,
  bolt: BoltIcon, undo: UndoIcon, shuffle: ShuffleIcon, eye: EyeIcon,
  check: CheckIcon, cross: CrossIcon, lock: LockIcon, crown: CrownIcon,
  gift: GiftIcon, chest: ChestIcon, heart: HeartIcon, wheel: WheelIcon,
  dice: DiceIcon, clover: CloverIcon, hourglass: HourglassIcon,
  target: TargetIcon, calendar: CalendarIcon, bell: BellIcon, key: KeyIcon,
  infinity: InfinityIcon, ticket: TicketIcon,
  leaf: LeafIcon, flower: FlowerIcon, tree: TreeIcon, mountain: MountainIcon,
  sun: SunIcon, moon: MoonIcon, snowflake: SnowflakeIcon, droplet: DropletIcon,
  wave: WaveIcon, flask: FlaskIcon, telescope: TelescopeIcon, scroll: ScrollIcon,
  rocket: RocketIcon, planet: PlanetIcon, palette: PaletteIcon,
  note: MusicNoteIcon, masks: MasksIcon, frame: FrameIcon, globe: GlobeIcon,
  book: BookIcon, bookOpen: BookOpenIcon,
  magnifier: MagnifierIcon, chat: ChatIcon, people: PeopleIcon,
  handshake: HandshakeIcon, brain: BrainIcon, puzzle: PuzzleIcon, owl: OwlIcon,
  gear: GearIcon, castle: CastleIcon, shield: ShieldIcon, sword: SwordIcon,
  paw: PawIcon, apple: AppleIcon, house: HouseIcon, rainbow: RainbowIcon,
  butterfly: ButterflyIcon, gamepad: GamepadIcon, crystal: CrystalBallIcon,
  pencil: PencilIcon, link: LinkIcon, runner: RunnerIcon,
  // decoration illustrations (library collection cards)
  armchair: ArmchairIcon, chandelierDecor: ChandelierIcon,
  bannerDecor: BannerIcon, bookendOak: BookendOakIcon, lampBrass: LampBrassIcon,
  globeAntique: GlobeAntiqueIcon, clockPendulum: ClockPendulumIcon,
  telescopeMini: TelescopeMiniIcon, statueThinker: StatueThinkerIcon,
  fernPot: FernPotIcon, paintingSunset: PaintingSunsetIcon,
  crystalBallDecor: CrystalBallDecorIcon, crownWisdom: CrownWisdomIcon,
  // decoration illustrations — furniture & lighting (iconsDecor2)
  oakDesk: OakDeskIcon, antiqueTable: AntiqueTableIcon,
  wordThrone: WordThroneIcon, crystalDesk: CrystalDeskIcon,
  candleDecor: CandleDecorIcon, paperLantern: PaperLanternIcon,
  fireplaceDecor: FireplaceDecorIcon, auroraLamp: AuroraLampIcon,
  fireSconce: FireSconceIcon,
  // decoration illustrations — ornaments A (iconsDecor3)
  worldGlobe: WorldGlobeIcon, hourglassDecor: HourglassDecorIcon,
  goldenShelf: GoldenShelfIcon, crystalDisplay: CrystalDisplayIcon,
  speedTrophy: SpeedTrophyIcon, diamondPlaque: DiamondPlaqueIcon,
  rallyBanner: RallyBannerIcon, cascadeCrystal: CascadeCrystalIcon,
  mysteryOrb: MysteryOrbIcon,
  // decoration illustrations — ornaments B (iconsDecor4)
  retroArcade: RetroArcadeIcon, paintingForest: PaintingForestIcon,
  labEquipment: LabEquipmentIcon, shipWheel: ShipWheelIcon,
  gauntletShield: GauntletShieldIcon, communityStatue: CommunityStatueIcon,
  seasonThrone: SeasonThroneIcon, oceanGlobe: OceanGlobeIcon,
  naturePlaque: NaturePlaqueIcon,
  // decoration illustrations — books & bundle exclusives (iconsDecor5)
  tomeNature: TomeNatureIcon, journalScience: JournalScienceIcon,
  codexMyth: CodexMythIcon, atlasOcean: AtlasOceanIcon,
  forbiddenBook: ForbiddenBookIcon, starterBookend: StarterBookendIcon,
  chapterMarker: ChapterMarkerIcon, whaleTrophy: WhaleTrophyIcon,
  platinumDisplay: PlatinumDisplayIcon,
  // decoration illustrations — event exclusives + piggy jar (iconsDecor6)
  communityStar: CommunityStarIcon, gravityCrystal: GravityCrystalIcon,
  blitzTrophy: BlitzTrophyIcon, oceanWave: OceanWaveIcon,
  piggyJar: PiggyJarIcon,
  // VIP streak ladder marks (iconsDecor6)
  vipLaurel: VipLaurelIcon, vipTrophy: VipTrophyIcon,
  // reward renders — escalating currency + loot art (iconsRewards)
  coinSmall: CoinSmallIcon, coinStack: CoinStackIcon, coinPile: CoinPileIcon,
  gemSingle: GemSingleIcon, gemCluster: GemClusterIcon, gemHoard: GemHoardIcon,
  hintBulbReward: HintBulbRewardIcon, boosterCrate: BoosterCrateIcon,
  chestBronze: ChestBronzeIcon, chestGold: ChestGoldIcon,
} as const;

/**
 * Emoji → icon name. Covers every emoji stored in the data catalogs plus
 * the ones previously hardcoded in components. Nearest-neighbor semantic
 * mapping where no dedicated icon exists (e.g. all florals → flower).
 */
const EMOJI_TO_NAME: Record<string, GameIconName> = {
  // currency / rewards
  '🪙': 'coin', '💰': 'coin', '💎': 'gem', '💡': 'hint', '🎁': 'gift',
  '📦': 'chest', '🎰': 'wheel', '🎡': 'wheel', '🎲': 'dice', '🍀': 'clover',
  '🎟': 'ticket', '🎫': 'ticket', '🫙': 'piggyJar',
  // status / achievement
  '⭐': 'star', '🌟': 'star', '✨': 'sparkle', '💫': 'sparkle', '🏆': 'trophy',
  '🥇': 'medal', '🥈': 'medal', '🥉': 'medal', '🏅': 'medal', '🎖': 'medal',
  '🔥': 'flame', '⚡': 'bolt', '💯': 'target', '🎯': 'target', '👑': 'crown',
  '🔒': 'lock', '🔓': 'lock', '🔑': 'key', '❤': 'heart', '🫀': 'heart',
  '💜': 'heart', '⏳': 'hourglass', '⏰': 'hourglass', '🕰': 'hourglass',
  '⌛': 'hourglassDecor',
  '📅': 'calendar', '📋': 'calendar', '🔔': 'bell', '♾': 'infinity',
  '✅': 'check', '❌': 'cross', '🚫': 'cross', '💪': 'bolt', '💀': 'sword',
  // nature — chapter emblems get bespoke/thematic art so the five chapters
  // of a wing never share one icon (blind-panel distinctness pass).
  '🌱': 'leaf', '🌿': 'leaf', '🍃': 'leaf', '🌾': 'sun', '🍂': 'leaf', '🍁': 'leaf',
  '🌷': 'flower', '🌸': 'flower', '🌺': 'flower', '🌻': 'flower', '💐': 'flower',
  '🏵': 'flower', '🌹': 'flower', '🌼': 'flower',
  '🌲': 'tree', '🌳': 'tree', '🌴': 'tree', '🎄': 'tree',
  '🏔': 'mountain', '⛰': 'mountain', '🗻': 'mountain', '🏝': 'mountain', '🏖': 'mountain',
  '☀': 'sun', '🌞': 'sun', '🌅': 'sun', '🌄': 'sun', '⛅': 'sun', '🌤': 'sun',
  '🌡': 'sun', '🌙': 'moon', '🌕': 'moon', '🌑': 'moon',
  '❄': 'snowflake', '🧊': 'snowflake', '🌨': 'snowflake', '⛈': 'snowflake', '🌧': 'droplet',
  '💧': 'droplet', '💦': 'droplet', '🌊': 'wave', '⛵': 'shipWheel', '🐋': 'whaleTrophy',
  '🐠': 'oceanGlobe', '🐚': 'oceanWave', '🦑': 'mysteryOrb', '⚓': 'wave', '💨': 'wave',
  '🌈': 'rainbow', '🦋': 'butterfly', '🐝': 'butterfly', '🐦': 'butterfly',
  '🐾': 'paw', '🦉': 'owl', '🦄': 'crystal', '🐉': 'codexMyth', '🦅': 'eye',
  '🌠': 'sparkle', '🪔': 'paperLantern',
  // science / space
  '🧪': 'flask', '⚗': 'labEquipment', '🔬': 'magnifier', '🧬': 'flask',
  '🔭': 'telescope', '🚀': 'rocket', '✈': 'rocket', '🪐': 'planet', '🌌': 'gravityCrystal',
  '🌍': 'globe', '🌐': 'globe', '🗺': 'globe', '🧭': 'globe',
  // arts / history
  '🎨': 'palette', '🖌': 'palette', '🎵': 'note', '🎶': 'note', '🎭': 'masks',
  '🖼': 'frame', '📜': 'scroll', '📕': 'book', '📖': 'bookOpen', '📚': 'book',
  '🔖': 'book', '📝': 'pencil', '✏': 'pencil', '🏺': 'globeAntique', '🔮': 'crystal',
  '🏛': 'statueThinker', '🏰': 'castle', '🗽': 'castle', '🏙': 'retroArcade', '🏠': 'house',
  '⚔': 'sword', '🛡': 'shield', '⚖': 'shield', '🚩': 'target',
  // social / misc
  '👥': 'people', '🤝': 'handshake', '💬': 'chat', '💭': 'chat', '🧠': 'brain',
  '🤔': 'brain', '🧩': 'puzzle', '🔤': 'puzzle', '🎮': 'gamepad', '🕹': 'gamepad',
  '⚙': 'gear', '🔧': 'gear', '🔗': 'link', '🏃': 'runner', '🔍': 'magnifier',
  '👁': 'eye', '🔀': 'shuffle', '🔄': 'undo', '↩': 'undo', '🍎': 'apple',
  '🍦': 'apple', '🎉': 'sparkle', '🎊': 'sparkle', '😲': 'owl', '🎬': 'frame',
  '📊': 'target', '❏': 'bookOpen', '🔻': 'gem', '🌦': 'sun', '🎃': 'flower',
  '▶': 'gamepad', '◆': 'gem',
};

function stripVariation(glyph: string): string {
  return glyph.replace(/[︎️‍]/g, '').trim();
}

export interface GameIconProps extends IconProps {
  /** Icon by semantic name (preferred for new code). */
  name?: GameIconName;
  /**
   * Icon by stored glyph — an emoji string from a data catalog. Resolved
   * via EMOJI_TO_NAME; unknown glyphs render the sparkle fallback.
   */
  glyph?: string;
  /** For name="medal": which metal. */
  metal?: 'gold' | 'silver' | 'bronze';
}

const MEDAL_EMOJI_METAL: Record<string, 'gold' | 'silver' | 'bronze'> = {
  '🥇': 'gold', '🥈': 'silver', '🥉': 'bronze', '🏅': 'gold', '🎖': 'gold',
};

export function resolveIconName(glyph: string): GameIconName | null {
  const g = stripVariation(glyph);
  return EMOJI_TO_NAME[g] ?? EMOJI_TO_NAME[g.slice(0, 2)] ?? EMOJI_TO_NAME[g.slice(0, 1)] ?? null;
}

export default function GameIcon({ name, glyph, metal, size = 24, accent }: GameIconProps) {
  let resolved: GameIconName | null = name ?? null;
  let resolvedMetal = metal;
  if (!resolved && glyph) {
    resolved = resolveIconName(glyph);
    if (!resolvedMetal && glyph) {
      resolvedMetal = MEDAL_EMOJI_METAL[stripVariation(glyph)];
    }
  }
  const Comp = (resolved && REGISTRY[resolved]) || SparkleIcon;
  if (Comp === MedalIcon) {
    return <MedalIcon size={size} accent={accent} metal={resolvedMetal ?? 'gold'} />;
  }
  return <Comp size={size} accent={accent} />;
}
