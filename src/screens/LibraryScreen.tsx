import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS, SHADOWS, LIBRARY, MILESTONE_DECORATIONS } from '../constants';
import { SkeletonCard, SkeletonGrid } from '../components/common/Skeleton';
import { usePlayer } from '../contexts/PlayerContext';
import { CHAPTERS } from '../data/chapters';
import { Chapter } from '../types';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { LibraryHeroIllustration } from '../components/common/HeroIllustrations';
import { Tooltip } from '../components/common/Tooltip';

const { width } = Dimensions.get('window');

const WING_META: Record<string, { name: string; icon: string; color: string; aura: string }> = {
  nature: { name: 'Nature', icon: '\u{1F33F}', color: '#4caf50', aura: 'rgba(76, 175, 80, 0.16)' },
  science: { name: 'Science', icon: '\u{1F52C}', color: '#00d4ff', aura: 'rgba(255, 45, 149, 0.16)' },
  mythology: { name: 'Mythology', icon: '\u26A1', color: '#ffd700', aura: 'rgba(255, 215, 0, 0.16)' },
  ocean: { name: 'Ocean', icon: '\u{1F30A}', color: '#2196f3', aura: 'rgba(33, 150, 243, 0.16)' },
  arts: { name: 'Arts', icon: '\u{1F3A8}', color: '#e91e63', aura: 'rgba(233, 30, 99, 0.16)' },
  space: { name: 'Space', icon: '\u{1F680}', color: '#a855f7', aura: 'rgba(168, 85, 247, 0.16)' },
  history: { name: 'History', icon: '\u{1F4DC}', color: '#ff9800', aura: 'rgba(255, 152, 0, 0.16)' },
  elements: { name: 'Elements', icon: '\u2728', color: '#ff6b6b', aura: 'rgba(255, 107, 107, 0.16)' },
};

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
  const [loading, setLoading] = useState(true);
  const [showDecorationPicker, setShowDecorationPicker] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(
    !player.tooltipsShown.includes('library_screen')
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const wings = useMemo(() => {
    const wingIds = Array.from(new Set(CHAPTERS.map((chapter) => chapter.wingId)));
    return wingIds.map((wingId) => ({
      id: wingId,
      ...WING_META[wingId],
      chapters: CHAPTERS.filter((chapter) => chapter.wingId === wingId),
    }));
  }, []);

  // Staggered entry animation for wings
  const wingAnims = useRef(wings.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = wingAnims.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 80),
        Animated.spring(anim, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.parallel(animations).start();
  }, [wingAnims]);

  const totalLibraryStars = Object.values(player.starsByLevel).reduce((sum, value) => sum + value, 0);
  const selectedWingData = wings.find((wing) => wing.id === selectedWing) ?? wings[0];

  const getWingProgress = (chapters: Chapter[]) => {
    const completed = chapters.filter((chapter) => chapter.id < currentChapter).length;
    const inProgress = chapters.some((chapter) => chapter.id === currentChapter) ? 0.5 : 0;
    const percent = Math.round(((completed + inProgress) / chapters.length) * 100);
    return Math.min(100, percent);
  };

  const getChapterStatus = (chapterId: number): 'complete' | 'current' | 'locked' => {
    if (chapterId < currentChapter) return 'complete';
    if (chapterId === currentChapter) return 'current';
    return 'locked';
  };

  const selectedProgress = getWingProgress(selectedWingData.chapters);
  const nextWingToRestore = wings.find((wing) => !restoredWings.includes(wing.id));
  const nextMilestoneStars = CHAPTERS.find((chapter) => chapter.id === currentChapter + 1)?.requiredStars;

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="library" />
      <Tooltip
        message="Restore library wings by completing chapters. Each wing has themed word puzzles and unique decorations!"
        visible={showTooltip}
        onDismiss={() => {
          setShowTooltip(false);
          player.markTooltipShown('library_screen');
        }}
        position="top"
      />
      {loading ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonCard style={{ height: 260, borderRadius: 28 }} />
          <SkeletonCard style={{ height: 180, borderRadius: 24 }} />
          <SkeletonGrid rows={2} cols={4} itemHeight={100} />
          <SkeletonCard style={{ height: 200, borderRadius: 28, marginTop: 14 }} />
        </ScrollView>
      ) : (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.heroGlow} />
          <Text style={styles.heroEyebrow}>THE WORD ARCHITECT</Text>
          <Text style={styles.heroTitle}>Restore the grand library, one chapter at a time.</Text>
          <Text style={styles.heroSubtitle}>
            {restoredWings.length} of {wings.length} wings rebuilt {'\u2022'} {totalLibraryStars} stars collected {'\u2022'} Chapter {currentChapter} active
          </Text>
          <LibraryHeroIllustration />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{player.currentLevel}</Text>
              <Text style={styles.heroStatLabel}>Level</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{player.puzzlesSolved}</Text>
              <Text style={styles.heroStatLabel}>Puzzles</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{restoredWings.length}</Text>
              <Text style={styles.heroStatLabel}>Restored</Text>
            </View>
          </View>

          <View style={styles.nextGoalCard}>
            <Text style={styles.nextGoalLabel}>Next restoration goal</Text>
            <Text style={styles.nextGoalTitle}>
              {nextWingToRestore ? `${nextWingToRestore.icon} ${nextWingToRestore.name} Wing` : '\u2728 Entire library restored'}
            </Text>
            <Text style={styles.nextGoalMeta}>
              {nextMilestoneStars ? `Need ${nextMilestoneStars} total stars to unlock the next chapter gate.` : 'You have reached the end of the current chapter map.'}
            </Text>
          </View>
        </View>

        <View style={styles.overviewPanel}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.overviewHeaderRow}>
            <Text style={styles.sectionTitle}>Wing overview</Text>
            <Text style={styles.sectionMeta}>{wings.length * 5} total chapters</Text>
          </View>
          <View style={styles.overviewGrid}>
            {wings.map((wing, wingIndex) => {
              const progress = getWingProgress(wing.chapters);
              const isRestored = restoredWings.includes(wing.id);
              const isSelected = selectedWingData.id === wing.id;
              const isLocked = progress === 0 && !isRestored;
              const shelvesRestored = Math.round((progress / 100) * LIBRARY.shelvesPerWing);
              const anim = wingAnims[wingIndex];

              return (
                <Animated.View
                  key={wing.id}
                  style={{
                    opacity: anim,
                    transform: [
                      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
                      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.overviewWing,
                      {
                        borderColor: isRestored ? wing.color : isSelected ? wing.color : 'rgba(255,255,255,0.1)',
                        backgroundColor: isSelected ? wing.aura : 'rgba(255,255,255,0.05)',
                        opacity: isLocked ? 0.4 : 1,
                      },
                      isRestored && {
                        ...SHADOWS.glow(wing.color),
                        borderColor: wing.color,
                        borderWidth: 1.5,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedWing(wing.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${wing.name} wing, ${isRestored ? 'restored' : isLocked ? 'locked' : `${shelvesRestored} of ${LIBRARY.shelvesPerWing} shelves restored`}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={styles.overviewWingIcon}>{wing.icon}</Text>
                    <Text style={[styles.overviewWingName, isSelected && { color: wing.color }, isRestored && { color: COLORS.gold }]}>{wing.name}</Text>

                    {/* Book shelves visualization */}
                    <View style={styles.shelvesContainer}>
                      {Array.from({ length: LIBRARY.shelvesPerWing }, (_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.shelfSlot,
                            i < shelvesRestored && { backgroundColor: wing.color + '80' },
                            i < shelvesRestored && styles.shelfFilled,
                          ]}
                        />
                      ))}
                    </View>

                    {/* Progress bar */}
                    <View style={styles.wingProgressTrack}>
                      <View
                        style={[
                          styles.wingProgressFill,
                          {
                            width: `${Math.max(progress, 2)}%`,
                            backgroundColor: isRestored ? COLORS.gold : wing.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.overviewWingProgress, isRestored && { color: COLORS.gold }]}>
                      {isRestored ? 'Restored' : isLocked ? 'Locked' : `${shelvesRestored}/${LIBRARY.shelvesPerWing} shelves`}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <View style={[styles.featurePanel, { borderColor: selectedWingData.color }]}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={[styles.featurePanelGlow, { backgroundColor: selectedWingData.aura }]} />
          <View style={styles.featureHeader}>
            <View>
              <Text style={styles.featureEyebrow}>ACTIVE WING</Text>
              <Text style={[styles.featureTitle, { color: selectedWingData.color }]}>
                {selectedWingData.icon} {selectedWingData.name} Wing
              </Text>
              <Text style={styles.featureSubtitle}>
                {selectedWingData.chapters.length} chapters {'\u2022'} {selectedProgress}% restored
              </Text>
            </View>
            <TouchableOpacity
              style={styles.featureDecorationBadge}
              onPress={() => {
                if (player.ownedDecorations.length > 0) {
                  setShowDecorationPicker(selectedWingData.id);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Change decoration for this wing"
            >
              <Text style={styles.featureDecorationBadgeText}>
                {MILESTONE_DECORATIONS.find(d => d.decoration === decorations[selectedWingData.id])?.icon ?? '\u{1FA91}'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featureProgressTrack}>
            <View
              style={[
                styles.featureProgressFill,
                { width: `${selectedProgress}%`, backgroundColor: selectedWingData.color },
              ]}
            />
          </View>

          <View style={styles.infoCardsRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardLabel}>Decoration slot</Text>
              <Text style={styles.infoCardValue}>
                {MILESTONE_DECORATIONS.find(d => d.decoration === decorations[selectedWingData.id])?.name ?? 'Empty'}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardLabel}>Required stars</Text>
              <Text style={styles.infoCardValue}>{selectedWingData.chapters[selectedWingData.chapters.length - 1]?.requiredStars ?? 0}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Chapter roadmap</Text>
          {selectedWingData.chapters.map((chapter) => {
            const status = getChapterStatus(chapter.id);
            return (
              <View key={chapter.id} style={styles.chapterCard} accessibilityRole="text" accessibilityLabel={`${chapter.name} chapter, ${status === 'complete' ? 'complete' : status === 'current' ? 'current' : 'locked'}, ${chapter.puzzleCount} puzzles, ${chapter.difficulty} difficulty, requires ${chapter.requiredStars} stars`}>
                <View
                  style={[
                    styles.chapterIconWrap,
                    status === 'complete' && { backgroundColor: COLORS.greenGlow, borderColor: COLORS.green },
                    status === 'current' && { backgroundColor: selectedWingData.aura, borderColor: selectedWingData.color },
                  ]}
                >
                  <Text style={styles.chapterIcon}>{chapter.icon}</Text>
                </View>
                <View style={styles.chapterMain}>
                  <View style={styles.chapterTitleRow}>
                    <Text style={styles.chapterTitle}>{chapter.name}</Text>
                    <View
                      style={[
                        styles.chapterPill,
                        status === 'complete' && styles.chapterPillComplete,
                        status === 'current' && { borderColor: selectedWingData.color, backgroundColor: selectedWingData.aura },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chapterPillText,
                          status === 'complete' && styles.chapterPillTextComplete,
                          status === 'current' && { color: selectedWingData.color },
                        ]}
                      >
                        {status === 'complete' ? 'COMPLETE' : status === 'current' ? 'CURRENT' : 'LOCKED'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.chapterDescription}>{chapter.description}</Text>
                  <View style={styles.chapterMetaRow}>
                    <Text style={styles.chapterMeta}>{chapter.puzzleCount} puzzles</Text>
                    <Text style={styles.chapterMeta}>Gate: {chapter.requiredStars}{'\u2605'}</Text>
                    <Text style={styles.chapterMeta}>{chapter.difficulty.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.chapterThemeWords}>
                    Theme words: {chapter.themeWords.slice(0, 5).join(', ')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Decorations Collection */}
        <View style={styles.decorationsPanel}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <Text style={styles.sectionTitle}>Decorations</Text>
          <Text style={[styles.featureSubtitle, { marginBottom: 14 }]}>
            {player.ownedDecorations.length} of {MILESTONE_DECORATIONS.length} collected
          </Text>
          <View style={styles.decorationsGrid}>
            {MILESTONE_DECORATIONS.map((md) => {
              const owned = player.ownedDecorations.includes(md.decoration);
              const placedInWing = Object.entries(decorations).find(([, dec]) => dec === md.decoration)?.[0];
              return (
                <TouchableOpacity
                  key={md.decoration}
                  style={[
                    styles.decorationItem,
                    owned && styles.decorationItemOwned,
                    showDecorationPicker && owned && styles.decorationItemPickable,
                  ]}
                  activeOpacity={owned && showDecorationPicker ? 0.7 : 1}
                  onPress={() => {
                    if (owned && showDecorationPicker) {
                      player.placeDecoration(showDecorationPicker, md.decoration);
                      setShowDecorationPicker(null);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Decoration: ${owned ? md.name : `locked, unlocks at level ${md.level}`}${owned && placedInWing ? ', placed' : ''}`}
                >
                  <Text style={[styles.decorationIcon, !owned && { opacity: 0.3 }]}>{md.icon}</Text>
                  <Text style={[styles.decorationName, !owned && { color: COLORS.textMuted }]}>
                    {owned ? md.name : `Lvl ${md.level}`}
                  </Text>
                  {owned && placedInWing && (
                    <Text style={styles.decorationPlaced}>
                      {WING_META[placedInWing]?.icon ?? ''} placed
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {showDecorationPicker && (
            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setShowDecorationPicker(null)}
              accessibilityRole="button"
              accessibilityLabel="Cancel decoration selection"
            >
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 48,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  heroGlow: {
    position: 'absolute',
    top: -80,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.accentGlow,
    opacity: 0.65,
  },
  heroEyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    color: COLORS.gold,
    fontFamily: FONTS.display,
    marginBottom: 12,
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
    marginBottom: 10,
    maxWidth: width - 96,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginBottom: 18,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroStatValue: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginBottom: 6,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  heroStatLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nextGoalCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  nextGoalLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  nextGoalTitle: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  nextGoalMeta: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  overviewPanel: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodyBold,
    marginBottom: 12,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  sectionMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  overviewWing: {
    width: '23%',
    minWidth: 72,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  overviewWingIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  overviewWingName: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodyBold,
    marginBottom: 4,
    textAlign: 'center',
  },
  shelvesContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 6,
    alignItems: 'flex-end',
    height: 16,
  },
  shelfSlot: {
    width: 8,
    height: 4,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shelfFilled: {
    height: 12,
    borderRadius: 2,
  },
  wingProgressTrack: {
    width: '90%',
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  wingProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  overviewWingProgress: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  featurePanel: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  featurePanelGlow: {
    position: 'absolute',
    top: -60,
    left: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureEyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  featureTitle: {
    fontSize: 26,
    fontFamily: FONTS.display,
    marginBottom: 4,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  featureSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  featureDecorationBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureDecorationBadgeText: {
    fontSize: 24,
  },
  featureProgressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: COLORS.bgLight,
    overflow: 'hidden',
    marginBottom: 16,
  },
  featureProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  infoCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoCardLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  infoCardValue: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  chapterCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  chapterIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  chapterIcon: {
    fontSize: 22,
  },
  chapterMain: {
    flex: 1,
  },
  chapterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  chapterTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  chapterPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chapterPillComplete: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenGlow,
  },
  chapterPillText: {
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: FONTS.display,
    color: COLORS.textMuted,
  },
  chapterPillTextComplete: {
    color: COLORS.green,
  },
  chapterDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  chapterMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  chapterMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chapterThemeWords: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  decorationsPanel: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 18,
    overflow: 'hidden',
  },
  decorationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  decorationItem: {
    width: '30%',
    minWidth: 90,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  decorationItemOwned: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,215,0,0.3)',
  },
  decorationItemPickable: {
    borderColor: COLORS.teal,
    borderWidth: 2,
  },
  decorationIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  decorationName: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  decorationPlaced: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  pickerCancelBtn: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pickerCancelText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  bottomSpacer: {
    height: 24,
  },
});

export default LibraryScreen;
