import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS, RADIUS, SHADOWS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import IconMedallion from '../components/common/IconMedallion';
import NeonProgressBar from '../components/common/NeonProgressBar';
import { bentoPanel, bentoHeaderStyles, bentoDividerColor } from '../styles/bentoPanel';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { SkeletonCard } from '../components/common/Skeleton';
import {
  usePlayerStore,
  usePlayerActions,
  selectCollections,
  selectTooltipsShown,
} from '../stores/playerStore';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { ATLAS_PAGES } from '../data/collections';

const { width } = Dimensions.get('window');
const TILE_SIZE = (width - 80) / 7;

const TABS = ['Word Atlas', 'Rare Tiles', 'Seasonal Stamps'] as const;
type TabName = typeof TABS[number];

/** Each collection tab carries its own neon accent so the sliding pill and
 *  section chrome recolor as you move through the treasury. */
const TAB_ACCENT: Record<TabName, string> = {
  'Word Atlas': COLORS.cyan,
  'Rare Tiles': COLORS.gold,
  'Seasonal Stamps': COLORS.purple,
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Rarity tinting for the letter vault — scarce letters read as treasure. */
type LetterRarity = 'common' | 'rare' | 'epic' | 'legendary';
const RARITY_COLOR: Record<LetterRarity, string> = {
  common: COLORS.rarityCommon,
  rare: COLORS.rarityRare,
  epic: COLORS.rarityEpic,
  legendary: COLORS.rarityLegendary,
};
function letterRarity(letter: string): LetterRarity {
  if ('JQZX'.includes(letter)) return 'legendary';
  if ('KVWY'.includes(letter)) return 'epic';
  if ('BFGHMPUD'.includes(letter)) return 'rare';
  return 'common';
}

const TILE_SETS = [
  { name: 'PUZZLE', letters: ['P', 'U', 'Z', 'L', 'E'] },
  { name: 'GRAVITY', letters: ['G', 'R', 'A', 'V', 'I', 'T', 'Y'] },
  { name: 'WORDFALL', letters: ['W', 'O', 'R', 'D', 'F', 'A', 'L'] },
  { name: 'STELLAR', letters: ['S', 'T', 'E', 'L', 'A', 'R'] },
];

const DEFAULT_STAMPS = [
  { id: 'spring1', name: 'First Bloom', icon: '\u{1F338}', collected: false },
  { id: 'spring2', name: 'Rain Shower', icon: '\u{1F327}️', collected: false },
  { id: 'spring3', name: 'Butterfly', icon: '\u{1F98B}', collected: false },
  { id: 'spring4', name: 'Seedling', icon: '\u{1F331}', collected: false },
  { id: 'spring5', name: 'Rainbow', icon: '\u{1F308}', collected: false },
  { id: 'spring6', name: 'Bird Song', icon: '\u{1F426}', collected: false },
  { id: 'spring7', name: 'Picnic', icon: '\u{1F9FA}', collected: false },
  { id: 'spring8', name: 'Garden', icon: '\u{1F33B}', collected: false },
  { id: 'spring9', name: 'Kite', icon: '\u{1FA81}', collected: false },
  { id: 'spring10', name: 'Egg Hunt', icon: '\u{1F95A}', collected: false },
  { id: 'spring11', name: 'Ladybug', icon: '\u{1F41E}', collected: false },
  { id: 'spring12', name: 'Cherry', icon: '\u{1F352}', collected: false },
];

/**
 * Looping gold sheen swept across a completed card. Reduce-motion users get
 * a static gold wash instead of the moving stripe.
 */
const CardShine: React.FC<{ reduceMotion: boolean }> = ({ reduceMotion }) => {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(2400),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, sweep]);

  if (reduceMotion) {
    return (
      <LinearGradient
        pointerEvents="none"
        colors={[...GRADIENTS.goldShine]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [
            {
              translateX: sweep.interpolate({
                inputRange: [0, 1],
                outputRange: [-width * 0.7, width],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,210,77,0.16)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.shineStripe}
      />
    </Animated.View>
  );
};

interface CollectionsScreenProps {
  collections?: any;
}

const CollectionsScreen: React.FC<CollectionsScreenProps> = ({ collections: collectionsProp }) => {
  const collectionsFromStore = usePlayerStore(selectCollections);
  const tooltipsShown = usePlayerStore(selectTooltipsShown);
  const { markTooltipShown } = usePlayerActions();
  const reduceMotion = useReduceMotion();
  // Loose typing preserved: `collections` prop is typed `any` (test/preview
  // bypass); fall back to the player store value otherwise.
  const collections: any = collectionsProp ?? collectionsFromStore;
  const [activeTab, setActiveTab] = useState<TabName>('Word Atlas');
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(
    !tooltipsShown.includes('collections_screen')
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Sliding neon pill behind the active tab (NeonTabBar pattern).
  const [barWidth, setBarWidth] = useState(0);
  const pillX = useRef(new Animated.Value(4)).current;
  const activeIndex = TABS.indexOf(activeTab);
  const activeAccent = TAB_ACCENT[activeTab];
  const pillWidth = barWidth > 0 ? (barWidth - 8) / TABS.length : 0;

  useEffect(() => {
    if (barWidth <= 0) return;
    const toValue = 4 + activeIndex * pillWidth;
    if (reduceMotion) {
      pillX.setValue(toValue);
      return;
    }
    Animated.spring(pillX, {
      toValue,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [activeIndex, barWidth, pillWidth, reduceMotion, pillX]);

  const atlasProgress: Record<string, string[]> = collections?.atlasPages ?? {};
  const atlasPages = ATLAS_PAGES.map(page => ({
    id: page.id,
    name: page.category,
    icon: page.icon,
    total: page.words.length,
    found: (atlasProgress[page.id] ?? []).length,
    words: page.words,
    foundWords: atlasProgress[page.id] ?? [],
  }));
  const [expandedAtlasId, setExpandedAtlasId] = useState<string | null>(null);
  const collectedTiles: string[] = collections?.rareTiles
    ? Object.keys(collections.rareTiles).filter(l => collections.rareTiles[l] > 0)
    : [];
  const stamps = collections?.stamps ?? DEFAULT_STAMPS;
  const seasonName = collections?.seasonName ?? 'Spring Awakening';

  const renderWordAtlas = () => {
    const completedPages = atlasPages.filter((p) => p.found >= p.total).length;
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.atlasGrid}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          label="WORD ATLAS"
          accent={COLORS.cyan}
          meta={`${completedPages}/${atlasPages.length} PAGES`}
        />
        {atlasPages.map((page: any) => {
          const isComplete = page.found >= page.total;
          const accent = isComplete ? COLORS.gold : COLORS.cyan;
          return (
            <React.Fragment key={page.id}>
              <Pressable
                style={({ pressed }) => [
                  styles.atlasCard,
                  bentoPanel(isComplete ? 'gold' : 'cyan', { padding: 14, marginBottom: 10 }),
                  pressed && styles.pressedCard,
                ]}
                onPress={() => setExpandedAtlasId(expandedAtlasId === page.id ? null : page.id)}
                accessibilityRole="button"
                accessibilityLabel={`${page.name}: ${page.found} of ${page.total} words found${isComplete ? ', complete' : ''}`}
                accessibilityState={{ expanded: expandedAtlasId === page.id }}
              >
                <LinearGradient
                  colors={[...GRADIENTS.surfaceCard]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <LinearGradient
                  colors={[accent + '21', 'transparent']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.9, y: 0.9 }}
                />
                {isComplete && <CardShine reduceMotion={reduceMotion} />}
                <IconMedallion
                  glyph={page.icon}
                  accent={accent}
                  size={46}
                  shape="squircle"
                  style={styles.atlasMedallion}
                />
                <View style={styles.atlasInfo}>
                  <Text style={[styles.atlasName, isComplete && styles.atlasNameComplete]}>
                    {page.name}
                  </Text>
                  <Text style={styles.atlasProgress}>
                    {page.found} / {page.total} words
                  </Text>
                  <NeonProgressBar
                    progress={page.total > 0 ? page.found / page.total : 0}
                    color={accent}
                    height={7}
                    showGlowDot={!isComplete}
                  />
                </View>
                {isComplete && (
                  <View style={styles.completeRibbon}>
                    <Text style={styles.completeRibbonText}>{'✓'} COMPLETE</Text>
                  </View>
                )}
              </Pressable>
              {expandedAtlasId === page.id && (
                <View style={styles.atlasWordList}>
                  {page.words.map((word: string) => {
                    const isFound = page.foundWords.includes(word);
                    return (
                      <View
                        key={word}
                        style={[styles.atlasWordChip, isFound && styles.atlasWordChipFound]}
                      >
                        <Text style={[styles.atlasWordText, !isFound && styles.atlasWordHidden]}>
                          {isFound ? word.toUpperCase() : '????'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </React.Fragment>
          );
        })}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  const renderRareTiles = () => {
    const totalCollected = collectedTiles.length;
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tilesContainer}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          label="RARE TILES"
          accent={COLORS.gold}
          meta={`${totalCollected}/26 COLLECTED`}
        />
        <View style={styles.vaultMeter}>
          <NeonProgressBar
            progress={totalCollected / 26}
            color={COLORS.gold}
            height={8}
          />
        </View>

        <View style={[styles.tileSetsSection, bentoPanel('gold', { padding: 16, marginBottom: 6 })]}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={[bentoHeaderStyles.row, { borderBottomColor: bentoDividerColor('gold') }]}>
            <Text style={bentoHeaderStyles.title}>TILE SETS</Text>
            <Text style={bentoHeaderStyles.meta}>
              {TILE_SETS.filter((s) => s.letters.every((l) => collectedTiles.includes(l))).length}/{TILE_SETS.length} DONE
            </Text>
          </View>
          {TILE_SETS.map((set) => {
            const collected = set.letters.filter((l) =>
              collectedTiles.includes(l),
            ).length;
            const isComplete = collected >= set.letters.length;
            return (
              <View key={set.name} style={styles.tileSetRow}>
                <View style={styles.tileSetInfo}>
                  <Text style={[styles.tileSetName, isComplete && styles.tileSetComplete]}>
                    {set.name}
                  </Text>
                  <Text style={styles.tileSetProgress}>
                    {collected}/{set.letters.length}
                  </Text>
                </View>
                <View style={styles.tileSetLetters}>
                  {set.letters.map((letter, idx) => {
                    const owned = collectedTiles.includes(letter);
                    return (
                      <View
                        key={`${set.name}-${letter}-${idx}`}
                        style={[
                          styles.miniTile,
                          owned ? styles.miniTileOwned : styles.miniTileMissing,
                        ]}
                      >
                        <Text
                          style={[
                            styles.miniTileText,
                            owned ? styles.miniTileTextOwned : styles.miniTileTextMissing,
                          ]}
                        >
                          {letter}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <SectionHeader label="LETTER VAULT" accent={COLORS.gold} meta="RARITY-TINTED" />
        <View style={styles.tilesGrid}>
          {ALPHABET.map((letter) => {
            const owned = collectedTiles.includes(letter);
            const rarityColor = RARITY_COLOR[letterRarity(letter)];
            return (
              <View
                key={letter}
                style={[
                  styles.tile,
                  owned
                    ? [styles.tileOwned, { borderColor: rarityColor }, SHADOWS.glow(rarityColor)]
                    : [styles.tileMissing, { borderColor: rarityColor + '3D' }],
                ]}
                accessibilityRole="text"
                accessibilityLabel={`Letter ${letter}, ${owned ? 'collected' : 'not collected'}`}
              >
                {owned && (
                  <LinearGradient
                    colors={[...GRADIENTS.button.gold]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                  />
                )}
                <Text
                  style={[
                    styles.tileText,
                    owned ? styles.tileTextOwned : styles.tileTextMissing,
                  ]}
                >
                  {letter}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  const renderSeasonalStamps = () => {
    const collectedCount = stamps.filter((s: any) => s.collected).length;
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.stampsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.seasonBanner, bentoPanel('purple', { padding: 20 })]}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <LinearGradient
            colors={[COLORS.purple + '2E', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <Text style={styles.seasonEyebrow}>SEASONAL ALBUM</Text>
          <Text style={styles.seasonName}>{seasonName}</Text>
          <Text style={styles.seasonProgress}>
            {collectedCount} / {stamps.length} stamps
          </Text>
          <View style={styles.seasonMeter}>
            <NeonProgressBar
              progress={stamps.length > 0 ? collectedCount / stamps.length : 0}
              color={COLORS.purple}
              height={8}
            />
          </View>
        </View>

        <View style={styles.stampsGrid}>
          {stamps.map((stamp: any) => (
            <View
              key={stamp.id}
              style={[
                styles.stampCard,
                stamp.collected
                  ? [bentoPanel('purple', { padding: 12, marginBottom: 0, borderRadius: RADIUS.xl })]
                  : styles.stampMissing,
              ]}
              accessibilityRole="text"
              accessibilityLabel={`Stamp: ${stamp.collected ? stamp.name : 'undiscovered'}, ${stamp.collected ? 'collected' : 'not collected'}`}
            >
              {stamp.collected && (
                <LinearGradient
                  colors={[...GRADIENTS.surfaceCard]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
              )}
              <IconMedallion
                glyph={stamp.icon}
                accent={COLORS.purple}
                size={44}
                muted={!stamp.collected}
                style={styles.stampMedallion}
              />
              <Text
                style={[
                  styles.stampName,
                  !stamp.collected && styles.stampNameDim,
                ]}
                numberOfLines={1}
              >
                {stamp.collected ? stamp.name : '???'}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  return (
    <ScreenScaffold
      title="COLLECTIONS"
      backdrop="collections"
      scroll={false}
      headerRight={
        <Image
          source={LOCAL_IMAGES.crystalGems}
          style={styles.headerGem}
          resizeMode="contain"
        />
      }
    >
      {/* First-visit coach mark — an IN-FLOW glass banner under the header.
          It pushes the tab bar + list down instead of floating over them
          (the old absolutely-positioned Tooltip occluded the atlas cards). */}
      {showTooltip && (
        <Pressable
          onPress={() => {
            setShowTooltip(false);
            markTooltipShown('collections_screen');
          }}
          style={({ pressed }) => [styles.coachBanner, pressed && styles.coachBannerPressed]}
          accessibilityRole="button"
          accessibilityLabel="Tip: Collect words, rare tiles, and seasonal stamps as you play. Complete sets for bonus rewards. Tap to dismiss"
        >
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <LinearGradient
            colors={[COLORS.cyan + '1F', 'transparent'] as [string, string]}
            style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <IconMedallion glyph={'\u{1F48E}'} accent={COLORS.cyan} size={30} shape="squircle" />
          <Text style={styles.coachBannerText}>
            Collect words, rare tiles & seasonal stamps — complete sets for bonus rewards!
          </Text>
          <View style={styles.coachDismiss}>
            <Text style={styles.coachDismissText}>{'✕'}</Text>
          </View>
        </Pressable>
      )}
      <View
        style={styles.tabBar}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        <LinearGradient
          colors={[...GRADIENTS.surface]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {pillWidth > 0 && (
          <Animated.View
            style={[
              styles.tabPill,
              {
                width: pillWidth,
                borderColor: activeAccent + '66',
                transform: [{ translateX: pillX }],
              },
              SHADOWS.neonEdge(activeAccent),
            ]}
          >
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <View style={[styles.tabPillUnderline, { backgroundColor: activeAccent }]} />
          </Animated.View>
        )}
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
            accessibilityLabel={tab}
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && [
                  styles.tabTextActive,
                  { color: TAB_ACCENT[tab], textShadowColor: TAB_ACCENT[tab] + '8C' },
                ],
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonCard style={{ height: 80 }} />
          <SkeletonCard style={{ height: 80 }} />
          <SkeletonCard style={{ height: 80 }} />
          <SkeletonCard style={{ height: 80 }} />
        </ScrollView>
      ) : (
        <>
          {activeTab === 'Word Atlas' && renderWordAtlas()}
          {activeTab === 'Rare Tiles' && renderRareTiles()}
          {activeTab === 'Seasonal Stamps' && renderSeasonalStamps()}
        </>
      )}
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  coachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.28)',
    overflow: 'hidden',
    // Opaque base so the hex-grid backdrop can't bleed through the
    // translucent gradient fill layered on top.
    backgroundColor: 'rgba(12,4,28,0.94)',
    ...SHADOWS.soft,
  },
  coachBannerPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.88,
  },
  coachBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  coachDismiss: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachDismissText: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  headerGem: {
    width: 30,
    height: 30,
  },
  shineStripe: {
    width: '60%',
    height: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: RADIUS.xl,
    padding: 4,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    ...SHADOWS.medium,
  },
  tabPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabPillUnderline: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: 26,
    height: 2.5,
    borderTopLeftRadius: RADIUS.sm,
    borderTopRightRadius: RADIUS.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  tabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  tabText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 0.3,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    fontFamily: FONTS.bodyBold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  tabContent: {
    flex: 1,
  },
  atlasGrid: {
    paddingHorizontal: 16,
  },
  atlasCard: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    // Opaque base under the gradient fills — reward content sits ON the
    // card instead of blending into the hex grid behind it.
    backgroundColor: 'rgba(12,4,28,0.96)',
  },
  pressedCard: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  atlasMedallion: {
    marginRight: 14,
  },
  atlasInfo: {
    flex: 1,
  },
  atlasName: {
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  atlasNameComplete: {
    color: COLORS.goldLight,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  atlasProgress: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  completeRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.gold,
    borderBottomLeftRadius: RADIUS.lg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    ...SHADOWS.glow(COLORS.gold),
  },
  completeRibbonText: {
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    color: COLORS.bg,
  },
  vaultMeter: {
    marginBottom: 16,
  },
  tilesContainer: {
    paddingHorizontal: 16,
  },
  tileSetsSection: {
    overflow: 'hidden',
    backgroundColor: 'rgba(12,4,28,0.96)',
  },
  tileSetRow: {
    marginBottom: 12,
  },
  tileSetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tileSetName: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
  tileSetComplete: {
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  tileSetProgress: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
  },
  tileSetLetters: {
    flexDirection: 'row',
    gap: 6,
  },
  miniTile: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTileOwned: {
    backgroundColor: COLORS.gold,
    ...SHADOWS.glow(COLORS.gold),
  },
  miniTileMissing: {
    backgroundColor: COLORS.cellDefault,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  miniTileText: {
    fontSize: 12,
    fontFamily: FONTS.display,
  },
  miniTileTextOwned: {
    color: COLORS.bg,
  },
  miniTileTextMissing: {
    color: COLORS.textMuted,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileOwned: {},
  tileMissing: {
    backgroundColor: COLORS.cellDefault,
  },
  tileText: {
    fontSize: 18,
    fontFamily: FONTS.display,
  },
  tileTextOwned: {
    color: COLORS.bg,
  },
  tileTextMissing: {
    color: COLORS.textMuted,
  },
  stampsContainer: {
    paddingHorizontal: 16,
  },
  seasonBanner: {
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: 'rgba(12,4,28,0.96)',
  },
  seasonEyebrow: {
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 3,
    color: COLORS.purpleLight,
    marginBottom: 4,
  },
  seasonName: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.purpleLight,
    marginBottom: 6,
    textShadowColor: COLORS.purpleGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  seasonProgress: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  seasonMeter: {
    alignSelf: 'stretch',
  },
  stampsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  stampCard: {
    width: (width - 68) / 3,
    borderRadius: RADIUS.xl,
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(12,4,28,0.96)',
  },
  stampMissing: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.borderDisabled,
  },
  stampMedallion: {
    marginBottom: 8,
  },
  stampName: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  stampNameDim: {
    color: COLORS.textMuted,
  },
  bottomSpacer: {
    height: 110,
  },
  atlasWordList: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(18,7,36,0.94)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.14)',
    marginTop: -4,
    marginBottom: 10,
  },
  atlasWordChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  atlasWordChipFound: {
    borderColor: 'rgba(0,229,255,0.45)',
    ...SHADOWS.soft,
  },
  atlasWordText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.cyan,
    letterSpacing: 1,
  },
  atlasWordHidden: {
    color: COLORS.textMuted,
  },
});

export default CollectionsScreen;
