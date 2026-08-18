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
  '🎟': 'ticket', '🎫': 'ticket',
  // status / achievement
  '⭐': 'star', '🌟': 'star', '✨': 'sparkle', '💫': 'sparkle', '🏆': 'trophy',
  '🥇': 'medal', '🥈': 'medal', '🥉': 'medal', '🏅': 'medal', '🎖': 'medal',
  '🔥': 'flame', '⚡': 'bolt', '💯': 'target', '🎯': 'target', '👑': 'crown',
  '🔒': 'lock', '🔓': 'lock', '🔑': 'key', '❤': 'heart', '🫀': 'heart',
  '💜': 'heart', '⏳': 'hourglass', '⏰': 'hourglass', '🕰': 'hourglass',
  '📅': 'calendar', '📋': 'calendar', '🔔': 'bell', '♾': 'infinity',
  '✅': 'check', '❌': 'cross', '🚫': 'cross',
  // nature
  '🌱': 'leaf', '🌿': 'leaf', '🍃': 'leaf', '🌾': 'leaf', '🍂': 'leaf', '🍁': 'leaf',
  '🌷': 'flower', '🌸': 'flower', '🌺': 'flower', '🌻': 'flower', '💐': 'flower',
  '🏵': 'flower', '🌹': 'flower', '🌼': 'flower',
  '🌲': 'tree', '🌳': 'tree', '🌴': 'tree', '🎄': 'tree',
  '🏔': 'mountain', '⛰': 'mountain', '🗻': 'mountain', '🏝': 'mountain', '🏖': 'mountain',
  '☀': 'sun', '🌞': 'sun', '🌅': 'sun', '🌄': 'sun', '⛅': 'sun', '🌤': 'sun',
  '🌡': 'sun', '🌙': 'moon', '🌕': 'moon', '🌑': 'moon',
  '❄': 'snowflake', '🧊': 'snowflake', '🌨': 'snowflake', '⛈': 'snowflake', '🌧': 'droplet',
  '💧': 'droplet', '💦': 'droplet', '🌊': 'wave', '⛵': 'wave', '🐋': 'wave',
  '🐠': 'wave', '🐚': 'wave', '🦑': 'wave', '⚓': 'wave', '💨': 'wave',
  '🌈': 'rainbow', '🦋': 'butterfly', '🐝': 'butterfly', '🐦': 'butterfly',
  '🐾': 'paw', '🦉': 'owl', '🦄': 'crystal', '🐉': 'sword',
  // science / space
  '🧪': 'flask', '⚗': 'flask', '🔬': 'flask', '🧬': 'flask',
  '🔭': 'telescope', '🚀': 'rocket', '✈': 'rocket', '🪐': 'planet', '🌌': 'planet',
  '🌍': 'globe', '🌐': 'globe', '🗺': 'globe', '🧭': 'globe',
  // arts / history
  '🎨': 'palette', '🖌': 'palette', '🎵': 'note', '🎶': 'note', '🎭': 'masks',
  '🖼': 'frame', '📜': 'scroll', '📕': 'book', '📖': 'bookOpen', '📚': 'book',
  '🔖': 'book', '📝': 'pencil', '✏': 'pencil', '🏺': 'crystal', '🔮': 'crystal',
  '🏛': 'castle', '🏰': 'castle', '🗽': 'castle', '🏙': 'castle', '🏠': 'house',
  '⚔': 'sword', '🛡': 'shield', '⚖': 'shield', '🚩': 'target',
  // social / misc
  '👥': 'people', '🤝': 'handshake', '💬': 'chat', '💭': 'chat', '🧠': 'brain',
  '🤔': 'brain', '🧩': 'puzzle', '🔤': 'puzzle', '🎮': 'gamepad', '🕹': 'gamepad',
  '⚙': 'gear', '🔧': 'gear', '🔗': 'link', '🏃': 'runner', '🔍': 'magnifier',
  '👁': 'eye', '🔀': 'shuffle', '🔄': 'undo', '↩': 'undo', '🍎': 'apple',
  '🍦': 'apple', '🎉': 'sparkle', '🎊': 'sparkle', '😲': 'owl', '🎬': 'frame',
  '📊': 'target', '❏': 'bookOpen', '🔻': 'gem', '🌦': 'sun', '🎃': 'flower',
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
