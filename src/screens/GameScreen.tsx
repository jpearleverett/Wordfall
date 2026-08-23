import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState, useRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  Share,
  View,
} from 'react-native';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, CellPosition, GameMode, GameState, VictorySummaryItem } from '../types';
import { useGame } from '../hooks/useGame';
import { GameStoreContext } from '../stores/gameStore';
import { GameHeader } from '../components/GameHeader';
import { PuzzleComplete } from '../components/PuzzleComplete';
import LocalErrorBoundary from '../components/LocalErrorBoundary';
import { crashReporter } from '../services/crashReporting';
import { findWordInGrid, choiceAvoidedDeadEnd, isProvablyCompletable } from '../engine/solver';
import { resolveUndoSource } from '../utils/undoGate';
import { TutorialOverlay } from '../components/TutorialOverlay';
import GameIcon, { GameIconName } from '../components/icons/GameIcon';

import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, MODE_CONFIGS, ANIM, FONTS, SCREEN_WIDTH, getDifficultyTier, isSpikeLevel, CELL_GAP, MAX_GRID_WIDTH } from '../constants';
import { soundManager } from '../services/sound';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { wordFoundHaptic, errorHaptic, successHaptic, boosterComboHaptic, lastWordHaptic, gravityLandHaptic, stuckHaptic } from '../services/haptics';
import { profilerOnRender } from '../utils/perfInstrument';
import { useStableCallback } from '../utils/hooks';
import { useReduceMotion } from '../hooks/useReduceMotion';
import {
  canShowOfferNow,
  recordOfferShown,
  offersShownThisSession,
} from '../utils/offerPacing';
import {
  usePlayerStore,
  usePlayerActions,
  selectEquippedTheme,
  selectFailCountByLevel,
  selectConsecutiveFailures,
  selectLastLevelStars,
  selectLastBreatherOfferedAt,
  selectPuzzlesSolved,
  selectStreaks,
  selectFlawlessStreak,
  selectTooltipsShown,
} from '../stores/playerStore';
import {
  useEconomyStore,
  useEconomyActions,
  selectHintTokens,
  selectUndoTokens,
  selectBoosterTokens,
  selectLivesCurrent,
  selectIsAdFreeComputed,
} from '../stores/economyStore';
import { analytics } from '../services/analytics';
import { getRemoteBoolean, getRemoteNumber } from '../services/remoteConfig';
import BoosterComboBanner from '../components/BoosterComboBanner';
import GameplayMascot from '../components/GameplayMascot';
import { detectCombo, type BoosterType, type ComboType } from '../data/boosterCombos';
import { getTheme } from '../data/cosmetics';
import { getChapterForLevel, getChapterPalette, getChapterTileRamp } from '../data/chapters';
import { getWing } from '../data/library';
import { rollBonusTile } from '../utils/bonusTile';

import { ContextualOffer, OfferType } from '../components/ContextualOffer';
import { adManager, AdRewardType } from '../services/ads';
import { MockAdModal } from '../components/MockAdModal';
import { ModeTutorialOverlay } from '../components/ModeTutorialOverlay';
import { getModeTutorial } from '../data/modeTutorials';
import { PostLossModal } from '../components/PostLossModal';
import { FailBreatherOffer, BREATHER_COOLDOWN_MS } from '../components/FailBreatherOffer';
import { GameFlashes } from './game/GameFlashes';
import { GameBanners } from './game/GameBanners';
import { PlayField, ConnectedWordBank } from './game/PlayField';
import { TilePaletteContext } from '../components/LetterCell';
import {
  computeGridGeometry,
  computeGridMetrics,
  GRID_FRAME_ALLOWANCE,
  gridSlotCenter,
} from '../components/game/gridGeometry';

interface GameScreenProps {
  board: Board;
  level: number;
  isDaily?: boolean;
  mode?: GameMode;
  maxMoves?: number;
  timeLimit?: number;
  onComplete: (
    stars: number,
    score: number,
    perfectRun: boolean,
    completionTimeSeconds: number,
    /**
     * Assist usage for this solve. Passed explicitly because the reward hook
     * has no access to the game store — it was previously logging hardcoded
     * zeros for these, which made every difficulty dashboard read as though
     * nobody ever used a hint.
     */
    assists?: { hintsUsed: number; undosUsed: number },
  ) => void;
  onNextLevel: () => void;
  onHome: () => void;
  // Completion data (passed from App.tsx wrapper after handleComplete)
  isFirstWin?: boolean;
  leveledUp?: boolean;
  newLevel?: number;
  difficultyTransition?: { from: string; to: string } | null;
  nextLevelPreview?: { level: number; difficulty: string } | null;
  shareText?: string;
  friendComparison?: { beaten: number; total: number } | null;
  eventMultiplierLabel?: string | null;
  showTomorrowPreview?: boolean;
  summaryItems?: VictorySummaryItem[];
  onNavigate?: (screen: string) => void;
  totalCoinsAwarded?: number;
  totalGemsAwarded?: number;
  nextUnlockPreview?: { icon: string; name: string; unlockLevel: number } | null;
}

interface MovedCell {
  row: number;
  col: number;
  cellId: string;
  /** Positive = fell downward by this many rows */
  fallRows: number;
}

function getMovedCellPositions(previousGrid: Board['grid'], nextGrid: Board['grid']): MovedCell[] {
  const previousPositions = new Map<string, CellPosition>();

  previousGrid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell) {
        previousPositions.set(cell.id, { row: rowIndex, col: colIndex });
      }
    });
  });

  const moved: MovedCell[] = [];

  nextGrid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) return;
      const previousPosition = previousPositions.get(cell.id);
      if (!previousPosition) return;
      if (previousPosition.row !== rowIndex || previousPosition.col !== colIndex) {
        moved.push({
          row: rowIndex,
          col: colIndex,
          cellId: cell.id,
          fallRows: rowIndex - previousPosition.row,
        });
      }
    });
  });

  return moved;
}

// Shared empty Set so memoized consumers (PlayField's GameGrid) don't re-render when spotlight is inactive.
const EMPTY_CELL_KEY_SET: Set<string> = new Set();
const GRID_AREA_BOTTOM_PADDING = 36;

// Unified booster-button body gradient — matches the tile material language
// so the three boosters read as one shelf with different icons rather than
// three mismatched widgets. Earlier revision had per-booster gradient
// tints (purple / blue / blue) and a yellow shelf image bleeding through
// behind them, which made the bar look like stickers on a wood plank.
const BOOSTER_BODY_GRADIENT = ['#2a1548', '#160a2e'] as [string, string];

// Pure helper — module scope so memoized sub-components can reach it.
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Memoized booster bar ────────────────────────────────────────────────
// Extracted so it doesn't re-render on every cell tap. Booster counts change
// only when a booster is spent; wildcardMode / spotlightActive change only
// on booster activation. None of them depend on selectedCells, so wrapping
// in React.memo means this whole subtree is skipped during gameplay taps.
interface BoosterBarMemoProps {
  wildcardCount: number;
  spotlightCount: number;
  shuffleCount: number;
  wildcardMode: boolean;
  spotlightActive: boolean;
  hasAnyBoosters: boolean;
  isPlaying: boolean;
  onWildcard: () => void;
  onSpotlight: () => void;
  onSmartShuffle: () => void;
}
const BoosterBarMemo = React.memo(function BoosterBarMemo({
  wildcardCount,
  spotlightCount,
  shuffleCount,
  wildcardMode,
  spotlightActive,
  hasAnyBoosters,
  isPlaying,
  onWildcard,
  onSpotlight,
  onSmartShuffle,
}: BoosterBarMemoProps) {
  // Per-booster accent identity ("boosters feel flat" — Aug 2026 blind
  // design review). Each booster owns a color: gold wildcard, teal
  // spotlight, coral shuffle — border tint, icon plate ring, glow, and
  // count badge all follow it.
  const boosters = [
    { key: 'wildcard', label: 'Wildcard', icon: 'star' as GameIconName, accent: COLORS.gold, count: wildcardCount, active: wildcardMode, onPress: onWildcard },
    { key: 'spotlight', label: 'Spotlight', icon: 'hint' as GameIconName, accent: COLORS.teal, count: spotlightCount, active: spotlightActive, onPress: onSpotlight },
    { key: 'shuffle', label: 'Shuffle', icon: 'shuffle' as GameIconName, accent: COLORS.coral, count: shuffleCount, active: false, onPress: onSmartShuffle },
  ];
  return (
    <View style={[
      styles.boosterBar,
      !(hasAnyBoosters && isPlaying) && styles.boosterBarHidden,
    ]}>
      <View style={styles.boosterShelf}>
        {boosters.map(b => b.count > 0 && (
          <Pressable
            key={b.key}
            style={({ pressed }) => [
              styles.boosterButton,
              { borderColor: b.accent + '66', shadowColor: b.accent },
              b.active && [styles.boosterActive, { borderColor: b.accent }],
              pressed && styles.boosterPressed,
            ]}
            onPress={b.onPress}
          >
            <LinearGradient
              colors={BOOSTER_BODY_GRADIENT}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
            />
            <View style={styles.boosterGlassEdge} />
            <View style={[styles.boosterIconPlate, { borderColor: b.accent + '73', shadowColor: b.accent }]}>
              <GameIcon name={b.icon} size={20} accent={b.accent} />
            </View>
            <Text style={styles.boosterLabel}>{b.label}</Text>
            <View style={[styles.boosterCount, { backgroundColor: b.accent, shadowColor: b.accent }]}>
              <Text style={styles.boosterCountText}>{b.count}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

// ── Memoized timer/moves bars ──────────────────────────────────────────
// These only need to update when the tick fires or moves increment — never
// on cell taps. Separating them means GameScreen's tap-driven re-renders
// don't touch this subtree.
interface TimerMovesBarsProps {
  hasTimer: boolean;
  hasMoveLimit: boolean;
  timeRemaining: number;
  /** Full time budget for the puzzle — suppresses warnings that would fire at start. */
  totalSeconds: number;
  moves: number;
  maxMoves: number;
}
const TimerMovesBarsMemo = React.memo(function TimerMovesBars({
  hasTimer,
  hasMoveLimit,
  timeRemaining,
  totalSeconds,
  moves,
  maxMoves,
}: TimerMovesBarsProps) {
  // Tier 4 C2 — 30s/10s threshold warnings (haptic + SFX). These were
  // authored in components/modes/TimerDisplay.tsx, which nothing ever
  // mounted; that component also ran its own setInterval countdown, so
  // mounting it would have raced the reducer's authoritative timer. The
  // warnings live here instead, driven by the store's timeRemaining.
  const warned30Ref = useRef(false);
  const warned10Ref = useRef(false);
  const prevTimeRef = useRef(timeRemaining);
  useEffect(() => {
    const prev = prevTimeRef.current;
    prevTimeRef.current = timeRemaining;
    if (!hasTimer) return;
    if (timeRemaining > prev) {
      // Timer refilled (new puzzle / time bonus) — re-arm the crossings.
      if (timeRemaining > 30) warned30Ref.current = false;
      if (timeRemaining > 10) warned10Ref.current = false;
      return;
    }
    if (!warned30Ref.current && timeRemaining <= 30 && timeRemaining > 10 && totalSeconds > 30) {
      warned30Ref.current = true;
      void errorHaptic();
      void soundManager.playSound('timerWarning30s');
    }
    if (!warned10Ref.current && timeRemaining <= 10 && timeRemaining > 0 && totalSeconds > 10) {
      warned10Ref.current = true;
      void errorHaptic();
      void soundManager.playSound('timerWarning10s');
    }
  }, [timeRemaining, hasTimer, totalSeconds]);

  return (
    <>
      {hasTimer && (
        <View style={[
          styles.timerBar,
          timeRemaining <= 30 && timeRemaining > 0 && styles.timerBarDanger,
          timeRemaining <= 0 && styles.barHidden,
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <GameIcon name="hourglass" size={16} accent={timeRemaining <= 30 ? COLORS.coral : undefined} />
            <Text style={[
              styles.timerText,
              timeRemaining <= 30 && styles.timerTextDanger,
            ]}>
              {formatTime(timeRemaining)}
            </Text>
          </View>
        </View>
      )}
      {hasMoveLimit && maxMoves > 0 && (
        <View style={[
          styles.moveBar,
          moves >= maxMoves - 1 && styles.moveBarDanger,
        ]}>
          <Text style={[
            styles.moveText,
            moves >= maxMoves - 1 && styles.moveTextDanger,
          ]}>
            Moves: {moves}/{maxMoves}
          </Text>
        </View>
      )}
    </>
  );
});

// --- Word-Clear Particle Pop ---
const PARTICLE_COLORS = ['#00d4ff', '#00e676', '#ffd700', '#b366ff', '#ff5252', '#ff9100'];

/**
 * Tooltip key for the "why did the board die" explainer. Lives in the same
 * `tooltipsShown` ledger as the other tips so it persists across sessions.
 *
 * NOT once-per-lifetime any more: the explainer almost always burned in
 * L1-30, where random-play dead-ends run ~12% and a stuck board is a
 * curiosity — then the ~57% regime arrives at L31+ with only the short
 * banner. One show per 15-level difficulty phase (4 lifetime max, keyed
 * below), so the lesson re-lands right where the boards start demanding it.
 * The legacy un-suffixed key doubles as phase 0 so existing players don't
 * re-see the early-game show.
 */
const FIRST_STUCK_TOOLTIP = 'first_stuck_gravity';
function stuckTooltipKeyForLevel(level: number): string {
  const phase = Math.min(3, Math.floor(Math.max(0, level - 1) / 15));
  return phase === 0 ? FIRST_STUCK_TOOLTIP : `${FIRST_STUCK_TOOLTIP}_p${phase}`;
}

// Last-word tension only fires on boards with at least this many words —
// on 2-3 word early boards the "climax" landed seconds into the puzzle.
const LAST_WORD_TENSION_MIN_WORDS = 4;

/** Stable empty array so the stranded-words memo can't churn GameBanners. */
const EMPTY_STRING_LIST: string[] = [];

function WordClearParticle({ delay, startX, startY }: { delay: number; startX: number; startY: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const angle = useRef(Math.random() * Math.PI * 2).current;
  // Travel + size lifted again (blind motion review round 2: "particle
  // energy is sparse" — bigger, brighter, farther so bursts still register
  // at 250ms frame sampling).
  const distance = useRef(65 + Math.random() * 85).current;
  const size = useRef(8 + Math.random() * 8).current;
  const color = useRef(PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1, duration: 620, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      left: startX,
      top: startY,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      alignItems: 'center',
      justifyContent: 'center',
      // Colored glow halo so the mote reads mid-flight, not just at spawn.
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 6,
      opacity: anim.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 0] }),
      transform: [
        { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] }) },
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance] }) },
        { scale: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.25, 0.25] }) },
      ],
    }}>
      {/* Hot white core — brighter center makes each mote read as a spark. */}
      <View style={{
        width: size * 0.45,
        height: size * 0.45,
        borderRadius: size * 0.225,
        backgroundColor: 'rgba(255,255,255,0.95)',
      }} />
    </Animated.View>
  );
}

// Radial flash ring — ONE expanding circle at the centroid of a cleared
// word, spawned alongside the bloom particles. Scales 0.3 → 2.2 while
// fading 0.85 → 0 over 500ms (ease-out) so the clear moment reads as a
// shockwave even at coarse frame sampling. Decorative only; rendered inside
// the pointerEvents="none" particle layer, and only reached through the
// same reduce-motion-gated dispatch sites as spawnTileBloom.
const RING_BASE_SIZE = 120;
const RING_DURATION_MS = 500;

function ClearFlashRing({ x, y }: { x: number; y: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: RING_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - RING_BASE_SIZE / 2,
        top: y - RING_BASE_SIZE / 2,
        width: RING_BASE_SIZE,
        height: RING_BASE_SIZE,
        borderRadius: RING_BASE_SIZE / 2,
        borderWidth: 4,
        borderColor: 'rgba(255,236,160,0.95)',
        shadowColor: '#ffd700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
        transform: [
          { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.2] }) },
        ],
      }}
    />
  );
}

// Four-point star sparks — 6–8 per word clear, launched from the burst
// centroid, flying outward 80–160px while scaling 0 → 1 → 0 with rotation
// over ~600ms. Second particle vocabulary layered over the round motes so
// bursts read as fireworks, not sparse dots (round-3 blind review: juice
// 4–5 vs AAA 7.3). Same decorative rules as WordClearParticle: transform/
// opacity only, native driver, pointerEvents="none" layer, reduce-motion
// gated at the dispatch sites.
const STAR_SPARK_DURATION_MS = 600;
const STAR_SPARK_COLORS = ['#ffffff', '#ffe27a', '#ffd700'];

function StarSpark({ x, y, delay }: { x: number; y: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const angle = useRef(Math.random() * Math.PI * 2).current;
  const distance = useRef(80 + Math.random() * 80).current; // 80–160px
  const size = useRef(14 + Math.random() * 8).current; // 14–22px
  const spin = useRef(Math.random() < 0.5 ? 200 : -200).current;
  const color = useRef(
    STAR_SPARK_COLORS[Math.floor(Math.random() * STAR_SPARK_COLORS.length)],
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, {
        toValue: 1,
        duration: STAR_SPARK_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ffd700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.85,
        shadowRadius: 6,
        opacity: anim.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] }) },
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance] }) },
          { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spin}deg`] }) },
          { scale: anim.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 1, 0] }) },
        ],
      }}
    >
      {/* Vertical + horizontal rays = 4-point star (same trick as Grid's GlintStar). */}
      <View style={{ position: 'absolute', width: size * 0.22, height: size, borderRadius: size * 0.11, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: size, height: size * 0.22, borderRadius: size * 0.11, backgroundColor: color }} />
    </Animated.View>
  );
}

// Brief white flash stamped on each cleared cell — a rounded rect matching
// the tile footprint fading 0.65 → 0 over 260ms, spawned with the bloom so
// the cleared letters visibly "pop" before gravity moves in. Opacity-only,
// native-driven, decorative layer.
const CELL_FLASH_DURATION_MS = 260;

function CellClearFlash({ x, y, size }: { x: number; y: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: CELL_FLASH_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: Math.max(6, size * 0.18),
        backgroundColor: '#ffffff',
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 0] }),
      }}
    />
  );
}

// ── Bloom particle queue, extracted from GameScreen (Fix F) ────────────────
// Previously the queue lived in GameScreen's state, so every push/remove
// re-rendered the 2690-line parent. Moving it here isolates re-renders to
// this tiny overlay. GameScreen talks to it through an imperative ref
// handle so the coordinating code reads the same as before.
interface ClearParticleEntry {
  id: string;
  x: number;
  y: number;
}

interface ClearRingEntry {
  id: string;
  x: number;
  y: number;
}

interface StarSparkEntry {
  id: string;
  x: number;
  y: number;
}

interface CellFlashEntry {
  id: string;
  x: number;
  y: number;
  size: number;
}

export interface ClearParticleLayerHandle {
  push(entries: ClearParticleEntry[]): void;
  removeIds(ids: string[]): void;
  /** Word-clear flash ring; self-removes after its 500ms animation. */
  pushRing(entry: ClearRingEntry): void;
  /** Star sparks batch; self-removes after the ~600ms flight. */
  pushStars(entries: StarSparkEntry[]): void;
  /** Per-cell white clear flashes; self-remove after 260ms. */
  pushCellFlashes(entries: CellFlashEntry[]): void;
}

interface ClearParticleLayerProps {
  style: any;
}

const ClearParticleLayerImpl = forwardRef<ClearParticleLayerHandle, ClearParticleLayerProps>(
  function ClearParticleLayerImpl({ style }, ref) {
    const [queue, setQueue] = useState<ClearParticleEntry[]>([]);
    const [rings, setRings] = useState<ClearRingEntry[]>([]);
    const [stars, setStars] = useState<StarSparkEntry[]>([]);
    const [flashes, setFlashes] = useState<CellFlashEntry[]>([]);
    // Self-removal timers for rings / stars / cell flashes.
    const ringTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    useEffect(() => () => {
      ringTimersRef.current.forEach(clearTimeout);
      ringTimersRef.current.clear();
    }, []);

    useImperativeHandle(ref, () => ({
      push(entries) {
        if (entries.length === 0) return;
        setQueue(prev => [...prev, ...entries]);
      },
      removeIds(ids) {
        if (ids.length === 0) return;
        const idSet = new Set(ids);
        setQueue(prev => prev.filter(q => !idSet.has(q.id)));
      },
      pushRing(entry) {
        setRings(prev => [...prev, entry]);
        const t = setTimeout(() => {
          ringTimersRef.current.delete(t);
          setRings(prev => prev.filter(r => r.id !== entry.id));
        }, RING_DURATION_MS + 60);
        ringTimersRef.current.add(t);
      },
      pushStars(entries) {
        if (entries.length === 0) return;
        setStars(prev => [...prev, ...entries]);
        const idSet = new Set(entries.map(e => e.id));
        const t = setTimeout(() => {
          ringTimersRef.current.delete(t);
          setStars(prev => prev.filter(s => !idSet.has(s.id)));
        }, STAR_SPARK_DURATION_MS + 8 * 15 + 60); // flight + max stagger
        ringTimersRef.current.add(t);
      },
      pushCellFlashes(entries) {
        if (entries.length === 0) return;
        setFlashes(prev => [...prev, ...entries]);
        const idSet = new Set(entries.map(e => e.id));
        const t = setTimeout(() => {
          ringTimersRef.current.delete(t);
          setFlashes(prev => prev.filter(f => !idSet.has(f.id)));
        }, CELL_FLASH_DURATION_MS + 60);
        ringTimersRef.current.add(t);
      },
    }), []);

    if (queue.length === 0 && rings.length === 0 && stars.length === 0 && flashes.length === 0) {
      return null;
    }

    return (
      <View style={style} pointerEvents="none">
        {flashes.map(f => (
          <CellClearFlash key={f.id} x={f.x} y={f.y} size={f.size} />
        ))}
        {rings.map(r => (
          <ClearFlashRing key={r.id} x={r.x} y={r.y} />
        ))}
        {stars.map((s, i) => (
          <StarSpark key={s.id} x={s.x} y={s.y} delay={(i % 8) * 15} />
        ))}
        {queue.map((p, i) => (
          <WordClearParticle
            key={p.id}
            delay={(i % 10) * 20}
            startX={p.x}
            startY={p.y}
          />
        ))}
      </View>
    );
  },
);
const ClearParticleLayer = React.memo(ClearParticleLayerImpl);

function GameScreenImpl({
  board,
  level,
  isDaily = false,
  mode = 'classic',
  maxMoves = 0,
  timeLimit = 0,
  onComplete,
  onNextLevel,
  onHome,
  isFirstWin = false,
  leveledUp = false,
  newLevel = 0,
  difficultyTransition = null,
  nextLevelPreview = null,
  shareText = '',
  friendComparison = null,
  eventMultiplierLabel = null,
  showTomorrowPreview = false,
  summaryItems = [],
  onNavigate,
  totalCoinsAwarded = 0,
  totalGemsAwarded = 0,
  nextUnlockPreview = null,
}: GameScreenProps) {
  const { t } = useTranslation();
  // Bottom inset: RN's legacy SafeAreaView is a no-op on Android, so the
  // booster bar previously relied on a fixed 28px guess that sat flush
  // against (or under) tall gesture-nav bars. Take the larger of the two.
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(28, insets.bottom + 12);
  // Narrow zustand subscriptions — re-render only when the slice actually
  // read changes. usePlayer() / useEconomy() would re-render this 1700-line
  // component on every economy/player mutation across the app.
  const equippedThemeId = usePlayerStore(selectEquippedTheme);
  const failCountByLevel = usePlayerStore(selectFailCountByLevel);
  const consecutiveFailures = usePlayerStore(selectConsecutiveFailures);
  const lastLevelStars = usePlayerStore(selectLastLevelStars);
  const lastBreatherOfferedAt = usePlayerStore(selectLastBreatherOfferedAt);
  const puzzlesSolved = usePlayerStore(selectPuzzlesSolved);
  const playerStreaks = usePlayerStore(selectStreaks);
  const flawlessStreakData = usePlayerStore(selectFlawlessStreak);
  const flawlessStreakCurrent = flawlessStreakData?.currentStreak ?? 0;
  const tooltipsShown = usePlayerStore(selectTooltipsShown);
  const playerActions = usePlayerActions();
  const { markTooltipShown, queueCeremony, sendChallenge, recordDailyQuestEvent } = playerActions;
  // Cast handle for the dynamic streak_shield activation lookup below — no
  // such method exists on PlayerActions today, but the offer-accept switch
  // checks for it so a future addition wires through automatically.
  const playerActionsAny = playerActions as unknown as Record<string, unknown>;

  const equippedTheme = useMemo(
    () => getTheme(equippedThemeId),
    [equippedThemeId],
  );
  const failCount = failCountByLevel?.[level] ?? 0;
  // Dynamic hint generosity: show hint sooner if player has failed this level before
  // Memoized to keep resetIdleTimer callback stable across renders
  const idleHintDelay = useMemo(
    () => failCount >= 2 ? 10000 : failCount === 1 ? 15000 : 20000,
    [failCount]
  );

  // Challenge-spike marker — computed once per level so a Remote Config
  // flip or level change rolls through. Suppressed for daily/weekly which
  // don't use the ramp-based level config at all.
  const isSpike = useMemo(() => isSpikeLevel(level), [level]);

  const modeConfig = MODE_CONFIGS[mode];
  const effectiveTimeLimit = modeConfig.rules.hasTimer
    ? (modeConfig.rules.timerSeconds || timeLimit || 120)
    : 0;
  const effectiveMaxMoves = modeConfig.rules.hasMoveLimit
    ? (maxMoves || board.words.length)
    : 0;

  const {
    store,
    submitWord,
    useHint,
    undoMove,
    grantHint,
    grantUndo,
    grantBooster,
    newGame,
    activateWildcard,
    activateSpotlight,
    activateSmartShuffle,
    activateBoosterCombo,
    expireBoosterCombo,
    activateScoreDoubler,
    activateBoardFreeze,
    isStuck,
    stars,
    foundWords,
    totalWords,
    remainingWords,
    solveSequence,
  } = useGame(board, level, mode, effectiveMaxMoves, effectiveTimeLimit, isDaily);

  // ── Narrow zustand selectors — GameScreen only re-renders when these
  //    coarse slices change (per word/action, NOT per cell tap). ─────────
  const status = useStore(store, s => s.status);
  const score = useStore(store, s => s.score);
  const moves = useStore(store, s => s.moves);
  const hintsLeft = useStore(store, s => s.hintsLeft);
  const hintsUsed = useStore(store, s => s.hintsUsed);
  const undosLeft = useStore(store, s => s.undosLeft);
  const timeRemaining = useStore(store, s => s.timeRemaining);
  const grid = useStore(store, s => s.board.grid);
  const history = useStore(store, useShallow((s: GameState) => s.history));
  const wildcardMode = useStore(store, s => s.wildcardMode);
  const spotlightActive = useStore(store, s => s.spotlightActive);
  const spotlightLetters = useStore(store, useShallow((s: GameState) => s.spotlightLetters));
  const gravityDirection = useStore(store, s => s.gravityDirection);
  const wordsUntilShrink = useStore(store, s => s.wordsUntilShrink);
  const perfectRun = useStore(store, s => s.perfectRun);
  // NOTE: deliberately NOT subscribed to per-tap markers (lastInvalidTap /
  // lastSelectionResetTap) — the invalid-tap feedback below watches the store
  // transiently so trace restarts never re-render this 3000-line component.
  const activeComboType = useStore(store, s => s.activeComboType);
  const comboWordsRemaining = useStore(store, s => s.comboWordsRemaining);
  const comboMultiplierValue = useStore(store, s => s.comboMultiplier);

  const [showComplete, setShowComplete] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [gridAreaSize, setGridAreaSize] = useState({ width: 0, height: 0 });
  const { width: gridAreaWidth, height: gridAreaHeight } = gridAreaSize;

  // Announce every newly-found word to screen readers (TalkBack / VoiceOver).
  // solveSequence grows by one entry per valid word; we watch its length and
  // emit the `wordFound` string from the most recent step.
  const lastAnnouncedIdxRef = useRef(-1);
  useEffect(() => {
    const len = solveSequence.length;
    if (len === 0) {
      lastAnnouncedIdxRef.current = -1;
      return;
    }
    if (lastAnnouncedIdxRef.current >= len - 1) return;
    lastAnnouncedIdxRef.current = len - 1;
    const step = solveSequence[len - 1];
    if (step?.wordFound) {
      AccessibilityInfo.announceForAccessibility(
        `Found word ${step.wordFound}. ${foundWords} of ${totalWords} complete.`,
      );
    }
  }, [solveSequence, foundWords, totalWords]);
  const validFlashAnim = useRef(new Animated.Value(0)).current;
  const [showValidFlash, setShowValidFlash] = useState(false);
  const invalidFlashAnim = useRef(new Animated.Value(0)).current;
  const [showInvalidFlash, setShowInvalidFlash] = useState(false);
  const scorePopupAnim = useRef(new Animated.Value(0)).current;
  const [scorePopup, setScorePopup] = useState<{ points: number; label: string; bonusCoins?: number } | null>(null);
  // Pending reduce-motion popup teardown — cleared before scheduling the next
  // so fast word chains don't have the old word's timer null the new popup.
  const scorePopupTeardownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScoreRef = useRef(score);
  const [showIdleHint, setShowIdleHint] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showModeIntro, setShowModeIntro] = useState(true);
  const [showModeTutorial, setShowModeTutorial] = useState(false);
  const modeTutorialSteps = useMemo(() => getModeTutorial(mode), [mode]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevFoundWordsRef = useRef(foundWords);
  // Multi-tile bloom queue — owned by the sibling `ClearParticleLayer` so
  // pushes/removes don't re-render the 2700-line GameScreen parent. We talk
  // to it through an imperative handle (Fix F, April 2026 perf pass).
  const particleLayerRef = useRef<ClearParticleLayerHandle | null>(null);
  // Tracks transient setTimeout handles (particle bursts, score popups, etc.) so they can be cleared on unmount.
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const trackTimeout = useCallback(
    (fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
      const handle = setTimeout(() => {
        pendingTimeoutsRef.current.delete(handle);
        fn();
      }, ms);
      pendingTimeoutsRef.current.add(handle);
      return handle;
    },
    [],
  );
  useEffect(() => () => {
    pendingTimeoutsRef.current.forEach(clearTimeout);
    pendingTimeoutsRef.current.clear();
  }, []);
  const gridScaleAnim = useRef(new Animated.Value(1)).current;
  const undoFlashAnim = useRef(new Animated.Value(0)).current;
  const [showUndoFlash, setShowUndoFlash] = useState(false);
  const undoPulseAnim = useRef(new Animated.Value(1)).current;

  // --- Big word celebration state (Task 2) ---
  const [bigWordLabel, setBigWordLabel] = useState<string | null>(null);
  const bigWordAnim = useRef(new Animated.Value(0)).current;
  const lastSubmittedWordLenRef = useRef(0);
  // Cell positions of the most-recently-submitted word (captured pre-submit).
  // Used by the multi-tile bloom spawn in the score-change effect.
  const lastSubmittedCellsRef = useRef<CellPosition[]>([]);

  // --- Tutorial overlay state (Task 4) ---
  const [tutorialTip, setTutorialTip] = useState<{ id: string; text: string } | null>(null);

  // --- Contextual Offer state ---
  const hintTokens = useEconomyStore(selectHintTokens);
  const undoTokens = useEconomyStore(selectUndoTokens);
  const boosterTokens = useEconomyStore(selectBoosterTokens);
  const lives = useEconomyStore(selectLivesCurrent);
  const isAdFree = useEconomyStore(selectIsAdFreeComputed);
  const {
    addCoins,
    addHintTokens,
    addLives,
    addBoosterToken,
    spendBoosterToken,
    spendHintToken,
    spendUndoToken,
    spendCoins,
    spendGems,
    processAdReward,
    hasTemporaryEntitlement,
    consumeTemporaryEntitlement,
  } = useEconomyActions();
  const [activeOffer, setActiveOffer] = useState<OfferType | null>(null);
  const offerShownThisLevel = useRef(false);

  // ── Bonus coin tile (in-puzzle variable reward) ──────────────────────
  // ~35% of boards mark one letter of a hidden word with a coin badge;
  // finding that word pays bonus coins with a rare-find sting. Selection is
  // a pure hash of the board's word list, so a given board always rolls the
  // same tile (retry can't farm it — the award ref below is keyed on the
  // cell ID). RC kill switch: bonusTileEnabled.
  const bonusTile = useMemo(
    () => (getRemoteBoolean('bonusTileEnabled') ? rollBonusTile(board) : null),
    [board],
  );
  const bonusAwardedCellRef = useRef<string | null>(null);
  const completionHandled = useRef(false);
  // hint_rescue: track session fail count for this level (local, resets on mount)
  const sessionFailCount = useRef(0);
  const failureCountedRef = useRef(false);
  // Separate once-per-puzzle guard for the adaptive-difficulty fail
  // signal. Classic/noGravity/gravityFlip/expert/relax modes never
  // transition status to 'failed' when the board goes unwinnable —
  // instead the isStuck flag fires while status stays 'playing'. This
  // ref lets us count a single "struggled on this puzzle" event for
  // the adjuster the first time isStuck goes true, independent of the
  // hint_rescue failure-count plumbing.
  const stuckFailRecordedRef = useRef(false);
  // close_finish: idle timer for "1 word away" scenario
  const closeFinishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // close_finish_premium escalation: fires after the coin-priced close_finish
  // has been declined/dismissed AND player remains stuck at 1 word for 60s.
  const closeFinishPremiumTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeFinishDismissedRef = useRef(false);
  const closeFinishPremiumShownRef = useRef(false);
  // post_puzzle: track whether to show after completion dismissal
  const [pendingPostPuzzleOffer, setPendingPostPuzzleOffer] = useState(false);
  // Post-loss modal state
  const [showPostLoss, setShowPostLoss] = useState(false);
  const postLossShownRef = useRef(false);
  // Tier 6 B1 — fail-breather offer gates PostLoss when player is stuck
  const [showFailBreather, setShowFailBreather] = useState(false);
  const failBreatherShownRef = useRef(false);
  // booster_pack: only show once per level on first entry to hard/expert
  const boosterPackShown = useRef(false);
  const offerSuppressed = showModeTutorial || showComplete || showPostLoss || showFailed || showFailBreather || activeOffer !== null;

  // --- Rewarded Ad state ---
  const [mockAdState, setMockAdState] = useState<{
    rewardType: AdRewardType;
    resolver: (watched: boolean) => void;
  } | null>(null);
  const [rewardDoubled, setRewardDoubled] = useState(false);

  // Register mock ad handler on mount so adManager can trigger the modal
  useEffect(() => {
    adManager.setMockAdHandler((rewardType, resolve) => {
      setMockAdState({ rewardType, resolver: resolve });
    });
    return () => {
      adManager.setMockAdHandler(() => {});
    };
  }, []);

  const handleWatchAdForHint = useCallback(async () => {
    const result = await adManager.showRewardedAd('hint_reward');
    if (result.rewarded) {
      processAdReward('hint_reward');
      void soundManager.playSound('hintUsed');
    }
  }, [processAdReward]);

  const handleWatchAdForDoubleReward = useCallback(async () => {
    const result = await adManager.showRewardedAd('double_reward');
    if (result.rewarded) {
      setRewardDoubled(true);
      // The actual doubling is applied in onComplete callback — we just set the flag
    }
  }, []);

  const handleMockAdComplete = useCallback((watched: boolean) => {
    if (mockAdState) {
      mockAdState.resolver(watched);
      setMockAdState(null);
    }
  }, [mockAdState]);

  const difficulty = useMemo(() => getDifficultyTier(level), [level]);

  const dismissOffer = useCallback(() => {
    if (activeOffer) {
      void analytics.logEvent('offer_dismissed', {
        offerType: activeOffer,
        level,
        mode,
        difficulty,
      });
      if (activeOffer === 'close_finish') {
        closeFinishDismissedRef.current = true;
      }
    }
    setActiveOffer(null);
  }, [activeOffer, level, mode, difficulty]);

  const showOfferIfAllowed = useCallback((type: OfferType) => {
    // close_finish_premium is a deliberate escalation — it is allowed to fire
    // even after the coin-priced close_finish has already been shown/dismissed
    // on this level. All other offer types still honour the one-per-level gate.
    const bypassGate = type === 'close_finish_premium';
    if (offerSuppressed) return false;
    if (!bypassGate && offerShownThisLevel.current) return false;
    // Session-level pacing. The one-per-level gate above was previously the
    // ONLY limit, so a level-2 player could be shown a purchase offer on
    // every single level — the pattern players describe as "the game keeps
    // asking me for money". Adds a grace period before the first offer, a
    // per-session cap, and a cooldown between offers. All RC-tunable.
    // close_finish_premium is an escalation of an offer the player is already
    // looking at, so it bypasses pacing exactly as it bypasses the level gate.
    if (!bypassGate && !canShowOfferNow(puzzlesSolved)) return false;
    offerShownThisLevel.current = true;
    if (!bypassGate) recordOfferShown();
    trackTimeout(() => {
      setActiveOffer(type);
      void analytics.logEvent('offer_shown', {
        offerType: type,
        level,
        mode,
        difficulty,
        offersThisSession: offersShownThisSession(),
      });
    }, 750);
    return true;
  }, [offerSuppressed, level, mode, difficulty, trackTimeout, puzzlesSolved]);

  // booster_pack: show on first entry to a hard/expert level
  useEffect(() => {
    if (boosterPackShown.current) return;
    if (puzzlesSolved < 8) return;
    if (difficulty === 'hard' || difficulty === 'expert') {
      const levelsPlayed = failCountByLevel ?? {};
      const previouslyPlayed = (levelsPlayed[level] ?? 0) > 0;
      if (!previouslyPlayed) {
        boosterPackShown.current = true;
        showOfferIfAllowed('booster_pack');
      }
    }
  }, [level, difficulty, failCountByLevel, puzzlesSolved, showOfferIfAllowed]);

  // close_finish: watch for 1 word remaining + stuck or idle 15s
  useEffect(() => {
    if (closeFinishTimerRef.current) {
      clearTimeout(closeFinishTimerRef.current);
      closeFinishTimerRef.current = null;
    }
    if (
      status === 'playing' &&
      remainingWords.length === 1 &&
      !offerShownThisLevel.current &&
      !activeOffer
    ) {
      // If dead-end detected, show after delay
      if (isStuck) {
        showOfferIfAllowed('close_finish');
      } else {
        // Start 30s idle timer for close_finish
        closeFinishTimerRef.current = setTimeout(() => {
          if (!offerShownThisLevel.current) {
            showOfferIfAllowed('close_finish');
          }
        }, 30000);
      }
    }
    return () => {
      if (closeFinishTimerRef.current) {
        clearTimeout(closeFinishTimerRef.current);
        closeFinishTimerRef.current = null;
      }
    };
  }, [remainingWords, isStuck, status, activeOffer, showOfferIfAllowed]);

  // close_finish_premium: escalation after the coin-priced close_finish was
  // dismissed. Fires 60s after dismissal if still at 1 word. 9-gem auto-solve.
  useEffect(() => {
    if (closeFinishPremiumTimerRef.current) {
      clearTimeout(closeFinishPremiumTimerRef.current);
      closeFinishPremiumTimerRef.current = null;
    }
    if (!getRemoteBoolean('closeFinishPremiumEnabled')) return;
    if (
      status === 'playing' &&
      remainingWords.length === 1 &&
      closeFinishDismissedRef.current &&
      !closeFinishPremiumShownRef.current &&
      !activeOffer
    ) {
      closeFinishPremiumTimerRef.current = setTimeout(() => {
        if (closeFinishPremiumShownRef.current) return;
        closeFinishPremiumShownRef.current = true;
        showOfferIfAllowed('close_finish_premium');
      }, 60000);
    }
    return () => {
      if (closeFinishPremiumTimerRef.current) {
        clearTimeout(closeFinishPremiumTimerRef.current);
        closeFinishPremiumTimerRef.current = null;
      }
    };
  }, [remainingWords.length, status, activeOffer, showOfferIfAllowed]);

  // hint_rescue: detect failures and show offer after 2+ fails (session or persistent)
  useEffect(() => {
    if (status === 'failed' || status === 'timeout') {
      if (!failureCountedRef.current) {
        failureCountedRef.current = true;
        sessionFailCount.current += 1;
        // Persist the failure so the hint_rescue offer survives app
        // restarts AND so the adaptive difficulty adjuster sees
        // struggling levels (recordFailure co-updates
        // performanceMetrics.levelAttempts now). The fail-path had
        // never invoked this before — failCountByLevel was always
        // empty, so the `persistentFails` read below only ever saw 0.
        playerActions.recordFailure(level);
      }
      const persistentFails = failCountByLevel?.[level] ?? 0;
      const totalFails = Math.max(sessionFailCount.current, persistentFails);
      if (totalFails >= 2 && !offerShownThisLevel.current && !activeOffer) {
        showOfferIfAllowed('hint_rescue');
      }
    } else {
      failureCountedRef.current = false;
    }
  }, [status, activeOffer, showOfferIfAllowed, failCountByLevel, level, playerActions]);

  // hint_rescue: dead-end detected while player has 0 hint tokens
  useEffect(() => {
    if (
      isStuck &&
      status === 'playing' &&
      hintTokens === 0 &&
      mode !== 'relax' &&
      !offerShownThisLevel.current &&
      !activeOffer
    ) {
      showOfferIfAllowed('hint_rescue');
    }
  }, [isStuck, status, hintTokens, mode, activeOffer, showOfferIfAllowed]);

  // post_puzzle (restock): show when hint tokens reach 0 mid-gameplay after using a hint
  useEffect(() => {
    if (
      status === 'playing' &&
      hintsUsed > 0 &&
      hintTokens === 0 &&
      mode !== 'relax' &&
      remainingWords.length > 0 &&
      !offerShownThisLevel.current &&
      !activeOffer
    ) {
      showOfferIfAllowed('post_puzzle');
    }
  }, [status, hintsUsed, hintTokens, mode, remainingWords.length, activeOffer, showOfferIfAllowed]);

  // life_refill: show when player fails and has no lives remaining
  useEffect(() => {
    if ((status === 'failed' || status === 'timeout') && lives === 0) {
      if (!offerShownThisLevel.current && !activeOffer) {
        showOfferIfAllowed('life_refill');
      }
    }
  }, [status, lives, activeOffer, showOfferIfAllowed]);

  // streak_shield: show when player has an active streak at risk during gameplay
  useEffect(() => {
    if (status !== 'playing') return;
    const streaks = playerStreaks;
    if (!streaks || streaks.currentStreak < 3 || streaks.streakShieldAvailable) return;
    // Check if last play was yesterday (streak at risk of expiring today)
    if (!streaks.lastPlayDate) return;
    const lastPlayed = new Date(streaks.lastPlayDate);
    const now = new Date();
    const diffMs = now.getTime() - lastPlayed.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    // Streak is at risk if last completed > 20 hours ago (approaching the daily reset)
    if (diffHours >= 20 && !offerShownThisLevel.current && !activeOffer) {
      showOfferIfAllowed('streak_shield');
    }
  }, [status, playerStreaks, activeOffer, showOfferIfAllowed]);

  // post_puzzle: flag when puzzle won with hint tokens depleted
  useEffect(() => {
    if (status === 'won' && hintTokens === 0 && mode !== 'relax') {
      setPendingPostPuzzleOffer(true);
    }
  }, [status, hintTokens, mode]);

  const handleOfferAccept = useCallback(() => {
    if (!activeOffer) return;
    let accepted = false;
    switch (activeOffer) {
      case 'hint_rescue':
        // Spend 50 coins, grant 5 hint tokens
        if (spendCoins(50)) {
          addHintTokens(5);
          accepted = true;
        }
        break;
      case 'close_finish':
        // Spend 25 coins, grant 1 hint token
        if (spendCoins(25)) {
          addHintTokens(1);
          accepted = true;
        }
        break;
      case 'close_finish_premium': {
        // Gem-priced escalation: spend N gems and auto-solve the last word.
        // Price is Remote Config driven so LiveOps can tune without a build.
        const gemCost = Math.max(1, Math.round(getRemoteNumber('closeFinishPremiumGemCost')));
        if (spendGems(gemCost)) {
          // Select the current positions of the last word (post-gravity) via
          // USE_PREMIUM_HINT, then submit on the next tick so the player
          // sees the trace briefly before it resolves.
          store.dispatch({ type: 'USE_PREMIUM_HINT' });
          trackTimeout(() => {
            store.dispatch({ type: 'SUBMIT_WORD' });
          }, 400);
          accepted = true;
        }
        break;
      }
      case 'post_puzzle':
        // Spend 80 coins, grant 10 hint tokens
        if (spendCoins(80)) {
          addHintTokens(10);
          accepted = true;
        }
        break;
      case 'booster_pack':
        // Spend 15 gems, grant 1 of each booster to persistent inventory
        if (spendGems(15)) {
          addBoosterToken('wildcardTile');
          addBoosterToken('spotlight');
          addBoosterToken('smartShuffle');
          accepted = true;
        }
        break;
      case 'life_refill':
        // Spend 10 gems, refill lives
        if (spendGems(10)) {
          addLives(5);
          accepted = true;
        }
        break;
      case 'streak_shield':
        // Activate streak shield — gem-priced in-game alternative to the
        // streak_freeze IAP. Same underlying player action.
        if (typeof (playerActionsAny as Record<string, unknown>).activateStreakShield === 'function') {
          if (spendGems(30)) {
            (playerActionsAny as { activateStreakShield: () => void }).activateStreakShield();
            accepted = true;
          }
        }
        break;
    }
    void analytics.logEvent('offer_accepted', {
      offerType: activeOffer,
      level,
      mode,
      difficulty,
      transactionCompleted: accepted,
    });
    setActiveOffer(null);
  }, [
    activeOffer,
    spendCoins,
    addHintTokens,
    spendGems,
    addBoosterToken,
    addLives,
    playerActionsAny,
    level,
    mode,
    difficulty,
    store,
    trackTimeout,
  ]);

  // Memoize the composed grid scale to avoid creating a new style object each render
  const gridScaleStyle = useMemo(() => ({
    transform: [{ scale: Animated.multiply(gridScaleAnim, undoPulseAnim) }],
  }), [gridScaleAnim, undoPulseAnim]);

  // Memoize the root shake container style so the Animated.View ref stays
  // stable across the thousands of re-renders a puzzle triggers (one per
  // cell selection). The shakeAnim ref is stable so the style needs only
  // to be computed once.
  const shakeContainerStyle = useMemo(
    () => [styles.container, { transform: [{ translateX: shakeAnim }] }],
    [shakeAnim],
  );

  // Track the grid container's actual height. Previously this was locked
  // to the first measurement via `gridHeightLocked.current` to avoid
  // re-renders on every minor layout shift — but that froze the grid at
  // whatever size it measured BEFORE the WordBank finished expanding to
  // its 2-row wrap panel, so the grid then visibly shrank as WordBank
  // claimed its real height. Now we track every measurement but only
  // re-render when the height actually changed by ≥1px, which absorbs
  // the post-mount layout settle while staying stable during gameplay.
  const handleGridLayout = useCallback((e: {
    nativeEvent: { layout: { width: number; height: number } };
  }) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    setGridAreaSize((prev) => (
      Math.abs(prev.width - width) >= 1 || Math.abs(prev.height - height) >= 1
        ? { width, height }
        : prev
    ));
  }, []);

  // Hard cap on simultaneously-rendered bloom particles. Keeps the queue
  // bounded so a 10-letter word with perTile=2 can't balloon past this limit.
  // 24 → 36 (round 2: "particle energy is sparse") → 48 (round 3: bursts
  // still read as "sparse particles"; star sparks + cell flashes join in).
  const MAX_BLOOM_PARTICLES = 48;

  const gridMetrics = useMemo(
    () => computeGridMetrics(
      grid.length,
      grid[0]?.length ?? 0,
      MAX_GRID_WIDTH,
      gridAreaHeight,
      CELL_GAP,
      GRID_FRAME_ALLOWANCE,
    ),
    [grid, gridAreaHeight],
  );
  const gridGeometry = useMemo(
    () => computeGridGeometry(grid, gridMetrics.cellSize, CELL_GAP),
    [grid, gridMetrics.cellSize],
  );
  const gridOffset = useMemo(
    () => ({
      left: (gridAreaWidth - gridGeometry.width) / 2,
      top: (gridAreaHeight - GRID_AREA_BOTTOM_PADDING - gridGeometry.height) / 2,
    }),
    [gridAreaWidth, gridAreaHeight, gridGeometry],
  );

  // Map an engine-owned (row, col) slot to its center in the particle
  // container. The same geometry drives Grid rendering and hit-testing.
  const cellPositionToScreen = useCallback(
    (row: number, col: number): { x: number; y: number } => {
      const fallback = {
        x: gridAreaWidth > 0 ? gridAreaWidth / 2 : SCREEN_WIDTH / 2,
        y: gridAreaHeight / 2 + 60,
      };
      if (
        gridMetrics.cellSize <= 0 ||
        row < 0 ||
        row >= gridGeometry.rows ||
        col < 0 ||
        col >= gridGeometry.cols
      ) {
        return fallback;
      }
      const center = gridSlotCenter(gridGeometry, row, col);
      if (!center) return fallback;
      return {
        x: gridOffset.left + center.x,
        y: gridOffset.top + center.y,
      };
    },
    [gridAreaHeight, gridAreaWidth, gridGeometry, gridMetrics.cellSize, gridOffset],
  );

  const gridCellSize = gridMetrics.cellSize;

  // Spawn multi-tile bloom particles for a word. Each cell gets
  // `tileBloomParticlesPerTile` particle instances, staggered 30ms per tile
  // for a waterfall effect, plus a 260ms white flash stamped on the tile
  // itself. Entries auto-remove from the queue after ~700ms.
  // No-op when `tileBloomEnabled` is false (Remote Config kill-switch).
  const spawnTileBloom = useCallback(
    (cells: CellPosition[]) => {
      if (cells.length === 0) return;
      if (!getRemoteBoolean('tileBloomEnabled')) return;
      const perTile = Math.max(
        1,
        Math.round(getRemoteNumber('tileBloomParticlesPerTile') || 2),
      );
      const maxTiles = Math.max(1, Math.floor(MAX_BLOOM_PARTICLES / perTile));
      const tiles = cells.slice(0, maxTiles);
      const bloomBatchId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      tiles.forEach((cell, idx) => {
        trackTimeout(() => {
          const { x, y } = cellPositionToScreen(cell.row, cell.col);
          if (gridCellSize > 0) {
            particleLayerRef.current?.pushCellFlashes([
              { id: `${bloomBatchId}-${idx}-flash`, x, y, size: gridCellSize },
            ]);
          }
          const entries: ClearParticleEntry[] = [];
          for (let p = 0; p < perTile; p++) {
            entries.push({ id: `${bloomBatchId}-${idx}-${p}`, x, y });
          }
          particleLayerRef.current?.push(entries);
          const ids = entries.map(e => e.id);
          trackTimeout(() => {
            particleLayerRef.current?.removeIds(ids);
          }, 700);
        }, idx * 30);
      });
    },
    [cellPositionToScreen, trackTimeout, gridCellSize],
  );

  // One expanding flash ring at the centroid of the cleared cells — a single
  // "shockwave" beat under the particle burst so the clear moment reads even
  // between coarse sample frames. Shares spawnTileBloom's Remote Config
  // kill-switch; reduce-motion gating happens at the dispatch sites, exactly
  // like spawnTileBloom's calls.
  const spawnClearRing = useCallback(
    (cells: CellPosition[]) => {
      if (cells.length === 0) return;
      if (!getRemoteBoolean('tileBloomEnabled')) return;
      let sx = 0;
      let sy = 0;
      for (const cell of cells) {
        const { x, y } = cellPositionToScreen(cell.row, cell.col);
        sx += x;
        sy += y;
      }
      particleLayerRef.current?.pushRing({
        id: `ring-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        x: sx / cells.length,
        y: sy / cells.length,
      });
    },
    [cellPositionToScreen],
  );

  // 6–8 four-point star sparks from the cleared word's centroid — the
  // second particle vocabulary of burst v2 (see StarSpark). Shares the
  // tileBloomEnabled kill-switch and the dispatch sites' reduce-motion
  // gating, exactly like spawnClearRing.
  const spawnStarSparks = useCallback(
    (cells: CellPosition[]) => {
      if (cells.length === 0) return;
      if (!getRemoteBoolean('tileBloomEnabled')) return;
      let sx = 0;
      let sy = 0;
      for (const cell of cells) {
        const { x, y } = cellPositionToScreen(cell.row, cell.col);
        sx += x;
        sy += y;
      }
      const cx = sx / cells.length;
      const cy = sy / cells.length;
      const count = 6 + Math.floor(Math.random() * 3); // 6–8
      const batchId = `star-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const entries: StarSparkEntry[] = [];
      for (let i = 0; i < count; i++) {
        entries.push({ id: `${batchId}-${i}`, x: cx, y: cy });
      }
      particleLayerRef.current?.pushStars(entries);
    },
    [cellPositionToScreen],
  );

  const reduceMotion = useReduceMotion();

  // Invalid word flash animation. Runs a brief low-amplitude screen shake
  // (kinesthetic negative feedback — distinct from the 7+-letter celebration
  // shake). Gated by Remote Config `invalidShakeEnabled` and skipped under
  // reduceMotion.
  const showInvalidFlashAnim = useCallback(() => {
    setShowInvalidFlash(true);
    void errorHaptic();
    void soundManager.playSound('wordInvalid');
    invalidFlashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(invalidFlashAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(invalidFlashAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      // A rapid second invalid tap restarts the sequence; the interrupted
      // run's callback must not hide the flash the new run just showed.
      if (finished) setShowInvalidFlash(false);
    });

    if (!reduceMotion && getRemoteBoolean('invalidShakeEnabled')) {
      // ~120ms total, ±8px peak — reduced amplitude vs the 7+-letter shake
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 20, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -7, duration: 20, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 20, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 20, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 2, duration: 20, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 20, useNativeDriver: true }),
      ]).start();
    }
  }, [invalidFlashAnim, reduceMotion, shakeAnim]);

  // NOTE (Aug 2026 feel audit): the "invalid tap" error treatment that used
  // to fire here — error haptic + wordInvalid SFX + red flash + screen shake
  // whenever a non-adjacent tap broke a 2+ cell trace — is deliberately GONE.
  // game_mechanics.md is explicit that invalid-word rejection is not a moment
  // this game has, and the gesture it punished (abandon a guess, start a new
  // one) is the single most common transition in exploratory play. Dead
  // traces now release silently on finger lift (see PlayField's
  // handleDragEnd), and a restart tap is just normal play. The reducer still
  // records lastSelectionResetTap; showInvalidFlashAnim stays for any future
  // surface that needs a genuine error flash.

  // Hints/undos use persistent economy tokens (not per-level allocation)
  // Relax mode still uses unlimited per-level allocation.
  // allowHints was only ever read by GameHeader (hiding the button), so
  // expert/perfectSolve players with tokens still got a tappable idle-hint
  // banner — and the ad-hint banner when they had none. Forcing availability
  // to 0 here starves every downstream surface at once.
  const hintsAllowed = modeConfig.rules.allowHints;
  const hintsAvailable = !hintsAllowed ? 0 : mode === 'relax' ? hintsLeft : hintTokens;
  const undosAvailable = mode === 'relax' ? undosLeft : undoTokens;

  // Idle hint prompt — use refs to avoid recreating on every state change
  const statusRef = useRef(status);
  const hintsAvailableRef = useRef(hintsAvailable);
  statusRef.current = status;
  hintsAvailableRef.current = hintsAvailable;

  const resetIdleTimer = useCallback(() => {
    setShowIdleHint(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // No hintsAvailable gate here: the out-of-hints ad banner REQUIRES
    // hintsAvailable === 0, so arming only when > 0 made it unreachable dead
    // code — the player most in need of a nudge (stalled, no hints) got
    // nothing at any idle duration. GameBanners decides which banner renders
    // (and canShowAdHint already suppresses the ad path in no-hint modes).
    if (statusRef.current === 'playing') {
      idleTimerRef.current = setTimeout(() => {
        setShowIdleHint(true);
      }, idleHintDelay);
    }
  }, [idleHintDelay]);

  // Selection-length changes (per-tap) are notified by PlayField via
  // onSelectionLengthChange callback, which calls resetIdleTimer. The
  // foundWords dependency (per-word) also resets the idle timer.
  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [foundWords, resetIdleTimer]);

  // Show mode tutorial on first play of a mode, or fall back to 2.5s text banner
  useEffect(() => {
    if (mode !== 'classic' && modeTutorialSteps && !tooltipsShown.includes(`mode_tutorial_${mode}`)) {
      // First time playing this mode — show interactive tutorial instead of banner
      setShowModeIntro(false);
      setShowModeTutorial(true);
    } else if (showModeIntro && mode !== 'classic') {
      const timer = setTimeout(() => setShowModeIntro(false), 2500);
      return () => clearTimeout(timer);
    } else {
      setShowModeIntro(false);
    }
  }, [mode]);

  // Track game state in refs so the cleanup can read current values without
  // adding them as effect dependencies (which caused spurious start/abandon cycles)
  const gameStateRef = useRef({ status: status, foundWords, totalWords, score: score });
  gameStateRef.current = { status: status, foundWords, totalWords, score: score };

  useEffect(() => {
    // BGM-by-screen context (plan task 2.3): crossfade via default 400ms
    // window. `relax` and `victory` are dedicated tracks; timePressure keeps
    // the tense bed; everything else uses the gameplay loop.
    const bgm = mode === 'timePressure' ? 'tense' : mode === 'relax' ? 'relax' : 'gameplay';
    void soundManager.playMusic(bgm);
    void analytics.logEvent('puzzle_start', {
      level,
      mode,
      isDaily,
      wordCount: board.words.length,
      boardRows: board.config.rows,
      boardCols: board.config.cols,
    });

    return () => {
      void soundManager.playMusic('menu');
      const gs = gameStateRef.current;
      if (gs.status === 'playing') {
        void analytics.logEvent('puzzle_abandon', {
          level,
          mode,
          foundWords: gs.foundWords,
          totalWords: gs.totalWords,
          score: gs.score,
        });
      }
    };
  }, [mode, level, isDaily, board.words.length, board.config.rows, board.config.cols]);

  // Gravity SFX + analytics on word found. The fall ANIMATION itself now
  // lives entirely inside Grid.tsx — it diffs the grid data at render time
  // and applies translate offsets in the same pass, so tiles can never
  // paint at their destination before the animation starts (the old
  // GameScreen-effect pipeline had a visible teleport/flicker window, and
  // its Animated.parallel froze every in-flight tile when a second word
  // interrupted it). GameScreen keeps the whoosh sound, analytics, and the
  // reduce-motion settle haptic (Grid skips all motion under reduce-motion,
  // so its onGravitySettled never fires there — feedback must not vanish
  // with motion).
  useEffect(() => {
    // Capture-then-update BEFORE branching: the word-found branch returns
    // early, so a trailing assignment would leave a stale ref that replays
    // the gravity whoosh on every undo.
    const prevFound = prevFoundWordsRef.current;
    prevFoundWordsRef.current = foundWords;
    if (foundWords > prevFound && status === 'playing') {
      const previousGrid = history[history.length - 1]?.grid;
      const moved = previousGrid
        ? getMovedCellPositions(previousGrid, grid)
        : [];
      void soundManager.playSound('gravity');
      // Defer analytics serialization off the gravity frame so the event
      // dispatch doesn't compete with the animation that just started.
      const analyticsPayload = { level, mode, movedCells: moved.length };
      requestAnimationFrame(() => {
        void analytics.logEvent('gravity_interaction', analyticsPayload);
      });
      if (reduceMotion && moved.length > 0) {
        void gravityLandHaptic();
      }
    }
  }, [foundWords, status]);

  // Landing haptic — fired by Grid when every tile from a fall has settled.
  const handleGravitySettled = useCallback(() => {
    void gravityLandHaptic();
  }, []);

  // E2E driver hook — web only, and only when the page was opened with an
  // `e2e` query param (never true in the shipped Android app; the web build
  // is used solely by the screenshot/design-review pipeline, where headless
  // Chromium cannot deliver the pointer events react-native-gesture-handler
  // expects). Exposes the game store so the driver can select cells and
  // read board state directly.
  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof window.location?.search === 'string' &&
      window.location.search.includes('e2e')
    ) {
      (window as unknown as Record<string, unknown>).__wfStore = store;
    }
  }, [store]);

  // Last-word tension hook (plan task 2). When `remainingWords` transitions to
  // exactly 1, crossfade to the tense BGM, fire a one-shot sting, and run a
  // medium haptic. Guarded by a ref so it fires once per transition even if the
  // effect re-runs. `starEarn` is currently the synth fallback; swap to
  // `last_word_sting` when real audio lands.
  const lastWordTensionFiredRef = useRef(false);
  // Below 4 words the "tension peak" fires seconds into the puzzle — on the
  // 2-word L1 board it landed on the FIRST word a brand-new player ever
  // found, before they even knew what the word bank was, training them to
  // ignore the cue before it meant anything. Early levels stay quiet; the
  // beat debuts around L8 where 4-word boards make it earned.
  const tensionEligible = totalWords >= LAST_WORD_TENSION_MIN_WORDS;
  useEffect(() => {
    const remaining = totalWords - foundWords;
    if (remaining !== 1 || status !== 'playing' || !tensionEligible) {
      if (remaining !== 1) lastWordTensionFiredRef.current = false;
      return;
    }
    if (lastWordTensionFiredRef.current) return;
    lastWordTensionFiredRef.current = true;
    void soundManager.playMusic('tense', { crossfadeMs: 600 });
    void soundManager.playSound('lastWord');
    void lastWordHaptic();
    const puzzleStartTime = store.getState().puzzleStartTime;
    const timeIntoPuzzleMs = puzzleStartTime > 0 ? Date.now() - puzzleStartTime : 0;
    void analytics.logEvent('last_word_tension_entered', {
      level,
      mode,
      timeIntoPuzzleMs,
    });
  }, [foundWords, totalWords, status, level, mode, store, tensionEligible]);

  useEffect(() => {
    if ((status === 'failed' || status === 'timeout') && showFailed) {
      const puzzleStartTime = store.getState().puzzleStartTime;
      const timeMs = puzzleStartTime > 0 ? Date.now() - puzzleStartTime : 0;
      void analytics.logEvent('puzzle_fail', {
        level,
        mode,
        reason: status,
        foundWords,
        totalWords,
        score: score,
      });
      void analytics.trackDifficultyTelemetry({
        mode,
        level,
        outcome: status === 'timeout' ? 'timeout' : 'fail',
        hints_used: hintsUsed,
        time_ms: timeMs,
        words_found: foundWords,
        words_total: totalWords,
      });
    }
  }, [status, showFailed, level, mode, foundWords, totalWords, score, hintsUsed, store]);

  // Score popup when score changes (word found) + particle burst (#1) + big word celebration (Task 2)
  useEffect(() => {
    const diff = score - prevScoreRef.current;
    prevScoreRef.current = score;
    if (diff > 0 && status === 'playing') {
      const wordLen = lastSubmittedWordLenRef.current;

      // Bonus coin tile payoff — the just-found word carried the coin badge.
      let bonusCoins = 0;
      if (bonusTile && bonusAwardedCellRef.current !== bonusTile.cellId) {
        const seq = store.getState().solveSequence;
        const lastFound = seq[seq.length - 1]?.wordFound;
        if (lastFound && lastFound.toUpperCase() === bonusTile.word.toUpperCase()) {
          bonusAwardedCellRef.current = bonusTile.cellId;
          bonusCoins = bonusTile.coins;
          addCoins(bonusCoins);
          void soundManager.playSound('wordFoundRare');
          void successHaptic();
          void analytics.logEvent('bonus_tile_collected', { level, mode, coins: bonusCoins });
        }
      }

      setScorePopup({
        points: diff,
        label: `+${diff}`,
        bonusCoins: bonusCoins > 0 ? bonusCoins : undefined,
      });
      void wordFoundHaptic();

      // Big word celebration (Task 2, re-tuned Aug 2026 feel audit).
      // Calibrated for a calm word game: per game_mechanics.md a long word
      // is "emotionally satisfying to trace, not mechanically harder" — a
      // texture, not an achievement. The old treatment (random slot-machine
      // adjective + ±14px camera shake + a haptic stacked on the one that
      // just fired) was the register of a match-3 cascade. The length IS
      // the flex, so the badge states it; the bloom carries the delight;
      // wordFoundHaptic above already provides the tactile beat.
      if (wordLen >= 7) {
        void soundManager.playSound('combo');
        setBigWordLabel(`${wordLen} LETTERS!`);
        bigWordAnim.setValue(0);
        if (!reduceMotion) {
          // Gentle grid nudge, not a camera shake.
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 6, duration: 35, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -5, duration: 35, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 3, duration: 30, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
          ]).start();

          Animated.sequence([
            Animated.spring(bigWordAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
            Animated.delay(800),
            Animated.timing(bigWordAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]).start(({ finished }) => {
            // Consecutive 7+ letter words restart the sequence; an interrupted
            // run must not null out the label the new run just set.
            if (finished) setBigWordLabel(null);
          });

          // Per-tile bloom burst for 7+ letter words (multi-tile waterfall).
          // Falls back to a center burst if no cleared cells were captured
          // (e.g. chain reactions don't carry selectedCells through).
          const bigCells = lastSubmittedCellsRef.current;
          if (bigCells.length > 0) {
            spawnTileBloom(bigCells);
            spawnClearRing(bigCells);
            spawnStarSparks(bigCells);
            // Second batch for extra celebratory impact
            trackTimeout(() => spawnTileBloom(bigCells), 250);
          } else {
            const fallbackId = `big-${Date.now()}`;
            // Push both entries in a single batch so the sibling layer
            // commits once (Fix F). Removals are likewise batched via
            // a single trackTimeout chain.
            const fallback: ClearParticleEntry[] = [
              { id: `${fallbackId}-a`, x: SCREEN_WIDTH / 2, y: gridAreaHeight / 2 + 60 },
              { id: `${fallbackId}-b`, x: SCREEN_WIDTH / 2 + 20, y: gridAreaHeight / 2 + 40 },
            ];
            particleLayerRef.current?.push([fallback[0]]);
            trackTimeout(() => {
              particleLayerRef.current?.removeIds([fallback[0].id]);
              particleLayerRef.current?.push([fallback[1]]);
              trackTimeout(() => {
                particleLayerRef.current?.removeIds([fallback[1].id]);
              }, 500);
            }, 250);
          }
        } else {
          bigWordAnim.setValue(1);
          trackTimeout(() => { bigWordAnim.setValue(0); setBigWordLabel(null); }, 1000);
        }
      } else if (wordLen >= 5) {
        void soundManager.playSound('combo');
        void soundManager.playSound('wordFound');
      } else {
        void soundManager.playSound('wordFound');
      }

      // #1 Word-clear particle burst (normal words). Multi-tile bloom spawns
      // a small particle puff at each cleared cell; falls back to a center
      // burst if positions weren't captured (e.g. chain-reaction clears).
      if (!reduceMotion && wordLen < 7) {
        const cells = lastSubmittedCellsRef.current;
        if (cells.length > 0) {
          spawnTileBloom(cells);
          spawnClearRing(cells);
          spawnStarSparks(cells);
        } else {
          const fallbackId = `chain-${Date.now()}`;
          const entry: ClearParticleEntry = { id: fallbackId, x: SCREEN_WIDTH / 2, y: gridAreaHeight / 2 + 60 };
          particleLayerRef.current?.push([entry]);
          trackTimeout(() => {
            particleLayerRef.current?.removeIds([entry.id]);
          }, 500);
        }
      }

      // Reset captured cells so the next non-submit score change (e.g. chain
      // reactions, score doubler) falls back to the center burst.
      lastSubmittedCellsRef.current = [];

      if (reduceMotion) {
        // Skip score popup animation, just show briefly. Cancel the previous
        // word's pending teardown so a fast follow-up popup isn't nulled 800ms
        // after the OLD word instead of this one.
        if (scorePopupTeardownRef.current !== null) {
          clearTimeout(scorePopupTeardownRef.current);
          pendingTimeoutsRef.current.delete(scorePopupTeardownRef.current);
        }
        scorePopupAnim.setValue(1);
        scorePopupTeardownRef.current = trackTimeout(() => {
          scorePopupTeardownRef.current = null;
          scorePopupAnim.setValue(0);
          setScorePopup(null);
        }, 800);
        return;
      }

      // Celebration scaling based on word length (Task 2)
      // 3-4 letter words get a visible 1.15x beat so every word clear confirms
      // even when the board has no bloom cells captured (e.g. chain reactions).
      const popupScale = wordLen >= 7 ? 1.6 : wordLen >= 5 ? 1.3 : 1.15;

      scorePopupAnim.setValue(0);
      Animated.sequence([
        // Quick pop-in (~200ms). Round-3 blind review flagged the old
        // spring + 520ms + 260ms chain as "lingers ~1.7s / sluggish" —
        // total visible lifetime now targets ~900ms. Stiffer spring +
        // raised rest thresholds cut the settle tail.
        Animated.spring(scorePopupAnim, {
          toValue: 1,
          friction: 6,
          tension: 320,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.5,
          useNativeDriver: true,
        }),
        // Single drift-and-fade leg (~550ms): the 1→2 drive still carries
        // the pill the same -40px translateY (GameFlashes interpolation is
        // unchanged) and the 1.8→2 opacity ramp fades it over the final
        // ~250ms. Fully gone by ~900ms.
        Animated.timing(scorePopupAnim, {
          toValue: 2,
          duration: 550,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        // A back-to-back word find restarts this sequence via setValue(0),
        // which fires the interrupted run's callback — without this guard it
        // deletes the popup the new word just set, so fast chains lose their
        // '+N' feedback entirely.
        if (finished) setScorePopup(null);
      });
    }
  }, [score]);

  // Green flash + auto-submit when a valid word is selected.
  // Driven by PlayField's onValidWordChange callback (not a direct subscription
  // to selectedCells, which would defeat the per-tap optimization).
  const validFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleValidWordChange = useStableCallback((isValid: boolean, wordLength: number) => {
    // Clean up any pending auto-submit timer from a previous valid state
    if (validFlashTimerRef.current) {
      clearTimeout(validFlashTimerRef.current);
      validFlashTimerRef.current = null;
    }

    if (isValid && wordLength >= 3) {
      // Show green flash (skip animation if reduceMotion)
      setShowValidFlash(true);
      if (!reduceMotion) {
        validFlashAnim.setValue(0);
        Animated.timing(validFlashAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        // Grid scale pop runs in parallel with the flash so submit can fire faster
        gridScaleAnim.setValue(1);
        Animated.sequence([
          Animated.timing(gridScaleAnim, { toValue: 0.97, duration: 60, useNativeDriver: true }),
          Animated.timing(gridScaleAnim, { toValue: 1.0, duration: 100, useNativeDriver: true }),
        ]).start();
      }

      validFlashTimerRef.current = setTimeout(() => {
        validFlashTimerRef.current = null;

        // Track word length for big word celebration (Task 2)
        lastSubmittedWordLenRef.current = wordLength;
        // Snapshot the user's current selection so the score-change effect can
        // bloom per-tile particles at each cleared cell. Copied by value
        // because SUBMIT_WORD will clear selectedCells in the store.
        lastSubmittedCellsRef.current = store.getState().selectedCells.slice();

        submitWord();
        setShowValidFlash(false);
      }, 50);
    } else {
      setShowValidFlash(false);
    }
  });

  // Clean up valid flash timer on unmount
  useEffect(() => () => {
    if (validFlashTimerRef.current) clearTimeout(validFlashTimerRef.current);
  }, []);

  // Callback for PlayField selection length changes — resets idle timer
  const handleSelectionLengthChange = useStableCallback((_length: number) => {
    resetIdleTimer();
  });

  // Show completion modal — use a ref guard to prevent double-firing when
  // onComplete mutates player/economy state and causes callback reference changes
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  useEffect(() => {
    if (status === 'won' && !completionHandled.current) {
      completionHandled.current = true;
      void successHaptic();
      // Duck BGM under the ceremony SFX so puzzleComplete rings clearly,
      // then swap to the victory bed while the complete modal animates in.
      soundManager.duckMusicFor(1200, 0.35);
      void soundManager.playSound('puzzleComplete');
      void soundManager.playMusic('victory');
      const finalScore = score;
      const finalStars = stars;
      const finalPerfectRun = perfectRun;
      // Capture real completion time for the adaptive-difficulty feed.
      // puzzleStartTime is wall-clock ms at NEW_GAME; this branch fires
      // once per 'won' transition so subtracting gives the player's
      // actual time-to-solve. Clamped to >=0 in case puzzleStartTime
      // wasn't set (legacy snapshot hydrate path).
      const startedAt = store.getState().puzzleStartTime;
      const completionTimeSeconds =
        startedAt > 0 ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
      const timer = setTimeout(() => {
        setShowComplete(true);
        const finalState = store.getState();
        onCompleteRef.current(
          finalStars,
          finalScore,
          finalPerfectRun,
          completionTimeSeconds,
          { hintsUsed: finalState.hintsUsed, undosUsed: finalState.undosUsed },
        );
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [status, stars, score, perfectRun]);

  // Reset grid height when board changes (new puzzle/level) — prompts a
  // fresh onLayout measurement for the new grid's dimensions.
  useEffect(() => {
    setGridAreaSize({ width: 0, height: 0 });
    // Also reset the adjuster's per-puzzle stuck-fail guard so the
    // next puzzle can record its own struggle signal independently.
    stuckFailRecordedRef.current = false;
  }, [board]);

  // Adaptive-difficulty struggle signal for modes that DON'T flip
  // status to 'failed' on dead-end (Classic, noGravity, gravityFlip,
  // expert, relax). When the solver reports isStuck on an active
  // puzzle, count it as a fail for the adjuster exactly once per
  // puzzle load — the player may then use a hint to escape, but the
  // struggle telemetry is real and worth feeding in.
  useEffect(() => {
    if (
      isStuck &&
      status === 'playing' &&
      !stuckFailRecordedRef.current
    ) {
      stuckFailRecordedRef.current = true;
      playerActions.recordFailure(level);
    }
  }, [isStuck, status, level, playerActions]);

  // Free rescue on a genuinely dead board.
  //
  // Getting stuck is a real, intended fail state — the order you clear words
  // in reshapes the board, and choosing badly is supposed to cost you. What
  // was NOT intended is the response: with no undo tokens the only remaining
  // option is restarting the level outright, and the dead board also triggers
  // two purchase offers (close_finish, hint_rescue). That monetises the
  // single most frustrating moment in the game.
  //
  // One free undo per level, only when the solver says the board is actually
  // dead and the player has nothing left to spend. The wall still happens and
  // the player still has to re-plan — they just aren't taxed to learn the
  // mechanic. Cannot be farmed: it requires a genuine dead end, fires once per
  // puzzle, and grants a single undo.
  const freeRescueUsedRef = useRef(false);
  const [freeUndoGranted, setFreeUndoGranted] = useState(false);
  useEffect(() => {
    freeRescueUsedRef.current = false;
    setFreeUndoGranted(false);
  }, [level, mode]);

  // Purchased one-shot effects from the coin shop. The shop stores them as
  // temporary entitlements (so an unused purchase survives an app restart);
  // this is the point where they become real: activate in the game store,
  // then consume so the effect cannot apply twice. Board Freeze is only
  // meaningful where a shrink exists, so it is left banked in other modes
  // rather than burned uselessly.
  useEffect(() => {
    if (hasTemporaryEntitlement('score_doubler')) {
      activateScoreDoubler();
      consumeTemporaryEntitlement('score_doubler');
      void analytics.logEvent('temporary_effect_activated', { effect: 'score_doubler', level, mode });
    }
    if (mode === 'shrinkingBoard' && hasTemporaryEntitlement('board_freeze')) {
      activateBoardFreeze();
      consumeTemporaryEntitlement('board_freeze');
      void analytics.logEvent('temporary_effect_activated', { effect: 'board_freeze', level, mode });
    }
    // Keyed per puzzle load — the entitlement check is cheap and the consume
    // makes re-runs harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, mode]);

  // First dead end ever: explain the mechanic instead of just announcing the
  // wall. A player who doesn't yet connect "I cleared the wrong word first"
  // to "the board is now unsolvable" reads a dead end as the game being
  // broken — the banner names the word gravity buried, and this adds the one
  // sentence that turns the loss into a rule they can use. Latched into
  // state so the text doesn't switch to the short form while they're reading
  // it, and marked shown immediately so it can't reappear on the next level.
  const [showFirstStuckHelp, setShowFirstStuckHelp] = useState(false);
  const firstStuckHandledRef = useRef(false);
  useEffect(() => {
    firstStuckHandledRef.current = false;
    setShowFirstStuckHelp(false);
  }, [level, mode]);

  // Which remaining words gravity has actually buried. `isStuck` means no
  // clearing ORDER finishes the board, which does not imply every word is
  // unreachable — some may still be traceable and simply lead nowhere. The
  // banner names only the genuinely unreachable ones, so the filter happens
  // here where the live grid is. Only computed on a dead board; on every
  // other render this is an empty array and costs nothing.
  const strandedWords = useMemo(() => {
    if (!isStuck || status !== 'playing') return EMPTY_STRING_LIST;
    return remainingWords.filter((w) => findWordInGrid(grid, w, 1).length === 0);
  }, [isStuck, status, remainingWords, grid]);

  // The board dying is the game's core fail state, and it used to happen in
  // total silence: a static banner popped into the layout and nothing else —
  // no sound (the `defeat` slot was authored, registered, synth-defined, and
  // never played), no haptic, no screen-reader signal. The generous rescue
  // logic underneath landed with zero presentation, so nobody registered the
  // favour. One beat per dead end: sad-but-not-punishing chord over ducked
  // BGM, a Warning (not Error) haptic, and an a11y announcement naming the
  // buried word the way the visual banner does.
  const stuckFeltRef = useRef(false);
  const failFeltRef = useRef(false);
  useEffect(() => {
    stuckFeltRef.current = false;
    failFeltRef.current = false;
  }, [level, mode, board]);

  // ── J11: "kept it open" acknowledgment ─────────────────────────────────
  // Order-sensitivity is the game's stated skill, but the player only ever
  // learned about ordering by LOSING. When their clear provably avoided a
  // dead end an alternative would have caused, a small teal chip says so —
  // once per puzzle at most, no points, no multiplier, no escalation (the
  // constraints that keep this out of the deleted combo-system territory).
  // Detection runs deferred (350ms, post-gravity) with a hard 80ms solver
  // budget, and only fires on a CONFIRMED dead-ending alternative —
  // inconclusive budget-exhausted checks stay silent (see solver.ts).
  const [keptOpenVisible, setKeptOpenVisible] = useState(false);
  const keptOpenFiredRef = useRef(false);
  const keptOpenAnim = useRef(new Animated.Value(0)).current;
  const prevFoundForKeptOpenRef = useRef(0);
  useEffect(() => {
    keptOpenFiredRef.current = false;
    prevFoundForKeptOpenRef.current = 0;
    setKeptOpenVisible(false);
  }, [level, mode, board]);
  useEffect(() => {
    const prev = prevFoundForKeptOpenRef.current;
    prevFoundForKeptOpenRef.current = foundWords;
    if (foundWords <= prev || status !== 'playing') return;
    if (keptOpenFiredRef.current) return;
    if (!getRemoteBoolean('keptOpenBadgeEnabled')) return;
    const timer = setTimeout(() => {
      const s = store.getState();
      if (s.status !== 'playing') return;
      const lastStep = s.solveSequence[s.solveSequence.length - 1];
      const found = lastStep?.wordFound;
      const prevEntry = s.history[s.history.length - 1];
      if (!found || !prevEntry) return;
      const remainingBefore = prevEntry.words
        .filter((w) => !w.found)
        .map((w) => w.word);
      if (remainingBefore.length < 2) return;
      // The badge must never appear on a board that just died, and the
      // authoritative isStuck check is debounced past this window — so
      // require a cheap POSITIVE proof that the current board completes
      // (unproven = stay silent). Also skip the final word: the victory
      // screen owns that moment.
      const remainingNow = s.board.words
        .filter((w) => !w.found)
        .map((w) => w.word);
      if (remainingNow.length === 0) return;
      if (!isProvablyCompletable(s.board.grid, remainingNow)) return;
      if (choiceAvoidedDeadEnd(prevEntry.grid, found, remainingBefore, 80)) {
        keptOpenFiredRef.current = true;
        setKeptOpenVisible(true);
        void analytics.logEvent('kept_open_shown', { level, mode });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [foundWords, status, store, level, mode]);
  useEffect(() => {
    if (!keptOpenVisible) return;
    if (reduceMotion) {
      keptOpenAnim.setValue(1);
      const t = setTimeout(() => {
        keptOpenAnim.setValue(0);
        setKeptOpenVisible(false);
      }, 1600);
      return () => clearTimeout(t);
    }
    keptOpenAnim.setValue(0);
    Animated.sequence([
      Animated.timing(keptOpenAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(keptOpenAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setKeptOpenVisible(false);
    });
  }, [keptOpenVisible, reduceMotion, keptOpenAnim]);
  useEffect(() => {
    if (!isStuck || status !== 'playing') {
      if (!isStuck) stuckFeltRef.current = false;
      return;
    }
    if (stuckFeltRef.current) return;
    stuckFeltRef.current = true;
    soundManager.duckMusicFor(1800, 0.35);
    void soundManager.playSound('puzzleFailStuck');
    void stuckHaptic();
    const headline =
      strandedWords.length > 0
        ? `${strandedWords[0]} is cut off by gravity.`
        : 'No remaining order finishes this board.';
    AccessibilityInfo.announceForAccessibility(
      `Board is stuck. ${headline} Step back a move or retry the puzzle.`,
    );
  }, [isStuck, status, strandedWords]);

  useEffect(() => {
    if (!isStuck || status !== 'playing' || firstStuckHandledRef.current) return;
    firstStuckHandledRef.current = true;
    const tooltipKey = stuckTooltipKeyForLevel(level);
    if (tooltipsShown.includes(tooltipKey)) return;
    setShowFirstStuckHelp(true);
    markTooltipShown(tooltipKey);
    void analytics.logEvent('first_stuck_explainer_shown', { level, mode });
  }, [isStuck, status, tooltipsShown, markTooltipShown, level, mode]);

  useEffect(() => {
    if (
      isStuck &&
      status === 'playing' &&
      mode !== 'relax' &&
      undosLeft <= 0 &&
      undoTokens <= 0 &&
      history.length > 0 &&
      !freeRescueUsedRef.current &&
      getRemoteBoolean('freeStuckRescueEnabled')
    ) {
      freeRescueUsedRef.current = true;
      grantUndo();
      // Say so. The rescue silently flipped the banner from "tap to retry"
      // to "tap to step back", so the player read it as having had an undo
      // all along — a moment of generosity nobody notices buys nothing.
      setFreeUndoGranted(true);
      void analytics.logEvent('free_stuck_rescue_granted', { level, mode });
    }
  }, [isStuck, status, mode, undosLeft, undoTokens, history.length, grantUndo, level]);

  // Show post-loss modal first (if applicable), then failed modal.
  // Tier 6 B1 — if the player qualifies for the fail-breather offer,
  // surface it ahead of PostLossModal on this loss. Rules:
  //   • Remote Config flag `failBreatherEnabled` must be true
  //   • consecutiveFailures >= 2 OR lastLevelStars === 1 (existing
  //     `needsBreather()` predicate, mirrored here via selectors so
  //     GameScreen doesn't have to call the context method)
  //   • 1-hour cooldown since the last offer on this player
  //   • mode !== 'relax' (relax mode has no fail state)
  useEffect(() => {
    if ((status === 'failed' || status === 'timeout') && !showFailed) {
      // Hard fails (timeout, perfect-solve violation) get the same single
      // sad-but-not-punishing beat as a stuck board — unless the stuck
      // effect above already played it for this attempt.
      if (!failFeltRef.current && !stuckFeltRef.current) {
        failFeltRef.current = true;
        soundManager.duckMusicFor(1800, 0.35);
        void soundManager.playSound(
          status === 'timeout' ? 'puzzleFailTime' : 'puzzleFailInstant',
        );
        void stuckHaptic();
      }
      const breatherEligible =
        getRemoteBoolean('failBreatherEnabled') &&
        mode !== 'relax' &&
        (consecutiveFailures >= 2 || lastLevelStars === 1) &&
        (!lastBreatherOfferedAt ||
          Date.now() - lastBreatherOfferedAt > BREATHER_COOLDOWN_MS) &&
        !failBreatherShownRef.current;
      if (breatherEligible) {
        failBreatherShownRef.current = true;
        const timer = setTimeout(() => {
          setShowFailBreather(true);
          void analytics.logEvent('fail_breather_shown', {
            consecutive_failures: consecutiveFailures,
            last_level_stars: lastLevelStars,
            level,
            mode,
          });
        }, 400);
        return () => clearTimeout(timer);
      }
      // Show post-loss conversion modal if not already shown this level attempt
      if (!postLossShownRef.current && foundWords > 0 && mode !== 'relax') {
        postLossShownRef.current = true;
        const timer = setTimeout(() => setShowPostLoss(true), 400);
        return () => clearTimeout(timer);
      }
      // Otherwise show the normal failed modal
      const timer = setTimeout(() => setShowFailed(true), 400);
      return () => clearTimeout(timer);
    }
  }, [
    status,
    showFailed,
    foundWords,
    mode,
    consecutiveFailures,
    lastLevelStars,
    lastBreatherOfferedAt,
  ]);

  // Cell press/drag handlers now live inside PlayField — GameScreen no longer
  // subscribes to per-tap selection state. PlayField notifies GameScreen of
  // relevant changes via onCellInteraction / onValidWordChange callbacks.

  const handleHint = useCallback(() => {
    // Modes that forbid hints (expert, perfectSolve) must refuse here too,
    // not just hide buttons — this is the single choke point every hint
    // surface routes through.
    if (!hintsAllowed) return;
    if (mode !== 'relax') {
      // Spend from persistent inventory and grant into game state
      if (hintTokens <= 0) return;
      spendHintToken();
      grantHint();
    }
    void soundManager.playSound('hintUsed');
    void analytics.logEvent('hint_used', { level, mode, hintsAvailable });
    useHint();
  }, [useHint, grantHint, level, mode, hintsAvailable, hintTokens, spendHintToken, hintsAllowed]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    // Two undo pools: game-store `undosLeft` (granted into this puzzle — the
    // free stuck rescue's grant lands there) and economy `undoTokens`. The
    // old gate checked ONLY tokens, and the rescue fires precisely when
    // tokens are 0 — so the "FREE UNDO — ON US" banner it shows was a
    // labeled gift whose tap did nothing. resolveUndoSource consumes the
    // granted pool first (it expires with the puzzle; tokens persist).
    const source = resolveUndoSource(mode, undosLeft, undoTokens);
    if (source === 'blocked') return;
    if (source === 'token') {
      spendUndoToken();
      grantUndo();
    }
    void soundManager.playSound('undoUsed');
    void analytics.logEvent('undo_used', { level, mode, undosAvailable });

    // #4 Undo rewind effect — cyan tint flash + scale pulse
    if (!reduceMotion) {
      setShowUndoFlash(true);
      undoFlashAnim.setValue(0);
      Animated.timing(undoFlashAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Double-tapping undo restarts the flash; the interrupted run's
        // callback must not hide the flash the second tap just started.
        if (!finished) return;
        setShowUndoFlash(false);
        undoFlashAnim.setValue(0);
      });

      undoPulseAnim.setValue(1);
      Animated.sequence([
        Animated.timing(undoPulseAnim, { toValue: 1.02, duration: 80, useNativeDriver: true }),
        Animated.timing(undoPulseAnim, { toValue: 1.0, duration: 100, useNativeDriver: true }),
      ]).start();
    }

    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    undoMove();

    setShowFailed(false);
    setShowIdleHint(false);
  }, [undoMove, grantUndo, level, mode, undosAvailable, undosLeft, undoTokens, spendUndoToken, reduceMotion, undoFlashAnim, undoPulseAnim, history.length]);

  const handleRetry = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        200,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    newGame(board, level, mode, effectiveMaxMoves, effectiveTimeLimit);
    setShowComplete(false);
    completionHandled.current = false;
    // A retry is a fresh attempt and gets a fresh safety net. The guard is
    // keyed on level+mode, neither of which changes on retry, so without
    // this the player who dead-ends, retries, and dead-ends again gets no
    // rescue on attempt two — taxing exactly the player who is actively
    // trying to learn the ordering. It still can't be farmed: retrying
    // throws away all board progress, which costs far more than one undo.
    freeRescueUsedRef.current = false;
    setFreeUndoGranted(false);

    setShowFailed(false);
  }, [board, level, mode, effectiveMaxMoves, effectiveTimeLimit, newGame]);

  // ── Stable-identity wrappers for callbacks passed to memoized children ──
  // These wrappers have identity that never changes across renders, so
  // React.memo comparisons on GameBanners / GameHUD / GameOverlays succeed
  // and those subtrees do NOT re-reconcile on every SELECT_CELL tap.
  // Each wrapper internally calls the latest closure (see useStableCallback).
  const stableHandleUndo = useStableCallback(() => {
    handleUndo();
  });
  const stableHandleRetry = useStableCallback(() => {
    handleRetry();
  });
  const stableHandleIdleHintBannerTap = useStableCallback(() => {
    setShowIdleHint(false);
    handleHint();
  });
  const stableHandleAdHintBannerTap = useStableCallback(() => {
    setShowIdleHint(false);
    void handleWatchAdForHint();
  });

  const handleNextLevel = useCallback(() => {
    setShowComplete(false);
    completionHandled.current = false;
    // post_puzzle: show hint upsell if player used all free hints
    if (pendingPostPuzzleOffer && !offerShownThisLevel.current && !offerSuppressed) {
      setPendingPostPuzzleOffer(false);
      showOfferIfAllowed('post_puzzle');
      // Still proceed to next level after a brief delay for the offer to appear
      trackTimeout(() => onNextLevel(), 100);
    } else {
      onNextLevel();
    }
  }, [onNextLevel, pendingPostPuzzleOffer, offerSuppressed, showOfferIfAllowed, trackTimeout]);

  // First-booster ceremony (fires once ever, tracked via tooltipsShown)
  const checkFirstBooster = useCallback(() => {
    if (!tooltipsShown.includes('first_booster_used')) {
      markTooltipShown('first_booster_used');
      queueCeremony({
        type: 'first_booster',
        data: {},
      });
    }
  }, [tooltipsShown, markTooltipShown, queueCeremony]);

  // Booster-combo expiration analytics: when `activeComboType` transitions
  // from a truthy id back to null, fire one `booster_combo_expired` event.
  // Reducer owns the actual transition (combo expires after N words); this
  // effect only reports it.
  const prevComboRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevComboRef.current;
    if (prev && !activeComboType) {
      void analytics.logEvent('booster_combo_expired', {
        combo: prev,
        level,
        mode,
      });
    }
    prevComboRef.current = activeComboType;
  }, [activeComboType, level, mode]);

  // Booster handlers — spend from persistent economy inventory
  // Booster handlers use useStableCallback (not useCallback) so their
  // identity is stable across renders. Otherwise they'd be recreated on
  // every economy change (which is most renders), defeating BoosterBarMemo's
  // React.memo compare and making the booster bar re-render with every tap.

  // Two-booster synergy: when a second distinct booster is used in the same
  // puzzle, activate a combo (2x score on next N words). Gated behind the
  // `boosterCombosEnabled` Remote Config flag so soft-launch can flip it off
  // if KPI data regresses. The reducer is source-of-truth for the multiplier
  // + expiration; we only dispatch here + fire feedback.
  const checkAndActivateCombo = useStableCallback((justUsed: BoosterType) => {
    if (!getRemoteBoolean('boosterCombosEnabled')) return;
    const prior = store.getState().boostersUsedThisPuzzle as BoosterType[];
    const combo: ComboType | null = detectCombo(prior, justUsed);
    if (!combo) return;
    const multiplier = getRemoteNumber('boosterComboMultiplier') || 2;
    const duration = Math.max(1, Math.round(getRemoteNumber('boosterComboDurationWords') || 3));
    activateBoosterCombo(combo, multiplier, duration);
    void boosterComboHaptic();
    void soundManager.playSound('boosterCombo');
    void analytics.logEvent('booster_combo_activated', {
      combo,
      multiplier,
      duration_words: duration,
      level,
      mode,
    });
  });

  const handleWildcard = useStableCallback(() => {
    if ((boosterTokens?.wildcardTile ?? 0) <= 0) return;
    spendBoosterToken('wildcardTile');
    grantBooster('wildcardTile');
    void soundManager.playSound('buttonPress');
    void analytics.logEvent('booster_used', { level, mode, booster: 'wildcardTile' });
    recordDailyQuestEvent({ type: 'booster_used' });
    checkFirstBooster();
    activateWildcard();
    checkAndActivateCombo('wildcardTile');
  });

  const handleSpotlight = useStableCallback(() => {
    if ((boosterTokens?.spotlight ?? 0) <= 0) return;
    spendBoosterToken('spotlight');
    grantBooster('spotlight');
    void soundManager.playSound('buttonPress');
    void analytics.logEvent('booster_used', { level, mode, booster: 'spotlight' });
    recordDailyQuestEvent({ type: 'booster_used' });
    checkFirstBooster();
    activateSpotlight();
    checkAndActivateCombo('spotlight');
  });

  const handleSmartShuffle = useStableCallback(() => {
    if ((boosterTokens?.smartShuffle ?? 0) <= 0) return;
    spendBoosterToken('smartShuffle');
    grantBooster('smartShuffle');
    void soundManager.playSound('buttonPress');
    void analytics.logEvent('booster_used', { level, mode, booster: 'smartShuffle' });
    recordDailyQuestEvent({ type: 'booster_used' });
    checkFirstBooster();
    activateSmartShuffle();
    checkAndActivateCombo('smartShuffle');
  });

  // NOTE: chainScale/chainBgColor/chainShadowColor/chainBorderColor and the
  // valid/invalid flash opacities were previously computed here. They moved
  // to GameFlashes (src/screens/game/GameFlashes.tsx) as part of the
  // per-tap re-render decomposition — see that file for the memoized subtree.

  const bt = boosterTokens ?? { wildcardTile: 0, spotlight: 0, smartShuffle: 0 };
  const hasAnyBoosters =
    bt.wildcardTile > 0 ||
    bt.spotlight > 0 ||
    bt.smartShuffle > 0;

  // Compute spotlight dimmed cells for grid rendering.
  // Returns a shared empty Set when inactive so GameGrid's memoized props stay referentially stable.
  const spotlightDimmedSet = useMemo(() => {
    if (!spotlightActive) return EMPTY_CELL_KEY_SET;
    const relevant = new Set(spotlightLetters);
    const dimmed = new Set<string>();
    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && !relevant.has(cell.letter)) {
          dimmed.add(`${r},${c}`);
        }
      });
    });
    return dimmed;
  }, [spotlightActive, spotlightLetters, grid]);

  // Per-chapter backdrop palette. RC-gated so we can kill the feature
  // remotely if a particular palette clashes with chapter art. When the
  // flag is off, `undefined` passes through and AmbientBackdrop renders
  // its default synthwave stops.
  const chapterForBackdrop = useMemo(() => getChapterForLevel(level), [level]);
  const chapterPaletteOverride = getRemoteBoolean('chapterThemedBackdropEnabled')
    ? getChapterPalette(chapterForBackdrop)
    : undefined;
  // Per-chapter default tile ramp. Memoized on level so the provider value
  // is referentially stable across per-tap re-renders — the 50-tile grid
  // would otherwise invalidate on every commit.
  const chapterTileRamp = useMemo(
    () => (getRemoteBoolean('chapterThemedBackdropEnabled') ? getChapterTileRamp(chapterForBackdrop) : null),
    [chapterForBackdrop],
  );

  return (
    <GameStoreContext.Provider value={store}>
    <React.Profiler id="GameScreen" onRender={profilerOnRender}>
    <Animated.View style={shakeContainerStyle}>
    <SafeAreaView style={[styles.container, { paddingBottom: bottomInset }]}>
      <AmbientBackdrop variant="game" colorOverride={chapterPaletteOverride} />
      {/* Mode intro banner - absolute overlay so it doesn't shift layout */}
      {showModeIntro && mode !== 'classic' && (
        <View style={styles.modeIntroOverlay} pointerEvents="none">
          <View style={[styles.modeIntroBanner, { borderColor: modeConfig.color }]}>
            <Text style={[styles.modeIntroText, { color: modeConfig.color }]}>
              {modeConfig.icon} {modeConfig.name.toUpperCase()}
            </Text>
            <Text style={styles.modeIntroDesc}>
              {mode === 'perfectSolve' ? 'No mistakes allowed!' :
               mode === 'gravityFlip' ? 'Gravity rotates after each word!' :
               mode === 'timePressure' ? `Beat the clock! ${formatTime(effectiveTimeLimit)}` :
               mode === 'shrinkingBoard' ? 'Clear edge words before the board shrinks!' :
               mode === 'noGravity' ? 'No gravity — letters stay put!' :
               mode === 'expert' ? 'No hints. No mercy.' :
               mode === 'relax' ? 'Take your time. Enjoy the words.' :
               modeConfig.description}
            </Text>
          </View>
        </View>
      )}

      {activeComboType && (
        <BoosterComboBanner
          comboType={activeComboType as ComboType}
          wordsRemaining={comboWordsRemaining}
          multiplier={comboMultiplierValue}
        />
      )}

      <GameplayMascot
        foundCount={foundWords}
        tensionActive={tensionEligible && totalWords - foundWords === 1}
        flawlessStreak={flawlessStreakCurrent}
        // Folio wears the current wing's colors — same chapter resolution
        // as the backdrop palette, so mascot + backdrop always agree.
        wingAccent={chapterForBackdrop ? getWing(chapterForBackdrop.wingId).accent : undefined}
      />

      <GameHeader
        level={level}
        score={score}
        moves={moves}
        hintsLeft={hintsAvailable}
        hintsUsed={hintsUsed}
        flawlessStreak={flawlessStreakCurrent}
        undosLeft={undosAvailable}
        foundWords={foundWords}
        totalWords={totalWords}
        isDaily={isDaily}
        mode={mode}
        maxMoves={effectiveMaxMoves}
        timeRemaining={timeRemaining}
        onHint={handleHint}
        onUndo={handleUndo}
        onBack={onHome}
      />

      {/* Timer/move bars — extracted to a memoized sub-component so they only
          re-render on tick / move-increment, not on every cell tap. */}
      <TimerMovesBarsMemo
        hasTimer={modeConfig.rules.hasTimer ?? false}
        hasMoveLimit={modeConfig.rules.hasMoveLimit ?? false}
        timeRemaining={timeRemaining}
        totalSeconds={effectiveTimeLimit}
        moves={moves}
        maxMoves={effectiveMaxMoves}
      />


      {/* Game field subtree wrapped in a scoped boundary so a render error
          in PlayField / GameFlashes / GameBanners shows a recovery card
          instead of restarting the app mid-puzzle. */}
      <LocalErrorBoundary
        scope="game_field"
        title="Game ran into an error"
        actionLabel="Return home"
        onReset={onHome}
      >
      {/* Valid/invalid flash, score popup, big-word celebration — extracted
          into a single memoized subtree so this branch doesn't re-reconcile
          on every SELECT_CELL. All Animated.Values are ref-stable and
          compared referentially by React.memo; primitive props only change
          on word submit. */}
      <GameFlashes
        showValidFlash={showValidFlash}
        showInvalidFlash={showInvalidFlash}
        scorePopup={scorePopup}
        lastSubmittedWordLen={lastSubmittedWordLenRef.current}
        bigWordLabel={bigWordLabel}
        validFlashAnim={validFlashAnim}
        invalidFlashAnim={invalidFlashAnim}
        scorePopupAnim={scorePopupAnim}
        bigWordAnim={bigWordAnim}
      />

      {/* J11 — once-per-puzzle ordering acknowledgment. Display-only. */}
      {keptOpenVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.keptOpenChip,
            {
              opacity: keptOpenAnim,
              transform: [
                {
                  translateY: keptOpenAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.keptOpenText}>NICE ORDER — KEPT IT OPEN</Text>
        </Animated.View>
      )}


      {/* Word bank — reads selection state from the zustand store directly.
          Renders above the grid area in its original layout position.
          Hidden (opacity 0, layout preserved) while any completion overlay
          is up so the chips can never paint over the victory/failure UI. */}
      <ConnectedWordBank hidden={showComplete || showFailed || showPostLoss} />

      {/* Grid area — onLayout measures the available space for Grid sizing */}
      <View style={styles.gridArea} onLayout={handleGridLayout}>
        {/* TilePaletteContext publishes the chapter-derived tile ramp to every
            LetterCell without threading a prop through Grid. Value is
            memoized per-level above, so per-tap re-renders don't invalidate
            consumers. */}
        <TilePaletteContext.Provider value={chapterTileRamp}>
        {/* PlayField — subscribes to per-tap selection state (selectedCells,
            grid, wildcardCells). GameScreen does NOT subscribe to
            selectedCells, so cell taps only re-render PlayField +
            ConnectedWordBank, not the full GameScreen parent. */}
        <PlayField
          mode={mode}
          onCellInteraction={resetIdleTimer}
          onValidWordChange={handleValidWordChange}
          onSelectionLengthChange={handleSelectionLengthChange}
          gridAreaHeight={gridAreaHeight}
          gridScaleStyle={gridScaleStyle}
          showValidFlash={showValidFlash}
          spotlightDimmedSet={spotlightDimmedSet}
          onGravitySettled={handleGravitySettled}
          frameAccent={chapterTileRamp?.[0]}
          bonusCellId={bonusTile?.cellId ?? null}
        />
        </TilePaletteContext.Provider>
        {/* Floating banners - absolute overlay, don't affect grid sizing.
            Memoized subtree: all its conditions are derived from non-per-tap
            state (mode, gravityDirection, wildcardMode, hintsAvailable,
            isStuck, undosLeft). When selectedCells changes, GameBanners'
            React.memo bails out and this entire subtree is skipped. */}
        <View style={styles.bannerOverlay} pointerEvents="box-none">
          <GameBanners
            mode={mode}
            gravityDirection={gravityDirection}
            wordsUntilShrink={wordsUntilShrink}
            wildcardMode={wildcardMode}
            status={status}
            showIdleHint={showIdleHint}
            hintsAvailable={hintsAvailable}
            canShowAdHint={hintsAllowed && !isAdFree && adManager.canShowAd('hint_reward')}
            isStuck={isStuck}
            undosLeft={undosLeft}
            strandedWords={strandedWords}
            isFirstStuck={showFirstStuckHelp}
            freeUndoGranted={freeUndoGranted}
            isSpike={isSpike && !isDaily && mode !== 'weekly'}
            onIdleHintTap={stableHandleIdleHintBannerTap}
            onAdHintTap={stableHandleAdHintBannerTap}
            onUndoTap={stableHandleUndo}
            onRetryTap={stableHandleRetry}
          />
        </View>

        {/* #1 Word-clear particles — multi-tile bloom queue. Each queue entry
            renders one particle instance anchored at a cleared cell's screen
            coordinate. Entries are removed by filter after their animation
            finishes (see spawnTileBloom). Owned by the sibling component so
            push/remove doesn't re-render GameScreen (Fix F, April 2026). */}
        <ClearParticleLayer ref={particleLayerRef} style={styles.particleContainer} />

        {/* #4 Undo cyan tint flash overlay */}
        {showUndoFlash && (
          <Animated.View
            style={[
              styles.undoFlashOverlay,
              {
                opacity: undoFlashAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.2, 0],
                }),
              },
            ]}
            pointerEvents="none"
          />
        )}
      </View>
      </LocalErrorBoundary>

      {/* Booster bar — extracted to a memoized sub-component so it doesn't
          re-render on every cell tap (it has no dependency on selectedCells). */}
      <BoosterBarMemo
        wildcardCount={bt.wildcardTile}
        spotlightCount={bt.spotlight}
        shuffleCount={bt.smartShuffle}
        wildcardMode={wildcardMode}
        spotlightActive={spotlightActive}
        hasAnyBoosters={hasAnyBoosters}
        isPlaying={status === 'playing'}
        onWildcard={handleWildcard}
        onSpotlight={handleSpotlight}
        onSmartShuffle={handleSmartShuffle}
      />

      {/* Completion overlay — wrapped so a render crash doesn't leave the
          player stuck on a broken victory screen with no way home. */}
      {showComplete && (
        <LocalErrorBoundary scope="puzzle_complete" onReset={onHome} actionLabel="Go home">
        <PuzzleComplete
          score={score}
          moves={moves}
          stars={stars}
          level={level}
          isDaily={isDaily}
          mode={mode}
          perfectRun={perfectRun}
          isFirstWin={isFirstWin}
          leveledUp={leveledUp}
          newLevel={newLevel}
          difficultyTransition={difficultyTransition}
          nextLevelPreview={nextLevelPreview}
          shareText={shareText}
          friendComparison={friendComparison}
          eventMultiplierLabel={eventMultiplierLabel}
          showTomorrowPreview={showTomorrowPreview}
          summaryItems={summaryItems}
          onNavigate={onNavigate}
          totalCoinsAwarded={totalCoinsAwarded}
          totalGemsAwarded={totalGemsAwarded}
          nextUnlockPreview={nextUnlockPreview}
          onNextLevel={handleNextLevel}
          onHome={onHome}
          onRetry={handleRetry}
          onDoubleReward={handleWatchAdForDoubleReward}
          rewardDoubled={rewardDoubled}
          showAdOption={!isAdFree && adManager.canShowAd('double_reward')}
          onChallengeFriend={() => {
            const challenge = sendChallenge('friend', {
              score: score,
              stars,
              time: solveSequence.length > 0 ? solveSequence[solveSequence.length - 1].timestamp : 0,
              level,
              seed: Date.now(),
              mode,
              boardConfig: board.config,
            });
            const challengeText = [
              `I challenge you to beat my score on Wordfall Level ${level}!`,
              `My score: ${score.toLocaleString()} | ${'*'.repeat(stars)}`,
              `Challenge code: ${challenge.id}`,
              '',
              '#Wordfall #Challenge',
            ].join('\n');
            Share.share({ message: challengeText }).catch((e) => {
              crashReporter.addBreadcrumb(
                `Share.share (challenge) failed: ${e instanceof Error ? e.message : String(e)}`,
                'share',
              );
            });
          }}
        />
        </LocalErrorBoundary>
      )}

      {/* Contextual offer overlay */}
      {activeOffer && (
        <ContextualOffer
          type={activeOffer}
          context={{
            failCount: sessionFailCount.current,
            levelNumber: level,
            difficulty,
            wordsRemaining: remainingWords.length,
            hintsUsed: hintsUsed,
            streakDays: playerStreaks?.currentStreak ?? 0,
            livesRemaining: lives,
          }}
          onAccept={handleOfferAccept}
          onDismiss={dismissOffer}
        />
      )}

      {/* Mode tutorial overlay — shown once per mode on first play */}
      {showModeTutorial && modeTutorialSteps && (
        <ModeTutorialOverlay
          steps={modeTutorialSteps}
          visible={showModeTutorial}
          onComplete={() => {
            setShowModeTutorial(false);
            markTooltipShown(`mode_tutorial_${mode}`);
          }}
        />
      )}

      {/* Tier 6 B1 — fail-breather offer: precedes PostLoss on stuck loops */}
      {showFailBreather && (
        <FailBreatherOffer
          visible={showFailBreather}
          consecutiveFailures={consecutiveFailures}
          onAccept={() => {
            addHintTokens(1);
            if (typeof (playerActionsAny as Record<string, unknown>).updateProgress === 'function') {
              (playerActionsAny as { updateProgress: (patch: Record<string, unknown>) => void })
                .updateProgress({ lastBreatherOfferedAt: Date.now() });
            }
            void analytics.logEvent('fail_breather_accepted', {
              consecutive_failures: consecutiveFailures,
              level,
              mode,
            });
            setShowFailBreather(false);
            // Skip PostLossModal this time — the breather is the relief.
            setShowFailed(true);
          }}
          onDismiss={() => {
            if (typeof (playerActionsAny as Record<string, unknown>).updateProgress === 'function') {
              (playerActionsAny as { updateProgress: (patch: Record<string, unknown>) => void })
                .updateProgress({ lastBreatherOfferedAt: Date.now() });
            }
            void analytics.logEvent('fail_breather_dismissed', {
              consecutive_failures: consecutiveFailures,
              level,
              mode,
            });
            setShowFailBreather(false);
            // Fall through to the standard post-loss flow on next frame.
            if (!postLossShownRef.current && foundWords > 0) {
              postLossShownRef.current = true;
              setShowPostLoss(true);
            } else {
              setShowFailed(true);
            }
          }}
        />
      )}

      {/* Post-loss conversion modal */}
      {showPostLoss && (
        <PostLossModal
          wordsFound={foundWords}
          totalWords={totalWords}
          // Route to the mode-appropriate ceremony so each failure state
          // has its own visual identity instead of flattening all losses
          // into "So Close!".
          variant={
            status === 'timeout'
              ? 'timeout'
              : status === 'failed' && mode === 'perfectSolve'
              ? 'perfect_broken'
              : 'stuck'
          }
          onWatchAd={() => {
            setShowPostLoss(false);
            handleWatchAdForHint();
          }}
          onBuyHints={() => {
            setShowPostLoss(false);
            // Navigate to shop or trigger IAP for hint_bundle_10
            if (spendCoins(80)) {
              addHintTokens(5);
            }
            setShowFailed(true);
          }}
          onDismiss={() => {
            setShowPostLoss(false);
            setShowFailed(true);
          }}
        />
      )}

      {/* Failed overlay with near-miss encouragement */}
      {showFailed && (
        <View style={styles.failedOverlay}>
          <View style={styles.failedCard}>
            {/* Near-miss encouragement */}
            {foundWords > 0 && foundWords >= totalWords - 1 ? (
              <>
                <Text style={styles.failedTitle}>{t('result.soClose')}</Text>
                <Text style={styles.failedSubtext}>
                  {t('result.foundWordsAlmost', {
                    found: foundWords,
                    total: totalWords,
                    remaining: totalWords - foundWords,
                  })}
                </Text>
              </>
            ) : foundWords > 0 ? (
              <>
                {status === 'timeout' ? (
                  <View style={styles.failedTitleRow}>
                    <GameIcon name="hourglass" size={26} accent={COLORS.coral} />
                    <Text style={[styles.failedTitle, styles.failedTitleInRow]}>{t('result.timeUpShort')}</Text>
                  </View>
                ) : (
                  <Text style={styles.failedTitle}>{t('result.keepGoing')}</Text>
                )}
                <Text style={styles.failedSubtext}>
                  {t('result.foundWordsProgress', { found: foundWords, total: totalWords })}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.failedTitleRow}>
                  <GameIcon
                    name={status === 'timeout' ? 'hourglass' : 'cross'}
                    size={26}
                    accent={COLORS.coral}
                  />
                  <Text style={[styles.failedTitle, styles.failedTitleInRow]}>
                    {status === 'timeout' ? t('result.timeUpShort') : t('result.puzzleFailed')}
                  </Text>
                </View>
                <Text style={styles.failedSubtext}>
                  {status === 'timeout'
                    ? t('result.ranOutOfTime')
                    : mode === 'perfectSolve'
                      ? t('result.perfectZeroMistakes')
                      : t('result.usedAllMoves', { count: effectiveMaxMoves })}
                </Text>
              </>
            )}
            {/* Progress bar */}
            {totalWords > 0 && (
              <View style={styles.failedProgressContainer}>
                <View style={styles.failedProgressTrack}>
                  <View style={[
                    styles.failedProgressFill,
                    { width: `${Math.max((foundWords / totalWords) * 100, 2)}%` },
                  ]} />
                </View>
                <Text style={styles.failedProgressText}>{t('result.wordsCounter', { found: foundWords, total: totalWords })}</Text>
              </View>
            )}
            <View style={styles.failedStats}>
              <Text style={styles.failedStat}>{t('result.score', { score })}</Text>
            </View>
            <View style={styles.failedButtons}>
              <Pressable
                style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
                onPress={handleRetry}
              >
                <Text style={styles.retryButtonText}>{t('result.tryAgain').toUpperCase()}</Text>
              </Pressable>
              {/* Watch ad for a free hint — shown after failure when player has no hints */}
              {!isAdFree && adManager.canShowAd('hint_reward') && hintsLeft === 0 && (
                <Pressable
                  style={({ pressed }) => [styles.adHintButton, pressed && styles.buttonPressed]}
                  onPress={handleWatchAdForHint}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <GameIcon name="frame" size={16} accent={COLORS.green} />
                    <Text style={styles.adHintButtonText}>{t('result.watchAdFreeHint')}</Text>
                  </View>
                </Pressable>
              )}
              {undosLeft > 0 && history.length > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.undoRecoverButton, pressed && styles.buttonPressed]}
                  onPress={handleUndo}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <GameIcon name="undo" size={16} accent={COLORS.gold} />
                    <Text style={styles.undoRecoverText}>{t('result.undoLastMove')}</Text>
                  </View>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.homeButton, pressed && styles.buttonPressed]}
                onPress={onHome}
              >
                <Text style={styles.homeButtonText}>{t('result.home').toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Mock Ad Modal — shown during development when no real ad SDK is installed */}
      {mockAdState && (
        <MockAdModal
          rewardType={mockAdState.rewardType}
          onComplete={handleMockAdComplete}
        />
      )}
    </SafeAreaView>
    </Animated.View>
    </React.Profiler>
    </GameStoreContext.Provider>
  );
}

// React.memo isolates GameScreen from GameScreenWrapper re-renders that
// aren't relevant to gameplay (e.g. PlayerContext / EconomyContext value
// identity churn from unrelated state ticks). Props are all primitives or
// stable callbacks, so the default shallow compare is sufficient.
export const GameScreen = React.memo(GameScreenImpl);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    // Lift the whole content stack off the OS navigation bar / home
    // indicator. 28px keeps the boosters comfortably above the gesture
    // pill instead of sitting flush against the bottom edge.
    paddingBottom: 28,
  },
  gridArea: {
    flex: 1,
    // Keep the grid CENTERED in its area (flex-start let the grid's
    // +22px decorative outer-glow render up into the chip row). The
    // centerline is biased upward via the asymmetric padding below so
    // the grid still reads as "moved up" without colliding with the
    // WordBank — paddingBottom > 0 shifts the visual center up by
    // half the difference.
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: GRID_AREA_BOTTOM_PADDING,
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 4,
    gap: 3,
  },
  modeIntroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    paddingTop: 60,
  },
  barHidden: {
    opacity: 0,
  },
  wordArea: {
    paddingTop: 2,
    paddingBottom: 2,
    height: 86,
  },
  timerBar: {
    backgroundColor: 'rgba(26, 10, 46, 0.75)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 45, 149, 0.30)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  timerBarDanger: {
    backgroundColor: 'rgba(60, 15, 20, 0.75)',
    borderColor: 'rgba(255, 107, 107, 0.5)',
    shadowColor: COLORS.coral,
    shadowOpacity: 0.3,
  },
  timerText: {
    fontFamily: FONTS.display,
    color: COLORS.accent,
    fontSize: 16,
    letterSpacing: 3,
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 12,
  },
  timerTextDanger: {
    color: COLORS.coral,
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 12,
  },
  moveBar: {
    backgroundColor: 'rgba(26, 10, 46, 0.75)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(200, 77, 255, 0.20)',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  moveBarDanger: {
    backgroundColor: 'rgba(60, 15, 20, 0.75)',
    borderColor: 'rgba(255, 107, 107, 0.5)',
    shadowColor: COLORS.coral,
    shadowOpacity: 0.3,
  },
  moveText: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  moveTextDanger: {
    color: COLORS.coral,
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 10,
  },
  cascadeBar: {
    backgroundColor: 'rgba(50, 15, 20, 0.75)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 107, 0.40)',
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cascadeText: {
    fontFamily: FONTS.display,
    color: COLORS.coral,
    fontSize: 14,
    letterSpacing: 0.5,
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 10,
  },
  chainPopup: {
    position: 'absolute',
    top: '36%',
    alignSelf: 'center',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 32,
    zIndex: 200,
    elevation: 30,
    backgroundColor: 'rgba(255, 45, 149, 0.95)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.85,
    shadowRadius: 30,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  chainText: {
    fontFamily: FONTS.display,
    color: '#fff',
    fontSize: 34,
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowRadius: 14,
  },
  neonPulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderRadius: 24,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 0,
    zIndex: 190,
  },
  vhsGlitchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,45,149,0.12)',
    zIndex: 185,
  },
  validFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.green,
    zIndex: 50,
  },
  invalidFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.coral,
    zIndex: 50,
  },
  idleHintBanner: {
    backgroundColor: 'rgba(255, 45, 149, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 149, 0.2)',
  },
  idleHintText: {
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  adHintBanner: {
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.2)',
  },
  adHintBannerText: {
    color: COLORS.green,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  stuckBanner: {
    backgroundColor: 'rgba(255, 82, 82, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 8,
    marginTop: 4,
  },
  stuckBannerRetry: {
    backgroundColor: 'rgba(168, 85, 247, 0.85)',
  },
  stuckText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeIntroBanner: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  modeIntroText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    letterSpacing: 2,
    marginBottom: 2,
  },
  modeIntroDesc: {
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  keptOpenChip: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.teal,
    backgroundColor: 'rgba(10, 30, 34, 0.88)',
    zIndex: 240,
    elevation: 24,
  },
  keptOpenText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.teal,
    letterSpacing: 1.5,
  },
  scorePopup: {
    position: 'absolute',
    top: '33%',
    alignSelf: 'center',
    zIndex: 250,
    paddingHorizontal: 34,
    paddingVertical: 16,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 45, 149, 0.95)',
    elevation: 30,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.85,
    shadowRadius: 28,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  scorePopupText: {
    fontFamily: FONTS.display,
    color: '#fff',
    fontSize: 28,
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowRadius: 12,
  },
  scorePopupCombo: {
    fontSize: 32,
    textShadowColor: 'rgba(255, 215, 0, 0.8)',
    textShadowRadius: 20,
  },
  // Bigger popup container variants for 5/7+ letter celebrations.
  scorePopupMedium: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    shadowRadius: 34,
  },
  scorePopupBig: {
    paddingHorizontal: 46,
    paddingVertical: 24,
    borderRadius: 34,
    shadowRadius: 42,
    shadowOpacity: 1,
    borderWidth: 3,
  },
  scorePopupTextBig: {
    fontSize: 40,
    letterSpacing: 5,
    textShadowColor: 'rgba(255, 215, 0, 0.9)',
    textShadowRadius: 24,
  },
  // Big-word celebration label overlay (7+ letters).
  bigWordOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    zIndex: 260,
    paddingHorizontal: 50,
    paddingVertical: 22,
    borderRadius: 36,
    backgroundColor: 'rgba(20, 6, 42, 0.92)',
    borderWidth: 3,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.9,
    shadowRadius: 40,
    elevation: 36,
  },
  bigWordText: {
    fontFamily: FONTS.display,
    color: COLORS.gold,
    fontSize: 44,
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 215, 0, 0.9)',
    textShadowRadius: 22,
  },
  boosterBar: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
    marginTop: 2,
    marginBottom: 0,
    height: 76,
  },
  boosterBarHidden: {
    opacity: 0,
  },
  boosterShelf: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 4,
  },
  boosterButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 13,
    borderWidth: 1.5,
    minWidth: 82,
    overflow: 'visible',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 9,
    elevation: 5,
  },
  boosterActive: {
    shadowOpacity: 0.75,
    shadowRadius: 14,
  },
  boosterPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
  // Top glass highlight that matches LetterCell's specular — ties the
  // booster material to the grid's.
  boosterGlassEdge: {
    position: 'absolute',
    top: 1,
    left: 8,
    right: 8,
    height: 12,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  boosterIconPlate: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 2, 22, 0.7)',
    marginBottom: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  boosterLabel: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  boosterEmoji: {
    fontSize: 17,
  },
  boosterCount: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(10, 0, 30, 0.9)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  boosterCountText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: FONTS.display,
  },
  failedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 6, 18, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  failedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 107, 0.45)',
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 20,
    overflow: 'hidden',
  },
  failedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  failedTitleInRow: {
    marginBottom: 0,
  },
  failedTitle: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: COLORS.coral,
    letterSpacing: 3,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 16,
  },
  failedSubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  failedProgressContainer: {
    width: '100%',
    marginBottom: 12,
  },
  failedProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  failedProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  failedProgressText: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    fontFamily: FONTS.bodyBold,
  },
  failedStats: {
    marginBottom: 20,
  },
  failedStat: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  failedButtons: {
    width: '100%',
    gap: 10,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  retryButtonText: {
    fontFamily: FONTS.display,
    color: '#fff',
    fontSize: 16,
    letterSpacing: 2,
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowRadius: 6,
  },
  adHintButton: {
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.35)',
  },
  adHintButtonText: {
    fontFamily: FONTS.display,
    color: COLORS.green,
    fontSize: 14,
    letterSpacing: 1,
  },
  undoRecoverButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
  },
  undoRecoverText: {
    fontFamily: FONTS.display,
    color: COLORS.gold,
    fontSize: 14,
    letterSpacing: 1,
  },
  homeButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  homeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
  },
  buttonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
  undoFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.accent,
    zIndex: 55,
  },
});
