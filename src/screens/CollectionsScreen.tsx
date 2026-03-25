import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { usePlayer } from '../contexts/PlayerContext';
import { Tooltip } from '../components/common/Tooltip';

const { width } = Dimensions.get('window');
const TILE_SIZE = (width - 80) / 7;

const TABS = ['Word Atlas', 'Rare Tiles', 'Seasonal Stamps'] as const;
type TabName = typeof TABS[number];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const TILE_SETS = [
  { name: 'PUZZLE', letters: ['P', 'U', 'Z', 'L', 'E'] },
  { name: 'GRAVITY', letters: ['G', 'R', 'A', 'V', 'I', 'T', 'Y'] },
  { name: 'WORDFALL', letters: ['W', 'O', 'R', 'D', 'F', 'A', 'L'] },
  { name: 'STELLAR', letters: ['S', 'T', 'E', 'L', 'A', 'R'] },
];

const DEFAULT_ATLAS_PAGES = [
  { id: 'animals', name: 'Animals', icon: '\u{1F981}', total: 25, found: 0 },
  { id: 'food', name: 'Food & Drink', icon: '\u{1F355}', total: 30, found: 0 },
  { id: 'nature', name: 'Nature', icon: '\u{1F332}', total: 20, found: 0 },
  { id: 'science', name: 'Science', icon: '\u{1F52C}', total: 35, found: 0 },
  { id: 'travel', name: 'Travel', icon: '\u2708\uFE0F', total: 28, found: 0 },
  { id: 'sports', name: 'Sports', icon: '\u26BD', total: 22, found: 0 },
  { id: 'music', name: 'Music', icon: '\u{1F3B5}', total: 18, found: 0 },
  { id: 'tech', name: 'Technology', icon: '\u{1F4BB}', total: 32, found: 0 },
];

const DEFAULT_STAMPS = [
  { id: 'spring1', name: 'First Bloom', icon: '\u{1F338}', collected: false },
  { id: 'spring2', name: 'Rain Shower', icon: '\u{1F327}\uFE0F', collected: false },
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

interface CollectionsScreenProps {
  collections?: any;
}

const CollectionsScreen: React.FC<CollectionsScreenProps> = ({ collections: collectionsProp }) => {
  const player = usePlayer();
  const collections = collectionsProp ?? player.collections;
  const [activeTab, setActiveTab] = useState<TabName>('Word Atlas');
  const [showTooltip, setShowTooltip] = useState(
    !player.tooltipsShown.includes('collections_screen')
  );

  const atlasPages = collections?.atlas ?? DEFAULT_ATLAS_PAGES;
  const collectedTiles: string[] = collections?.tiles ?? [];
  const stamps = collections?.stamps ?? DEFAULT_STAMPS;
  const seasonName = collections?.seasonName ?? 'Spring Awakening';

  const renderProgressBar = (current: number, total: number, color: string) => {
    const progress = total > 0 ? current / total : 0;
    return (
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    );
  };

  const renderWordAtlas = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.atlasGrid}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Word Atlas</Text>
        <Text style={styles.sectionSubtitle}>
          Discover words across categories
        </Text>
      </View>
      {atlasPages.map((page: any) => {
        const isComplete = page.found >= page.total;
        return (
          <TouchableOpacity
            key={page.id}
            style={[styles.atlasCard, isComplete && styles.atlasCardComplete]}
          >
            <LinearGradient
              colors={isComplete ? ['#1a2e1a', '#162814'] as const : [...GRADIENTS.surfaceCard]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            {isComplete && <View style={styles.completeGlow} />}
            <Text style={styles.atlasIcon}>{page.icon}</Text>
            <View style={styles.atlasInfo}>
              <Text style={[styles.atlasName, isComplete && styles.atlasNameComplete]}>
                {page.name}
              </Text>
              <Text style={styles.atlasProgress}>
                {page.found} / {page.total} words
              </Text>
              {renderProgressBar(
                page.found,
                page.total,
                isComplete ? COLORS.green : COLORS.accent,
              )}
            </View>
            {isComplete && (
              <Text style={styles.checkmark}>{'\u2713'}</Text>
            )}
          </TouchableOpacity>
        );
      })}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderRareTiles = () => {
    const totalCollected = collectedTiles.length;
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tilesContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rare Tiles</Text>
          <Text style={styles.sectionSubtitle}>
            {totalCollected} / 26 letters collected
          </Text>
          {renderProgressBar(totalCollected, 26, COLORS.gold)}
        </View>

        <View style={styles.tileSetsSection}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <Text style={styles.tileSetsTitle}>Tile Sets</Text>
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

        <Text style={styles.allTilesTitle}>All Letters</Text>
        <View style={styles.tilesGrid}>
          {ALPHABET.map((letter) => {
            const owned = collectedTiles.includes(letter);
            return (
              <View
                key={letter}
                style={[styles.tile, owned ? styles.tileOwned : styles.tileMissing]}
              >
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
        <View style={styles.seasonBanner}>
          <LinearGradient
            colors={['#251e52', '#1e1842']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <Text style={styles.seasonName}>{seasonName}</Text>
          <Text style={styles.seasonProgress}>
            {collectedCount} / {stamps.length} stamps
          </Text>
          {renderProgressBar(collectedCount, stamps.length, COLORS.purple)}
        </View>

        <View style={styles.stampsGrid}>
          {stamps.map((stamp: any) => (
            <View
              key={stamp.id}
              style={[
                styles.stampCard,
                stamp.collected ? styles.stampCollected : styles.stampMissing,
              ]}
            >
              {stamp.collected && (
                <LinearGradient
                  colors={[...GRADIENTS.surfaceCard]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
              )}
              <Text style={[styles.stampIcon, !stamp.collected && styles.stampIconDim]}>
                {stamp.icon}
              </Text>
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
    <View style={styles.container}>
      <AmbientBackdrop variant="collections" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COLLECTIONS</Text>
      </View>
      <Tooltip
        message="Collect words, rare tiles, and seasonal stamps as you play. Complete sets for bonus rewards!"
        visible={showTooltip}
        onDismiss={() => {
          setShowTooltip(false);
          player.markTooltipShown('collections_screen');
        }}
        position="top"
      />
      <View style={styles.tabBar}>
        <LinearGradient
          colors={[...GRADIENTS.surface]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            {activeTab === tab && (
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            )}
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === 'Word Atlas' && renderWordAtlas()}
      {activeTab === 'Rare Tiles' && renderRareTiles()}
      {activeTab === 'Seasonal Stamps' && renderSeasonalStamps()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 4,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabActive: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  tabText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  tabContent: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  atlasGrid: {
    paddingHorizontal: 16,
  },
  atlasCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  atlasCardComplete: {
    borderColor: COLORS.green,
  },
  completeGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  atlasIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  atlasInfo: {
    flex: 1,
  },
  atlasName: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  atlasNameComplete: {
    color: COLORS.green,
    textShadowColor: 'rgba(76,175,80,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  atlasProgress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  checkmark: {
    fontSize: 20,
    color: COLORS.green,
    fontFamily: FONTS.bodyBold,
    marginLeft: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.cellDefault,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  tilesContainer: {
    paddingHorizontal: 16,
  },
  tileSetsSection: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  tileSetsTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 12,
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
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  tileSetProgress: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  tileSetLetters: {
    flexDirection: 'row',
    gap: 6,
  },
  miniTile: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTileOwned: {
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  miniTileMissing: {
    backgroundColor: COLORS.cellDefault,
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
  allTilesTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 12,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOwned: {
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
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
    borderRadius: 14,
    padding: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.purple,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  seasonName: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.purple,
    marginBottom: 6,
    textShadowColor: 'rgba(168,85,247,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  seasonProgress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
    width: '100%',
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
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  stampCollected: {
    borderWidth: 1,
    borderColor: COLORS.purple,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  stampMissing: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stampIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  stampIconDim: {
    opacity: 0.2,
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
    height: 40,
  },
});

export default CollectionsScreen;
