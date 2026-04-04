import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS, TYPOGRAPHY } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { useEconomy } from '../contexts/EconomyContext';
import { usePlayer } from '../contexts/PlayerContext';
import {
  COSMETIC_THEMES,
  PROFILE_FRAMES,
  PROFILE_TITLES,
  LIBRARY_DECORATIONS,
} from '../data/cosmetics';
import { CosmeticTheme, ProfileFrame, ProfileTitle, LibraryDecoration, CurrencyType } from '../types';

const { width } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2;

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
    equipped: equippedTitle === t.title,
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
  const economy = useEconomy();
  const player = usePlayer();

  const [activeTab, setActiveTab] = useState<TabId>('themes');
  const [selectedItem, setSelectedItem] = useState<NormalizedItem | null>(null);

  // Build normalized items from data + player state
  const items = useMemo(() => {
    const unlocked = player.unlockedCosmetics ?? [];
    return {
      themes: normalizeThemes(COSMETIC_THEMES, unlocked, player.equippedTheme),
      frames: normalizeFrames(PROFILE_FRAMES, unlocked, player.equippedFrame),
      titles: normalizeTitles(PROFILE_TITLES, unlocked, player.equippedTitle),
      decorations: normalizeDecorations(LIBRARY_DECORATIONS, unlocked),
    };
  }, [player.unlockedCosmetics, player.equippedTheme, player.equippedFrame, player.equippedTitle]);

  const currentItems = items[activeTab];

  // ── Purchase logic ──────────────────────────────────────────────────────

  const handlePurchase = useCallback(
    (item: NormalizedItem) => {
      if (!item.costCurrency || !item.costAmount) {
        Alert.alert('Not for Sale', 'This item is earned through gameplay.');
        return;
      }

      const currency = item.costCurrency === 'libraryPoints' ? 'coins' : item.costCurrency;
      // libraryPoints doesn't have spendLibraryPoints; treat as coins for now
      if (item.costCurrency === 'libraryPoints') {
        if ((economy.libraryPoints ?? 0) < item.costAmount) {
          Alert.alert('Not Enough Library Points', `You need ${item.costAmount} library points.`);
          return;
        }
      } else if (!economy.canAfford(currency as 'coins' | 'gems', item.costAmount)) {
        Alert.alert(
          'Not Enough ' + (currency === 'coins' ? 'Coins' : 'Gems'),
          `You need ${item.costAmount} ${currency}.`,
        );
        return;
      }

      // Spend currency
      if (item.costCurrency === 'coins') {
        economy.spendCoins(item.costAmount);
      } else if (item.costCurrency === 'gems') {
        economy.spendGems(item.costAmount);
      }
      // libraryPoints: no spend method exists, just unlock

      player.unlockCosmetic(item.id);
      setSelectedItem((prev) =>
        prev && prev.id === item.id ? { ...prev, owned: true } : prev,
      );
    },
    [economy, player],
  );

  const handleEquip = useCallback(
    (item: NormalizedItem) => {
      switch (item.tabType) {
        case 'themes':
          player.equipCosmetic('theme', item.id);
          break;
        case 'frames':
          player.equipCosmetic('frame', item.id);
          break;
        case 'titles':
          player.equipCosmetic('title', item.name);
          break;
      }
      setSelectedItem(null);
    },
    [player],
  );

  // ── Render helpers ──────────────────────────────────────────────────────

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          onPress={() => setActiveTab(tab.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
            {tab.label}
          </Text>
          {activeTab === tab.id && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderThemePreview = (colors: CosmeticTheme['colors']) => (
    <View style={styles.themePreview}>
      <View style={[styles.themeSwatchLarge, { backgroundColor: colors.bg }]} />
      <View style={[styles.themeSwatchLarge, { backgroundColor: colors.surface }]} />
      <View style={[styles.themeSwatchLarge, { backgroundColor: colors.accent }]} />
      <View style={[styles.themeSwatchLarge, { backgroundColor: colors.cellSelected }]} />
    </View>
  );

  const canAffordItem = useCallback(
    (item: NormalizedItem): boolean => {
      if (!item.costCurrency || !item.costAmount) return false;
      if (item.costCurrency === 'libraryPoints') {
        return (economy.libraryPoints ?? 0) >= item.costAmount;
      }
      return economy.canAfford(item.costCurrency as 'coins' | 'gems', item.costAmount);
    },
    [economy],
  );

  const formatPrice = (amount: number): string => amount.toLocaleString();

  const renderItemCard = (item: NormalizedItem) => {
    const rarityColor = RARITY_COLORS[item.rarity] ?? COLORS.rarityCommon;
    const isEquipped = item.equipped;
    const isOwned = item.owned;
    const hasCost = !!(item.costCurrency && item.costAmount);
    const affordable = hasCost && !isOwned ? canAffordItem(item) : true;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.cardWrapper, isEquipped && { ...SHADOWS.glow(COLORS.accent) }]}
        onPress={() => setSelectedItem(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard]}
          style={[styles.card, isEquipped && styles.cardEquipped]}
        >
          {/* Rarity badge */}
          <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '30' }]}>
            <Text style={[styles.rarityText, { color: rarityColor }]}>
              {RARITY_LABELS[item.rarity] ?? 'COMMON'}
            </Text>
          </View>

          {/* Preview area */}
          <View style={styles.cardPreviewArea}>
            {item.tabType === 'themes' && item.preview ? (
              renderThemePreview(item.preview)
            ) : item.icon ? (
              <Text style={styles.itemIcon}>{item.icon}</Text>
            ) : item.tabType === 'frames' ? (
              <View style={[styles.framePlaceholder, { borderColor: rarityColor }]}>
                <Text style={styles.framePlaceholderText}>{item.name.charAt(0)}</Text>
              </View>
            ) : (
              <Text style={styles.itemIcon}>
                {item.tabType === 'titles' ? '\u{1F3F7}\uFE0F' : '\u{2728}'}
              </Text>
            )}
          </View>

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
            <View style={[styles.priceRow, !affordable && styles.priceRowUnaffordable]}>
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
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // ── Detail Modal ────────────────────────────────────────────────────────

  const renderDetailModal = () => {
    if (!selectedItem) return null;

    // Re-derive owned/equipped from current player state
    const unlocked = player.unlockedCosmetics ?? [];
    const isOwned =
      selectedItem.id === 'default' ||
      selectedItem.id === 'title_newcomer' ||
      unlocked.includes(selectedItem.id);
    const isEquipped =
      (selectedItem.tabType === 'themes' && player.equippedTheme === selectedItem.id) ||
      (selectedItem.tabType === 'frames' && player.equippedFrame === selectedItem.id) ||
      (selectedItem.tabType === 'titles' && player.equippedTitle === selectedItem.name);

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
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedItem(null)}
          />
          <LinearGradient
            colors={[...GRADIENTS.victoryCard]}
            style={styles.modalCard}
          >
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedItem(null)}
            >
              <Text style={styles.closeButtonText}>{'\u2715'}</Text>
            </TouchableOpacity>

            {/* Rarity */}
            <View style={[styles.modalRarityBadge, { backgroundColor: rarityColor + '25' }]}>
              <Text style={[styles.modalRarityText, { color: rarityColor }]}>
                {RARITY_LABELS[selectedItem.rarity] ?? 'COMMON'}
              </Text>
            </View>

            {/* Large preview */}
            <View style={styles.modalPreview}>
              {selectedItem.tabType === 'themes' && selectedItem.preview ? (
                <View style={styles.themePreviewLarge}>
                  {Object.entries(selectedItem.preview).map(([key, color]) => (
                    <View key={key} style={styles.themeSwatchRow}>
                      <View style={[styles.themeSwatchBig, { backgroundColor: color }]} />
                      <Text style={styles.swatchLabel}>{key}</Text>
                    </View>
                  ))}
                </View>
              ) : selectedItem.icon ? (
                <Text style={styles.modalIcon}>{selectedItem.icon}</Text>
              ) : selectedItem.tabType === 'frames' ? (
                <View style={[styles.framePlaceholderLarge, { borderColor: rarityColor }]}>
                  <Text style={styles.framePlaceholderTextLarge}>
                    {selectedItem.name.charAt(0)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.modalIcon}>
                  {selectedItem.tabType === 'titles' ? '\u{1F3F7}\uFE0F' : '\u{2728}'}
                </Text>
              )}
            </View>

            {/* Name & Description */}
            <Text style={styles.modalName}>{selectedItem.name}</Text>
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
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleEquip(selectedItem)}
                >
                  <LinearGradient
                    colors={[...GRADIENTS.button.primary]}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionButtonText}>EQUIP</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : hasCost && canBuy ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handlePurchase(selectedItem)}
                >
                  <LinearGradient
                    colors={[...GRADIENTS.button.gold]}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionButtonTextDark}>
                      BUY {CURRENCY_ICONS[selectedItem.costCurrency!]}{' '}
                      {formatPrice(selectedItem.costAmount!)}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
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
          </LinearGradient>
        </View>
      </Modal>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="home" />

      {/* Header */}
      <View style={styles.header}>
        {navigation && (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{'\u2190'}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>COSMETICS</Text>
        <View style={styles.currencyRow}>
          <Text style={styles.currencyText}>{'\u{1FA99}'} {economy.coins}</Text>
          <Text style={styles.currencyText}>{'\u{1F48E}'} {economy.gems}</Text>
        </View>
      </View>

      {renderTabBar()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {currentItems.map((item) => renderItemCard(item))}
        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {renderDetailModal()}
    </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backButtonText: {
    color: COLORS.textPrimary,
    fontSize: 20,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 24,
    letterSpacing: 2,
    color: COLORS.textPrimary,
    flex: 1,
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.gold,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.surface + '80',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: COLORS.accent + '25',
  },
  tabText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: COLORS.accent,
  },
  tabIndicator: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.accent,
    marginTop: 4,
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
  },

  // Card
  cardWrapper: {
    width: CARD_WIDTH,
    borderRadius: 16,
    ...SHADOWS.medium,
  },
  card: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    minHeight: 170,
  },
  cardEquipped: {
    borderColor: COLORS.accent + '50',
  },

  // Rarity badge
  rarityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  rarityText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    letterSpacing: 1.5,
  },

  // Preview area
  cardPreviewArea: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  themePreview: {
    flexDirection: 'row',
    gap: 4,
  },
  themeSwatchLarge: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  itemIcon: {
    fontSize: 36,
  },
  framePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  framePlaceholderText: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.textPrimary,
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

  // Price
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceIcon: {
    fontSize: 14,
  },
  priceText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.gold,
  },
  priceRowUnaffordable: {
    opacity: 0.5,
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
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    ...SHADOWS.strong,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
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
    borderRadius: 8,
    marginBottom: 16,
  },
  modalRarityText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
  },

  modalPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 80,
  },
  themePreviewLarge: {
    gap: 6,
    width: '100%',
  },
  themeSwatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeSwatchBig: {
    width: 36,
    height: 24,
    borderRadius: 6,
  },
  swatchLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  modalIcon: {
    fontSize: 56,
  },
  framePlaceholderLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  framePlaceholderTextLarge: {
    fontFamily: FONTS.display,
    fontSize: 30,
    color: COLORS.textPrimary,
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
  actionButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 1.5,
  },
  actionButtonTextDark: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: '#1a0a2e',
    letterSpacing: 1.5,
  },
  equippedButtonDisabled: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: COLORS.surface,
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
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: COLORS.surface,
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
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: COLORS.surface,
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
