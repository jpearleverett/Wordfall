import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Animated,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Board, CellPosition, GameMode } from '../types';
import { useGame } from '../hooks/useGame';
import { GameGrid } from '../components/Grid';
import { WordBank } from '../components/WordBank';
import { GameHeader } from '../components/GameHeader';
import { PuzzleComplete } from '../components/PuzzleComplete';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, MODE_CONFIGS, ANIM, FONTS } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { soundManager } from '../services/sound';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { tapHaptic, wordFoundHaptic, comboHaptic, errorHaptic, successHaptic } from '../services/haptics';
import { usePlayer } from '../contexts/PlayerContext';

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
  onComplete: (stars: number, score: number) => void;
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
}: GameScreenProps) {
  const player = usePlayer();
  const failCount = player.failCountByLevel?.[level] ?? 0;
  // Dynamic hint generosity: show hint sooner if player has failed this level before
  const idleHintDelay = failCount >= 2 ? 10000 : failCount === 1 ? 15000 : 20000;

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
    newGame,
    shuffleFiller,
    freezeColumn,
    previewMove,
    clearPreview,
    useBooster,
    currentWord,
    isValidWord,
    isStuck,
    stars,
    foundWords,
    totalWords,
    remainingWords,
  } = useGame(board, level, mode, effectiveMaxMoves, effectiveTimeLimit);

  const [showComplete, setShowComplete] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [freezeMode, setFreezeMode] = useState(false);
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
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevFoundWordsRef = useRef(foundWords);
  const [movedCells, setMovedCells] = useState<CellPosition[]>([]);

  // Chain celebration animation with screen shake
  const showChainCelebration = useCallback(() => {
    setChainVisible(true);
    chainAnim.setValue(0);
    void comboHaptic();
    void soundManager.playSound('combo');
    // Screen shake for chain
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 3, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -3, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 2, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
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
  }, [chainAnim, shakeAnim]);

  // Show chain celebration on combo > 1
  useEffect(() => {
    if (state.combo > 1 && state.status === 'playing') {
      showChainCelebration();
    }
  }, [state.combo]);

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

  // Idle hint prompt — use refs to avoid recreating on every state change
  const statusRef = useRef(state.status);
  const hintsLeftRef = useRef(state.hintsLeft);
  statusRef.current = state.status;
  hintsLeftRef.current = state.hintsLeft;

  const resetIdleTimer = useCallback(() => {
    setShowIdleHint(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (statusRef.current === 'playing' && hintsLeftRef.current > 0) {
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

  // Hide mode intro after 2 seconds
  useEffect(() => {
    if (showModeIntro && mode !== 'classic') {
      const timer = setTimeout(() => setShowModeIntro(false), 2500);
      return () => clearTimeout(timer);
    } else {
      setShowModeIntro(false);
    }
  }, [mode]);

  useEffect(() => {
    void soundManager.playMusic(mode === 'timePressure' ? 'tense' : 'gameplay');

    return () => {
      void soundManager.playMusic('menu');
    };
  }, [mode]);

  // Track post-gravity moved cells
  useEffect(() => {
    if (foundWords > prevFoundWordsRef.current && state.status === 'playing') {
      const previousGrid = state.history[state.history.length - 1]?.grid;
      const moved = previousGrid
        ? getMovedCellPositions(previousGrid, state.board.grid)
        : [];
      void soundManager.playSound('gravity');
      setMovedCells(moved);
      const timer = setTimeout(() => setMovedCells([]), 400);
      return () => clearTimeout(timer);
    }
    prevFoundWordsRef.current = foundWords;
  }, [foundWords, state.status]);

  // Score popup when score changes (word found)
  useEffect(() => {
    const diff = state.score - prevScoreRef.current;
    prevScoreRef.current = state.score;
    if (diff > 0 && state.status === 'playing') {
      const label = state.combo > 1 ? `+${diff} (${state.combo}x!)` : `+${diff}`;
      setScorePopup({ points: diff, label });
      void wordFoundHaptic();
      void soundManager.playSound('wordFound');
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
  useEffect(() => {
    if (isValidWord && currentWord.length >= 3) {
      // Show green flash
      setShowValidFlash(true);
      validFlashAnim.setValue(0);
      Animated.timing(validFlashAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            ANIM.gravityDuration,
            LayoutAnimation.Types.easeInEaseOut,
            LayoutAnimation.Properties.opacity
          )
        );
        submitWord();
        setShowValidFlash(false);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setShowValidFlash(false);
    }
  }, [isValidWord, currentWord]);

  // Show completion modal
  useEffect(() => {
    if (state.status === 'won' && !showComplete) {
      void successHaptic();
      void soundManager.playSound('puzzleComplete');
      const timer = setTimeout(() => {
        setShowComplete(true);
        onComplete(stars, state.score);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

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
  }, [state.status]);

  const handleCellPress = useCallback(
    (position: CellPosition) => {
      resetIdleTimer();
      void tapHaptic();
      void soundManager.playSound('tap');
      if (freezeMode) {
        freezeColumn(position.col);
        setFreezeMode(false);
        return;
      }
      // Adjacency is handled by the reducer — non-adjacent taps start a new selection
      selectCell(position);
    },
    [selectCell, freezeMode, freezeColumn, resetIdleTimer]
  );

  const handleHint = useCallback(() => {
    void soundManager.playSound('hintUsed');
    useHint();
  }, [useHint]);

  const handleUndo = useCallback(() => {
    void soundManager.playSound('undoUsed');
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
  }, [undoMove]);

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

    setShowFailed(false);
    setFreezeMode(false);
    setShowPreview(false);
  }, [board, level, mode, effectiveMaxMoves, effectiveTimeLimit, newGame]);

  const handleNextLevel = useCallback(() => {
    setShowComplete(false);
    onNextLevel();
  }, [onNextLevel]);

  // Booster handlers
  const handleShuffle = useCallback(() => {
    if (state.boosterCounts.shuffleFiller > 0) {
      void soundManager.playSound('buttonPress');
      useBooster('shuffleFiller');
    }
  }, [useBooster, state.boosterCounts.shuffleFiller]);

  const handleFreezeToggle = useCallback(() => {
    if (state.boosterCounts.freezeColumn > 0) {
      void soundManager.playSound('buttonPress');
      setFreezeMode(prev => !prev);
    }
  }, [state.boosterCounts.freezeColumn]);

  const handlePreviewToggle = useCallback(() => {
    if (showPreview) {
      clearPreview();
      setShowPreview(false);
    } else if (state.boosterCounts.boardPreview > 0 && state.selectedCells.length > 0) {
      previewMove(state.selectedCells);
      useBooster('boardPreview');
      setShowPreview(true);
    }
  }, [showPreview, clearPreview, previewMove, useBooster, state.boosterCounts.boardPreview, state.selectedCells]);

  // Format timer
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const chainScale = chainAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const validFlashOpacity = validFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  const hasAnyBoosters =
    state.boosterCounts.shuffleFiller > 0 ||
    state.boosterCounts.freezeColumn > 0 ||
    state.boosterCounts.boardPreview > 0;

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
               mode === 'limitedMoves' ? `Complete in ${effectiveMaxMoves} moves!` :
               mode === 'timePressure' ? `Beat the clock! ${formatTime(effectiveTimeLimit)}` :
               mode === 'cascade' ? 'Build combos for bonus multipliers!' :
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
        hintsLeft={state.hintsLeft}
        undosLeft={state.undosLeft}
        foundWords={foundWords}
        totalWords={totalWords}
        isDaily={isDaily}
        mode={mode}
        maxMoves={effectiveMaxMoves}
        timeRemaining={state.timeRemaining}
        cascadeMultiplier={state.cascadeMultiplier}
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
            opacity: chainAnim,
            transform: [{ scale: chainScale }],
          },
        ]}>
          <Text style={styles.chainText}>
            {state.combo}x CHAIN!
          </Text>
        </Animated.View>
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

      {/* Score popup */}
      {scorePopup && (
        <Animated.View
          style={[
            styles.scorePopup,
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
                    outputRange: [0.5, 1.2, 1, 0.8],
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
          ]}>
            {scorePopup.label}
          </Text>
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
      <View style={styles.gridArea} onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (!gridHeightLocked.current && h > 0) {
          gridHeightLocked.current = true;
          setGridAreaHeight(h);
        }
      }}>
        {/* Floating banners - absolute overlay, don't affect grid sizing */}
        <View style={styles.bannerOverlay} pointerEvents="box-none">
          {mode === 'cascade' && state.cascadeMultiplier > 1 && (
            <View style={styles.cascadeBar}>
              <Text style={styles.cascadeText}>
                🔥 {state.cascadeMultiplier.toFixed(2)}x Multiplier
              </Text>
            </View>
          )}
          {state.frozenColumns.length > 0 && (
            <View style={styles.frozenBanner}>
              <Text style={styles.frozenText}>
                ❄️ Column {state.frozenColumns.map(c => c + 1).join(', ')} frozen
              </Text>
            </View>
          )}
          {freezeMode && (
            <View style={styles.freezeModeBanner}>
              <Text style={styles.freezeModeText}>
                ❄️ Tap a column to freeze it
              </Text>
            </View>
          )}
          {showIdleHint && state.hintsLeft > 0 && state.status === 'playing' && (
            <Pressable
              style={styles.idleHintBanner}
              onPress={() => { setShowIdleHint(false); handleHint(); }}
            >
              <Text style={styles.idleHintText}>
                Need help? Tap here or press 💡 for a hint
              </Text>
            </Pressable>
          )}
        </View>

        {/* Show preview grid if active */}
        {showPreview && state.previewGrid ? (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>PREVIEW</Text>
            <GameGrid
              grid={state.previewGrid}
              selectedCells={[]}
              onCellPress={() => {}}
              maxHeight={gridAreaHeight}
            />
            <Pressable
              style={styles.previewDismiss}
              onPress={() => { clearPreview(); setShowPreview(false); }}
            >
              <Text style={styles.previewDismissText}>Dismiss Preview</Text>
            </Pressable>
          </View>
        ) : (
          <GameGrid
            grid={state.board.grid}
            selectedCells={state.selectedCells}
            hintedCells={isValidWord ? state.selectedCells : []}
            onCellPress={handleCellPress}
            frozenColumns={state.frozenColumns}
            validWord={showValidFlash}
            movedCells={movedCells}
            maxHeight={gridAreaHeight}
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
          {state.boosterCounts.shuffleFiller > 0 && (
            <Pressable
              style={({ pressed }) => [styles.boosterButton, pressed && styles.boosterPressed]}
              onPress={handleShuffle}
            >
              {/* Pedestal card */}
              <LinearGradient
                colors={['rgba(25, 15, 50, 0.85)', 'rgba(15, 8, 35, 0.90)'] as [string, string]}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
              />
              {/* Icon glow background */}
              <View style={[styles.boosterGlow, { backgroundColor: 'rgba(168, 85, 247, 0.20)' }]} />
              <View style={styles.boosterIconWrap}>
                <Image source={LOCAL_IMAGES.iconShuffle} style={styles.boosterIconImage} resizeMode="contain" />
              </View>
              <Text style={styles.boosterLabel}>Shuffle</Text>
              {state.boosterCounts.shuffleFiller > 0 && (
                <View style={styles.boosterCount}>
                  <Text style={styles.boosterCountText}>{state.boosterCounts.shuffleFiller}</Text>
                </View>
              )}
            </Pressable>
          )}
          {state.boosterCounts.freezeColumn > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.boosterButton,
                freezeMode && styles.boosterActive,
                pressed && styles.boosterPressed,
              ]}
              onPress={handleFreezeToggle}
            >
              <LinearGradient
                colors={['rgba(10, 20, 50, 0.85)', 'rgba(5, 12, 35, 0.90)'] as [string, string]}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
              />
              <View style={[styles.boosterGlow, { backgroundColor: 'rgba(0, 212, 255, 0.18)' }]} />
              <View style={styles.boosterIconWrap}>
                <Image source={LOCAL_IMAGES.iconFreeze} style={styles.boosterIconImage} resizeMode="contain" />
              </View>
              <Text style={styles.boosterLabel}>Freeze</Text>
              {state.boosterCounts.freezeColumn > 0 && (
                <View style={styles.boosterCount}>
                  <Text style={styles.boosterCountText}>{state.boosterCounts.freezeColumn}</Text>
                </View>
              )}
            </Pressable>
          )}
          {state.boosterCounts.boardPreview > 0 && (
            <Pressable
              style={({ pressed }) => [styles.boosterButton, pressed && styles.boosterPressed]}
              onPress={handlePreviewToggle}
            >
              <LinearGradient
                colors={['rgba(10, 20, 50, 0.85)', 'rgba(5, 12, 35, 0.90)'] as [string, string]}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
              />
              <View style={[styles.boosterGlow, { backgroundColor: 'rgba(0, 212, 255, 0.18)' }]} />
              <View style={styles.boosterIconWrap}>
                <Image source={LOCAL_IMAGES.iconPreview} style={styles.boosterIconImage} resizeMode="contain" />
              </View>
              <Text style={styles.boosterLabel}>Preview</Text>
              {state.boosterCounts.boardPreview > 0 && (
                <View style={styles.boosterCount}>
                  <Text style={styles.boosterCountText}>{state.boosterCounts.boardPreview}</Text>
                </View>
              )}
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
          onNextLevel={handleNextLevel}
          onHome={onHome}
          onRetry={handleRetry}
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  timerBarDanger: {
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  timerText: {
    fontFamily: FONTS.display,
    color: COLORS.accent,
    fontSize: 16,
    letterSpacing: 3,
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 8,
  },
  timerTextDanger: {
    color: COLORS.coral,
    textShadowColor: COLORS.coralGlow,
  },
  moveBar: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  moveBarDanger: {
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  moveText: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  moveTextDanger: {
    color: COLORS.coral,
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 6,
  },
  cascadeBar: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  cascadeText: {
    fontFamily: FONTS.display,
    color: COLORS.coral,
    fontSize: 14,
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 6,
  },
  frozenBanner: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.25)',
  },
  frozenText: {
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  freezeModeBanner: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 212, 255, 0.5)',
  },
  freezeModeText: {
    fontFamily: FONTS.display,
    color: COLORS.accent,
    fontSize: 13,
    letterSpacing: 1,
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 8,
  },
  chainPopup: {
    position: 'absolute',
    top: '36%',
    alignSelf: 'center',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 28,
    zIndex: 200,
    elevation: 28,
    backgroundColor: 'rgba(0, 212, 255, 0.95)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chainText: {
    fontFamily: FONTS.display,
    color: '#fff',
    fontSize: 32,
    letterSpacing: 5,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 6,
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
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  idleHintText: {
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
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
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 212, 255, 0.95)',
    elevation: 28,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  scorePopupText: {
    fontFamily: FONTS.display,
    color: '#fff',
    fontSize: 26,
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 6,
  },
  scorePopupCombo: {
    fontSize: 30,
    textShadowColor: 'rgba(255, 215, 0, 0.7)',
    textShadowRadius: 16,
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewLabel: {
    color: COLORS.gold,
    fontSize: 12,
    fontFamily: FONTS.display,
    letterSpacing: 3,
    marginBottom: 8,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 6,
  },
  previewDismiss: {
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewDismissText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.20)',
    minWidth: 90,
    overflow: 'visible',
    shadowColor: 'rgba(0, 212, 255, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  boosterActive: {
    borderColor: 'rgba(0, 212, 255, 0.6)',
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
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 107, 0.4)',
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
    overflow: 'hidden',
  },
  failedTitle: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: COLORS.coral,
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 10,
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
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  retryButtonText: {
    fontFamily: FONTS.display,
    color: '#fff',
    fontSize: 16,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowRadius: 2,
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
});
