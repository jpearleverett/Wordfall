import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
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
import { COLORS, MODE_CONFIGS, ANIM } from '../constants';

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
}: GameScreenProps) {
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
    currentWord,
    isValidWord,
    isStuck,
    stars,
    foundWords,
    totalWords,
    remainingWords,
  } = useGame(board, level, mode, effectiveMaxMoves, effectiveTimeLimit);

  const [showComplete, setShowComplete] = useState(false);
  const [showStuck, setShowStuck] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const chainAnim = useRef(new Animated.Value(0)).current;
  const [chainVisible, setChainVisible] = useState(false);

  // Chain celebration animation
  const showChainCelebration = useCallback(() => {
    setChainVisible(true);
    chainAnim.setValue(0);
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
  }, [chainAnim]);

  // Show chain celebration on combo > 1
  useEffect(() => {
    if (state.combo > 1 && state.status === 'playing') {
      showChainCelebration();
    }
  }, [state.combo]);

  // Auto-submit when a valid word is selected
  useEffect(() => {
    if (isValidWord && currentWord.length >= 3) {
      const timer = setTimeout(() => {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            ANIM.gravityDuration,
            LayoutAnimation.Types.easeInEaseOut,
            LayoutAnimation.Properties.opacity
          )
        );
        submitWord();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isValidWord, currentWord]);

  // Show completion modal
  useEffect(() => {
    if (state.status === 'won' && !showComplete) {
      const timer = setTimeout(() => {
        setShowComplete(true);
        onComplete(stars, state.score);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  // Show failed modal
  useEffect(() => {
    if ((state.status === 'failed' || state.status === 'timeout') && !showFailed) {
      const timer = setTimeout(() => setShowFailed(true), 800);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  // Detect stuck state
  useEffect(() => {
    if (isStuck && !showStuck && state.status === 'playing') {
      const timer = setTimeout(() => setShowStuck(true), 1500);
      return () => clearTimeout(timer);
    } else if (!isStuck) {
      setShowStuck(false);
    }
  }, [isStuck, state.status]);

  const handleCellPress = useCallback(
    (position: CellPosition) => {
      selectCell(position);
    },
    [selectCell]
  );

  const handleHint = useCallback(() => {
    useHint();
  }, [useHint]);

  const handleUndo = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    undoMove();
    setShowStuck(false);
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
    setShowStuck(false);
    setShowFailed(false);
  }, [board, level, mode, effectiveMaxMoves, effectiveTimeLimit, newGame]);

  const handleNextLevel = useCallback(() => {
    setShowComplete(false);
    onNextLevel();
  }, [onNextLevel]);

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

  return (
    <View style={styles.container}>
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

      {/* Timer display for timed mode */}
      {modeConfig.rules.hasTimer && state.timeRemaining > 0 && (
        <View style={[
          styles.timerBar,
          state.timeRemaining <= 30 && styles.timerBarDanger,
        ]}>
          <Text style={[
            styles.timerText,
            state.timeRemaining <= 30 && styles.timerTextDanger,
          ]}>
            ⏱ {formatTime(state.timeRemaining)}
          </Text>
        </View>
      )}

      {/* Move counter for limited moves */}
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

      {/* Cascade multiplier */}
      {mode === 'cascade' && state.cascadeMultiplier > 1 && (
        <View style={styles.cascadeBar}>
          <Text style={styles.cascadeText}>
            🔥 {state.cascadeMultiplier.toFixed(2)}x Multiplier
          </Text>
        </View>
      )}

      {/* Stuck warning */}
      {showStuck && (
        <View style={styles.stuckBanner}>
          <Text style={styles.stuckText}>
            Stuck! Try undoing your last move.
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

      {/* Grid area */}
      <View style={styles.gridArea}>
        <GameGrid
          grid={state.board.grid}
          selectedCells={state.selectedCells}
          onCellPress={handleCellPress}
        />
      </View>

      {/* Word bank */}
      <View style={styles.wordArea}>
        <WordBank
          words={state.board.words}
          currentWord={currentWord}
          isValidWord={isValidWord}
        />
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
          onNextLevel={handleNextLevel}
          onHome={onHome}
          onRetry={handleRetry}
        />
      )}

      {/* Failed overlay */}
      {showFailed && (
        <View style={styles.failedOverlay}>
          <View style={styles.failedCard}>
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
            <View style={styles.failedStats}>
              <Text style={styles.failedStat}>Words Found: {foundWords}/{totalWords}</Text>
              <Text style={styles.failedStat}>Score: {state.score}</Text>
            </View>
            <View style={styles.failedButtons}>
              <Pressable style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>RETRY</Text>
              </Pressable>
              <Pressable style={styles.homeButton} onPress={onHome}>
                <Text style={styles.homeButtonText}>HOME</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
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
    paddingHorizontal: 12,
  },
  wordArea: {
    paddingBottom: 16,
  },
  timerBar: {
    backgroundColor: COLORS.surface,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  timerBarDanger: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.coral,
  },
  timerText: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  timerTextDanger: {
    color: COLORS.coral,
  },
  moveBar: {
    backgroundColor: COLORS.surface,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  moveBarDanger: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.coral,
  },
  moveText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  moveTextDanger: {
    color: COLORS.coral,
  },
  cascadeBar: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.coral,
  },
  cascadeText: {
    color: COLORS.coral,
    fontSize: 14,
    fontWeight: '800',
  },
  stuckBanner: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.coral,
    alignItems: 'center',
  },
  stuckText: {
    color: COLORS.coral,
    fontSize: 13,
    fontWeight: '600',
  },
  chainPopup: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    zIndex: 200,
    elevation: 20,
  },
  chainText: {
    color: COLORS.bg,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  failedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  failedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.coral,
  },
  failedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.coral,
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  failedSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
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
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  retryButtonText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  homeButton: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  homeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
