import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Alert,
  Animated,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, GRADIENTS, FONTS, SHADOWS, RADIUS, LIBRARY, MILESTONE_DECORATIONS } from '../constants';
import { SkeletonCard, SkeletonGrid } from '../components/common/Skeleton';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
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
import { CHAPTERS, getChapterForLevel, getLastLevelOfChapter } from '../data/chapters';
import { Chapter } from '../types';
import { useReduceMotion } from '../hooks/useReduceMotion';
import GameIcon, { GameIconName } from '../components/icons/GameIcon';
import {
  getWing,
  LIBRARIAN,
  folioGreeting,
  WingDef,
  DecorationRarity,
  getDecorationIconName,
  MILESTONE_DECORATION_FLAVOR,
  milestoneRarity,
} from '../data/library';
import GrandLibraryScene, { SceneWing, WingSceneState } from '../components/library/GrandLibraryScene';
import { OwlIcon } from '../components/icons/iconsMisc';
import PrimaryButton from '../components/common/PrimaryButton';
import { useEconomyStore, selectLibraryPoints } from '../stores/economyStore';
import { startAnimationWithCleanup } from '../utils/animationLifecycle';
import { getDecoration } from '../data/cosmetics';
import { generateBoard } from '../engine/boardGenerator';
import { getLevelConfigExtended } from '../engine/puzzleGenerator';

const { width } = Dimensions.get('window');

/**
 * IconMedallion's shell (accent ring + glow + body gradient) hosting a
 * GameIcon SVG instead of an emoji Text — same layered-gem look with the
 * bespoke icon set. Local because common/IconMedallion is emoji-Text-based.
 */
function SvgMedallion({
  glyph,
  name,
  size = 44,
  accent = COLORS.purple,
  shape = 'circle',
  muted = false,
  teaser = false,
  style,
}: {
  glyph?: string;
  name?: GameIconName;
  size?: number;
  accent?: string;
  shape?: 'circle' | 'squircle';
  muted?: boolean;
  /**
   * Locked-but-coming-soon treatment: the medallion keeps its OWN accent —
   * tinted disc (accent+22 fill, accent+55 ring) with the icon drawn in the
   * accent at ~45% opacity. A visibly colored teaser of what unlocks, not
   * the dead gray disc `muted` produces.
   */
  teaser?: boolean;
  style?: object;
}) {
  const radius = shape === 'circle' ? size / 2 : size * 0.3;
  const alpha = (a: string) => (/^#[0-9a-fA-F]{6}$/.test(accent) ? accent + a : accent);
  const dim = muted && !teaser;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: 1.5,
          borderColor: dim ? 'rgba(255,255,255,0.14)' : teaser ? alpha('55') : alpha('73'),
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: 'rgba(8, 2, 22, 0.92)',
          shadowColor: dim ? '#000' : accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: dim ? 0.2 : teaser ? 0.3 : 0.55,
          shadowRadius: size * 0.22,
          elevation: dim ? 2 : teaser ? 3 : 6,
        },
        dim && { opacity: 0.55 },
        style as object,
      ]}
    >
      <LinearGradient
        colors={[
          dim ? 'rgba(255,255,255,0.05)' : teaser ? alpha('22') : alpha('3D'),
          teaser ? alpha('14') : 'rgba(8, 2, 22, 0.92)',
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {teaser ? (
        <View style={{ opacity: 0.45 }}>
          <GameIcon glyph={glyph} name={name} size={size * 0.58} accent={accent} />
        </View>
      ) : (
        <GameIcon glyph={glyph} name={name} size={size * 0.58} />
      )}
    </View>
  );
}

/**
 * DecorationMedallion — collection-grade disc for the decoration cards.
 * Reads as a dimensional rendered item instead of a flat glyph in a plain
 * circle: 2px rarity-gradient ring, tinted body gradient, glass top
 * highlight arc, bottom inner shadow, and a soft rarity-tinted glow behind
 * owned items. Unowned keeps the teaser tint, one notch brighter than the
 * standard medallion teaser.
 */
function DecorationMedallion({
  name,
  accent,
  owned,
  size = 48,
  style,
}: {
  name: GameIconName;
  accent: string;
  owned: boolean;
  size?: number;
  style?: object;
}) {
  // Ring stroke scales with the disc so an 84px medallion doesn't wear a
  // 48px medallion's hairline ring.
  const ring = size + Math.max(4, Math.round(size / 12));
  const alpha = (a: string) => (/^#[0-9a-fA-F]{6}$/.test(accent) ? accent + a : accent);
  return (
    <View
      style={[
        {
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: owned ? accent : '#000',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: owned ? 0.7 : 0.25,
          shadowRadius: size * 0.3,
          elevation: owned ? 8 : 3,
        },
        style as object,
      ]}
    >
      {/* Rarity-gradient ring — bright top-left fading to dim, a 2px
          gradient stroke around the disc. */}
      <LinearGradient
        colors={(owned ? [alpha('F2'), alpha('59')] : [alpha('7A'), alpha('2B')]) as [string, string]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: ring / 2 }]}
      />
      {/* Disc body */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: 'rgba(8,2,22,0.96)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={[owned ? alpha('47') : alpha('30'), 'rgba(8,2,22,0.95)'] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {owned ? (
          <GameIcon name={name} size={size * 0.58} />
        ) : (
          <View style={{ opacity: 0.55 }}>
            <GameIcon name={name} size={size * 0.58} accent={accent} />
          </View>
        )}
        {/* Glass top highlight arc */}
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)'] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: size * 0.05,
            left: size * 0.16,
            right: size * 0.16,
            height: size * 0.32,
            borderRadius: size * 0.2,
            opacity: owned ? 1 : 0.6,
          }}
        />
        {/* Bottom inner shadow — seats the icon in the disc. */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)'] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: size * 0.34 }}
        />
      </View>
    </View>
  );
}

// ─── Decoration metadata resolver ───────────────────────────────────────────
// The grid used to render MILESTONE_DECORATIONS only, which made decorations
// bought in the cosmetic store (LIBRARY_DECORATIONS) or granted by seasons /
// events invisible — owned but unplaceable. This resolver checks the
// milestone table first, then the cosmetics catalog, and finally falls back
// to a humanized id so ANY owned decoration renders and can be placed.

interface DecorationMeta {
  id: string;
  name: string;
  /** Emoji glyph — resolved to the bespoke SVG set via GameIcon's glyph map. */
  glyph: string;
  /** Distinct SVG silhouette for this decoration (never the sparkle fallback). */
  iconName: GameIconName;
  /** Rarity — tints the collection medallion. Milestones derive from level. */
  rarity: DecorationRarity;
  /** Flavor description (cosmetics catalog entries carry one). */
  description?: string;
  /** Unlock level, when the decoration is a milestone reward. */
  level?: number;
}

const RARITY_ACCENT: Record<DecorationRarity, string> = {
  common: COLORS.rarityCommon,
  rare: COLORS.rarityRare,
  epic: COLORS.rarityEpic,
  legendary: COLORS.rarityLegendary,
};

function humanizeDecorationId(id: string): string {
  return id
    .replace(/^(decoration|deco)_/, '')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    // "Season1" → "Season 1" — grant ids often glue a number onto a word.
    .replace(/([a-zA-Z])(\d)/g, '$1 $2');
}

function getDecorationMeta(id: string): DecorationMeta {
  const milestone = MILESTONE_DECORATIONS.find((m) => m.decoration === id);
  if (milestone) {
    return {
      id,
      name: milestone.name,
      glyph: milestone.icon,
      iconName: getDecorationIconName(id),
      rarity: milestoneRarity(milestone.level),
      description: MILESTONE_DECORATION_FLAVOR[id],
      level: milestone.level,
    };
  }
  const catalog = getDecoration(id);
  if (catalog) {
    return {
      id,
      name: catalog.name,
      glyph: catalog.icon,
      iconName: getDecorationIconName(id, catalog.type),
      rarity: catalog.rarity,
      description: catalog.description,
    };
  }
  // Season / event grants outside both catalogs still render gracefully \u2014
  // as a treasure chest, never the generic sparkle placeholder.
  return {
    id,
    name: humanizeDecorationId(id),
    glyph: '\u2728',
    iconName: getDecorationIconName(id),
    rarity: 'rare',
    description: 'Still being catalogued.',
  };
}

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
  const navigation = useNavigation<any>();
  const libraryPoints = useEconomyStore(selectLibraryPoints);
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
  const featurePanelY = useRef(0);
  const hasAutoScrolled = useRef(false);

  const onDecorationsPanelLayout = useCallback((e: { nativeEvent: { layout: { y: number } } }) => {
    decorationsPanelY.current = e.nativeEvent.layout.y;
  }, []);

  const onFeaturePanelLayout = useCallback((e: { nativeEvent: { layout: { y: number } } }) => {
    featurePanelY.current = e.nativeEvent.layout.y;
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

  // Wing identity (name/icon/accent/aura/tagline/lore) comes from the
  // canonical WINGS catalog via getWing(); chapter grouping stays local.
  const wings = useMemo(() => {
    const wingIds = Array.from(new Set(CHAPTERS.map((chapter) => chapter.wingId)));
    return wingIds.map((wingId) => ({
      def: getWing(wingId),
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
    // Hold the entrance until the skeleton clears — the wing grid (the only
    // consumer of these values) is unmounted while `loading`, so starting on
    // mount burned the cascade underneath the skeleton and the cards then
    // mounted mid-flight.
    if (loading) return;
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
    return startAnimationWithCleanup(Animated.parallel(animations));
  }, [wingAnims, reduceMotion, loading]);

  const totalLibraryStars = Object.values(starsByLevel).reduce((sum, value) => sum + value, 0);

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

  // Scene state per wing: restored (in restoredWings), current (holds the
  // active chapter), else ruined.
  const getWingState = (wing: { def: WingDef; chapters: Chapter[] }): WingSceneState => {
    if (restoredWings.includes(wing.def.id)) return 'restored';
    if (wing.chapters.some((chapter) => chapter.id === currentChapter)) return 'current';
    return 'ruined';
  };

  const currentWing = wings.find((wing) => wing.chapters.some((ch) => ch.id === currentChapter));
  const selectedWingData =
    wings.find((wing) => wing.def.id === selectedWing) ?? currentWing ?? wings[0];
  const selectedProgress = getWingProgress(selectedWingData.chapters);
  const selectedWingState = getWingState(selectedWingData);
  const nextWingToRestore = wings.find((wing) => !restoredWings.includes(wing.def.id));
  /**
   * Stars the player has actually earned inside a chapter, out of the 45 its
   * fifteen levels can pay. This replaced `requiredStars` on every surface
   * here: a chapter's gate is 6 x (id - 1) while reaching it costs 15 x
   * (id - 1) levels at a one-star minimum, so the gate is satisfied 2.5x over
   * at every boundary and can never actually lock anything. Telling a player
   * holding 150 stars that they "need 66" was simply false; their own
   * chapter mastery is both true and the number that drives a replay.
   */
  const chapterStars = (chapterId: number): number => {
    let earned = 0;
    for (let level = (chapterId - 1) * 15 + 1; level <= chapterId * 15; level++) {
      earned += starsByLevel[level] ?? 0;
    }
    return earned;
  };

  const sceneWings: SceneWing[] = wings.map((wing) => ({
    def: wing.def,
    state: getWingState(wing),
    progress: getWingProgress(wing.chapters) / 100,
  }));

  // Folio's greeting, computed from live state.
  const placedIds = new Set(Object.values(decorations));
  const hasUnplacedDecoration =
    restoredWings.some((id) => !decorations[id]) &&
    ownedDecorations.some((id) => !placedIds.has(id));
  const chaptersToNextWing = nextWingToRestore
    ? nextWingToRestore.chapters.filter((chapter) => chapter.id >= currentChapter).length
    : null;
  const greeting = folioGreeting({
    restoredCount: restoredWings.length,
    nextWingName: nextWingToRestore?.def.name ?? null,
    chaptersToNextWing,
    hasUnplacedDecoration,
  });

  // Tapping a scene alcove selects that wing and scrolls to the feature panel.
  const handleSceneWingPress = useCallback((wingId: string) => {
    setSelectedWing(wingId);
    scrollViewRef.current?.scrollTo({ y: featurePanelY.current, animated: true });
  }, []);

  // Launch a classic-mode level the same way HomeScreen / the deep-link
  // mapping do: generate the board here, then cross-tab navigate into the
  // Play stack's Game screen.
  const launchLevel = useCallback(
    (level: number) => {
      try {
        const config = getLevelConfigExtended(level);
        const chapter = getChapterForLevel(level);
        const board = generateBoard(
          config,
          Date.now() + level * 1337,
          'classic',
          chapter?.profile,
          chapter?.themeWords,
        );
        navigation.getParent()?.navigate('Play', {
          screen: 'Game',
          params: { board, level, mode: 'classic', isDaily: false },
        });
      } catch {
        Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
      }
    },
    [navigation],
  );

  const activeChapter = selectedWingData.chapters.find((ch) => ch.id === currentChapter);
  const firstChapterId = selectedWingData.chapters[0]?.id ?? 1;
  const wingFirstLevel = firstChapterId <= 1 ? 1 : getLastLevelOfChapter(firstChapterId - 1) + 1;

  // Unified decoration grid: every milestone decoration (locked or owned)
  // PLUS any owned decoration from other sources (cosmetic store, seasons,
  // events) not already covered by the milestone table.
  const decorationGridItems = useMemo(() => {
    const milestoneIds = new Set(MILESTONE_DECORATIONS.map((m) => m.decoration));
    const milestoneItems = MILESTONE_DECORATIONS.map((m) => ({
      meta: getDecorationMeta(m.decoration),
      owned: ownedDecorations.includes(m.decoration),
    }));
    const extraItems = ownedDecorations
      .filter((id) => !milestoneIds.has(id))
      .map((id) => ({ meta: getDecorationMeta(id), owned: true }));
    return [...milestoneItems, ...extraItems];
  }, [ownedDecorations]);

  // Folio's next find — the first unowned decoration, teased at the foot of
  // the screen so the collection ends on a goal instead of empty space.
  const nextFind = decorationGridItems.find((item) => !item.owned)?.meta ?? null;

  // The decorations grid lays out 2-up; when the collection count is odd the
  // last row would hold an orphaned card beside empty dark space. Fill the
  // leftover slot with a "future find" placeholder so every row reads
  // complete.
  const futureSlotCount = decorationGridItems.length % 2;

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
        {/* First-visit coach mark — an IN-FLOW glass banner under the header.
            It pushes the hero card down instead of floating over the headline
            (the old absolutely-positioned Tooltip occluded it). */}
        {showTooltip && (
          <Pressable
            onPress={() => {
              setShowTooltip(false);
              markTooltipShown('library_screen');
            }}
            style={({ pressed }) => [styles.coachBanner, pressed && styles.coachBannerPressed]}
            accessibilityRole="button"
            accessibilityLabel="Tip: Restore library wings by completing chapters. Each wing has themed word puzzles and unique decorations. Tap to dismiss"
          >
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard]}
              style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <LinearGradient
              colors={[COLORS.gold + '1F', 'transparent'] as [string, string]}
              style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <SvgMedallion name="book" accent={COLORS.gold} size={30} shape="squircle" />
            <Text style={styles.coachBannerText}>
              Complete chapters to restore wings — each holds themed puzzles & decorations.
            </Text>
            <View style={styles.coachDismiss}>
              <Text style={styles.coachDismissText}>{'✕'}</Text>
            </View>
          </Pressable>
        )}
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

            {/* Illustrated Grand Library hall — tappable wing alcoves. */}
            <View style={styles.sceneWrap}>
              <GrandLibraryScene
                wings={sceneWings}
                selectedWingId={selectedWingData.def.id}
                onWingPress={handleSceneWingPress}
                width={Math.min(width - 76, 390)}
                pendingDecoration={hasUnplacedDecoration}
              />
            </View>

            {/* Folio speech card */}
            <View style={styles.folioRow}>
              <View style={styles.folioDisc}>
                <OwlIcon size={26} />
              </View>
              <View
                style={styles.folioBubble}
                accessible
                accessibilityLabel={`${LIBRARIAN.name} says: ${greeting}`}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.10)', 'rgba(26,10,46,0.90)'] as [string, string]}
                  style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <View style={styles.folioBubbleTail} />
                <Text style={styles.folioText}>{greeting}</Text>
                <Text style={styles.folioAttribution}>{'— '}{LIBRARIAN.title}</Text>
              </View>
            </View>

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
                <SvgMedallion
                  name={nextWingToRestore ? nextWingToRestore.def.icon : 'sparkle'}
                  accent={nextWingToRestore ? nextWingToRestore.def.accent : COLORS.gold}
                  size={36}
                  shape="squircle"
                />
                <Text style={styles.nextGoalTitle}>
                  {nextWingToRestore ? `${nextWingToRestore.def.name} Wing` : 'Entire library restored'}
                </Text>
              </View>
              <Text style={styles.nextGoalMeta}>
                {chaptersToNextWing
                  ? `${chaptersToNextWing} chapter${chaptersToNextWing === 1 ? '' : 's'} to go — ${totalLibraryStars} stars collected so far.`
                  : 'You have reached the end of the current chapter map.'}
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
                const isRestored = restoredWings.includes(wing.def.id);
                const isSelected = selectedWingData.def.id === wing.def.id;
                const isLocked = progress === 0 && !isRestored;
                const shelvesRestored = Math.round((progress / 100) * LIBRARY.shelvesPerWing);
                const anim = wingAnims[wingIndex];

                return (
                  <Animated.View
                    key={wing.def.id}
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
                          // Locked wings tease their own accent — a dimmed
                          // preview of the wing to come, not a gray husk.
                          borderColor: isRestored || isSelected
                            ? wing.def.accent
                            : isLocked
                              ? wing.def.accent + '3D'
                              : 'rgba(255,255,255,0.12)',
                          shadowColor: isRestored || isSelected ? wing.def.accent : isLocked ? wing.def.accent : '#000',
                          shadowOpacity: isRestored ? 0.5 : isSelected ? 0.35 : 0.15,
                          opacity: isLocked ? 0.88 : 1,
                        },
                        isRestored && { borderWidth: 1.5 },
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => setSelectedWing(wing.def.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${wing.def.name} wing, ${isRestored ? 'restored' : isLocked ? 'locked' : `${shelvesRestored} of ${LIBRARY.shelvesPerWing} shelves restored`}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <LinearGradient
                        colors={[
                          isSelected || isRestored
                            ? wing.def.aura
                            : isLocked
                              ? wing.def.accent + '14'
                              : 'rgba(255,255,255,0.06)',
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
                      <SvgMedallion
                        name={wing.def.icon}
                        accent={wing.def.accent}
                        teaser={isLocked}
                        size={36}
                        style={{ marginBottom: 6 }}
                      />
                      <Text style={[styles.overviewWingName, isSelected && { color: wing.def.accent }, isRestored && { color: COLORS.gold }]}>{wing.def.name}</Text>
                      <Text style={styles.overviewWingTagline} numberOfLines={2} ellipsizeMode="tail">
                        {wing.def.tagline}
                      </Text>

                      {/* Book shelves visualization */}
                      <View style={styles.shelvesContainer}>
                        {Array.from({ length: LIBRARY.shelvesPerWing }, (_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.shelfSlot,
                              i < shelvesRestored && { backgroundColor: wing.def.accent + 'cc', shadowColor: wing.def.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 3, elevation: 2 },
                              i < shelvesRestored && styles.shelfFilled,
                            ]}
                          />
                        ))}
                      </View>

                      {/* Progress meter toward unlock/restoration */}
                      <View style={styles.wingProgressWrap}>
                        <NeonProgressBar
                          progress={progress / 100}
                          color={isRestored ? COLORS.gold : wing.def.accent}
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
            onLayout={onFeaturePanelLayout}
            style={[
              styles.featurePanel,
              { borderColor: selectedWingData.def.accent + '66', shadowColor: selectedWingData.def.accent },
            ]}
          >
            <View style={styles.featureDecorClip} pointerEvents="none">
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <View style={[styles.featurePanelGlow, { backgroundColor: selectedWingData.def.aura }]} />
            </View>
            <View style={styles.featureHeader}>
              <View style={styles.featureHeaderLeft}>
                <Text style={styles.featureEyebrow}>ACTIVE WING</Text>
                <View style={styles.featureTitleRow}>
                  <SvgMedallion name={selectedWingData.def.icon} accent={selectedWingData.def.accent} size={44} />
                  <Text style={[styles.featureTitle, { color: selectedWingData.def.accent }]} numberOfLines={1}>
                    {selectedWingData.def.name} Wing
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
                    setShowDecorationPicker(selectedWingData.def.id);
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
                {decorations[selectedWingData.def.id] ? (
                  <GameIcon
                    name={getDecorationMeta(decorations[selectedWingData.def.id]).iconName}
                    size={27}
                  />
                ) : (
                  <GameIcon glyph="" size={27} />
                )}
              </Pressable>
            </View>

            <View style={styles.featureProgressWrap}>
              <NeonProgressBar
                progress={selectedProgress / 100}
                color={selectedWingData.def.accent}
                height={12}
              />
            </View>

            {/* Wing lore */}
            <View style={[styles.loreQuote, { borderLeftColor: selectedWingData.def.accent }]}>
              <LinearGradient
                colors={[selectedWingData.def.aura, 'rgba(26,10,46,0.85)'] as [string, string]}
                style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.lg }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              {/* First sentence only — a clamped paragraph ellipsizes
                  mid-word ("…insist on bein...") which reads as a layout
                  bug; one complete sentence reads as intentional flavor. */}
              <Text style={styles.loreQuoteText}>
                {selectedWingData.def.lore.split('. ')[0].replace(/\.?$/, '.')}
              </Text>
            </View>

            <View style={styles.infoCardsRow}>
              <View style={[styles.infoCard, { borderColor: selectedWingData.def.accent + '33' }]}>
                <LinearGradient
                  colors={[selectedWingData.def.aura, 'rgba(26,10,46,0.90)'] as [string, string]}
                  style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <Text style={styles.infoCardLabel}>Decoration slot</Text>
                <Text style={styles.infoCardValue}>
                  {decorations[selectedWingData.def.id]
                    ? getDecorationMeta(decorations[selectedWingData.def.id]).name
                    : 'Empty'}
                </Text>
              </View>
              <View style={[styles.infoCard, { borderColor: selectedWingData.def.accent + '33' }]}>
                <LinearGradient
                  colors={[selectedWingData.def.aura, 'rgba(26,10,46,0.90)'] as [string, string]}
                  style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <Text style={styles.infoCardLabel}>Stars earned</Text>
                <Text style={styles.infoCardValue}>
                  {selectedWingData.chapters.reduce((sum, chapter) => sum + chapterStars(chapter.id), 0)}
                  <Text style={styles.infoCardValueMuted}>{`/${selectedWingData.chapters.length * 45}`}</Text>
                </Text>
              </View>
            </View>

            {/* Primary CTA — continue / replay / locked, per wing state. */}
            {selectedWingState === 'current' && activeChapter ? (
              <PrimaryButton
                label={`CONTINUE CHAPTER ${activeChapter.id}`}
                subLabel={activeChapter.name.toUpperCase()}
                onPress={() => launchLevel(currentLevel)}
                variant="gold"
                fullWidth
                style={styles.wingCta}
                accessibilityLabel={`Continue chapter ${activeChapter.id}, ${activeChapter.name}`}
              />
            ) : selectedWingState === 'restored' ? (
              <PrimaryButton
                label="REPLAY CHAPTERS"
                onPress={() => launchLevel(wingFirstLevel)}
                variant="primary"
                fullWidth
                style={styles.wingCta}
                accessibilityLabel={`Replay the ${selectedWingData.def.name} wing chapters`}
              />
            ) : (
              <View
                style={styles.lockedChip}
                accessible
                accessibilityLabel="Locked. Restore previous wings to unlock"
              >
                <GameIcon name="lock" size={13} accent="#8a7ba8" />
                <Text style={styles.lockedChipText}>LOCKED — RESTORE PREVIOUS WINGS</Text>
              </View>
            )}

            <SectionHeader label="CHAPTER ROADMAP" accent={selectedWingData.def.accent} />
            {selectedWingData.chapters.map((chapter) => {
              const status = getChapterStatus(chapter.id);
              const statusAccent = status === 'complete' ? COLORS.green
                : status === 'current' ? selectedWingData.def.accent
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
                        : status === 'current' ? selectedWingData.def.aura
                        : 'rgba(255,255,255,0.05)',
                      'rgba(26,10,46,0.92)',
                    ] as [string, string]}
                    style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <SvgMedallion
                    glyph={chapter.icon}
                    accent={status === 'complete' ? COLORS.green : selectedWingData.def.accent}
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
                          status === 'current' && { borderColor: selectedWingData.def.accent, backgroundColor: selectedWingData.def.aura },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chapterPillText,
                            status === 'complete' && styles.chapterPillTextComplete,
                            status === 'current' && { color: selectedWingData.def.accent },
                          ]}
                        >
                          {status === 'complete' ? 'COMPLETE' : status === 'current' ? 'CURRENT' : 'LOCKED'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.chapterDescription}>{chapter.description}</Text>
                    <View style={styles.chapterMetaRow}>
                      <Text style={styles.chapterMeta}>{chapter.puzzleCount} puzzles</Text>
                      <Text style={styles.chapterMeta}>{chapterStars(chapter.id)}/45{'★'}</Text>
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
              meta={`${ownedDecorations.length}/${decorationGridItems.length} COLLECTED`}
            />
            {/* Lore points balance — display only; spending lives in the
                cosmetic store. */}
            <View style={styles.loreChipRow}>
              <View
                style={styles.loreChip}
                accessible
                accessibilityLabel={`${libraryPoints} lore points`}
              >
                <GameIcon name="bookOpen" size={13} />
                <Text style={styles.loreChipText}>{libraryPoints} LORE</Text>
              </View>
            </View>
            <View style={styles.decorationsPanel}>
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard]}
                style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xxl }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <View style={styles.decorationsGrid}>
                {decorationGridItems.map(({ meta, owned }) => {
                  const placedInWing = Object.entries(decorations).find(([, dec]) => dec === meta.id)?.[0];
                  const pickable = Boolean(showDecorationPicker) && owned;
                  const rarityAccent = RARITY_ACCENT[meta.rarity];
                  return (
                    <Pressable
                      key={meta.id}
                      style={({ pressed }) => [
                        styles.decorationItem,
                        owned && styles.decorationItemOwned,
                        owned && { borderColor: rarityAccent + '66', shadowColor: rarityAccent },
                        pickable && styles.decorationItemPickable,
                        pressed && pickable && styles.cardPressed,
                      ]}
                      onPress={() => {
                        if (owned && showDecorationPicker) {
                          placeDecoration(showDecorationPicker, meta.id);
                          setShowDecorationPicker(null);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Decoration: ${owned ? meta.name : `${meta.name}, locked, unlocks at level ${meta.level}`}${owned && placedInWing ? ', placed' : ''}`}
                    >
                      <LinearGradient
                        colors={[
                          owned ? rarityAccent + '1f' : rarityAccent + '0f',
                          'rgba(26,10,46,0.92)',
                        ] as [string, string]}
                        style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                      <DecorationMedallion
                        name={meta.iconName}
                        accent={pickable ? COLORS.teal : rarityAccent}
                        owned={owned}
                        size={84}
                        style={{ marginBottom: 10 }}
                      />
                      <Text
                        style={[styles.decorationName, !owned && { color: COLORS.textMuted }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {meta.name}
                      </Text>
                      {meta.description ? (
                        <Text style={styles.decorationDescription} numberOfLines={1} ellipsizeMode="tail">
                          {meta.description}
                        </Text>
                      ) : null}
                      {!owned && meta.level != null && (
                        <View
                          style={[
                            styles.decorationUnlockChip,
                            { borderColor: rarityAccent + '55', backgroundColor: rarityAccent + '1a' },
                          ]}
                        >
                          <Text style={[styles.decorationUnlockText, { color: rarityAccent }]}>
                            LVL {meta.level}
                          </Text>
                        </View>
                      )}
                      {owned && placedInWing && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <View style={{ marginTop: 4 }}>
                            <GameIcon name={getWing(placedInWing).icon} size={10} />
                          </View>
                          <Text style={styles.decorationPlaced}>placed</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
                {Array.from({ length: futureSlotCount }, (_, slotIndex) => (
                  <View
                    key={`future-slot-${slotIndex}`}
                    style={[styles.decorationItem, styles.decorationItemFuture]}
                    accessible
                    accessibilityLabel="A future find, still buried in the stacks"
                  >
                    <View style={styles.futureChest}>
                      <GameIcon name="chest" size={44} accent="#8a7ba8" />
                    </View>
                    <Text style={styles.decorationFutureText}>One day{'…'}</Text>
                  </View>
                ))}
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

          {/* Folio's next find — closes the screen on a collection goal
              instead of a quarter-screen of empty backdrop. */}
          <View
            style={styles.folioFindPanel}
            accessible
            accessibilityLabel={
              nextFind
                ? `${LIBRARIAN.name}'s next find: ${nextFind.name}${nextFind.level ? `, unlocks at level ${nextFind.level}` : ''}`
                : `${LIBRARIAN.name} says the collection is complete`
            }
          >
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard]}
              style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xxl }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <LinearGradient
              colors={[COLORS.gold + '17', 'transparent'] as [string, string]}
              style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xxl }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.folioDisc}>
              <OwlIcon size={26} />
            </View>
            <View style={styles.folioFindMain}>
              <Text style={styles.folioFindEyebrow}>FOLIO{'’'}S NEXT FIND</Text>
              <Text style={styles.folioFindText} numberOfLines={3} ellipsizeMode="tail">
                {nextFind
                  ? `“I have shelf space measured for the ${nextFind.name}${nextFind.level ? ` — level ${nextFind.level} should do it` : ''}, Architect.”`
                  : '“The collection is complete. I dust it hourly, purely for the pleasure.”'}
              </Text>
            </View>
            {nextFind ? (
              <SvgMedallion
                name={nextFind.iconName}
                accent={RARITY_ACCENT[nextFind.rarity]}
                teaser
                size={42}
              />
            ) : (
              <SvgMedallion name="trophy" accent={COLORS.gold} size={42} />
            )}
          </View>
        </ScrollView>
        )}
      </ScreenScaffold>
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
    // The tab bar sits in-flow below the scroll view, so this only needs a
    // breath of air after the last panel — 110 here left a third of the
    // screen as empty backdrop.
    paddingBottom: 20,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  // ── Coach banner ──────────────────────────────────────────────────────
  coachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.30)',
    overflow: 'hidden',
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
  // ── Grand Library scene + Folio ───────────────────────────────────────
  sceneWrap: {
    marginTop: 6,
    marginBottom: 14,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.18)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
  folioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 18,
  },
  folioDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#c98b3f',
    backgroundColor: 'rgba(8, 2, 22, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#c98b3f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 9,
    elevation: 6,
  },
  folioBubble: {
    flex: 1,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.28)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  folioBubbleTail: {
    position: 'absolute',
    left: -5,
    top: 16,
    width: 10,
    height: 10,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,184,0,0.28)',
    backgroundColor: 'rgba(26,10,46,0.95)',
    transform: [{ rotate: '45deg' }],
  },
  folioText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodyMedium,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  folioAttribution: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: COLORS.gold,
    fontFamily: FONTS.bodySemiBold,
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
  overviewWingTagline: {
    fontSize: 9,
    lineHeight: 12,
    // Reserve two full lines so every card teases its wing identity at the
    // same height — no single-line mid-word clipping, no ragged grid.
    minHeight: 24,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
    textAlign: 'center',
    marginBottom: 5,
    paddingHorizontal: 2,
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
  infoCardValueMuted: {
    fontSize: 13,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textSecondary,
  },
  loreQuote: {
    borderRadius: RADIUS.lg,
    borderLeftWidth: 3,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  loreQuoteText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyRegular,
    fontStyle: 'italic',
  },
  wingCta: {
    marginTop: 14,
    marginBottom: 4,
  },
  lockedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    alignSelf: 'stretch',
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    opacity: 0.75,
  },
  lockedChipText: {
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: FONTS.display,
    color: COLORS.textMuted,
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
    // 2-up grid — fewer, bigger cards so the decoration render (not empty
    // purple card face) carries the tile.
    width: '48%',
    minWidth: 140,
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    paddingHorizontal: 12,
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
    fontSize: 13,
    lineHeight: 17,
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
  decorationDescription: {
    // One legible line, tail-ellipsized — not rows of micro-type.
    fontSize: 10.5,
    lineHeight: 15,
    color: 'rgba(214,204,236,0.75)',
    fontFamily: FONTS.bodyRegular,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  decorationUnlockChip: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  decorationUnlockText: {
    fontSize: 8,
    letterSpacing: 1,
    fontFamily: FONTS.display,
  },
  decorationItemFuture: {
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  futureChest: {
    opacity: 0.4,
    marginBottom: 6,
  },
  decorationFutureText: {
    fontSize: 10.5,
    letterSpacing: 1,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  // ── Folio's next find ─────────────────────────────────────────────────
  folioFindPanel: {
    ...bentoPanel('gold', { borderRadius: RADIUS.xxl, padding: 16, marginBottom: 0 }),
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  folioFindMain: {
    flex: 1,
  },
  folioFindEyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: COLORS.gold,
    fontFamily: FONTS.display,
    marginBottom: 4,
    textShadowColor: 'rgba(255,184,0,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  folioFindText: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyMedium,
    fontStyle: 'italic',
  },
  loreChipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -4,
    marginBottom: 8,
  },
  loreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.35)',
    backgroundColor: 'rgba(255,184,0,0.08)',
  },
  loreChipText: {
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: FONTS.display,
    color: COLORS.gold,
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
});

export default LibraryScreen;
