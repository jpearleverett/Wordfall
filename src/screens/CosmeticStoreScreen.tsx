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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { COLORS, GRADIENTS, SHADOWS, FONTS, RADIUS } from '../constants';
import { gradId } from '../components/icons/IconBase';
import ScreenScaffold from '../components/common/ScreenScaffold';
import IconMedallion from '../components/common/IconMedallion';
import ThemePreview from '../components/cosmetics/ThemePreview';
import { ProfileFrameArt } from '../components/cosmetics/ProfileFrameArt';
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
// Theme previews bleed edge-to-edge across the card (only the 1.5px border
// insets them), rendered square-cornered and clipped by the card's radius.
const THEME_PREVIEW_WIDTH = CARD_WIDTH - 3;

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

// ── Frame art preview ────────────────────────────────────────────────────────

/**
 * Placeholder avatar for frame previews — a miniature synthwave portrait
 * vignette (sunset disc over a neon grid floor with a neutral head-and-
 * shoulders silhouette) so frames read as framing a PICTURE. Deliberately
 * muted so the frame itself stays the hero.
 */
function PortraitVignette({ size }: { size: number }) {
  const ids = useMemo(() => {
    const base = gradId('frameport');
    return { sky: `${base}-sky`, sun: `${base}-sun`, sil: `${base}-sil`, clip: `${base}-clip` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const gridStroke = 'rgba(255,45,149,0.30)';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#150a2b" />
          <Stop offset="0.55" stopColor="#2b1046" />
          <Stop offset="1" stopColor="#0a0218" />
        </SvgGradient>
        <SvgGradient id={ids.sun} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffd76a" />
          <Stop offset="1" stopColor="#ff2d95" />
        </SvgGradient>
        <SvgGradient id={ids.sil} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3b2364" />
          <Stop offset="1" stopColor="#170930" />
        </SvgGradient>
        <ClipPath id={ids.clip}>
          <Circle cx={50} cy={50} r={50} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${ids.clip})`}>
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${ids.sky})`} />
        {/* Sunset disc with scanline slits */}
        <Circle cx={50} cy={52} r={22} fill={`url(#${ids.sun})`} opacity={0.6} />
        <Rect x={26} y={46} width={48} height={1.6} fill="#1c0c36" opacity={0.75} />
        <Rect x={26} y={51.5} width={48} height={2.2} fill="#1c0c36" opacity={0.75} />
        <Rect x={26} y={58} width={48} height={2.8} fill="#1c0c36" opacity={0.75} />
        {/* Horizon + perspective grid floor */}
        <Path d="M0 62 H100" stroke="#ff2d95" strokeWidth={1} opacity={0.5} />
        <Path d="M0 68 H100" stroke={gridStroke} strokeWidth={0.8} />
        <Path d="M0 76 H100" stroke={gridStroke} strokeWidth={0.8} />
        <Path d="M0 87 H100" stroke={gridStroke} strokeWidth={0.8} />
        {[14, 32, 68, 86].map((x) => (
          <Path key={`v${x}`} d={`M50 62 L${x} 100`} stroke={gridStroke} strokeWidth={0.8} />
        ))}
        {/* Neutral head-and-shoulders silhouette */}
        <Circle cx={50} cy={42} r={14.5} fill={`url(#${ids.sil})`} />
        <Path d="M21 100 C23 74 34 63 50 63 C66 63 77 74 79 100 Z" fill={`url(#${ids.sil})`} />
        {/* Faint rim light so the silhouette reads against the sun */}
        <Path d="M38.5 34.5 A14.5 14.5 0 0 1 61.5 34.5" stroke="#ffb3d6" strokeWidth={1.1} opacity={0.35} fill="none" />
        {/* Soft top sheen + bottom vignette */}
        <Rect x={0} y={0} width={100} height={26} fill="#ffffff" opacity={0.04} />
        <Rect x={0} y={84} width={100} height={16} fill="#05000f" opacity={0.35} />
      </G>
      <Circle cx={50} cy={50} r={49.2} stroke="rgba(255,255,255,0.08)" strokeWidth={1} fill="none" />
    </Svg>
  );
}

/**
 * Real frame art preview — ProfileFrameArt's bespoke SVG ring wrapped around
 * a mini portrait vignette (matching ProfileScreen's avatar footprint), so
 * store cards show the actual frame framing a picture. Locked/unowned
 * cards render it dimmed via `dimmed`.
 */
function FramePreview({
  frameId,
  size = 76,
  dimmed = false,
}: {
  frameId: string;
  size?: number;
  dimmed?: boolean;
}) {
  // Avatar disc at ~88% of size so the frame band seats on its rim
  // (same ratio ProfileScreen uses: 88px disc in a 100px frame).
  const discSize = Math.round(size * 0.88);
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
          <PortraitVignette size={discSize} />
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
  return themes.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    rarity: 'rare' as const,
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
  return frames.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.source,
    rarity: f.rarity,
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
  return titles.map((t) => ({
    id: t.id,
    name: t.title,
    description: t.source,
    rarity: 'common' as const,
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
  return decorations.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    icon: d.icon,
    rarity: d.rarity,
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

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.card,
          { borderColor: rarityColor + '55' },
          isEquipped
            ? { borderColor: COLORS.accent + '88', ...SHADOWS.glow(COLORS.accent) }
            : SHADOWS.glow(rarityColor),
          pressed && styles.pressedScale,
        ]}
        onPress={() => setSelectedItem(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.rarity} rarity${
          isEquipped ? ', equipped' : isOwned ? ', owned' : ''
        }`}
      >
        {/* Rarity-tinted body gradient */}
        <LinearGradient
          colors={[rarityColor + '16', 'rgba(26,10,46,0.94)'] as [string, string]}
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
          <View style={styles.cardPreviewArea}>
            {item.icon ? (
              <IconMedallion glyph={item.icon} size={48} accent={rarityColor} />
            ) : item.tabType === 'frames' ? (
              <FramePreview frameId={item.id} size={76} dimmed={!isOwned} />
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
                <FramePreview frameId={selectedItem.id} size={120} dimmed={!isOwned} />
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
    padding: 12,
    borderWidth: 1.5,
    minHeight: 170,
    overflow: 'hidden',
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
  themeBleed: {
    marginTop: -12,
    marginHorizontal: -12,
    marginBottom: 10,
    borderTopLeftRadius: RADIUS.xl - 1.5,
    borderTopRightRadius: RADIUS.xl - 1.5,
    overflow: 'hidden',
  },

  // Preview area
  cardPreviewArea: {
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
