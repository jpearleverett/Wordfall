import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants';
import { usePlayer } from '../contexts/PlayerContext';

const { width } = Dimensions.get('window');

const WINGS = [
  {
    id: 'nature',
    name: 'Nature',
    icon: '🌿',
    chapters: ['Forest Floor', 'Mountain Peak', 'River Delta', 'Meadow Bloom'],
    color: '#4caf50',
  },
  {
    id: 'science',
    name: 'Science',
    icon: '🔬',
    chapters: ['Chemistry Lab', 'Physics Hall', 'Biology Wing', 'Astronomy Dome'],
    color: '#00d4ff',
  },
  {
    id: 'mythology',
    name: 'Mythology',
    icon: '⚡',
    chapters: ['Greek Pantheon', 'Norse Legends', 'Egyptian Vault', 'Eastern Tales'],
    color: '#ffd700',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    icon: '🌊',
    chapters: ['Coral Reef', 'Deep Trench', 'Tidal Pool', 'Open Sea'],
    color: '#2196f3',
  },
  {
    id: 'arts',
    name: 'Arts',
    icon: '🎨',
    chapters: ['Gallery Hall', 'Music Room', 'Theater Stage', 'Sculpture Garden'],
    color: '#e91e63',
  },
  {
    id: 'space',
    name: 'Space',
    icon: '🚀',
    chapters: ['Launch Pad', 'Orbit Station', 'Lunar Base', 'Deep Cosmos'],
    color: '#a855f7',
  },
  {
    id: 'history',
    name: 'History',
    icon: '📜',
    chapters: ['Ancient Scripts', 'Medieval Texts', 'Renaissance Works', 'Modern Archives'],
    color: '#ff9800',
  },
  {
    id: 'elements',
    name: 'Elements',
    icon: '🔥',
    chapters: ['Fire Chamber', 'Water Basin', 'Earth Core', 'Wind Tower'],
    color: '#ff6b6b',
  },
];

interface LibraryScreenProps {
  restoredWings?: string[];
  currentChapter?: number;
  decorations?: Record<string, string>;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({
  restoredWings: restoredWingsProp,
  currentChapter: currentChapterProp,
  decorations: decorationsProp,
}) => {
  const player = usePlayer();
  const restoredWings = restoredWingsProp ?? player.restoredWings;
  const currentChapter = currentChapterProp ?? player.currentChapter;
  const decorations = decorationsProp ?? player.placedDecorations;
  const [selectedWing, setSelectedWing] = useState<string | null>(null);

  const getWingProgress = (wingId: string): number => {
    if (restoredWings.includes(wingId)) return 100;
    const wingIndex = WINGS.findIndex((w) => w.id === wingId);
    const chaptersPerWing = 4;
    const wingStartChapter = wingIndex * chaptersPerWing;
    const chaptersCompleted = Math.max(
      0,
      Math.min(chaptersPerWing, currentChapter - wingStartChapter),
    );
    return Math.round((chaptersCompleted / chaptersPerWing) * 100);
  };

  const getChapterStatus = (wingId: string, chapterIndex: number): 'complete' | 'current' | 'locked' => {
    const wingIndex = WINGS.findIndex((w) => w.id === wingId);
    const absoluteChapter = wingIndex * 4 + chapterIndex;
    if (absoluteChapter < currentChapter) return 'complete';
    if (absoluteChapter === currentChapter) return 'current';
    return 'locked';
  };

  const selectedWingData = WINGS.find((w) => w.id === selectedWing);

  const renderWingDetail = () => {
    if (!selectedWingData) return null;
    const progress = getWingProgress(selectedWingData.id);
    const isRestored = restoredWings.includes(selectedWingData.id);
    const decoration = decorations[selectedWingData.id];

    return (
      <View style={[styles.detailPanel, { borderColor: selectedWingData.color }]}>
        <TouchableOpacity
          style={styles.detailClose}
          onPress={() => setSelectedWing(null)}
        >
          <Text style={styles.detailCloseText}>Close</Text>
        </TouchableOpacity>

        <Text style={styles.detailIcon}>{selectedWingData.icon}</Text>
        <Text style={[styles.detailName, { color: selectedWingData.color }]}>
          {selectedWingData.name} Wing
        </Text>
        <Text style={styles.detailStatus}>
          {isRestored ? 'Fully Restored' : `${progress}% Restored`}
        </Text>

        <View style={styles.shelfContainer}>
          <View style={styles.shelfBg}>
            <View
              style={[
                styles.shelfFill,
                {
                  width: `${progress}%`,
                  backgroundColor: selectedWingData.color,
                },
              ]}
            />
          </View>
          <View style={styles.shelfDividers}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.shelfDivider} />
            ))}
          </View>
        </View>

        <Text style={styles.chaptersTitle}>Chapters</Text>
        {selectedWingData.chapters.map((chapter, idx) => {
          const status = getChapterStatus(selectedWingData.id, idx);
          return (
            <View key={chapter} style={styles.chapterRow}>
              <View
                style={[
                  styles.chapterDot,
                  status === 'complete' && { backgroundColor: COLORS.green },
                  status === 'current' && { backgroundColor: selectedWingData.color },
                  status === 'locked' && { backgroundColor: COLORS.cellDefault },
                ]}
              />
              <Text
                style={[
                  styles.chapterName,
                  status === 'locked' && styles.chapterLocked,
                ]}
              >
                {status === 'locked' ? '???' : chapter}
              </Text>
              <Text style={styles.chapterStatus}>
                {status === 'complete' ? '✓' : status === 'current' ? 'In Progress' : '🔒'}
              </Text>
            </View>
          );
        })}

        <View style={styles.decorationSection}>
          <Text style={styles.decorationTitle}>Decoration</Text>
          <View style={styles.decorationSlot}>
            {decoration ? (
              <Text style={styles.decorationEmoji}>{decoration}</Text>
            ) : (
              <Text style={styles.decorationEmpty}>Empty Slot</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>THE LIBRARY</Text>
        <Text style={styles.headerSubtitle}>
          {restoredWings.length} of {WINGS.length} wings restored
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.libraryOverview}>
          <View style={styles.overviewRow}>
            {WINGS.slice(0, 4).map((wing) => {
              const isRestored = restoredWings.includes(wing.id);
              return (
                <View
                  key={wing.id}
                  style={[
                    styles.miniWing,
                    isRestored && { borderColor: wing.color, backgroundColor: wing.color + '15' },
                  ]}
                >
                  <Text style={styles.miniWingIcon}>{wing.icon}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.overviewCenter}>
            <Text style={styles.overviewIcon}>🏛️</Text>
          </View>
          <View style={styles.overviewRow}>
            {WINGS.slice(4, 8).map((wing) => {
              const isRestored = restoredWings.includes(wing.id);
              return (
                <View
                  key={wing.id}
                  style={[
                    styles.miniWing,
                    isRestored && { borderColor: wing.color, backgroundColor: wing.color + '15' },
                  ]}
                >
                  <Text style={styles.miniWingIcon}>{wing.icon}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {selectedWing ? (
          renderWingDetail()
        ) : (
          WINGS.map((wing) => {
            const progress = getWingProgress(wing.id);
            const isRestored = restoredWings.includes(wing.id);

            return (
              <TouchableOpacity
                key={wing.id}
                style={[
                  styles.wingCard,
                  isRestored && { borderColor: wing.color },
                ]}
                onPress={() => setSelectedWing(wing.id)}
                activeOpacity={0.7}
              >
                {isRestored && (
                  <View
                    style={[styles.wingGlow, { backgroundColor: wing.color + '10' }]}
                  />
                )}
                <View style={styles.wingLeft}>
                  <Text style={styles.wingIcon}>{wing.icon}</Text>
                </View>
                <View style={styles.wingInfo}>
                  <Text
                    style={[
                      styles.wingName,
                      isRestored && { color: wing.color },
                    ]}
                  >
                    {wing.name} Wing
                  </Text>
                  <View style={styles.shelfSmall}>
                    <View style={styles.shelfSmallBg}>
                      <View
                        style={[
                          styles.shelfSmallFill,
                          { width: `${progress}%`, backgroundColor: wing.color },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.wingProgress}>
                    {isRestored ? 'Fully Restored' : `${progress}% complete`}
                  </Text>
                </View>
                <View style={styles.wingRight}>
                  <Text style={styles.wingChapters}>
                    {wing.chapters.length} ch.
                  </Text>
                  {isRestored && <Text style={styles.wingStar}>⭐</Text>}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  libraryOverview: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  overviewCenter: {
    marginVertical: 10,
  },
  overviewIcon: {
    fontSize: 40,
  },
  miniWing: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.cellDefault,
  },
  miniWingIcon: {
    fontSize: 20,
  },
  wingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    overflow: 'hidden',
  },
  wingGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  wingLeft: {
    marginRight: 14,
  },
  wingIcon: {
    fontSize: 32,
  },
  wingInfo: {
    flex: 1,
  },
  wingName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  shelfSmall: {
    marginBottom: 4,
  },
  shelfSmallBg: {
    height: 8,
    backgroundColor: COLORS.cellDefault,
    borderRadius: 4,
    overflow: 'hidden',
  },
  shelfSmallFill: {
    height: '100%',
    borderRadius: 4,
  },
  wingProgress: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  wingRight: {
    alignItems: 'center',
    marginLeft: 10,
  },
  wingChapters: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  wingStar: {
    fontSize: 18,
  },
  detailPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  detailClose: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  detailCloseText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  detailIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  detailStatus: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  shelfContainer: {
    width: '100%',
    marginBottom: 20,
  },
  shelfBg: {
    height: 24,
    backgroundColor: COLORS.cellDefault,
    borderRadius: 6,
    overflow: 'hidden',
  },
  shelfFill: {
    height: '100%',
    borderRadius: 6,
  },
  shelfDividers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  shelfDivider: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.bg + '80',
  },
  chaptersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgLight,
  },
  chapterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  chapterName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  chapterLocked: {
    color: COLORS.textMuted,
  },
  chapterStatus: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  decorationSection: {
    width: '100%',
    marginTop: 16,
  },
  decorationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  decorationSlot: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.cellDefault,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorationEmoji: {
    fontSize: 28,
  },
  decorationEmpty: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default LibraryScreen;
