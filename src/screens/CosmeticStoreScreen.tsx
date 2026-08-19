import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS, GRADIENTS, SHADOWS, FONTS, RADIUS } from '../constants';
import AvatarPortrait from '../components/cosmetics/AvatarPortrait';
import ScreenScaffold from '../components/common/ScreenScaffold';
import IconMedallion from '../components/common/IconMedallion';
import ThemePreview from '../components/cosmetics/ThemePreview';
import { ProfileFrameArt } from '../components/cosmetics/ProfileFrameArt';
import { resolveFrameArt } from '../components/cosmetics/frameArtCatalog';
import {
  AVATAR_VARIANT_ORDER,
  hashAvatarSeed,
} from '../components/cosmetics/avatarVariants';
import GameIcon from '../components/icons/GameIcon';
import { useEconomy } from '../contexts/EconomyContext';
import PrimaryButton from '../components/common/PrimaryButton';
import {
  useEconomyStore,
  useEconomyActions,
  selectCoins,
  selectGems,
  selectLibraryPoints,
} from '../stores/economyStore';
import {
  usePlayerStore,
  usePlayerActions,
  selectEquippedFrame,
  selectEquippedTheme,
  selectEquippedTitle,
  selectPlacedDecorations,
  selectUnlockedCosmetics,
} from '../stores/playerStore';
import {
  COSMETIC_THEMES,
  PROFILE_FRAMES,
  PROFILE_TITLES,
  LIBRARY_DECORATIONS,
  getTitleLabel,
} from '../data/cosmetics';
import { CosmeticTheme, ProfileFrame, ProfileTitle, LibraryDecoration, CurrencyType } from '../types';

const { width } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2;
const CARD_PADDING = 12;
const CARD_BORDER = 1.5;
/** Inner content width of a card (inside its border). */
const CARD_INNER_WIDTH = CARD_WIDTH - CARD_BORDER * 2;

// Theme previews bleed edge-to-edge across the card (only the 1.5px border
// insets them), rendered square-cornered and clipped by the card's radius.
// ThemePreview keeps a 160:96 aspect, so on narrow phones a full-bleed width
// yields <100px of height — we therefore render it at whatever width the
// minimum height demands and let the bleed container clip the overflow, so
// the vignette always reaches both card edges AND stays >= 100px tall.
const THEME_PREVIEW_MIN_HEIGHT = 104;
const THEME_PREVIEW_WIDTH = Math.round(
  Math.max(CARD_INNER_WIDTH, (THEME_PREVIEW_MIN_HEIGHT * 160) / 96),
);
const THEME_PREVIEW_HEIGHT = Math.max(
  THEME_PREVIEW_MIN_HEIGHT,
  Math.round((THEME_PREVIEW_WIDTH * 96) / 160),
);

// Frame previews are the product on the Frames tab — the ring fills the card
// (inner width minus the card padding) instead of floating at thumbnail size.
const FRAME_PREVIEW_SIZE = Math.round(
  Math.min(CARD_INNER_WIDTH - CARD_PADDING * 2, 136),
);

// ── Types ────────────────────────────────────────────────────────────────────

type TabId = 'themes' | 'frames' | 'titles' | 'decorations';

interface NormalizedItem {
  id: string;
  name: string;
  description: string;
  icon?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  owned: boolean;
  equipped: boolean;
  costCurrency?: CurrencyType;
  costAmount?: number;
  source?: string;
  preview?: CosmeticTheme['colors'];
  tabType: TabId;
  /**
   * Position in the rendered list for this tab. Portrait variants key off it
   * (not off an id hash) so ADJACENT cards can never land on the same figure —
   * hashing clumped the first screenful of frames onto one avatar, which read
   * as "every frame is the same picture with a different ring".
   */
  listIndex: number;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'themes', label: 'Themes' },
  { id: 'frames', label: 'Frames' },
  { id: 'titles', label: 'Titles' },
  { id: 'decorations', label: 'Decor' },
];

// ── Rarity helpers ───────────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
  common: COLORS.rarityCommon,
  rare: COLORS.rarityRare,
  epic: COLORS.rarityEpic,
  legendary: COLORS.rarityLegendary,
};

const RARITY_LABELS: Record<string, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

const CURRENCY_ICONS: Record<string, string> = {
  coins: '\u{1FA99}',
  gems: '\u{1F48E}',
  libraryPoints: '\u{1F4DA}',
};

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

interface RarityTreatment {
  /** 3-stop backplate gradient (top tint / body / base tint). */
  body: [string, string, string];
  borderColor: string;
  borderWidth: number;
  /** Outer glow — null for tiers that stay flat. */
  glow: ViewStyle | null;
  /** Legendary-only corner sunburst. */
  sunburst: boolean;
}

/**
 * Tiered card treatment — rarity must be legible from the CARD, not just from
 * a text pill. Common stays a flat surface; each higher tier adds a tinted
 * gradient backplate, a stronger rarity border, and (epic+) an outer glow,
 * with legendary topped by a faint corner sunburst.
 */
function rarityTreatment(rarity: Rarity, color: string): RarityTreatment {
  switch (rarity) {
    case 'legendary':
      return {
        body: [color + '3D', 'rgba(44,24,8,0.93)', color + '20'],
        borderColor: color + 'CC',
        borderWidth: 2,
        glow: {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.75,
          shadowRadius: 20,
          elevation: 16,
        },
        sunburst: true,
      };
    case 'epic':
      return {
        body: [color + '30', 'rgba(33,12,54,0.94)', color + '18'],
        borderColor: color + 'AA',
        borderWidth: 1.75,
        glow: {
          shadowColor: color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.55,
          shadowRadius: 14,
          elevation: 12,
        },
        sunburst: false,
      };
    case 'rare':
      return {
        body: [color + '20', 'rgba(15,26,45,0.95)', color + '10'],
        borderColor: color + '77',
        borderWidth: 1,
        glow: null,
        sunburst: false,
      };
    default:
      // Common — flat surface, no tint, no glow.
      return {
        body: ['rgba(26,10,46,0.94)', 'rgba(26,10,46,0.94)', 'rgba(21,8,39,0.96)'],
        borderColor: COLORS.borderSubtle,
        borderWidth: 1,
        glow: null,
        sunburst: false,
      };
  }
}

/** Faint radiating corner sunburst — legendary tier only. */
function CornerSunburst({ color }: { color: string }) {
  const rays = useMemo(() => {
    const out: string[] = [];
    const R = 132;
    for (let i = 0; i < 9; i++) {
      const a0 = ((96 + i * 10.5) * Math.PI) / 180;
      const a1 = a0 + (4.8 * Math.PI) / 180;
      const p = (a: number) =>
        `${(100 + R * Math.cos(a)).toFixed(1)} ${(R * Math.sin(a)).toFixed(1)}`;
      out.push(`M100 0 L${p(a0)} L${p(a1)} Z`);
    }
    return out;
  }, []);
  return (
    <View style={styles.cornerSunburst} pointerEvents="none">
      <Svg width={104} height={104} viewBox="0 0 100 100">
        <Circle cx={100} cy={0} r={56} fill={color} opacity={0.1} />
        {rays.map((d, i) => (
          <Path key={`ray${i}`} d={d} fill={color} opacity={i % 2 === 0 ? 0.13 : 0.06} />
        ))}
      </Svg>
    </View>
  );
}

// ── Frame art preview ────────────────────────────────────────────────────────

/**
 * Real frame art preview — ProfileFrameArt's bespoke SVG ring wrapped around
 * a mini portrait vignette (matching ProfileScreen's avatar footprint), so
 * store cards show the actual frame framing a picture. Locked/unowned
 * cards render it dimmed via `dimmed`.
 */
/**
 * Pick the portrait variant for a frame card. Keyed on the card's INDEX in the
 * rendered list, stepped by the four-variant rotation, so cards 0..3 are always
 * four different characters and no two neighbours (row-wise or column-wise in a
 * 2-up grid) repeat. The id only breaks ties when no index is available (the
 * detail modal for an item that isn't in the current list), where it falls back
 * to the catalog's own hash.
 */
function portraitVariantFor(frameId: string, index?: number): string {
  const order = AVATAR_VARIANT_ORDER;
  if (index === undefined || index < 0) {
    return order[hashAvatarSeed(frameId) % order.length];
  }
  return order[index % order.length];
}

function FramePreview({
  frameId,
  portraitIndex,
  size = FRAME_PREVIEW_SIZE,
  dimmed = false,
}: {
  frameId: string;
  /** Index of this frame in the rendered list — drives the portrait variant. */
  portraitIndex?: number;
  size?: number;
  dimmed?: boolean;
}) {
  // Avatar disc at ~88% of size so the frame band seats on its rim
  // (same ratio ProfileScreen uses: 88px disc in a 100px frame).
  const discSize = Math.round(size * 0.88);
  // The portrait borrows the frame art's own accent so each ring frames a
  // picture in its own hue rather than the same dark bust every time.
  const accent = useMemo(() => resolveFrameArt(frameId).accent, [frameId]);
  const variant = useMemo(
    () => portraitVariantFor(frameId, portraitIndex),
    [frameId, portraitIndex],
  );
  return (
    <View style={dimmed && { opacity: 0.55 }}>
      <ProfileFrameArt frameId={frameId} size={size}>
        <View
          style={{
            width: discSize,
            height: discSize,
            borderRadius: discSize / 2,
            overflow: 'hidden',
            backgroundColor: 'rgba(10,0,21,0.92)',
          }}
        >
          {/* Illustrated Word Architect portrait, variant keyed by the card's
              list position so adjacent frame cards never enclose the same
              figure (an id hash clumped the first visible cards). */}
          <AvatarPortrait size={discSize} accent={accent} variant={variant} />
        </View>
      </ProfileFrameArt>
    </View>
  );
}

// ── Normalize data into a common shape ───────────────────────────────────────

function normalizeThemes(
  themes: CosmeticTheme[],
  unlockedCosmetics: string[],
  equippedTheme: string,
): NormalizedItem[] {
  return themes.map((t, i) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    // Real per-theme tier from the catalog. This used to be hardcoded 'rare',
    // so every visible theme card wore the same chip and the rarity ladder
    // communicated no tiering at all — it also fed rarityTreatment(), meaning
    // the backplate/glow/sunburst were flat across the whole tab.
    rarity: t.rarity,
    listIndex: i,
    owned: t.id === 'default' || unlockedCosmetics.includes(t.id),
    equipped: equippedTheme === t.id,
    costCurrency: t.cost?.currency,
    costAmount: t.cost?.amount,
    preview: t.colors,
    tabType: 'themes' as const,
  }));
}

function normalizeFrames(
  frames: ProfileFrame[],
  unlockedCosmetics: string[],
  equippedFrame: string,
): NormalizedItem[] {
  return frames.map((f, i) => ({
    id: f.id,
    name: f.name,
    description: f.source,
    rarity: f.rarity,
    listIndex: i,
    owned: f.id === 'default' || unlockedCosmetics.includes(f.id),
    equipped: equippedFrame === f.id,
    source: f.source,
    tabType: 'frames' as const,
  }));
}

function normalizeTitles(
  titles: ProfileTitle[],
  unlockedCosmetics: string[],
  equippedTitle: string,
): NormalizedItem[] {
  return titles.map((t, i) => ({
    id: t.id,
    name: t.title,
    description: t.source,
    rarity: 'common' as const,
    listIndex: i,
    owned: t.id === 'title_newcomer' || unlockedCosmetics.includes(t.id),
    equipped: equippedTitle === t.id,
    source: t.source,
    tabType: 'titles' as const,
  }));
}

function normalizeDecorations(
  decorations: LibraryDecoration[],
  unlockedCosmetics: string[],
): NormalizedItem[] {
  return decorations.map((d, i) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    icon: d.icon,
    rarity: d.rarity,
    listIndex: i,
    owned: unlockedCosmetics.includes(d.id),
    equipped: false,
    costCurrency: d.cost?.currency,
    costAmount: d.cost?.amount,
    tabType: 'decorations' as const,
  }));
}

// ── Component ────────────────────────────────────────────────────────────────

interface CosmeticStoreScreenProps {
  navigation?: any;
}

const CosmeticStoreScreen: React.FC<CosmeticStoreScreenProps> = ({ navigation }) => {
  const coins = useEconomyStore(selectCoins);
  const gems = useEconomyStore(selectGems);
  const libraryPoints = useEconomyStore(selectLibraryPoints);
  const { canAfford, spendCoins, spendGems } = useEconomyActions();
  // spendLibraryPoints is not yet part of the EconomyActions Pick (defined in
  // economyStore.ts), so read it off the full context.
  const { spendLibraryPoints } = useEconomy();
  const equippedFrame = usePlayerStore(selectEquippedFrame);
  const equippedTheme = usePlayerStore(selectEquippedTheme);
  const equippedTitle = usePlayerStore(selectEquippedTitle);
  const placedDecorations = usePlayerStore(selectPlacedDecorations);
  const unlockedCosmetics = usePlayerStore(selectUnlockedCosmetics);
  const { equipCosmetic, unlockCosmetic, unlockDecoration } = usePlayerActions();

  const [activeTab, setActiveTab] = useState<TabId>('themes');
  const [selectedItem, setSelectedItem] = useState<NormalizedItem | null>(null);

  // Build normalized items from data + player state
  const items = useMemo(() => {
    const unlocked = unlockedCosmetics ?? [];
    return {
      themes: normalizeThemes(COSMETIC_THEMES, unlocked, equippedTheme),
      frames: normalizeFrames(PROFILE_FRAMES, unlocked, equippedFrame),
      titles: normalizeTitles(PROFILE_TITLES, unlocked, equippedTitle),
      decorations: normalizeDecorations(LIBRARY_DECORATIONS, unlocked),
    };
  }, [unlockedCosmetics, equippedTheme, equippedFrame, equippedTitle]);

  const currentItems = items[activeTab];

  // ── Purchase logic ──────────────────────────────────────────────────────

  const handlePurchase = useCallback(
    (item: NormalizedItem) => {
      if (!item.costCurrency || !item.costAmount) {
        Alert.alert('Not for Sale', 'This item is earned through gameplay.');
        return;
      }

      if (item.costCurrency === 'libraryPoints') {
        if ((libraryPoints ?? 0) < item.costAmount) {
          Alert.alert('Not Enough Lore', `You need ${item.costAmount} Lore.`);
          return;
        }
      } else if (!canAfford(item.costCurrency as 'coins' | 'gems', item.costAmount)) {
        Alert.alert(
          'Not Enough ' + (item.costCurrency === 'coins' ? 'Coins' : 'Gems'),
          `You need ${item.costAmount} ${item.costCurrency}.`,
        );
        return;
      }

      // Spend currency — every spend* returns false when the balance is
      // short, so bail without unlocking if the debit did not land.
      if (item.costCurrency === 'coins') {
        if (!spendCoins(item.costAmount)) return;
      } else if (item.costCurrency === 'gems') {
        if (!spendGems(item.costAmount)) return;
      } else if (item.costCurrency === 'libraryPoints') {
        if (!spendLibraryPoints(item.costAmount)) return;
      }

      // Decorations have their own ledger (ownedDecorations, written by
      // unlockDecoration). unlockCosmetic early-returns for any id that is
      // not a theme/frame/title, so routing a decoration through it charged
      // the currency, recorded nothing, and left the item buyable forever.
      if (item.tabType === 'decorations') {
        unlockDecoration(item.id);
      } else {
        unlockCosmetic(item.id);
      }
      setSelectedItem((prev) =>
        prev && prev.id === item.id ? { ...prev, owned: true } : prev,
      );
    },
    [libraryPoints, canAfford, spendCoins, spendGems, spendLibraryPoints, unlockCosmetic, unlockDecoration],
  );

  const handleEquip = useCallback(
    (item: NormalizedItem) => {
      switch (item.tabType) {
        case 'themes':
          equipCosmetic('theme', item.id);
          break;
        case 'frames':
          equipCosmetic('frame', item.id);
          break;
        case 'titles':
          equipCosmetic('title', item.id);
          break;
        case 'decorations':
          setSelectedItem(null);
          if (navigation) navigation.navigate('Library');
          return;
      }
      setSelectedItem(null);
    },
    [equipCosmetic, navigation],
  );

  // ── Render helpers ──────────────────────────────────────────────────────

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as [string, string]}
        style={[StyleSheet.absoluteFillObject, { borderRadius: RADIUS.xl }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => setActiveTab(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${tab.label} tab`}
          >
            {active && (
              <LinearGradient
                colors={[COLORS.accent + '30', COLORS.purple + '14'] as [string, string]}
                style={[StyleSheet.absoluteFillObject, { borderRadius: RADIUS.lg }]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
            )}
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View style={[styles.tabIndicator, active && styles.tabIndicatorActive]} />
          </Pressable>
        );
      })}
    </View>
  );

  const renderThemePreview = (
    id: string,
    colors: CosmeticTheme['colors'],
    previewWidth: number,
    cornerRadius?: number,
  ) => (
    <ThemePreview theme={{ id, colors }} width={previewWidth} cornerRadius={cornerRadius} />
  );

  const canAffordItem = useCallback(
    (item: NormalizedItem): boolean => {
      if (!item.costCurrency || !item.costAmount) return false;
      if (item.costCurrency === 'libraryPoints') {
        return (libraryPoints ?? 0) >= item.costAmount;
      }
      return canAfford(item.costCurrency as 'coins' | 'gems', item.costAmount);
    },
    [libraryPoints, canAfford],
  );

  const formatPrice = (amount: number): string => amount.toLocaleString();

  const renderItemCard = (item: NormalizedItem) => {
    const rarityColor = RARITY_COLORS[item.rarity] ?? COLORS.rarityCommon;
    const isEquipped = item.equipped;
    const isOwned = item.owned;
    const hasCost = !!(item.costCurrency && item.costAmount);
    const affordable = hasCost && !isOwned ? canAffordItem(item) : true;
    const isThemeCard = item.tabType === 'themes' && !!item.preview;
    const isFrameCard = item.tabType === 'frames' && !item.icon;
    const treat = rarityTreatment(item.rarity, rarityColor);

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.card,
          { borderColor: treat.borderColor, borderWidth: treat.borderWidth },
          isEquipped
            ? {
                borderColor: COLORS.accent + '99',
                borderWidth: Math.max(treat.borderWidth, 1.75),
                ...SHADOWS.glow(COLORS.accent),
              }
            : treat.glow,
          pressed && styles.pressedScale,
        ]}
        onPress={() => setSelectedItem(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.rarity} rarity${
          isEquipped ? ', equipped' : isOwned ? ', owned' : ''
        }`}
      >
        {/* Tiered rarity backplate — common flat, higher tiers tinted */}
        <LinearGradient
          colors={treat.body}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Full-bleed theme world preview */}
        {isThemeCard && (
          <View style={styles.themeBleed}>
            {renderThemePreview(item.id, item.preview!, THEME_PREVIEW_WIDTH, 0)}
          </View>
        )}

        {/* Legendary corner sunburst */}
        {treat.sunburst && <CornerSunburst color={rarityColor} />}

        {/* Rarity top edge */}
        <LinearGradient
          colors={['transparent', rarityColor, 'transparent'] as [string, string, string]}
          style={styles.rarityTopEdge}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />

        {/* Rarity badge \u2014 overlaid on the vignette for theme cards */}
        <View
          style={[
            styles.rarityBadge,
            { backgroundColor: rarityColor + '26', borderColor: rarityColor + '66' },
            isThemeCard && styles.rarityBadgeOverlay,
          ]}
        >
          <Text style={[styles.rarityText, { color: rarityColor }]}>
            {RARITY_LABELS[item.rarity] ?? 'COMMON'}
          </Text>
        </View>

        {/* Preview area (non-theme tabs) */}
        {!isThemeCard && (
          <View style={[styles.cardPreviewArea, isFrameCard && styles.cardPreviewAreaFrame]}>
            {item.icon ? (
              <IconMedallion glyph={item.icon} size={48} accent={rarityColor} />
            ) : item.tabType === 'frames' ? (
              <FramePreview
                frameId={item.id}
                portraitIndex={item.listIndex}
                dimmed={!isOwned}
              />
            ) : (
              <IconMedallion
                glyph={item.tabType === 'titles' ? '\u{1F3F7}\uFE0F' : '\u{2728}'}
                size={48}
                accent={rarityColor}
              />
            )}
          </View>
        )}

        {/* Name */}
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Status / Price */}
        {isEquipped ? (
          <View style={styles.equippedBadge}>
            <Text style={styles.equippedText}>EQUIPPED</Text>
          </View>
        ) : isOwned ? (
          <View style={styles.ownedBadge}>
            <Text style={styles.ownedText}>{'\u2713'} OWNED</Text>
          </View>
        ) : hasCost ? (
          <View style={[styles.priceChip, !affordable && styles.priceChipUnaffordable]}>
            <Text style={[styles.priceIcon, !affordable && styles.priceIconUnaffordable]}>
              {CURRENCY_ICONS[item.costCurrency!] ?? '\u{1FA99}'}
            </Text>
            <Text style={[styles.priceText, !affordable && styles.priceTextUnaffordable]}>
              {formatPrice(item.costAmount!)}
            </Text>
          </View>
        ) : (
          <Text style={styles.earnLabel}>Earn in-game</Text>
        )}
      </Pressable>
    );
  };

  // ── Detail Modal ────────────────────────────────────────────────────────

  const renderDetailModal = () => {
    if (!selectedItem) return null;

    // Re-derive owned/equipped from current player state
    const unlocked = unlockedCosmetics ?? [];
    const isOwned =
      selectedItem.id === 'default' ||
      selectedItem.id === 'title_newcomer' ||
      unlocked.includes(selectedItem.id);
    const isEquipped =
      (selectedItem.tabType === 'themes' && equippedTheme === selectedItem.id) ||
      (selectedItem.tabType === 'frames' && equippedFrame === selectedItem.id) ||
      (selectedItem.tabType === 'titles' && equippedTitle === selectedItem.id) ||
      (selectedItem.tabType === 'decorations' &&
        Object.values(placedDecorations ?? {}).includes(selectedItem.id));

    const rarityColor = RARITY_COLORS[selectedItem.rarity] ?? COLORS.rarityCommon;
    const hasCost = selectedItem.costCurrency && selectedItem.costAmount;

    return (
      <Modal
        transparent
        visible={!!selectedItem}
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedItem(null)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          <View style={[styles.modalCard, { borderColor: rarityColor + '55', ...SHADOWS.glow(rarityColor) }]}>
            <LinearGradient
              colors={[...GRADIENTS.victoryCard]}
              style={StyleSheet.absoluteFill}
            />
            {/* Rarity top edge */}
            <LinearGradient
              colors={['transparent', rarityColor, 'transparent'] as [string, string, string]}
              style={styles.rarityTopEdge}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            />
            {/* Close button */}
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressedScale]}
              onPress={() => setSelectedItem(null)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <Text style={styles.closeButtonText}>{'\u2715'}</Text>
            </Pressable>

            {/* Rarity */}
            <View style={[styles.modalRarityBadge, { backgroundColor: rarityColor + '25', borderColor: rarityColor + '66' }]}>
              <Text style={[styles.modalRarityText, { color: rarityColor }]}>
                {RARITY_LABELS[selectedItem.rarity] ?? 'COMMON'}
              </Text>
            </View>

            {/* Large preview */}
            <View style={styles.modalPreview}>
              {selectedItem.tabType === 'themes' && selectedItem.preview ? (
                renderThemePreview(
                  selectedItem.id,
                  selectedItem.preview,
                  Math.min(width - 96, 312),
                )
              ) : selectedItem.icon ? (
                <IconMedallion glyph={selectedItem.icon} size={80} accent={rarityColor} />
              ) : selectedItem.tabType === 'frames' ? (
                <FramePreview
                  frameId={selectedItem.id}
                  portraitIndex={selectedItem.listIndex}
                  size={Math.min(width - 140, 176)}
                  dimmed={!isOwned}
                />
              ) : (
                <IconMedallion
                  glyph={selectedItem.tabType === 'titles' ? '\u{1F3F7}\uFE0F' : '\u{2728}'}
                  size={80}
                  accent={rarityColor}
                />
              )}
            </View>

            {/* Name & Description */}
            <Text style={styles.modalName}>
              {selectedItem.tabType === 'titles' ? getTitleLabel(selectedItem.id) : selectedItem.name}
            </Text>
            <Text style={styles.modalDescription}>{selectedItem.description}</Text>

            {selectedItem.source && selectedItem.tabType !== 'themes' && (
              <Text style={styles.modalSource}>
                How to get: {selectedItem.source ?? selectedItem.description}
              </Text>
            )}

            {/* Action button */}
            {(() => {
              const canBuy = hasCost && canAffordItem(selectedItem);
              return isEquipped ? (
                <View style={styles.equippedButtonDisabled}>
                  <Text style={styles.equippedButtonText}>CURRENTLY EQUIPPED</Text>
                </View>
              ) : isOwned ? (
                <PrimaryButton
                  label={selectedItem.tabType === 'decorations' ? 'PLACE IN LIBRARY' : 'EQUIP'}
                  onPress={() => handleEquip(selectedItem)}
                  variant="primary"
                  size="large"
                  fullWidth
                  style={styles.modalActionButton}
                />
              ) : hasCost && canBuy ? (
                <PrimaryButton
                  label={`BUY ${CURRENCY_ICONS[selectedItem.costCurrency!]} ${formatPrice(selectedItem.costAmount!)}`}
                  onPress={() => handlePurchase(selectedItem)}
                  variant="gold"
                  size="large"
                  fullWidth
                  accessibilityLabel={`Buy ${selectedItem.name} for ${formatPrice(selectedItem.costAmount!)} ${selectedItem.costCurrency}`}
                  style={styles.modalActionButton}
                />
              ) : hasCost && !canBuy ? (
                <View style={styles.cantAffordButton}>
                  <Text style={styles.cantAffordButtonText}>
                    {CURRENCY_ICONS[selectedItem.costCurrency!]}{' '}
                    {formatPrice(selectedItem.costAmount!)} — Can't Afford
                  </Text>
                </View>
              ) : (
                <View style={styles.earnButton}>
                  <Text style={styles.earnButtonText}>Earn through gameplay</Text>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <ScreenScaffold
      title="COSMETICS"
      eyebrow="STYLE VAULT"
      accent={COLORS.purple}
      backdrop="shop"
      onBack={navigation ? () => navigation.goBack() : undefined}
      scroll={false}
      headerRight={
        <View style={styles.currencyCluster}>
          <View style={styles.currencyChip}>
            <Text style={styles.currencyGlyph}>{'\u{1FA99}'}</Text>
            <Text style={styles.currencyText}>{coins.toLocaleString()}</Text>
          </View>
          <View style={styles.currencyChip}>
            <Text style={styles.currencyGlyph}>{'\u{1F48E}'}</Text>
            <Text style={[styles.currencyText, { color: COLORS.cyan }]}>
              {gems.toLocaleString()}
            </Text>
          </View>
          {activeTab === 'decorations' && (
            <View style={styles.currencyChip}>
              <GameIcon name="bookOpen" size={12} accent={COLORS.purple} />
              <Text style={[styles.currencyText, { color: COLORS.purple }]}>
                {(libraryPoints ?? 0).toLocaleString()} LORE
              </Text>
            </View>
          )}
        </View>
      }
    >
      {renderTabBar()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {currentItems.map((item) => renderItemCard(item))}
        {/* Bottom spacing */}
        <View style={{ height: 40, width: '100%' }} />
      </ScrollView>

      {renderDetailModal()}
    </ScreenScaffold>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pressedScale: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },

  // Header currency cluster
  currencyCluster: {
    alignItems: 'flex-end',
    gap: 4,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceGlass,
  },
  currencyGlyph: {
    fontSize: 10,
  },
  currencyText: {
    fontFamily: FONTS.display,
    fontSize: 11,
    color: COLORS.gold,
    fontVariant: ['tabular-nums'],
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 4,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  tabPressed: {
    opacity: 0.8,
  },
  tabText: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  tabIndicator: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  tabIndicatorActive: {
    backgroundColor: COLORS.accent,
    ...SHADOWS.neonEdge(COLORS.accent),
  },

  // Grid
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: CARD_GAP,
    paddingBottom: 90,
  },

  // Card — rarity drives border, glow, and top edge
  card: {
    width: CARD_WIDTH,
    borderRadius: RADIUS.xl,
    padding: CARD_PADDING,
    borderWidth: CARD_BORDER,
    minHeight: 170,
    overflow: 'hidden',
  },
  // Legendary corner sunburst, anchored to the card's top-right corner.
  cornerSunburst: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 104,
    height: 104,
  },
  rarityTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
  },

  // Rarity badge
  rarityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  rarityText: {
    fontFamily: FONTS.display,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  rarityBadgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    marginBottom: 0,
    backgroundColor: 'rgba(8,2,20,0.62)',
    zIndex: 2,
  },

  // Full-bleed theme vignette — escapes the card padding so the theme's
  // world fills the card edge-to-edge; card overflow clips the top corners.
  // Full-bleed theme vignette — escapes the card padding AND the border inset
  // so the theme's world reaches both card edges with no dark margin. The
  // preview is rendered at >= the container width (see THEME_PREVIEW_WIDTH),
  // centered, and any overflow is clipped here rather than leaving a gap.
  themeBleed: {
    marginTop: -CARD_PADDING,
    marginHorizontal: -CARD_PADDING,
    marginBottom: 10,
    height: THEME_PREVIEW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: RADIUS.xl - CARD_BORDER,
    borderTopRightRadius: RADIUS.xl - CARD_BORDER,
    overflow: 'hidden',
  },

  // Preview area
  cardPreviewArea: {
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  // Frames tab — the ring IS the product, so it fills the card's padding box.
  cardPreviewAreaFrame: {
    minHeight: FRAME_PREVIEW_SIZE,
    marginTop: 2,
    marginBottom: 10,
  },

  // Card name
  cardName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  // Status badges
  equippedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent + '30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.accent + '50',
  },
  equippedText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  ownedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.green + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ownedText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: COLORS.green,
    letterSpacing: 0.5,
  },

  // Price capsule
  priceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '55',
    backgroundColor: COLORS.gold + '14',
  },
  priceIcon: {
    fontSize: 12,
  },
  priceText: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: COLORS.gold,
    fontVariant: ['tabular-nums'],
  },
  priceChipUnaffordable: {
    opacity: 0.5,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  priceIconUnaffordable: {
    opacity: 0.6,
  },
  priceTextUnaffordable: {
    color: COLORS.textMuted,
  },
  earnLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  // ── Modal ──────────────────────────────────────────────────────────────

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.xxl,
    padding: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },

  modalRarityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalRarityText: {
    fontFamily: FONTS.display,
    fontSize: 11,
    letterSpacing: 1.5,
  },

  modalPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 80,
  },
  modalName: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalDescription: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  modalSource: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },

  // Action buttons
  modalActionButton: {
    marginTop: 8,
  },
  equippedButtonDisabled: {
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  equippedButtonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  cantAffordButton: {
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.coral + '30',
    opacity: 0.7,
  },
  cantAffordButtonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.coral,
    letterSpacing: 0.5,
  },
  earnButton: {
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  earnButtonText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.textMuted,
  },
});

export default CosmeticStoreScreen;
