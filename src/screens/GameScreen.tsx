import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Board, CellPosition, GameMode } from '../types';
import { useGame } from '../hooks/useGame';
import { GameGrid } from '../components/Grid';
import { WordBank } from '../components/WordBank';
import { GameHeader } from '../components/GameHeader';
import { PuzzleComplete } from '../components/PuzzleComplete';
import { ANIM, COLORS, GRADIENTS, MODE_CONFIGS, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '../constants';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
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
  const effectiveTimeLimit = modeConfig.rules.hasTimer ? (modeConfig.rules.timerSeconds || timeLimit || 120) : 0;
  const effectiveMaxMoves = modeConfig.rules.hasMoveLimit ? (maxMoves || board.words.length) : 0;

  const {
    state,
    selectCell,
    submitWord,
    useHint,
    undoMove,
    newGame,
    currentWord,
    isValidWord,
    isStuck,
    stars,
    foundWords,
    totalWords,
  } = useGame(board, level, mode, effectiveMaxMoves, effectiveTimeLimit);

  const [showComplete, setShowComplete] = useState(false);
  const [showStuck, setShowStuck] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const chainAnim = useRef(new Animated.Value(0)).current;
  const energyAnim = useRef(new Animated.Value(0)).current;
  const [chainVisible, setChainVisible] = useState(false);

  const showChainCelebration = useCallback(() => {
    setChainVisible(true);
    chainAnim.setValue(0);
    energyAnim.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(chainAnim, {
          toValue: 1,
          friction: 5,
          tension: 170,
          useNativeDriver: true,
        }),
        Animated.delay(ANIM.chainPopupDuration - 120),
        Animated.timing(chainAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(energyAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(energyAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => setChainVisible(false));
  }, [chainAnim, energyAnim]);

  useEffect(() => {
    if (state.combo > 1 && state.status === 'playing') {
      showChainCelebration();
    }
  }, [showChainCelebration, state.combo, state.status]);

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
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [currentWord, isValidWord, submitWord]);

  useEffect(() => {
    if (state.status === 'won' && !showComplete) {
      const timer = setTimeout(() => {
        setShowComplete(true);
        onComplete(stars, state.score);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [onComplete, showComplete, stars, state.score, state.status]);

  useEffect(() => {
    if ((state.status === 'failed' || state.status === 'timeout') && !showFailed) {
      const timer = setTimeout(() => setShowFailed(true), 800);
      return () => clearTimeout(timer);
    }
  }, [showFailed, state.status]);

  useEffect(() => {
    if (isStuck && !showStuck && state.status === 'playing') {
      const timer = setTimeout(() => setShowStuck(true), 1500);
      return () => clearTimeout(timer);
    }
    if (!isStuck) setShowStuck(false);
  }, [isStuck, showStuck, state.status]);

  const handleCellPress = useCallback((position: CellPosition) => {
    selectCell(position);
  }, [selectCell]);

  const handleUndo = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(300, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );
    undoMove();
    setShowStuck(false);
  }, [undoMove]);

  const handleRetry = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );
    newGame(board, level, mode, effectiveMaxMoves, effectiveTimeLimit);
    setShowComplete(false);
    setShowStuck(false);
    setShowFailed(false);
  }, [board, effectiveMaxMoves, effectiveTimeLimit, level, mode, newGame]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const chainScale = chainAnim.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1] });
  const energyOpacity = energyAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.24] });

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <View style={styles.bgAuraTop} />
      <Animated.View style={[styles.energyFlash, { opacity: energyOpacity }]} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
          onHint={useHint}
          onUndo={handleUndo}
          onBack={onHome}
        />

        <View style={styles.statusRail}>
          {modeConfig.rules.hasTimer && state.timeRemaining > 0 && (
            <LinearGradient
              colors={state.timeRemaining <= 30 ? ['rgba(255,124,114,0.2)', 'rgba(255,124,114,0.08)'] : ['rgba(32,216,255,0.16)', 'rgba(32,216,255,0.06)']}
              style={[styles.statusChip, state.timeRemaining <= 30 && styles.statusChipDanger]}
            >
              <Text style={[styles.statusText, state.timeRemaining <= 30 && styles.statusTextDanger]}>⏱ {formatTime(state.timeRemaining)}</Text>
            </LinearGradient>
          )}

          {modeConfig.rules.hasMoveLimit && effectiveMaxMoves > 0 && (
            <LinearGradient
              colors={state.moves >= effectiveMaxMoves - 1 ? ['rgba(255,124,114,0.2)', 'rgba(255,124,114,0.08)'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
              style={[styles.statusChip, state.moves >= effectiveMaxMoves - 1 && styles.statusChipDanger]}
            >
              <Text style={[styles.statusText, state.moves >= effectiveMaxMoves - 1 && styles.statusTextDanger]}>Moves {state.moves}/{effectiveMaxMoves}</Text>
            </LinearGradient>
          )}

          {mode === 'cascade' && state.cascadeMultiplier > 1 && (
            <LinearGradient colors={['rgba(255,207,90,0.2)', 'rgba(255,207,90,0.08)']} style={[styles.statusChip, styles.statusChipGold]}>
              <Text style={[styles.statusText, styles.statusTextGold]}>✦ Gravity {state.cascadeMultiplier.toFixed(2)}×</Text>
            </LinearGradient>
          )}
        </View>

        {showStuck && (
          <View style={styles.bannerWrap}>
            <LinearGradient colors={['rgba(255,124,114,0.18)', 'rgba(255,124,114,0.08)']} style={styles.stuckBanner}>
              <Text style={styles.stuckText}>Board jammed. Undo to recover a better drop.</Text>
            </LinearGradient>
          </View>
        )}

        {chainVisible && (
          <Animated.View style={[styles.chainPopup, { opacity: chainAnim, transform: [{ scale: chainScale }] }]}>
            <LinearGradient colors={GRADIENTS.accent} style={styles.chainPopupFill}>
              <Text style={styles.chainText}>{state.combo}× CHAIN</Text>
            </LinearGradient>
          </Animated.View>
        )}

        <View style={styles.gridArea}>
          <Text style={styles.gridCaption}>The board shifts after every word.</Text>
          <GameGrid grid={state.board.grid} selectedCells={state.selectedCells} onCellPress={handleCellPress} />
        </View>

        <View style={styles.wordArea}>
          <WordBank words={state.board.words} currentWord={currentWord} isValidWord={isValidWord} />
        </View>

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
            onNextLevel={() => {
              setShowComplete(false);
              onNextLevel();
            }}
            onHome={onHome}
            onRetry={handleRetry}
          />
        )}

        {showFailed && (
          <View style={styles.failedOverlay}>
            <LinearGradient colors={GRADIENTS.panel} style={styles.failedCard}>
              <Text style={styles.failedKicker}>{state.status === 'timeout' ? 'Time slipped away' : 'Run ended'}</Text>
              <Text style={styles.failedTitle}>{state.status === 'timeout' ? 'Clock defeated you' : 'The board outlasted the run'}</Text>
              <Text style={styles.failedSubtext}>
                {state.status === 'timeout'
                  ? 'You ran out of time. Take another shot with a cleaner route.'
                  : mode === 'perfectSolve'
                    ? 'Perfect Solve requires zero mistakes.'
                    : `All ${effectiveMaxMoves} moves are gone. Try a more efficient sequence.`}
              </Text>
              <View style={styles.failedStats}>
                <Text style={styles.failedStat}>Words found {foundWords}/{totalWords}</Text>
                <Text style={styles.failedStat}>Score {state.score}</Text>
              </View>
              <View style={styles.failedButtons}>
                <Pressable style={styles.retryButton} onPress={handleRetry}>
                  <LinearGradient colors={GRADIENTS.accent} style={styles.retryFill}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable style={styles.homeButton} onPress={onHome}>
                  <Text style={styles.homeButtonText}>Home</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  bgAuraTop: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: COLORS.accentGlow,
    opacity: 0.7,
  },
  energyFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.accentGlow,
  },
  statusRail: {
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  statusChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusChipDanger: {
    borderColor: 'rgba(255,124,114,0.46)',
  },
  statusChipGold: {
    borderColor: 'rgba(255,207,90,0.46)',
  },
  statusText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: TYPOGRAPHY.ui,
  },
  statusTextDanger: {
    color: COLORS.coral,
  },
  statusTextGold: {
    color: COLORS.gold,
  },
  bannerWrap: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  stuckBanner: {
    borderRadius: RADII.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,124,114,0.42)',
  },
  stuckText: {
    color: COLORS.coral,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: TYPOGRAPHY.ui,
  },
  chainPopup: {
    position: 'absolute',
    top: '34%',
    alignSelf: 'center',
    zIndex: 200,
    ...SHADOWS.glow,
  },
  chainPopupFill: {
    borderRadius: RADII.pill,
    paddingHorizontal: 26,
    paddingVertical: 14,
  },
  chainText: {
    color: COLORS.textOnAccent,
    fontSize: 24,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontFamily: TYPOGRAPHY.display,
  },
  gridArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  gridCaption: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
    fontFamily: TYPOGRAPHY.ui,
  },
  wordArea: {
    paddingBottom: SPACING.sm,
  },
  failedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 6, 18, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    zIndex: 100,
  },
  failedCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: RADII.xl,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,124,114,0.4)',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  failedKicker: {
    color: COLORS.coral,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: TYPOGRAPHY.ui,
  },
  failedTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: TYPOGRAPHY.display,
  },
  failedSubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontFamily: TYPOGRAPHY.ui,
  },
  failedStats: {
    marginTop: SPACING.lg,
    gap: 4,
  },
  failedStat: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.ui,
  },
  failedButtons: {
    width: '100%',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  retryButton: {
    borderRadius: RADII.md,
    overflow: 'hidden',
  },
  retryFill: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  retryButtonText: {
    color: COLORS.textOnAccent,
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontFamily: TYPOGRAPHY.display,
  },
  homeButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  homeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.ui,
  },
});
