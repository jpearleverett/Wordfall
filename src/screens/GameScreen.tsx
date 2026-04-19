import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Animated,
  Image,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  Share,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { Board, CellPosition, GameMode, VictorySummaryItem } from '../types';
import { useGame } from '../hooks/useGame';
import { GameStoreContext } from '../stores/gameStore';
import { GameHeader } from '../components/GameHeader';
import { PuzzleComplete } from '../components/PuzzleComplete';
import LocalErrorBoundary from '../components/LocalErrorBoundary';
import { crashReporter } from '../services/crashReporting';
import { TutorialOverlay } from '../components/TutorialOverlay';

import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, MODE_CONFIGS, ANIM, FONTS, SCREEN_WIDTH, CHAIN_INTENSITY, getDifficultyTier, CELL_GAP, MAX_GRID_WIDTH } from '../constants';
import { soundManager } from '../services/sound';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { wordFoundHaptic, comboHaptic, errorHaptic, successHaptic, boosterComboHaptic } from '../services/haptics';
import { profilerOnRender } from '../utils/perfInstrument';
import { useStableCallback } from '../utils/hooks';
import {
  usePlayerStore,
  usePlayerActions,
  selectEquippedTheme,
  selectFailCountByLevel,
  selectPuzzlesSolved,
  selectStreaks,
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
import { detectCombo, type BoosterType, type ComboType } from '../data/boosterCombos';
import { getTheme } from '../data/cosmetics';

import { ContextualOffer, OfferType } from '../components/ContextualOffer';
import { adManager, AdRewardType } from '../services/ads';
import { MockAdModal } from '../components/MockAdModal';
import { ModeTutorialOverlay } from '../components/ModeTutorialOverlay';
import { getModeTutorial } from '../data/modeTutorials';
import { PostLossModal } from '../components/PostLossModal';
import { GameFlashes } from './game/GameFlashes';
import { ComboFlash } from '../components/effects/ComboFlash';
import { GameBanners } from './game/GameBanners';
import { PlayField, ConnectedWordBank } from './game/PlayField';

interface GameScreenProps {
  board: Board;
  level: number;
  isDaily?: boolean;
  mode?: GameMode;
  maxMoves?: number;
  timeLimit?: number;
  onComplete: (stars: number, score: number, maxCombo: number) => void;
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
  return (
    <View style={[
      styles.boosterBar,
      !(hasAnyBoosters && isPlaying) && styles.boosterBarHidden,
    ]}>
      <Image
        source={LOCAL_IMAGES.shelfBooster}
        style={styles.boosterShelfImage}
        resizeMode="stretch"
      />
      <View style={styles.boosterShelf}>
        {wildcardCount > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.boosterButton,
              wildcardMode && styles.boosterActive,
              pressed && styles.boosterPressed,
            ]}
            onPress={onWildcard}
          >
            <LinearGradient
              colors={['rgba(25, 15, 50, 0.85)', 'rgba(15, 8, 35, 0.90)'] as [string, string]}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
            />
            <View style={[styles.boosterGlow, { backgroundColor: 'rgba(255, 215, 0, 0.20)' }]} />
            <View style={styles.boosterIconWrap}>
              <Text style={styles.boosterEmoji}>★</Text>
            </View>
            <Text style={styles.boosterLabel}>Wildcard</Text>
            <View style={styles.boosterCount}>
              <Text style={styles.boosterCountText}>{wildcardCount}</Text>
            </View>
          </Pressable>
        )}
        {spotlightCount > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.boosterButton,
              spotlightActive && styles.boosterActive,
              pressed && styles.boosterPressed,
            ]}
            onPress={onSpotlight}
          >
            <LinearGradient
              colors={['rgba(10, 20, 50, 0.85)', 'rgba(5, 12, 35, 0.90)'] as [string, string]}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
            />
            <View style={[styles.boosterGlow, { backgroundColor: 'rgba(255, 215, 0, 0.18)' }]} />
            <View style={styles.boosterIconWrap}>
              <Text style={styles.boosterEmoji}>💡</Text>
            </View>
            <Text style={styles.boosterLabel}>Spotlight</Text>
            <View style={styles.boosterCount}>
              <Text style={styles.boosterCountText}>{spotlightCount}</Text>
            </View>
          </Pressable>
        )}
        {shuffleCount > 0 && (
          <Pressable
            style={({ pressed }) => [styles.boosterButton, pressed && styles.boosterPressed]}
            onPress={onSmartShuffle}
          >
            <LinearGradient
              colors={['rgba(10, 20, 50, 0.85)', 'rgba(5, 12, 35, 0.90)'] as [string, string]}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
            />
            <View style={[styles.boosterGlow, { backgroundColor: 'rgba(168, 85, 247, 0.20)' }]} />
            <View style={styles.boosterIconWrap}>
              <Text style={styles.boosterEmoji}>🔀</Text>
            </View>
            <Text style={styles.boosterLabel}>Shuffle</Text>
            <View style={styles.boosterCount}>
              <Text style={styles.boosterCountText}>{shuffleCount}</Text>
            </View>
          </Pressable>
        )}
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
  moves: number;
  maxMoves: number;
}
const TimerMovesBarsMemo = React.memo(function TimerMovesBars({
  hasTimer,
  hasMoveLimit,
  timeRemaining,
  moves,
  maxMoves,
}: TimerMovesBarsProps) {
  return (
    <>
      {hasTimer && (
        <View style={[
          styles.timerBar,
          timeRemaining <= 30 && timeRemaining > 0 && styles.timerBarDanger,
          timeRemaining <= 0 && styles.barHidden,
        ]}>
          <Text style={[
            styles.timerText,
            timeRemaining <= 30 && styles.timerTextDanger,
          ]}>
            ⏱ {formatTime(timeRemaining)}
          </Text>
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

function WordClearParticle({ delay, startX, startY }: { delay: number; startX: number; startY: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const angle = useRef(Math.random() * Math.PI * 2).current;
  const distance = useRef(40 + Math.random() * 60).current;
  const size = useRef(4 + Math.random() * 6).current;
  const color = useRef(PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
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
      opacity: anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
      transform: [
        { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] }) },
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance] }) },
        { scale: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 0.2] }) },
      ],
    }} />
  );
}

export function GameScreen({
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
  // Narrow zustand subscriptions — re-render only when the slice actually
  // read changes. usePlayer() / useEconomy() would re-render this 1700-line
  // component on every economy/player mutation across the app.
  const equippedThemeId = usePlayerStore(selectEquippedTheme);
  const failCountByLevel = usePlayerStore(selectFailCountByLevel);
  const puzzlesSolved = usePlayerStore(selectPuzzlesSolved);
  const playerStreaks = usePlayerStore(selectStreaks);
  const tooltipsShown = usePlayerStore(selectTooltipsShown);
  const playerActions = usePlayerActions();
  const { markTooltipShown, queueCeremony, sendChallenge } = playerActions;
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
    isStuck,
    stars,
    foundWords,
    totalWords,
    remainingWords,
    solveSequence,
  } = useGame(board, level, mode, effectiveMaxMoves, effectiveTimeLimit);

  // ── Narrow zustand selectors — GameScreen only re-renders when these
  //    coarse slices change (per word/action, NOT per cell tap). ─────────
  const status = useStore(store, s => s.status);
  const score = useStore(store, s => s.score);
  const combo = useStore(store, s => s.combo);
  const maxCombo = useStore(store, s => s.maxCombo);
  const moves = useStore(store, s => s.moves);
  const hintsLeft = useStore(store, s => s.hintsLeft);
  const hintsUsed = useStore(store, s => s.hintsUsed);
  const undosLeft = useStore(store, s => s.undosLeft);
  const timeRemaining = useStore(store, s => s.timeRemaining);
  const grid = useStore(store, s => s.board.grid);
  const words = useStore(store, s => s.board.words);
  const history = useStore(store, s => s.history);
  const wildcardMode = useStore(store, s => s.wildcardMode);
  const spotlightActive = useStore(store, s => s.spotlightActive);
  const spotlightLetters = useStore(store, s => s.spotlightLetters);
  const gravityDirection = useStore(store, s => s.gravityDirection);
  const wordsUntilShrink = useStore(store, s => s.wordsUntilShrink);
  const perfectRun = useStore(store, s => s.perfectRun);
  const lastInvalidTap = useStore(store, s => s.lastInvalidTap);
  const lastSelectionResetTap = useStore(store, s => s.lastSelectionResetTap);
  const boardFreezeActive = useStore(store, s => s.boardFreezeActive);
  const scoreDoubler = useStore(store, s => s.scoreDoubler);
  const boostersUsedThisPuzzle = useStore(store, s => s.boostersUsedThisPuzzle);
  const activeComboType = useStore(store, s => s.activeComboType);
  const comboWordsRemaining = useStore(store, s => s.comboWordsRemaining);
  const comboMultiplierValue = useStore(store, s => s.comboMultiplier);

  const [showComplete, setShowComplete] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [gridAreaHeight, setGridAreaHeight] = useState(0);

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
  const gridHeightLocked = useRef(false);
  const chainAnim = useRef(new Animated.Value(0)).current;
  const [chainVisible, setChainVisible] = useState(false);
  const validFlashAnim = useRef(new Animated.Value(0)).current;
  const [showValidFlash, setShowValidFlash] = useState(false);
  const invalidFlashAnim = useRef(new Animated.Value(0)).current;
  const [showInvalidFlash, setShowInvalidFlash] = useState(false);
  const scorePopupAnim = useRef(new Animated.Value(0)).current;
  const [scorePopup, setScorePopup] = useState<{ points: number; label: string } | null>(null);
  const prevScoreRef = useRef(score);
  const [showIdleHint, setShowIdleHint] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showModeIntro, setShowModeIntro] = useState(true);
  const [showModeTutorial, setShowModeTutorial] = useState(false);
  const modeTutorialSteps = useMemo(() => getModeTutorial(mode), [mode]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevFoundWordsRef = useRef(foundWords);
  const [movedCells, setMovedCells] = useState<CellPosition[]>([]);
  // Multi-tile bloom queue — each entry is one particle instance at a cell-centered
  // screen coordinate. Populated from `lastSubmittedCellsRef` positions when a
  // word is found (each tile gets `tileBloomParticlesPerTile` copies, staggered
  // 30ms apart). Entries are removed via batched filter after ~700ms.
  const [clearParticleQueue, setClearParticleQueue] = useState<
    Array<{ id: string; x: number; y: number }>
  >([]);
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

  // --- Per-tile gravity fall animation state ---
  const fallAnimMap = useRef(new Map<string, Animated.Value>()).current;
  const [fallActive, setFallActive] = useState(false);

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
    addHintTokens,
    addLives,
    addBoosterToken,
    spendBoosterToken,
    spendHintToken,
    spendUndoToken,
    spendCoins,
    spendGems,
    processAdReward,
  } = useEconomyActions();
  const [activeOffer, setActiveOffer] = useState<OfferType | null>(null);
  const offerShownThisLevel = useRef(false);
  const completionHandled = useRef(false);
  // hint_rescue: track session fail count for this level (local, resets on mount)
  const sessionFailCount = useRef(0);
  const failureCountedRef = useRef(false);
  // close_finish: idle timer for "1 word away" scenario
  const closeFinishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // post_puzzle: track whether to show after completion dismissal
  const [pendingPostPuzzleOffer, setPendingPostPuzzleOffer] = useState(false);
  // Post-loss modal state
  const [showPostLoss, setShowPostLoss] = useState(false);
  const postLossShownRef = useRef(false);
  // booster_pack: only show once per level on first entry to hard/expert
  const boosterPackShown = useRef(false);
  const offerSuppressed = showModeTutorial || showComplete || showPostLoss || showFailed || activeOffer !== null;

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
    }
    setActiveOffer(null);
  }, [activeOffer, level, mode, difficulty]);

  const showOfferIfAllowed = useCallback((type: OfferType) => {
    if (offerShownThisLevel.current || offerSuppressed) return false;
    offerShownThisLevel.current = true;
    trackTimeout(() => {
      setActiveOffer(type);
      void analytics.logEvent('offer_shown', {
        offerType: type,
        level,
        mode,
        difficulty,
      });
    }, 750);
    return true;
  }, [offerSuppressed, level, mode, difficulty, trackTimeout]);

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

  // hint_rescue: detect failures and show offer after 2+ fails (session or persistent)
  useEffect(() => {
    if (status === 'failed' || status === 'timeout') {
      if (!failureCountedRef.current) {
        failureCountedRef.current = true;
        sessionFailCount.current += 1;
      }
      const persistentFails = failCountByLevel?.[level] ?? 0;
      const totalFails = Math.max(sessionFailCount.current, persistentFails);
      if (totalFails >= 2 && !offerShownThisLevel.current && !activeOffer) {
        showOfferIfAllowed('hint_rescue');
      }
    } else {
      failureCountedRef.current = false;
    }
  }, [status, activeOffer, showOfferIfAllowed, failCountByLevel, level]);

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
        // Activate streak shield — only spend gems if method exists.
        // (Placeholder — no such method on PlayerActions today; keeping the
        // dynamic check so a future addition wires through automatically.)
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

  // Stable onLayout callback — uses ref to lock on first measurement and prevent re-renders
  const handleGridLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    const h = e.nativeEvent.layout.height;
    if (!gridHeightLocked.current && h > 0) {
      gridHeightLocked.current = true;
      setGridAreaHeight(h);
    }
  }, []);

  // Hard cap on simultaneously-rendered bloom particles. Keeps the queue
  // bounded so a 10-letter word with perTile=2 can't balloon past this limit.
  const MAX_BLOOM_PARTICLES = 24;

  // Map a grid (row, col) to pixel-space coordinates inside the particle
  // container (which is `absoluteFillObject` inside `gridArea`). Mirrors the
  // cellSize math used by Grid.tsx and the gravity block so bloom particles
  // land at each tile's visual center. Returns a safe fallback centered in
  // the grid area when layout hasn't measured yet.
  const cellPositionToScreen = useCallback(
    (row: number, col: number): { x: number; y: number } => {
      const rows = grid.length;
      const cols = grid[0]?.length ?? 0;
      if (cols === 0 || rows === 0 || gridAreaHeight <= 0) {
        return { x: SCREEN_WIDTH / 2, y: gridAreaHeight / 2 + 60 };
      }
      const availableWidth = MAX_GRID_WIDTH - CELL_GAP * (cols + 1);
      let cellSize = Math.floor(availableWidth / cols);
      const frameAllowance = 58;
      const heightAvail = gridAreaHeight - frameAllowance;
      const heightBased = Math.floor(heightAvail / rows - CELL_GAP);
      cellSize = Math.min(cellSize, heightBased);
      if (cellSize <= 0) {
        return { x: SCREEN_WIDTH / 2, y: gridAreaHeight / 2 + 60 };
      }
      const cellStride = cellSize + CELL_GAP;
      const gridWidth = cols * cellStride + CELL_GAP;
      const gridHeight = rows * cellStride;
      // Grid is centered inside gridArea (≈ SCREEN_WIDTH wide with 8px padding).
      const gridLeft = (SCREEN_WIDTH - gridWidth) / 2;
      const gridTop = (gridAreaHeight - gridHeight) / 2;
      const padding = CELL_GAP / 2;
      return {
        x: gridLeft + padding + col * cellStride + cellSize / 2,
        y: gridTop + row * cellStride + cellSize / 2,
      };
    },
    [grid, gridAreaHeight],
  );

  // Spawn multi-tile bloom particles for a word. Each cell gets
  // `tileBloomParticlesPerTile` particle instances, staggered 30ms per tile
  // for a waterfall effect. Entries auto-remove from the queue after ~700ms.
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
          const entries: Array<{ id: string; x: number; y: number }> = [];
          for (let p = 0; p < perTile; p++) {
            entries.push({ id: `${bloomBatchId}-${idx}-${p}`, x, y });
          }
          setClearParticleQueue(prev => [...prev, ...entries]);
          trackTimeout(() => {
            setClearParticleQueue(prev =>
              prev.filter(q => !entries.some(e => e.id === q.id)),
            );
          }, 700);
        }, idx * 30);
      });
    },
    [cellPositionToScreen, trackTimeout],
  );

  // #5 reduceMotion support
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Chain celebration animation with screen shake (skips animation when reduceMotion)
  const showChainCelebration = useCallback(() => {
    setChainVisible(true);
    chainAnim.setValue(0);
    void comboHaptic();
    void soundManager.playSound('combo');

    if (reduceMotion) {
      // Skip animation, just show briefly then hide
      chainAnim.setValue(1);
      trackTimeout(() => {
        chainAnim.setValue(0);
        setChainVisible(false);
      }, ANIM.chainPopupDuration);
      return;
    }

    // Screen shake for chain — escalates with combo count
    const isLongShake = combo >= 6;
    const shakeSequence = isLongShake
      ? Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 8, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -6, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 5, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -3, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 2, duration: 25, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 25, useNativeDriver: true }),
        ])
      : Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 5, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -3, duration: 35, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 2, duration: 30, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
        ]);
    shakeSequence.start();
    Animated.sequence([
      Animated.spring(chainAnim, {
        toValue: 1,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.delay(ANIM.chainPopupDuration),
      Animated.timing(chainAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setChainVisible(false));
  }, [chainAnim, shakeAnim, combo, reduceMotion]);

  // Show chain celebration on combo > 1
  useEffect(() => {
    if (combo > 1 && status === 'playing') {
      showChainCelebration();
      void analytics.logEvent('chain_count', {
        level,
        mode,
        combo: combo,
      });
    }
  }, [combo, status, showChainCelebration, level, mode]);

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
    ]).start(() => setShowInvalidFlash(false));

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

  // Trigger invalid flash only for true invalid-tap errors.
  useEffect(() => {
    if (lastInvalidTap) {
      showInvalidFlashAnim();
    }
  }, [lastInvalidTap, showInvalidFlashAnim]);

  // Hints/undos use persistent economy tokens (not per-level allocation)
  // Relax mode still uses unlimited per-level allocation
  const hintsAvailable = mode === 'relax' ? hintsLeft : hintTokens;
  const undosAvailable = mode === 'relax' ? undosLeft : undoTokens;

  // Idle hint prompt — use refs to avoid recreating on every state change
  const statusRef = useRef(status);
  const hintsAvailableRef = useRef(hintsAvailable);
  statusRef.current = status;
  hintsAvailableRef.current = hintsAvailable;

  const resetIdleTimer = useCallback(() => {
    setShowIdleHint(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (statusRef.current === 'playing' && hintsAvailableRef.current > 0) {
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

  // Track post-gravity moved cells + per-tile fall animation
  useEffect(() => {
    if (foundWords > prevFoundWordsRef.current && status === 'playing') {
      const previousGrid = history[history.length - 1]?.grid;
      const moved = previousGrid
        ? getMovedCellPositions(previousGrid, grid)
        : [];
      void soundManager.playSound('gravity');
      void analytics.logEvent('gravity_interaction', {
        level,
        mode,
        movedCells: moved.length,
      });
      setMovedCells(moved);

      // Per-tile gravity fall animation
      if (!reduceMotion && moved.length > 0) {
        const rows = grid.length;
        const cols = grid[0]?.length ?? 0;
        // Compute cellStride (same formula as Grid.tsx)
        const availableWidth = MAX_GRID_WIDTH - CELL_GAP * (cols + 1);
        let cellSize = Math.floor(availableWidth / cols);
        if (gridAreaHeight > 0) {
          const frameAllowance = 58;
          const heightAvail = gridAreaHeight - frameAllowance;
          const heightBased = Math.floor(heightAvail / rows - CELL_GAP);
          cellSize = Math.min(cellSize, heightBased);
        }
        const cellStride = cellSize + CELL_GAP;

        // Stagger delay per column for wave effect
        const staggerDelay = ANIM.gravityStagger || 30;
        const movedCols = new Set(moved.map(c => c.col));
        const colOrder = Array.from(movedCols).sort((a, b) => a - b);
        const colDelayMap = new Map<number, number>();
        colOrder.forEach((c, i) => colDelayMap.set(c, i * staggerDelay));

        const animations: Animated.CompositeAnimation[] = [];
        for (const cell of moved) {
          // Get or create Animated.Value for this cell
          let anim = fallAnimMap.get(cell.cellId);
          if (!anim) {
            anim = new Animated.Value(0);
            fallAnimMap.set(cell.cellId, anim);
          }
          // Set offset so tile visually appears at old position
          // fallRows > 0 means tile fell down, so start with negative translateY (above)
          const offsetPx = -(cell.fallRows * cellStride);
          anim.setValue(offsetPx);

          const delay = colDelayMap.get(cell.col) ?? 0;
          // Animate to 0 (final position) with gravity-like feel.
          // Phase 3.10: friction dropped 12 → 9 for a subtle landing bounce
          // overshoot (reduceMotion users already skip this block at line 1048).
          animations.push(
            Animated.sequence([
              Animated.delay(delay),
              Animated.spring(anim, {
                toValue: 0,
                tension: 180,
                friction: 9,
                useNativeDriver: true,
              }),
            ])
          );
        }
        setFallActive(true);
        Animated.parallel(animations).start(() => {
          setFallActive(false);
          // Clean up animated values for cells no longer on the grid
          const activeCellIds = new Set<string>();
          grid.forEach(row =>
            row.forEach(c => { if (c) activeCellIds.add(c.id); })
          );
          for (const id of fallAnimMap.keys()) {
            if (!activeCellIds.has(id)) fallAnimMap.delete(id);
          }
        });
      }

      const timer = setTimeout(() => setMovedCells([]), 400);
      return () => clearTimeout(timer);
    }
    prevFoundWordsRef.current = foundWords;
  }, [foundWords, status]);

  useEffect(() => {
    if ((status === 'failed' || status === 'timeout') && showFailed) {
      const puzzleStartTime = store.getState().puzzleStartTime;
      const chainCount = store.getState().chainCount;
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
        max_combo: maxCombo,
        chain_count: chainCount,
        time_ms: timeMs,
        words_found: foundWords,
        words_total: totalWords,
      });
    }
  }, [status, showFailed, level, mode, foundWords, totalWords, score, hintsUsed, maxCombo, store]);

  // Score popup when score changes (word found) + particle burst (#1) + big word celebration (Task 2)
  useEffect(() => {
    const diff = score - prevScoreRef.current;
    prevScoreRef.current = score;
    if (diff > 0 && status === 'playing') {
      const wordLen = lastSubmittedWordLenRef.current;
      const label = combo > 1 ? `+${diff} (${combo}x!)` : `+${diff}`;
      setScorePopup({ points: diff, label });
      void wordFoundHaptic();

      // Big word celebration variance (Task 2)
      if (wordLen >= 7) {
        void soundManager.playSound('combo');
        void comboHaptic();
        // Show "AMAZING!" / "INCREDIBLE!" overlay
        const labels = ['AMAZING!', 'INCREDIBLE!', 'PHENOMENAL!', 'SPECTACULAR!'];
        setBigWordLabel(labels[Math.floor(Math.random() * labels.length)]);
        bigWordAnim.setValue(0);
        if (!reduceMotion) {
          // Extra screen shake for 7+ letter words
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 14, duration: 35, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 35, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 30, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -7, duration: 30, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 4, duration: 25, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 25, useNativeDriver: true }),
          ]).start();

          Animated.sequence([
            Animated.spring(bigWordAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
            Animated.delay(800),
            Animated.timing(bigWordAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]).start(() => setBigWordLabel(null));

          // Per-tile bloom burst for 7+ letter words (multi-tile waterfall).
          // Falls back to a center burst if no cleared cells were captured
          // (e.g. chain reactions don't carry selectedCells through).
          const bigCells = lastSubmittedCellsRef.current;
          if (bigCells.length > 0) {
            spawnTileBloom(bigCells);
            // Second batch for extra celebratory impact
            trackTimeout(() => spawnTileBloom(bigCells), 250);
          } else {
            const fallbackId = `big-${Date.now()}`;
            const fallback = [
              { id: `${fallbackId}-a`, x: SCREEN_WIDTH / 2, y: gridAreaHeight / 2 + 60 },
              { id: `${fallbackId}-b`, x: SCREEN_WIDTH / 2 + 20, y: gridAreaHeight / 2 + 40 },
            ];
            setClearParticleQueue(prev => [...prev, fallback[0]]);
            trackTimeout(() => {
              setClearParticleQueue(prev => [...prev.filter(q => q.id !== fallback[0].id), fallback[1]]);
              trackTimeout(() => {
                setClearParticleQueue(prev => prev.filter(q => q.id !== fallback[1].id));
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
        } else {
          const fallbackId = `chain-${Date.now()}`;
          const entry = { id: fallbackId, x: SCREEN_WIDTH / 2, y: gridAreaHeight / 2 + 60 };
          setClearParticleQueue(prev => [...prev, entry]);
          trackTimeout(() => {
            setClearParticleQueue(prev => prev.filter(q => q.id !== entry.id));
          }, 500);
        }
      }

      // Reset captured cells so the next non-submit score change (e.g. chain
      // reactions, score doubler) falls back to the center burst.
      lastSubmittedCellsRef.current = [];

      if (reduceMotion) {
        // Skip score popup animation, just show briefly
        scorePopupAnim.setValue(1);
        trackTimeout(() => { scorePopupAnim.setValue(0); setScorePopup(null); }, 800);
        return;
      }

      // Celebration scaling based on word length (Task 2)
      const popupScale = wordLen >= 7 ? 1.6 : wordLen >= 5 ? 1.3 : 1.0;

      scorePopupAnim.setValue(0);
      Animated.sequence([
        Animated.spring(scorePopupAnim, {
          toValue: 1,
          friction: 5,
          tension: 180,
          useNativeDriver: true,
        }),
        Animated.delay(600),
        Animated.timing(scorePopupAnim, {
          toValue: 2,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setScorePopup(null));
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
      }

      validFlashTimerRef.current = setTimeout(() => {
        validFlashTimerRef.current = null;
        // #3 Grid scale pop: 1.0 -> 0.97 -> 1.0 around submit
        if (!reduceMotion) {
          gridScaleAnim.setValue(1);
          Animated.sequence([
            Animated.timing(gridScaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
            Animated.timing(gridScaleAnim, { toValue: 1.0, duration: 120, useNativeDriver: true }),
          ]).start();
        }

        // Track word length for big word celebration (Task 2)
        lastSubmittedWordLenRef.current = wordLength;
        // Snapshot the user's current selection so the score-change effect can
        // bloom per-tile particles at each cleared cell. Copied by value
        // because SUBMIT_WORD will clear selectedCells in the store.
        lastSubmittedCellsRef.current = store.getState().selectedCells.slice();

        submitWord();
        setShowValidFlash(false);
      }, 250);
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
      const finalMaxCombo = maxCombo;
      const timer = setTimeout(() => {
        setShowComplete(true);
        onCompleteRef.current(finalStars, finalScore, finalMaxCombo);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [status, stars, score, maxCombo]);

  // Reset grid height lock when board changes (new puzzle/level)
  useEffect(() => {
    gridHeightLocked.current = false;
    setGridAreaHeight(0);
  }, [board]);

  // Show post-loss modal first (if applicable), then failed modal
  useEffect(() => {
    if ((status === 'failed' || status === 'timeout') && !showFailed) {
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
  }, [status, showFailed, foundWords, mode]);

  // Cell press/drag handlers now live inside PlayField — GameScreen no longer
  // subscribes to per-tap selection state. PlayField notifies GameScreen of
  // relevant changes via onCellInteraction / onValidWordChange callbacks.

  const handleHint = useCallback(() => {
    if (mode !== 'relax') {
      // Spend from persistent inventory and grant into game state
      if (hintTokens <= 0) return;
      spendHintToken();
      grantHint();
    }
    void soundManager.playSound('hintUsed');
    void analytics.logEvent('hint_used', { level, mode, hintsAvailable });
    useHint();
  }, [useHint, grantHint, level, mode, hintsAvailable, hintTokens, spendHintToken]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    if (mode !== 'relax') {
      // Spend from persistent inventory and grant into game state
      if (undoTokens <= 0) return;
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
      }).start(() => {
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
  }, [undoMove, grantUndo, level, mode, undosAvailable, undoTokens, spendUndoToken, reduceMotion, undoFlashAnim, undoPulseAnim, history.length]);

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

  return (
    <GameStoreContext.Provider value={store}>
    <React.Profiler id="GameScreen" onRender={profilerOnRender}>
    <Animated.View style={shakeContainerStyle}>
    <SafeAreaView style={styles.container}>
      <AmbientBackdrop variant="game" />
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

      <GameHeader
        level={level}
        score={score}
        combo={combo}
        moves={moves}
        hintsLeft={hintsAvailable}
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
      {/* Chain celebrations, valid/invalid flash, score popup, big word
          celebration — all extracted into a single memoized subtree so
          this branch doesn't re-reconcile on every SELECT_CELL. All
          Animated.Values are ref-stable and compared referentially by
          React.memo; the primitive props only change on word submit /
          combo increment. */}
      <GameFlashes
        chainVisible={chainVisible}
        combo={combo}
        showValidFlash={showValidFlash}
        showInvalidFlash={showInvalidFlash}
        scorePopup={scorePopup}
        lastSubmittedWordLen={lastSubmittedWordLenRef.current}
        bigWordLabel={bigWordLabel}
        chainAnim={chainAnim}
        validFlashAnim={validFlashAnim}
        invalidFlashAnim={invalidFlashAnim}
        scorePopupAnim={scorePopupAnim}
        bigWordAnim={bigWordAnim}
      />

      {/* Combo tint pulse + confetti at combo >=5 (Phase 3.9). Reads
          reduceMotion-aware; renders noop below the combo-3 threshold. */}
      <ComboFlash combo={combo} reduceMotion={reduceMotion} />


      {/* Word bank — reads selection state from the zustand store directly.
          Renders above the grid area in its original layout position. */}
      <ConnectedWordBank />

      {/* Grid area — onLayout measures the available space for Grid sizing */}
      <View style={styles.gridArea} onLayout={handleGridLayout}>
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
          fallAnimMap={fallAnimMap}
          fallActive={fallActive}
          movedCells={movedCells}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />
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
            canShowAdHint={!isAdFree && adManager.canShowAd('hint_reward')}
            isStuck={isStuck}
            undosLeft={undosLeft}
            onIdleHintTap={stableHandleIdleHintBannerTap}
            onAdHintTap={stableHandleAdHintBannerTap}
            onUndoTap={stableHandleUndo}
            onRetryTap={stableHandleRetry}
          />
        </View>

        {/* #1 Word-clear particles — multi-tile bloom queue. Each queue entry
            renders one particle instance anchored at a cleared cell's screen
            coordinate. Entries are removed by filter after their animation
            finishes (see spawnTileBloom). */}
        {clearParticleQueue.length > 0 && (
          <View style={styles.particleContainer} pointerEvents="none">
            {clearParticleQueue.map((p, i) => (
              <WordClearParticle
                key={p.id}
                delay={(i % 10) * 20}
                startX={p.x}
                startY={p.y}
              />
            ))}
          </View>
        )}

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
          combo={maxCombo}
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

      {/* Post-loss conversion modal */}
      {showPostLoss && (
        <PostLossModal
          wordsFound={foundWords}
          totalWords={totalWords}
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
                <Text style={styles.failedTitle}>
                  {status === 'timeout' ? `⏱ ${t('result.timeUpShort')}` : t('result.keepGoing')}
                </Text>
                <Text style={styles.failedSubtext}>
                  {t('result.foundWordsProgress', { found: foundWords, total: totalWords })}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.failedTitle}>
                  {status === 'timeout' ? `⏱ ${t('result.timeUpShort')}` : `❌ ${t('result.puzzleFailed')}`}
                </Text>
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
                  <Text style={styles.adHintButtonText}>{'\uD83C\uDFAC'} {t('result.watchAdFreeHint')}</Text>
                </Pressable>
              )}
              {undosLeft > 0 && history.length > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.undoRecoverButton, pressed && styles.buttonPressed]}
                  onPress={handleUndo}
                >
                  <Text style={styles.undoRecoverText}>↩ {t('result.undoLastMove')}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  gridArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
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
    paddingVertical: 4,
    marginTop: 4,
    marginBottom: 2,
    height: 100,
  },
  boosterBarHidden: {
    opacity: 0,
  },
  boosterShelfImage: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: '85%',
    height: 55,
    opacity: 0.9,
  },
  boosterShelf: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 8,
  },
  boosterButton: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 45, 149, 0.25)',
    minWidth: 90,
    overflow: 'visible',
    shadowColor: 'rgba(255, 45, 149, 0.4)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  boosterActive: {
    borderColor: 'rgba(255, 45, 149, 0.6)',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.7,
    shadowRadius: 14,
  },
  boosterPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.8,
  },
  boosterGlow: {
    position: 'absolute',
    top: 4,
    left: '15%' as unknown as number,
    right: '15%' as unknown as number,
    height: 40,
    borderRadius: 20,
  },
  boosterIconWrap: {
    marginBottom: 6,
  },
  boosterIconImage: {
    width: 32,
    height: 32,
  },
  boosterLabel: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  boosterEmoji: {
    fontSize: 28,
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
