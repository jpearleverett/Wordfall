import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import { COLORS, GRADIENTS, FONTS, SHADOWS, RADIUS, LIBRARY, MILESTONE_DECORATIONS } from '../constants';
import { SkeletonCard, SkeletonGrid } from '../components/common/Skeleton';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import IconMedallion from '../components/common/IconMedallion';
import NeonProgressBar from '../components/common/NeonProgressBar';
import { bentoPanel } from '../styles/bentoPanel';
import {
  usePlayerStore,
  usePlayerActions,
  selectCurrentChapter,
  selectCurrentLevel,
  selectOwnedDecorations,
  selectPlacedDecorations,
  selectPuzzlesSolved,
  selectRestoredWings,
  selectStarsByLevel,
  selectTooltipsShown,
} from '../stores/playerStore';
import { CHAPTERS } from '../data/chapters';
import { Chapter } from '../types';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { LibraryHeroIllustration } from '../components/common/HeroIllustrations';
import { Tooltip } from '../components/common/Tooltip';

const { width } = Dimensions.get('window');

// Wing theming on the synthwave palette (COLORS tokens). The original
// hand-picked Material Design hexes (#4caf50, #2196f3, …) read as a
// different app sitting inside the neon shell — and the science aura was
// accidentally pink. Auras are the wing color at 16% alpha.
const WING_META: Record<string, { name: string; icon: string; color: string; aura: string }> = {
  nature: { name: 'Nature', icon: '\u{1F33F}', color: COLORS.green, aura: 'rgba(0, 255, 135, 0.16)' },
  science: { name: 'Science', icon: '\u{1F52C}', color: COLORS.cyan, aura: 'rgba(0, 229, 255, 0.16)' },
  mythology: { name: 'Mythology', icon: '⚡', color: COLORS.gold, aura: 'rgba(255, 184, 0, 0.16)' },
  ocean: { name: 'Ocean', icon: '\u{1F30A}', color: COLORS.teal, aura: 'rgba(0, 245, 212, 0.16)' },
  arts: { name: 'Arts', icon: '\u{1F3A8}', color: COLORS.accent, aura: 'rgba(255, 45, 149, 0.16)' },
  space: { name: 'Space', icon: '\u{1F680}', color: COLORS.purple, aura: 'rgba(200, 77, 255, 0.16)' },
  history: { name: 'History', icon: '\u{1F4DC}', color: COLORS.orange, aura: 'rgba(255, 106, 0, 0.16)' },
  elements: { name: 'Elements', icon: '✨', color: COLORS.coral, aura: 'rgba(255, 68, 102, 0.16)' },
};

// Hero stat tiles each own an accent so the row reads as crafted gem chips
// (mirrors HomeScreen's hero stat treatment) instead of flat web boxes.
const HERO_STAT_ACCENTS = [COLORS.cyan, COLORS.accent, COLORS.gold] as const;

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
  const currentChapterFromStore = usePlayerStore(selectCurrentChapter);
  const currentLevel = usePlayerStore(selectCurrentLevel);
  const ownedDecorations = usePlayerStore(selectOwnedDecorations);
  const placedDecorations = usePlayerStore(selectPlacedDecorations);
  const puzzlesSolved = usePlayerStore(selectPuzzlesSolved);
  const restoredWingsFromStore = usePlayerStore(selectRestoredWings);
  const starsByLevel = usePlayerStore(selectStarsByLevel);
  const tooltipsShown = usePlayerStore(selectTooltipsShown);
  const { placeDecoration, markTooltipShown } = usePlayerActions();
  const route = useRoute<any>();
  const showDecorations = route.params?.showDecorations === true;
  const restoredWings = restoredWingsProp ?? restoredWingsFromStore;
  const currentChapter = currentChapterProp ?? currentChapterFromStore;
  const decorations = decorationsProp ?? placedDecorations;
  const [selectedWing, setSelectedWing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDecorationPicker, setShowDecorationPicker] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(
    !tooltipsShown.includes('library_screen')
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const decorationsPanelY = useRef(0);
  const hasAutoScrolled = useRef(false);

  const onDecorationsPanelLayout = useCallback((e: { nativeEvent: { layout: { y: number } } }) => {
    decorationsPanelY.current = e.nativeEvent.layout.y;
  }, []);

  // Auto-scroll to decorations and open picker when navigating from victory modal
  useEffect(() => {
    if (showDecorations && !loading && !hasAutoScrolled.current) {
      hasAutoScrolled.current = true;
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: decorationsPanelY.current, animated: true });
        // Auto-open picker for the first wing without a placed decoration
        const wingIds = Array.from(new Set(CHAPTERS.map((ch) => ch.wingId)));
        const emptyWing = wingIds.find(id => !decorations[id]);
        setShowDecorationPicker(emptyWing || wingIds[0] || null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showDecorations, loading, decorations]);

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

  // Staggered entry animation for wings. When reduce-motion is active we
  // jump every wing straight to the final state so the player doesn't see
  // a cascade of pop-ins across the screen.
  const wingAnims = useRef(wings.map(() => new Animated.Value(0))).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      wingAnims.forEach((anim) => anim.setValue(1));
      return;
    }
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
  }, [wingAnims, reduceMotion]);

  const totalLibraryStars = Object.values(starsByLevel).reduce((sum, value) => sum + value, 0);
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

  const heroStats = [
    { label: 'Level', value: currentLevel },
    { label: 'Puzzles', value: puzzlesSolved },
    { label: 'Restored', value: restoredWings.length },
  ];

  return (
    <View style={styles.root}>
      <ScreenScaffold
        title="LIBRARY"
        accent={COLORS.gold}
        backdrop="library"
        scroll={false}
      >
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
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card — the audit's favorite element. Shell upgraded from
              black drop shadow to a gold bento glow; stat chips + goal card
              upgraded from flat white-alpha to accent gradient glass. */}
          <View style={styles.heroCard}>
            <View style={styles.heroDecorClip} pointerEvents="none">
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <View style={styles.heroGlow} />
            </View>
            <Text style={styles.heroEyebrow}>THE WORD ARCHITECT</Text>
            <Text style={styles.heroTitle}>Restore the grand library, one chapter at a time.</Text>
            <Text style={styles.heroSubtitle}>
              {restoredWings.length} of {wings.length} wings rebuilt {'•'} {totalLibraryStars} stars collected {'•'} Chapter {currentChapter} active
            </Text>
            <LibraryHeroIllustration />

            <View style={styles.heroStatsRow}>
              {heroStats.map((stat, statIndex) => {
                const accent = HERO_STAT_ACCENTS[statIndex] ?? COLORS.cyan;
                return (
                  <View
                    key={stat.label}
                    style={[styles.heroStatCard, { borderColor: accent + '4d', shadowColor: accent }]}
                  >
                    <LinearGradient
                      colors={[accent + '21', 'rgba(26,10,46,0.92)'] as [string, string]}
                      style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />
                    <Text style={[styles.heroStatValue, { textShadowColor: accent + '99' }]}>{stat.value}</Text>
                    <Text style={styles.heroStatLabel}>{stat.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.nextGoalCard}>
              <LinearGradient
                colors={[COLORS.gold + '1f', 'rgba(26,10,46,0.90)'] as [string, string]}
                style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.nextGoalLabel}>Next restoration goal</Text>
              <View style={styles.nextGoalTitleRow}>
                <IconMedallion
                  glyph={nextWingToRestore ? nextWingToRestore.icon : '✨'}
                  accent={nextWingToRestore ? nextWingToRestore.color : COLORS.gold}
                  size={36}
                  shape="squircle"
                />
                <Text style={styles.nextGoalTitle}>
                  {nextWingToRestore ? `${nextWingToRestore.name} Wing` : 'Entire library restored'}
                </Text>
              </View>
              <Text style={styles.nextGoalMeta}>
                {nextMilestoneStars ? `Need ${nextMilestoneStars} total stars to unlock the next chapter gate.` : 'You have reached the end of the current chapter map.'}
              </Text>
            </View>
          </View>

          {/* Wing overview */}
          <SectionHeader
            label="WING OVERVIEW"
            accent={COLORS.purple}
            meta={`${wings.length * 5} CHAPTERS`}
          />
          <View style={styles.overviewPanel}>
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard]}
              style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xxl }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
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
                    <Pressable
                      style={({ pressed }) => [
                        styles.overviewWing,
                        {
                          borderColor: isRestored || isSelected ? wing.color : 'rgba(255,255,255,0.12)',
                          shadowColor: isRestored || isSelected ? wing.color : '#000',
                          shadowOpacity: isRestored ? 0.5 : isSelected ? 0.35 : 0.15,
                          opacity: isLocked ? 0.55 : 1,
                        },
                        isRestored && { borderWidth: 1.5 },
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => setSelectedWing(wing.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${wing.name} wing, ${isRestored ? 'restored' : isLocked ? 'locked' : `${shelvesRestored} of ${LIBRARY.shelvesPerWing} shelves restored`}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <LinearGradient
                        colors={[
                          isSelected || isRestored ? wing.aura : 'rgba(255,255,255,0.06)',
                          'rgba(26,10,46,0.92)',
                        ] as [string, string]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                      {isRestored && (
                        <LinearGradient
                          colors={[...GRADIENTS.goldShine]}
                          style={StyleSheet.absoluteFill}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          pointerEvents="none"
                        />
                      )}
                      <IconMedallion
                        glyph={wing.icon}
                        accent={wing.color}
                        muted={isLocked}
                        size={36}
                        style={{ marginBottom: 6 }}
                      />
                      <Text style={[styles.overviewWingName, isSelected && { color: wing.color }, isRestored && { color: COLORS.gold }]}>{wing.name}</Text>

                      {/* Book shelves visualization */}
                      <View style={styles.shelvesContainer}>
                        {Array.from({ length: LIBRARY.shelvesPerWing }, (_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.shelfSlot,
                              i < shelvesRestored && { backgroundColor: wing.color + 'cc', shadowColor: wing.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 3, elevation: 2 },
                              i < shelvesRestored && styles.shelfFilled,
                            ]}
                          />
                        ))}
                      </View>

                      {/* Progress meter toward unlock/restoration */}
                      <View style={styles.wingProgressWrap}>
                        <NeonProgressBar
                          progress={progress / 100}
                          color={isRestored ? COLORS.gold : wing.color}
                          height={5}
                          showGlowDot={false}
                        />
                      </View>
                      <Text style={[styles.overviewWingProgress, isRestored && { color: COLORS.gold }]}>
                        {isRestored ? 'Restored' : isLocked ? 'Locked' : `${shelvesRestored}/${LIBRARY.shelvesPerWing} shelves`}
                      </Text>

                      {/* Gold RESTORED ribbon */}
                      {isRestored && (
                        <View style={styles.restoredRibbon} pointerEvents="none">
                          <LinearGradient
                            colors={[...GRADIENTS.button.gold]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          />
                          <Text style={styles.restoredRibbonText}>RESTORED</Text>
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>
          {/* Active wing feature panel */}
          <View
            style={[
              styles.featurePanel,
              { borderColor: selectedWingData.color + '66', shadowColor: selectedWingData.color },
            ]}
          >
            <View style={styles.featureDecorClip} pointerEvents="none">
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <View style={[styles.featurePanelGlow, { backgroundColor: selectedWingData.aura }]} />
            </View>
            <View style={styles.featureHeader}>
              <View style={styles.featureHeaderLeft}>
                <Text style={styles.featureEyebrow}>ACTIVE WING</Text>
                <View style={styles.featureTitleRow}>
                  <IconMedallion glyph={selectedWingData.icon} accent={selectedWingData.color} size={44} />
                  <Text style={[styles.featureTitle, { color: selectedWingData.color }]} numberOfLines={1}>
                    {selectedWingData.name} Wing
                  </Text>
                </View>
                <Text style={styles.featureSubtitle}>
                  {selectedWingData.chapters.length} chapters {'•'} {selectedProgress}% restored
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.featureDecorationBadge, pressed && styles.cardPressed]}
                onPress={() => {
                  if (ownedDecorations.length > 0) {
                    setShowDecorationPicker(selectedWingData.id);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Change decoration for this wing"
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.featureDecorationBadgeText}>
                  {MILESTONE_DECORATIONS.find(d => d.decoration === decorations[selectedWingData.id])?.icon ?? '\u{1FA91}'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.featureProgressWrap}>
              <NeonProgressBar
                progress={selectedProgress / 100}
                color={selectedWingData.color}
                height={12}
              />
            </View>

            <View style={styles.infoCardsRow}>
              <View style={[styles.infoCard, { borderColor: selectedWingData.color + '33' }]}>
                <LinearGradient
                  colors={[selectedWingData.aura, 'rgba(26,10,46,0.90)'] as [string, string]}
                  style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <Text style={styles.infoCardLabel}>Decoration slot</Text>
                <Text style={styles.infoCardValue}>
                  {MILESTONE_DECORATIONS.find(d => d.decoration === decorations[selectedWingData.id])?.name ?? 'Empty'}
                </Text>
              </View>
              <View style={[styles.infoCard, { borderColor: selectedWingData.color + '33' }]}>
                <LinearGradient
                  colors={[selectedWingData.aura, 'rgba(26,10,46,0.90)'] as [string, string]}
                  style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <Text style={styles.infoCardLabel}>Required stars</Text>
                <Text style={styles.infoCardValue}>{selectedWingData.chapters[selectedWingData.chapters.length - 1]?.requiredStars ?? 0}</Text>
              </View>
            </View>

            <SectionHeader label="CHAPTER ROADMAP" accent={selectedWingData.color} />
            {selectedWingData.chapters.map((chapter) => {
              const status = getChapterStatus(chapter.id);
              const statusAccent = status === 'complete' ? COLORS.green
                : status === 'current' ? selectedWingData.color
                : 'rgba(255,255,255,0.12)';
              return (
                <View
                  key={chapter.id}
                  style={[
                    styles.chapterCard,
                    status !== 'locked' && {
                      borderColor: statusAccent + '55',
                      shadowColor: statusAccent,
                      shadowOpacity: 0.28,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      status === 'complete' ? 'rgba(0,255,135,0.10)'
                        : status === 'current' ? selectedWingData.aura
                        : 'rgba(255,255,255,0.05)',
                      'rgba(26,10,46,0.92)',
                    ] as [string, string]}
                    style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <IconMedallion
                    glyph={chapter.icon}
                    accent={status === 'complete' ? COLORS.green : selectedWingData.color}
                    muted={status === 'locked'}
                    size={48}
                    shape="squircle"
                    style={{ marginRight: 14 }}
                  />
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
                      <Text style={styles.chapterMeta}>Gate: {chapter.requiredStars}{'★'}</Text>
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
          <View onLayout={onDecorationsPanelLayout}>
            <SectionHeader
              label="DECORATIONS"
              accent={COLORS.gold}
              meta={`${ownedDecorations.length}/${MILESTONE_DECORATIONS.length} COLLECTED`}
            />
            <View style={styles.decorationsPanel}>
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard]}
                style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xxl }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <View style={styles.decorationsGrid}>
                {MILESTONE_DECORATIONS.map((md) => {
                  const owned = ownedDecorations.includes(md.decoration);
                  const placedInWing = Object.entries(decorations).find(([, dec]) => dec === md.decoration)?.[0];
                  const pickable = Boolean(showDecorationPicker) && owned;
                  return (
                    <Pressable
                      key={md.decoration}
                      style={({ pressed }) => [
                        styles.decorationItem,
                        owned && styles.decorationItemOwned,
                        pickable && styles.decorationItemPickable,
                        pressed && pickable && styles.cardPressed,
                      ]}
                      onPress={() => {
                        if (owned && showDecorationPicker) {
                          placeDecoration(showDecorationPicker, md.decoration);
                          setShowDecorationPicker(null);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Decoration: ${owned ? md.name : `locked, unlocks at level ${md.level}`}${owned && placedInWing ? ', placed' : ''}`}
                    >
                      <LinearGradient
                        colors={[
                          owned ? COLORS.gold + '1f' : 'rgba(255,255,255,0.05)',
                          'rgba(26,10,46,0.92)',
                        ] as [string, string]}
                        style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                      <IconMedallion
                        glyph={md.icon}
                        accent={pickable ? COLORS.teal : COLORS.gold}
                        muted={!owned}
                        size={40}
                        style={{ marginBottom: 6 }}
                      />
                      <Text style={[styles.decorationName, !owned && { color: COLORS.textMuted }]}>
                        {owned ? md.name : `Lvl ${md.level}`}
                      </Text>
                      {owned && placedInWing && (
                        <Text style={styles.decorationPlaced}>
                          {WING_META[placedInWing]?.icon ?? ''} placed
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              {showDecorationPicker && (
                <Pressable
                  style={({ pressed }) => [styles.pickerCancelBtn, pressed && styles.cardPressed]}
                  onPress={() => setShowDecorationPicker(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel decoration selection"
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: RADIUS.lg }]}
                  />
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
        )}
      </ScreenScaffold>
      <Tooltip
        message="Restore library wings by completing chapters. Each wing has themed word puzzles and unique decorations!"
        visible={showTooltip}
        onDismiss={() => {
          setShowTooltip(false);
          markTooltipShown('library_screen');
        }}
        position="top"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  // ── Hero ──────────────────────────────────────────────────────────────
  heroCard: {
    ...bentoPanel('gold', { borderRadius: 28, padding: 22, marginBottom: 4 }),
  },
  heroDecorClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: 'hidden',
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
    fontFamily: FONTS.bodyRegular,
    marginBottom: 18,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  heroStatValue: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginBottom: 6,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  heroStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: FONTS.bodyBold,
  },
  nextGoalCard: {
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.30)',
  },
  nextGoalLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 10,
  },
  nextGoalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  nextGoalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
  },
  nextGoalMeta: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyRegular,
  },
  // ── Wing overview ─────────────────────────────────────────────────────
  overviewPanel: {
    ...bentoPanel('purple', { borderRadius: RADIUS.xxl, padding: 18 }),
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  overviewWing: {
    width: '23%',
    minWidth: 72,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 5,
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
  wingProgressWrap: {
    width: '90%',
    marginBottom: 5,
  },
  overviewWingProgress: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
    textAlign: 'center',
  },
  restoredRibbon: {
    position: 'absolute',
    top: 10,
    right: -28,
    width: 100,
    paddingVertical: 3,
    alignItems: 'center',
    overflow: 'hidden',
    transform: [{ rotate: '35deg' }],
  },
  restoredRibbonText: {
    fontSize: 7,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    color: COLORS.bg,
  },
  // ── Feature panel ─────────────────────────────────────────────────────
  featurePanel: {
    borderRadius: RADIUS.xxl,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  featureDecorClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
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
  featureHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  featureEyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 8,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  featureTitle: {
    flexShrink: 1,
    fontSize: 24,
    fontFamily: FONTS.display,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  featureSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyRegular,
  },
  featureDecorationBadge: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(20, 8, 40, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  featureDecorationBadgeText: {
    fontSize: 24,
  },
  featureProgressWrap: {
    marginBottom: 16,
  },
  infoCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  infoCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
  },
  infoCardLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 8,
  },
  infoCardValue: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  // ── Chapter roadmap ───────────────────────────────────────────────────
  chapterCard: {
    flexDirection: 'row',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
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
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    fontFamily: FONTS.bodyRegular,
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
    fontFamily: FONTS.bodyMedium,
    textTransform: 'uppercase',
  },
  chapterThemeWords: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyRegular,
  },
  // ── Decorations ───────────────────────────────────────────────────────
  decorationsPanel: {
    ...bentoPanel('gold', { borderRadius: RADIUS.xxl, padding: 18, marginBottom: 0 }),
  },
  decorationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  decorationItem: {
    width: '30%',
    minWidth: 90,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  decorationItemOwned: {
    borderColor: 'rgba(255,184,0,0.40)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  decorationItemPickable: {
    borderColor: COLORS.teal,
    borderWidth: 2,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
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
    fontFamily: FONTS.bodyMedium,
    marginTop: 4,
  },
  pickerCancelBtn: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  pickerCancelText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodySemiBold,
  },
  bottomSpacer: {
    height: 8,
  },
});

export default LibraryScreen;
