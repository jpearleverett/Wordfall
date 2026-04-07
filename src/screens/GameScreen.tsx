import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  Share,
  UIManager,
  View,
} from 'react-native';
import { Board, CellPosition, GameMode, VictorySummaryItem } from '../types';
import { useGame } from '../hooks/useGame';
import { GameGrid } from '../components/Grid';
import { WordBank } from '../components/WordBank';
import { GameHeader } from '../components/GameHeader';
import { PuzzleComplete } from '../components/PuzzleComplete';
import { TutorialOverlay } from '../components/TutorialOverlay';

import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, MODE_CONFIGS, ANIM, FONTS, SCREEN_WIDTH, CHAIN_INTENSITY, getDifficultyTier } from '../constants';
import { soundManager } from '../services/sound';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { tapHaptic, wordFoundHaptic, comboHaptic, errorHaptic, successHaptic } from '../services/haptics';
import { usePlayer } from '../contexts/PlayerContext';
import { useEconomy } from '../contexts/EconomyContext';
import { analytics } from '../services/analytics';

import { ContextualOffer, OfferType } from '../components/ContextualOffer';
import { adManager, AdRewardType } from '../services/ads';
import { MockAdModal } from '../components/MockAdModal';
import { ModeTutorialOverlay } from '../components/ModeTutorialOverlay';
import { getModeTutorial } from '../data/modeTutorials';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function getMovedCellPositions(previousGrid: Board['grid'], nextGrid: Board['grid']): CellPosition[] {
  const previousPositions = new Map<string, CellPosition>();

  previousGrid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell) {
        previousPositions.set(cell.id, { row: rowIndex, col: colIndex });
      }
    });
  });

  const moved: CellPosition[] = [];

  nextGrid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) return;
      const previousPosition = previousPositions.get(cell.id);
      if (!previousPosition) return;
      if (previousPosition.row !== rowIndex || previousPosition.col !== colIndex) {
        moved.push({ row: rowIndex, col: colIndex });
      }
    });
  });

  return moved;
}

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
  const player = usePlayer();
  const failCount = player.failCountByLevel?.[level] ?? 0;
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
    state,
    selectCell,
    clearSelection,
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
    useBooster,
    currentWord,
    isValidWord,
    isStuck,
    stars,
    foundWords,
    totalWords,
    remainingWords,
    solveSequence,
  } = useGame(board, level, mode, effectiveMaxMoves, effectiveTimeLimit);

  const [showComplete, setShowComplete] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [gridAreaHeight, setGridAreaHeight] = useState(0);
  const gridHeightLocked = useRef(false);
  const chainAnim = useRef(new Animated.Value(0)).current;
  const [chainVisible, setChainVisible] = useState(false);
  const validFlashAnim = useRef(new Animated.Value(0)).current;
  const [showValidFlash, setShowValidFlash] = useState(false);
  const invalidFlashAnim = useRef(new Animated.Value(0)).current;
  const [showInvalidFlash, setShowInvalidFlash] = useState(false);
  const scorePopupAnim = useRef(new Animated.Value(0)).current;
  const [scorePopup, setScorePopup] = useState<{ points: number; label: string } | null>(null);
  const prevScoreRef = useRef(state.score);
  const [showIdleHint, setShowIdleHint] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showModeIntro, setShowModeIntro] = useState(true);
  const [showModeTutorial, setShowModeTutorial] = useState(false);
  const modeTutorialSteps = useMemo(() => getModeTutorial(mode), [mode]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevFoundWordsRef = useRef(foundWords);
  const [movedCells, setMovedCells] = useState<CellPosition[]>([]);
  const [clearParticles, setClearParticles] = useState<{ x: number; y: number } | null>(null);
  const gridScaleAnim = useRef(new Animated.Value(1)).current;
  const undoFlashAnim = useRef(new Animated.Value(0)).current;
  const [showUndoFlash, setShowUndoFlash] = useState(false);
  const undoPulseAnim = useRef(new Animated.Value(1)).current;

  // --- Column-stagger gravity animation state (Task 1) ---
  const columnStaggerAnims = useRef<Animated.Value[]>([]).current;
  const [staggerActive, setStaggerActive] = useState(false);

  // --- Big word celebration state (Task 2) ---
  const [bigWordLabel, setBigWordLabel] = useState<string | null>(null);
  const bigWordAnim = useRef(new Animated.Value(0)).current;
  const lastSubmittedWordLenRef = useRef(0);

  // --- Tutorial overlay state (Task 4) ---
  const [tutorialTip, setTutorialTip] = useState<{ id: string; text: string } | null>(null);

  // --- Contextual Offer state ---
  const economy = useEconomy();
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
  // booster_pack: only show once per level on first entry to hard/expert
  const boosterPackShown = useRef(false);

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
      economy.processAdReward('hint_reward');
      void soundManager.playSound('hintUsed');
    }
  }, [economy]);

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
    if (offerShownThisLevel.current || activeOffer) return false;
    offerShownThisLevel.current = true;
    setTimeout(() => {
      setActiveOffer(type);
      void analytics.logEvent('offer_shown', {
        offerType: type,
        level,
        mode,
        difficulty,
      });
    }, 750);
    return true;
  }, [activeOffer, level, mode, difficulty]);

  // booster_pack: show on first entry to a hard/expert level
  useEffect(() => {
    if (boosterPackShown.current) return;
    if (difficulty === 'hard' || difficulty === 'expert') {
      const levelsPlayed = player.failCountByLevel ?? {};
      const previouslyPlayed = (levelsPlayed[level] ?? 0) > 0;
      if (!previouslyPlayed) {
        boosterPackShown.current = true;
        showOfferIfAllowed('booster_pack');
      }
    }
  }, [level, difficulty, player.failCountByLevel, showOfferIfAllowed]);

  // close_finish: watch for 1 word remaining + stuck or idle 15s
  useEffect(() => {
    if (closeFinishTimerRef.current) {
      clearTimeout(closeFinishTimerRef.current);
      closeFinishTimerRef.current = null;
    }
    if (
      state.status === 'playing' &&
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
  }, [remainingWords, isStuck, state.status, activeOffer, showOfferIfAllowed]);

  // hint_rescue: detect failures and show offer after 2+ fails (session or persistent)
  useEffect(() => {
    if (state.status === 'failed' || state.status === 'timeout') {
      if (!failureCountedRef.current) {
        failureCountedRef.current = true;
        sessionFailCount.current += 1;
      }
      const persistentFails = player.failCountByLevel?.[level] ?? 0;
      const totalFails = Math.max(sessionFailCount.current, persistentFails);
      if (totalFails >= 2 && !offerShownThisLevel.current && !activeOffer) {
        showOfferIfAllowed('hint_rescue');
      }
    } else {
      failureCountedRef.current = false;
    }
  }, [state.status, activeOffer, showOfferIfAllowed, player.failCountByLevel, level]);

  // hint_rescue: dead-end detected while player has 0 hint tokens
  useEffect(() => {
    if (
      isStuck &&
      state.status === 'playing' &&
      economy.hintTokens === 0 &&
      mode !== 'relax' &&
      !offerShownThisLevel.current &&
      !activeOffer
    ) {
      showOfferIfAllowed('hint_rescue');
    }
  }, [isStuck, state.status, economy.hintTokens, mode, activeOffer, showOfferIfAllowed]);

  // post_puzzle (restock): show when hint tokens reach 0 mid-gameplay after using a hint
  useEffect(() => {
    if (
      state.status === 'playing' &&
      state.hintsUsed > 0 &&
      economy.hintTokens === 0 &&
      mode !== 'relax' &&
      remainingWords.length > 0 &&
      !offerShownThisLevel.current &&
      !activeOffer
    ) {
      showOfferIfAllowed('post_puzzle');
    }
  }, [state.status, state.hintsUsed, economy.hintTokens, mode, remainingWords.length, activeOffer, showOfferIfAllowed]);

  // life_refill: show when player fails and has no lives remaining
  useEffect(() => {
    if ((state.status === 'failed' || state.status === 'timeout') && economy.lives === 0) {
      if (!offerShownThisLevel.current && !activeOffer) {
        showOfferIfAllowed('life_refill');
      }
    }
  }, [state.status, economy.lives, activeOffer, showOfferIfAllowed]);

  // streak_shield: show when player has an active streak at risk during gameplay
  useEffect(() => {
    if (state.status !== 'playing') return;
    const streaks = player.streaks;
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
  }, [state.status, player.streaks, activeOffer, showOfferIfAllowed]);

  // post_puzzle: flag when puzzle won with hint tokens depleted
  useEffect(() => {
    if (state.status === 'won' && economy.hintTokens === 0 && mode !== 'relax') {
      setPendingPostPuzzleOffer(true);
    }
  }, [state.status, economy.hintTokens, mode]);

  const handleOfferAccept = useCallback(() => {
    if (!activeOffer) return;
    let accepted = false;
    switch (activeOffer) {
      case 'hint_rescue':
        // Spend 50 coins, grant 5 hint tokens
        if (economy.spendCoins(50)) {
          economy.addHintTokens(5);
          accepted = true;
        }
        break;
      case 'close_finish':
        // Spend 25 coins, grant 1 hint token
        if (economy.spendCoins(25)) {
          economy.addHintTokens(1);
          accepted = true;
        }
        break;
      case 'post_puzzle':
        // Spend 80 coins, grant 10 hint tokens
        if (economy.spendCoins(80)) {
          economy.addHintTokens(10);
          accepted = true;
        }
        break;
      case 'booster_pack':
        // Spend 15 gems, grant 1 of each booster to persistent inventory
        if (economy.spendGems(15)) {
          economy.addBoosterToken('wildcardTile');
          economy.addBoosterToken('spotlight');
          economy.addBoosterToken('smartShuffle');
          accepted = true;
        }
        break;
      case 'life_refill':
        // Spend 10 gems, refill lives
        if (economy.spendGems(10)) {
          economy.addLives(5);
          accepted = true;
        }
        break;
      case 'streak_shield':
        // Activate streak shield — only spend gems if method exists
        if (typeof (player as any).activateStreakShield === 'function') {
          if (economy.spendGems(30)) {
            (player as any).activateStreakShield();
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
  }, [activeOffer, economy, level, mode, difficulty, player]);

  // Memoize the composed grid scale to avoid creating a new style object each render
  const gridScaleStyle = useMemo(() => ({
    transform: [{ scale: Animated.multiply(gridScaleAnim, undoPulseAnim) }],
  }), [gridScaleAnim, undoPulseAnim]);

  // Stable onLayout callback — uses ref to lock on first measurement and prevent re-renders
  const handleGridLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    const h = e.nativeEvent.layout.height;
    if (!gridHeightLocked.current && h > 0) {
      gridHeightLocked.current = true;
      setGridAreaHeight(h);
    }
  }, []);

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
      setTimeout(() => {
        chainAnim.setValue(0);
        setChainVisible(false);
      }, ANIM.chainPopupDuration);
      return;
    }

    // Screen shake for chain — escalates with combo count
    const isLongShake = state.combo >= 6;
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
  }, [chainAnim, shakeAnim, state.combo, reduceMotion]);

  // Show chain celebration on combo > 1
  useEffect(() => {
    if (state.combo > 1 && state.status === 'playing') {
      showChainCelebration();
      void analytics.logEvent('chain_count', {
        level,
        mode,
        combo: state.combo,
      });
    }
  }, [state.combo, state.status, showChainCelebration, level, mode]);

  // Invalid word flash animation
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
  }, [invalidFlashAnim]);

  // Trigger invalid flash when a non-adjacent cell is tapped
  useEffect(() => {
    if (state.lastInvalidTap) {
      showInvalidFlashAnim();
    }
  }, [state.lastInvalidTap, showInvalidFlashAnim]);

  // Hints/undos use persistent economy tokens (not per-level allocation)
  // Relax mode still uses unlimited per-level allocation
  const hintsAvailable = mode === 'relax' ? state.hintsLeft : economy.hintTokens;
  const undosAvailable = mode === 'relax' ? state.undosLeft : economy.undoTokens;

  // Idle hint prompt — use refs to avoid recreating on every state change
  const statusRef = useRef(state.status);
  const hintsAvailableRef = useRef(hintsAvailable);
  statusRef.current = state.status;
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

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [state.selectedCells.length, foundWords, resetIdleTimer]);

  // Show mode tutorial on first play of a mode, or fall back to 2.5s text banner
  useEffect(() => {
    if (mode !== 'classic' && modeTutorialSteps && !player.tooltipsShown.includes(`mode_tutorial_${mode}`)) {
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
  const gameStateRef = useRef({ status: state.status, foundWords, totalWords, score: state.score });
  gameStateRef.current = { status: state.status, foundWords, totalWords, score: state.score };

  useEffect(() => {
    void soundManager.playMusic(mode === 'timePressure' ? 'tense' : 'gameplay');
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

  // Track post-gravity moved cells + column-stagger animation (Task 1)
  useEffect(() => {
    if (foundWords > prevFoundWordsRef.current && state.status === 'playing') {
      const previousGrid = state.history[state.history.length - 1]?.grid;
      const moved = previousGrid
        ? getMovedCellPositions(previousGrid, state.board.grid)
        : [];
      void soundManager.playSound('gravity');
      void analytics.logEvent('gravity_interaction', {
        level,
        mode,
        movedCells: moved.length,
      });
      setMovedCells(moved);

      // Column-stagger bounce animation (Task 1)
      if (!reduceMotion && moved.length > 0) {
        const cols = state.board.grid[0]?.length ?? 0;
        // Ensure we have enough Animated.Values for each column
        while (columnStaggerAnims.length < cols) {
          columnStaggerAnims.push(new Animated.Value(0));
        }
        // Determine which columns had moved cells
        const movedCols = new Set(moved.map(c => c.col));
        // Reset all column anims
        columnStaggerAnims.forEach(a => a.setValue(0));
        // Build staggered spring animations for each column with moved cells
        const staggerDelay = ANIM.gravityStagger || 40;
        let colDelay = 0;
        const animations: Animated.CompositeAnimation[] = [];
        for (let c = 0; c < cols; c++) {
          if (movedCols.has(c)) {
            animations.push(
              Animated.sequence([
                Animated.delay(colDelay),
                Animated.spring(columnStaggerAnims[c], {
                  toValue: 1,
                  tension: 120,
                  friction: 6,
                  useNativeDriver: true,
                }),
              ])
            );
            colDelay += staggerDelay;
          }
        }
        setStaggerActive(true);
        Animated.parallel(animations).start(() => {
          setStaggerActive(false);
        });
      }

      const timer = setTimeout(() => setMovedCells([]), 400);
      return () => clearTimeout(timer);
    }
    prevFoundWordsRef.current = foundWords;
  }, [foundWords, state.status]);

  useEffect(() => {
    if ((state.status === 'failed' || state.status === 'timeout') && showFailed) {
      void analytics.logEvent('puzzle_fail', {
        level,
        mode,
        reason: state.status,
        foundWords,
        totalWords,
        score: state.score,
      });
    }
  }, [state.status, showFailed, level, mode, foundWords, totalWords, state.score]);

  // Score popup when score changes (word found) + particle burst (#1) + big word celebration (Task 2)
  useEffect(() => {
    const diff = state.score - prevScoreRef.current;
    prevScoreRef.current = state.score;
    if (diff > 0 && state.status === 'playing') {
      const wordLen = lastSubmittedWordLenRef.current;
      const label = state.combo > 1 ? `+${diff} (${state.combo}x!)` : `+${diff}`;
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

          // Extra particle burst for 7+ letter words
          setClearParticles({ x: SCREEN_WIDTH / 2, y: gridAreaHeight / 2 + 60 });
          setTimeout(() => {
            setClearParticles(null);
            // Second burst for extra impact
            setClearParticles({ x: SCREEN_WIDTH / 2 + 20, y: gridAreaHeight / 2 + 40 });
            setTimeout(() => setClearParticles(null), 500);
          }, 250);
        } else {
          bigWordAnim.setValue(1);
          setTimeout(() => { bigWordAnim.setValue(0); setBigWordLabel(null); }, 1000);
        }
      } else if (wordLen >= 5) {
        void soundManager.playSound('combo');
        void soundManager.playSound('wordFound');
      } else {
        void soundManager.playSound('wordFound');
      }

      // #1 Word-clear particle burst (normal words)
      if (!reduceMotion && wordLen < 7) {
        setClearParticles({ x: SCREEN_WIDTH / 2, y: gridAreaHeight / 2 + 60 });
        setTimeout(() => setClearParticles(null), 500);
      }

      if (reduceMotion) {
        // Skip score popup animation, just show briefly
        scorePopupAnim.setValue(1);
        setTimeout(() => { scorePopupAnim.setValue(0); setScorePopup(null); }, 800);
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
  }, [state.score]);

  // Green flash + auto-submit when a valid word is selected
  // #3 letter pop (grid scale pulse) + #2 gravity bounce + #5 reduceMotion
  useEffect(() => {
    if (isValidWord && currentWord.length >= 3) {
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

      const timer = setTimeout(() => {
        // #3 Grid scale pop: 1.0 -> 0.97 -> 1.0 around submit
        if (!reduceMotion) {
          gridScaleAnim.setValue(1);
          Animated.sequence([
            Animated.timing(gridScaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
            Animated.timing(gridScaleAnim, { toValue: 1.0, duration: 120, useNativeDriver: true }),
          ]).start();
        }

        // Track word length for big word celebration (Task 2)
        lastSubmittedWordLenRef.current = currentWord.length;

        // #2 Gravity ease-out — 300ms per GDD spec (column stagger not supported by LayoutAnimation)
        LayoutAnimation.configureNext({
          duration: ANIM.gravityDuration,
          update: {
            type: LayoutAnimation.Types.easeOut,
            property: LayoutAnimation.Properties.opacity,
          },
          delete: {
            type: LayoutAnimation.Types.easeOut,
            property: LayoutAnimation.Properties.opacity,
          },
        });
        submitWord();
        setShowValidFlash(false);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setShowValidFlash(false);
    }
  }, [isValidWord, currentWord]);

  // Show completion modal — use a ref guard to prevent double-firing when
  // onComplete mutates player/economy state and causes callback reference changes
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  useEffect(() => {
    if (state.status === 'won' && !completionHandled.current) {
      completionHandled.current = true;
      void successHaptic();
      void soundManager.playSound('puzzleComplete');
      const finalScore = state.score;
      const finalStars = stars;
      const finalMaxCombo = state.maxCombo;
      const timer = setTimeout(() => {
        setShowComplete(true);
        onCompleteRef.current(finalStars, finalScore, finalMaxCombo);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.status, stars, state.score, state.maxCombo]);

  // Reset grid height lock when board changes (new puzzle/level)
  useEffect(() => {
    gridHeightLocked.current = false;
    setGridAreaHeight(0);
  }, [board]);

  // Show failed modal
  useEffect(() => {
    if ((state.status === 'failed' || state.status === 'timeout') && !showFailed) {
      const timer = setTimeout(() => setShowFailed(true), 400);
      return () => clearTimeout(timer);
    }
  }, [state.status, showFailed]);

  const handleCellPress = useCallback(
    (position: CellPosition) => {
      resetIdleTimer();
      void tapHaptic();
      void soundManager.playSound('tap');
      // Adjacency is handled by the reducer — non-adjacent taps start a new selection
      // Wildcard placement mode is also handled by the reducer via SELECT_CELL
      selectCell(position);
    },
    [selectCell, resetIdleTimer]
  );

  const handleHint = useCallback(() => {
    if (mode !== 'relax') {
      // Spend from persistent inventory and grant into game state
      if (economy.hintTokens <= 0) return;
      economy.spendHintToken();
      grantHint();
    }
    void soundManager.playSound('hintUsed');
    void analytics.logEvent('hint_used', { level, mode, hintsAvailable });
    useHint();
  }, [useHint, grantHint, level, mode, hintsAvailable, economy]);

  const handleUndo = useCallback(() => {
    if (state.history.length === 0) return;
    if (mode !== 'relax') {
      // Spend from persistent inventory and grant into game state
      if (economy.undoTokens <= 0) return;
      economy.spendUndoToken();
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
  }, [undoMove, grantUndo, level, mode, undosAvailable, economy, reduceMotion, undoFlashAnim, undoPulseAnim, state.history.length]);

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

  const handleNextLevel = useCallback(() => {
    setShowComplete(false);
    completionHandled.current = false;
    // post_puzzle: show hint upsell if player used all free hints
    if (pendingPostPuzzleOffer && !offerShownThisLevel.current) {
      setPendingPostPuzzleOffer(false);
      showOfferIfAllowed('post_puzzle');
      // Still proceed to next level after a brief delay for the offer to appear
      setTimeout(() => onNextLevel(), 100);
    } else {
      onNextLevel();
    }
  }, [onNextLevel, pendingPostPuzzleOffer, showOfferIfAllowed]);

  // First-booster ceremony (fires once ever, tracked via tooltipsShown)
  const checkFirstBooster = useCallback(() => {
    if (!player.tooltipsShown.includes('first_booster_used')) {
      player.markTooltipShown('first_booster_used');
      player.queueCeremony({
        type: 'first_booster',
        data: {},
      });
    }
  }, [player]);

  // Booster handlers — spend from persistent economy inventory
  const handleWildcard = useCallback(() => {
    if ((economy.boosterTokens?.wildcardTile ?? 0) <= 0) return;
    economy.spendBoosterToken('wildcardTile');
    grantBooster('wildcardTile');
    void soundManager.playSound('buttonPress');
    void analytics.logEvent('booster_used', { level, mode, booster: 'wildcardTile' });
    checkFirstBooster();
    activateWildcard();
  }, [activateWildcard, economy, grantBooster, level, mode, checkFirstBooster]);

  const handleSpotlight = useCallback(() => {
    if ((economy.boosterTokens?.spotlight ?? 0) <= 0) return;
    economy.spendBoosterToken('spotlight');
    grantBooster('spotlight');
    void soundManager.playSound('buttonPress');
    void analytics.logEvent('booster_used', { level, mode, booster: 'spotlight' });
    checkFirstBooster();
    activateSpotlight();
  }, [activateSpotlight, economy, grantBooster, level, mode, checkFirstBooster]);

  const handleSmartShuffle = useCallback(() => {
    if ((economy.boosterTokens?.smartShuffle ?? 0) <= 0) return;
    economy.spendBoosterToken('smartShuffle');
    grantBooster('smartShuffle');
    void soundManager.playSound('buttonPress');
    void analytics.logEvent('booster_used', { level, mode, booster: 'smartShuffle' });
    checkFirstBooster();
    activateSmartShuffle();
  }, [activateSmartShuffle, economy, grantBooster, level, mode, checkFirstBooster]);

  // Format timer — extracted as useCallback to avoid recreation on every render
  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Escalating chain scale based on combo count
  const chainTargetScale = state.combo >= 6 ? 1.5 : state.combo >= 4 ? 1.2 : 1;
  const chainScale = chainAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, chainTargetScale],
  });

  // Escalating chain color and style
  const chainBgColor = state.combo >= 6
    ? 'rgba(168, 85, 247, 0.95)'   // Purple for 6+
    : state.combo >= 4
    ? 'rgba(255, 215, 0, 0.95)'    // Gold for 4-5
    : 'rgba(255, 45, 149, 0.95)';   // Pink for 2-3

  const chainShadowColor = state.combo >= 6
    ? COLORS.purple
    : state.combo >= 4
    ? COLORS.gold
    : COLORS.accent;

  const chainBorderColor = state.combo >= 6
    ? 'rgba(200, 140, 255, 0.5)'
    : state.combo >= 4
    ? 'rgba(255, 230, 100, 0.5)'
    : 'rgba(255,255,255,0.3)';

  const validFlashOpacity = validFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  const bt = economy.boosterTokens ?? { wildcardTile: 0, spotlight: 0, smartShuffle: 0 };
  const hasAnyBoosters =
    bt.wildcardTile > 0 ||
    bt.spotlight > 0 ||
    bt.smartShuffle > 0;

  // Compute spotlight dimmed cells for grid rendering
  const spotlightDimmedSet = useMemo(() => {
    if (!state.spotlightActive) return new Set<string>();
    const relevant = new Set(state.spotlightLetters);
    const dimmed = new Set<string>();
    state.board.grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && !relevant.has(cell.letter)) {
          dimmed.add(`${r},${c}`);
        }
      });
    });
    return dimmed;
  }, [state.spotlightActive, state.spotlightLetters, state.board.grid]);

  const invalidFlashOpacity = invalidFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.25],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}>
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

      <GameHeader
        level={level}
        score={state.score}
        combo={state.combo}
        moves={state.moves}
        hintsLeft={hintsAvailable}
        undosLeft={undosAvailable}
        foundWords={foundWords}
        totalWords={totalWords}
        isDaily={isDaily}
        mode={mode}
        maxMoves={effectiveMaxMoves}
        timeRemaining={state.timeRemaining}
        onHint={handleHint}
        onUndo={handleUndo}
        onBack={onHome}
      />

      {/* Timer/move bars - reserved space so they don't shift layout */}
      {modeConfig.rules.hasTimer && (
        <View style={[
          styles.timerBar,
          state.timeRemaining <= 30 && state.timeRemaining > 0 && styles.timerBarDanger,
          state.timeRemaining <= 0 && styles.barHidden,
        ]}>
          <Text style={[
            styles.timerText,
            state.timeRemaining <= 30 && styles.timerTextDanger,
          ]}>
            ⏱ {formatTime(state.timeRemaining)}
          </Text>
        </View>
      )}
      {modeConfig.rules.hasMoveLimit && effectiveMaxMoves > 0 && (
        <View style={[
          styles.moveBar,
          state.moves >= effectiveMaxMoves - 1 && styles.moveBarDanger,
        ]}>
          <Text style={[
            styles.moveText,
            state.moves >= effectiveMaxMoves - 1 && styles.moveTextDanger,
          ]}>
            Moves: {state.moves}/{effectiveMaxMoves}
          </Text>
        </View>
      )}


      {/* Chain celebration */}
      {chainVisible && (
        <Animated.View style={[
          styles.chainPopup,
          {
            backgroundColor: chainBgColor,
            shadowColor: chainShadowColor,
            borderColor: chainBorderColor,
            opacity: chainAnim,
            transform: [{ scale: chainScale }],
          },
        ]}>
          <Text style={[
            styles.chainText,
            state.combo >= 6 && { fontSize: 40, letterSpacing: 6 },
            state.combo >= 4 && state.combo < 6 && { fontSize: 36, letterSpacing: 5.5 },
          ]}>
            {state.combo}x CHAIN!
          </Text>
        </Animated.View>
      )}

      {/* Chain combo neon pulse overlay — escalates with combo count */}
      {chainVisible && state.combo >= 3 && (
        <Animated.View
          style={[
            styles.neonPulseOverlay,
            {
              borderColor: state.combo >= 4 ? COLORS.cyan : COLORS.accent,
              opacity: chainAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.6, 0],
              }),
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* VHS glitch overlay for 4x+ chains */}
      {chainVisible && state.combo >= 4 && (
        <Animated.View
          style={[
            styles.vhsGlitchOverlay,
            {
              opacity: chainAnim.interpolate({
                inputRange: [0, 0.3, 0.5, 0.7, 1],
                outputRange: [0, 0.12, 0, 0.08, 0],
              }),
              transform: [{
                translateX: chainAnim.interpolate({
                  inputRange: [0, 0.2, 0.25, 0.45, 0.5, 1],
                  outputRange: [0, 4, -3, 2, -1, 0],
                }),
              }],
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Valid word green flash overlay */}
      {showValidFlash && (
        <Animated.View
          style={[styles.validFlashOverlay, { opacity: validFlashOpacity }]}
          pointerEvents="none"
        />
      )}

      {/* Invalid word red flash overlay */}
      {showInvalidFlash && (
        <Animated.View
          style={[styles.invalidFlashOverlay, { opacity: invalidFlashOpacity }]}
          pointerEvents="none"
        />
      )}

      {/* Score popup with word-length scaling (Task 2) */}
      {scorePopup && (() => {
        const wordLen = lastSubmittedWordLenRef.current;
        const popupScale = wordLen >= 7 ? 1.6 : wordLen >= 5 ? 1.3 : 1.0;
        return (
        <Animated.View
          style={[
            styles.scorePopup,
            wordLen >= 7 && styles.scorePopupBig,
            wordLen >= 5 && wordLen < 7 && styles.scorePopupMedium,
            {
              opacity: scorePopupAnim.interpolate({
                inputRange: [0, 0.5, 1, 1.8, 2],
                outputRange: [0, 1, 1, 1, 0],
              }),
              transform: [
                {
                  translateY: scorePopupAnim.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [20, 0, -40],
                  }),
                },
                {
                  scale: scorePopupAnim.interpolate({
                    inputRange: [0, 0.3, 1, 2],
                    outputRange: [0.5 * popupScale, 1.2 * popupScale, popupScale, 0.8 * popupScale],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={[
            styles.scorePopupText,
            state.combo > 1 && styles.scorePopupCombo,
            wordLen >= 7 && styles.scorePopupTextBig,
          ]}>
            {scorePopup.label}
          </Text>
        </Animated.View>
        );
      })()}

      {/* Big word celebration label overlay (Task 2) */}
      {bigWordLabel && (
        <Animated.View
          style={[
            styles.bigWordOverlay,
            {
              opacity: bigWordAnim.interpolate({
                inputRange: [0, 0.3, 0.8, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  scale: bigWordAnim.interpolate({
                    inputRange: [0, 0.2, 0.5, 1],
                    outputRange: [0.3, 1.3, 1.0, 0.8],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.bigWordText}>{bigWordLabel}</Text>
        </Animated.View>
      )}

      {/* Word bank - above grid */}
      <View style={styles.wordArea}>
        <WordBank
          words={state.board.words}
          currentWord={currentWord}
          isValidWord={isValidWord}
        />
      </View>

      {/* Grid area */}
      <View style={styles.gridArea} onLayout={handleGridLayout}>
        {/* Floating banners - absolute overlay, don't affect grid sizing */}
        <View style={styles.bannerOverlay} pointerEvents="box-none">
          {mode === 'gravityFlip' && state.gravityDirection !== 'down' && (
            <View style={styles.cascadeBar}>
              <Text style={styles.cascadeText}>
                🔄 Gravity: {state.gravityDirection === 'right' ? '→' : state.gravityDirection === 'up' ? '↑' : '←'}
              </Text>
            </View>
          )}
          {mode === 'shrinkingBoard' && state.wordsUntilShrink === 1 && state.status === 'playing' && (
            <View style={[styles.cascadeBar, { borderColor: COLORS.coral }]}>
              <Text style={[styles.cascadeText, { color: COLORS.coral }]}>
                🔻 SHRINKING IN 1 WORD
              </Text>
            </View>
          )}
          {state.wildcardMode && (
            <View style={[styles.cascadeBar, { borderColor: COLORS.gold }]}>
              <Text style={[styles.cascadeText, { color: COLORS.gold }]}>
                ★ Tap a cell to place wildcard
              </Text>
            </View>
          )}
          {showIdleHint && hintsAvailable > 0 && state.status === 'playing' && (
            <Pressable
              style={styles.idleHintBanner}
              onPress={() => { setShowIdleHint(false); handleHint(); }}
            >
              <Text style={styles.idleHintText}>
                Need help? Tap here or press 💡 for a hint
              </Text>
            </Pressable>
          )}
          {/* When hints are depleted, offer ad-for-hint during gameplay */}
          {showIdleHint && hintsAvailable === 0 && state.status === 'playing' && !economy.isAdFree && adManager.canShowAd('hint_reward') && (
            <Pressable
              style={styles.adHintBanner}
              onPress={() => { setShowIdleHint(false); handleWatchAdForHint(); }}
            >
              <Text style={styles.adHintBannerText}>
                {'\uD83C\uDFAC'} Out of hints — watch ad for +1 hint
              </Text>
            </Pressable>
          )}
          {isStuck && state.status === 'playing' && state.undosLeft > 0 && (
            <Pressable
              style={styles.stuckBanner}
              onPress={handleUndo}
            >
              <Text style={styles.stuckText}>
                Stuck? Tap here to undo your last move
              </Text>
            </Pressable>
          )}
          {isStuck && state.status === 'playing' && state.undosLeft <= 0 && (
            <Pressable
              style={[styles.stuckBanner, styles.stuckBannerRetry]}
              onPress={handleRetry}
            >
              <Text style={styles.stuckText}>
                No moves left — tap to retry this puzzle
              </Text>
            </Pressable>
          )}
        </View>

        {/* Grid wrapper with scale animations (#3 letter pop, #4 undo pulse) */}
        <Animated.View style={gridScaleStyle}>
          <GameGrid
            grid={state.board.grid}
            selectedCells={state.selectedCells}
            hintedCells={isValidWord ? state.selectedCells : []}
            onCellPress={handleCellPress}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            validWord={showValidFlash}
            movedCells={mode === 'noGravity' ? [] : movedCells}
            maxHeight={gridAreaHeight}
            isDragging={isDragging}
            wildcardCells={state.wildcardCells}
            spotlightDimmedCells={spotlightDimmedSet}
            gravityDirection={mode === 'gravityFlip' ? state.gravityDirection : undefined}
            noGravityLayout={mode === 'noGravity' || mode === 'shrinkingBoard'}
            columnStaggerAnims={columnStaggerAnims}
            staggerActive={staggerActive}
          />
        </Animated.View>

        {/* #1 Word-clear particles */}
        {clearParticles && (
          <View style={styles.particleContainer} pointerEvents="none">
            {Array.from({ length: 10 }).map((_, i) => (
              <WordClearParticle
                key={`particle-${i}-${clearParticles.x}`}
                delay={i * 20}
                startX={clearParticles.x}
                startY={clearParticles.y}
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

      {/* Booster bar - custom icon assets on metallic shelf */}
      <View style={[
        styles.boosterBar,
        !(hasAnyBoosters && state.status === 'playing') && styles.boosterBarHidden,
      ]}>
        {/* Metallic shelf asset */}
        <Image
          source={LOCAL_IMAGES.shelfBooster}
          style={styles.boosterShelfImage}
          resizeMode="stretch"
        />
        <View style={styles.boosterShelf}>
          {bt.wildcardTile > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.boosterButton,
                state.wildcardMode && styles.boosterActive,
                pressed && styles.boosterPressed,
              ]}
              onPress={handleWildcard}
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
                <Text style={styles.boosterCountText}>{bt.wildcardTile}</Text>
              </View>
            </Pressable>
          )}
          {bt.spotlight > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.boosterButton,
                state.spotlightActive && styles.boosterActive,
                pressed && styles.boosterPressed,
              ]}
              onPress={handleSpotlight}
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
                <Text style={styles.boosterCountText}>{bt.spotlight}</Text>
              </View>
            </Pressable>
          )}
          {bt.smartShuffle > 0 && (
            <Pressable
              style={({ pressed }) => [styles.boosterButton, pressed && styles.boosterPressed]}
              onPress={handleSmartShuffle}
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
                <Text style={styles.boosterCountText}>{bt.smartShuffle}</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* Completion overlay */}
      {showComplete && (
        <PuzzleComplete
          score={state.score}
          moves={state.moves}
          stars={stars}
          combo={state.maxCombo}
          level={level}
          isDaily={isDaily}
          mode={mode}
          perfectRun={state.perfectRun}
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
          showAdOption={!economy.isAdFree && adManager.canShowAd('double_reward')}
          onChallengeFriend={() => {
            const challenge = player.sendChallenge('friend', {
              score: state.score,
              stars,
              time: solveSequence.length > 0 ? solveSequence[solveSequence.length - 1].timestamp : 0,
              level,
              seed: Date.now(),
              mode,
              boardConfig: board.config,
            });
            const challengeText = [
              `I challenge you to beat my score on Wordfall Level ${level}!`,
              `My score: ${state.score.toLocaleString()} | ${'*'.repeat(stars)}`,
              `Challenge code: ${challenge.id}`,
              '',
              '#Wordfall #Challenge',
            ].join('\n');
            Share.share({ message: challengeText }).catch(() => {});
          }}
        />
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
            hintsUsed: state.hintsUsed,
            streakDays: player.streaks?.currentStreak ?? 0,
            livesRemaining: economy.lives,
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
            player.markTooltipShown(`mode_tutorial_${mode}`);
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
                <Text style={styles.failedTitle}>SO CLOSE!</Text>
                <Text style={styles.failedSubtext}>
                  You found {foundWords} of {totalWords} words — just {totalWords - foundWords} more!
                </Text>
              </>
            ) : foundWords > 0 ? (
              <>
                <Text style={styles.failedTitle}>
                  {state.status === 'timeout' ? '⏱ TIME\'S UP!' : 'KEEP GOING!'}
                </Text>
                <Text style={styles.failedSubtext}>
                  You found {foundWords} of {totalWords} words. You're making progress!
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.failedTitle}>
                  {state.status === 'timeout' ? '⏱ TIME\'S UP!' : '❌ PUZZLE FAILED'}
                </Text>
                <Text style={styles.failedSubtext}>
                  {state.status === 'timeout'
                    ? 'You ran out of time. Try again?'
                    : mode === 'perfectSolve'
                      ? 'Perfect mode requires zero mistakes.'
                      : `You used all ${effectiveMaxMoves} moves.`}
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
                <Text style={styles.failedProgressText}>{foundWords}/{totalWords} words</Text>
              </View>
            )}
            <View style={styles.failedStats}>
              <Text style={styles.failedStat}>Score: {state.score}</Text>
            </View>
            <View style={styles.failedButtons}>
              <Pressable
                style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
                onPress={handleRetry}
              >
                <Text style={styles.retryButtonText}>TRY AGAIN</Text>
              </Pressable>
              {/* Watch ad for a free hint — shown after failure when player has no hints */}
              {!economy.isAdFree && adManager.canShowAd('hint_reward') && state.hintsLeft === 0 && (
                <Pressable
                  style={({ pressed }) => [styles.adHintButton, pressed && styles.buttonPressed]}
                  onPress={handleWatchAdForHint}
                >
                  <Text style={styles.adHintButtonText}>{'\uD83C\uDFAC'} Watch Ad for Free Hint</Text>
                </Pressable>
              )}
              {state.undosLeft > 0 && state.history.length > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.undoRecoverButton, pressed && styles.buttonPressed]}
                  onPress={handleUndo}
                >
                  <Text style={styles.undoRecoverText}>↩ UNDO LAST MOVE</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.homeButton, pressed && styles.buttonPressed]}
                onPress={onHome}
              >
                <Text style={styles.homeButtonText}>HOME</Text>
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
