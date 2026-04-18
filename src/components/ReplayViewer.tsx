import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SolveStep } from '../types';
import { generateReplayText } from '../utils/replayGenerator';
import { crashReporter } from '../services/crashReporting';

interface ReplayViewerProps {
  steps: SolveStep[];
  level: number;
  stars: number;
  totalScore: number;
  isDaily: boolean;
  onClose: () => void;
}

function ReplayGrid({
  gridState,
  highlightedCells,
  animProgress,
}: {
  gridState: string[][];
  highlightedCells: Set<string>;
  animProgress: Animated.Value;
}) {
  if (gridState.length === 0) return null;

  const rows = gridState.length;
  const cols = gridState[0]?.length ?? 0;
  const cellSize = Math.min(36, (280 - 8) / cols);

  return (
    <View style={replayGridStyles.grid}>
      {gridState.map((row, rowIdx) => (
        <View key={rowIdx} style={replayGridStyles.row}>
          {row.map((cell, colIdx) => {
            const key = `${rowIdx},${colIdx}`;
            const isHighlighted = highlightedCells.has(key);
            const isEmpty = !cell || cell === '';

            return (
              <Animated.View
                key={colIdx}
                style={[
                  replayGridStyles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                  },
                  isEmpty && replayGridStyles.emptyCell,
                  isHighlighted && replayGridStyles.highlightedCell,
                  isHighlighted && {
                    opacity: animProgress.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [0.4, 1, 1],
                    }),
                    transform: [{
                      scale: animProgress.interpolate({
                        inputRange: [0, 0.3, 0.5, 1],
                        outputRange: [0.8, 1.1, 1, 1],
                      }),
                    }],
                  },
                ]}
              >
                {!isEmpty && (
                  <Text
                    style={[
                      replayGridStyles.cellText,
                      { fontSize: cellSize * 0.5 },
                      isHighlighted && replayGridStyles.highlightedText,
                    ]}
                  >
                    {cell}
                  </Text>
                )}
              </Animated.View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function ReplayViewer({
  steps,
  level,
  stars,
  totalScore,
  isDaily,
  onClose,
}: ReplayViewerProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(-1); // -1 = initial state
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAfterGravity, setShowAfterGravity] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Animate step transitions
  useEffect(() => {
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [currentStep, showAfterGravity, stepAnim]);

  const totalSteps = steps.length;

  const advanceStep = useCallback(() => {
    if (currentStep < 0) {
      setCurrentStep(0);
      setShowAfterGravity(false);
    } else if (!showAfterGravity) {
      setShowAfterGravity(true);
    } else if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setShowAfterGravity(false);
    } else {
      // Reached the end
      setIsPlaying(false);
    }
  }, [currentStep, showAfterGravity, totalSteps]);

  const previousStep = useCallback(() => {
    if (showAfterGravity) {
      setShowAfterGravity(false);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setShowAfterGravity(true);
    } else if (currentStep === 0) {
      setCurrentStep(-1);
      setShowAfterGravity(false);
    }
  }, [currentStep, showAfterGravity]);

  // Auto-play logic
  useEffect(() => {
    if (!isPlaying) {
      if (playTimer.current) {
        clearTimeout(playTimer.current);
        playTimer.current = null;
      }
      return;
    }

    playTimer.current = setTimeout(() => {
      advanceStep();
    }, showAfterGravity ? 800 : 1200);

    return () => {
      if (playTimer.current) {
        clearTimeout(playTimer.current);
      }
    };
  }, [isPlaying, advanceStep, showAfterGravity]);

  // Stop playing when we reach the end
  useEffect(() => {
    if (currentStep >= totalSteps - 1 && showAfterGravity) {
      setIsPlaying(false);
    }
  }, [currentStep, showAfterGravity, totalSteps]);

  const handlePlay = useCallback(() => {
    if (currentStep >= totalSteps - 1 && showAfterGravity) {
      // Reset to beginning
      setCurrentStep(-1);
      setShowAfterGravity(false);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  }, [currentStep, isPlaying, showAfterGravity, totalSteps]);

  // Current display state
  const { gridState, highlightedCells, stepLabel } = useMemo(() => {
    if (currentStep < 0 || currentStep >= steps.length) {
      // Show initial grid state
      const initialGrid = steps.length > 0 ? steps[0].gridStateBefore : [];
      return {
        gridState: initialGrid,
        highlightedCells: new Set<string>(),
        stepLabel: 'Initial Board',
      };
    }

    const step = steps[currentStep];

    if (showAfterGravity) {
      return {
        gridState: step.gridStateAfter,
        highlightedCells: new Set<string>(),
        stepLabel: `After "${step.wordFound}" + gravity`,
      };
    }

    const highlighted = new Set(
      step.cellPositions.map(([r, c]) => `${r},${c}`)
    );

    return {
      gridState: step.gridStateBefore,
      highlightedCells: highlighted,
      stepLabel: `${step.wordFound} (+${step.score}${step.combo > 1 ? ` ${step.combo}x` : ''})`,
    };
  }, [currentStep, showAfterGravity, steps]);

  const handleShareReplay = useCallback(() => {
    const text = generateReplayText(steps, level, stars, totalScore, isDaily);
    Share.share({ message: text }).catch((e) => {
      crashReporter.addBreadcrumb(
        `Share.share (replay) failed: ${e instanceof Error ? e.message : String(e)}`,
        'share',
      );
    });
  }, [steps, level, stars, totalScore, isDaily]);

  const atEnd = currentStep >= totalSteps - 1 && showAfterGravity;
  const atStart = currentStep < 0;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['rgba(4,6,18,0.97)', 'rgba(10,14,39,0.98)'] as [string, string]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Solve Replay</Text>
          <Text style={styles.subtitle}>
            Level {level} | {t('common.movesCount', { count: steps.length })} | {'*'.repeat(stars)}
          </Text>
        </View>

        {/* Grid Display */}
        <LinearGradient
          colors={GRADIENTS.surfaceCard as unknown as [string, string, ...string[]]}
          style={styles.gridContainer}
        >
          <Text style={styles.stepLabel}>{stepLabel}</Text>
          <ReplayGrid
            gridState={gridState}
            highlightedCells={highlightedCells}
            animProgress={stepAnim}
          />

          {/* Step counter */}
          <Text style={styles.stepCounter}>
            {currentStep < 0 ? 'Start' : `Step ${currentStep + 1}/${totalSteps}`}
            {showAfterGravity ? ' (gravity)' : ''}
          </Text>
        </LinearGradient>

        {/* Step list */}
        <ScrollView style={styles.stepList} showsVerticalScrollIndicator={false}>
          {steps.map((step, index) => (
            <Pressable
              key={index}
              onPress={() => {
                setCurrentStep(index);
                setShowAfterGravity(false);
                setIsPlaying(false);
              }}
              style={({ pressed }) => [
                styles.stepItem,
                index === currentStep && styles.stepItemActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[
                styles.stepNumber,
                index === currentStep && styles.stepNumberActive,
              ]}>
                {index + 1}
              </Text>
              <View style={styles.stepInfo}>
                <Text style={[
                  styles.stepWord,
                  index === currentStep && styles.stepWordActive,
                ]}>
                  {step.wordFound}
                </Text>
                <Text style={styles.stepScore}>
                  +{step.score}{step.combo > 1 ? ` (${step.combo}x)` : ''}
                </Text>
              </View>
              {index < currentStep && (
                <Text style={styles.stepCheck}>{'\u2713'}</Text>
              )}
            </Pressable>
          ))}
        </ScrollView>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [styles.controlButton, pressed && styles.buttonPressed, atStart && styles.controlDisabled]}
            onPress={previousStep}
            disabled={atStart}
          >
            <Text style={styles.controlIcon}>{'\u23EA'}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.playButton, pressed && styles.buttonPressed]}
            onPress={handlePlay}
          >
            <LinearGradient
              colors={GRADIENTS.button.primary as unknown as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.playButtonGradient}
            >
              <Text style={styles.playIcon}>
                {isPlaying ? '\u23F8' : atEnd ? '\u21BB' : '\u25B6'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.controlButton, pressed && styles.buttonPressed, atEnd && styles.controlDisabled]}
            onPress={advanceStep}
            disabled={atEnd}
          >
            <Text style={styles.controlIcon}>{'\u23E9'}</Text>
          </Pressable>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.shareReplayButton, pressed && styles.buttonPressed]}
            onPress={handleShareReplay}
          >
            <Text style={styles.shareReplayText}>Share Solve</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const replayGridStyles = StyleSheet.create({
  grid: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 3,
  },
  cell: {
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyCell: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.03)',
  },
  highlightedCell: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
    ...SHADOWS.glow(COLORS.green),
  },
  cellText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
  },
  highlightedText: {
    color: '#ffffff',
    fontFamily: FONTS.display,
  },
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 12,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    marginTop: 4,
  },
  gridContainer: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
    marginBottom: 12,
  },
  stepLabel: {
    color: COLORS.accent,
    fontSize: 14,
    fontFamily: FONTS.display,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  stepCounter: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  stepList: {
    flex: 1,
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stepItemActive: {
    backgroundColor: COLORS.accent + '15',
    borderColor: COLORS.accent + '40',
  },
  stepNumber: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.display,
    width: 28,
    textAlign: 'center',
  },
  stepNumberActive: {
    color: COLORS.accent,
  },
  stepInfo: {
    flex: 1,
    marginLeft: 8,
  },
  stepWord: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  stepWordActive: {
    color: COLORS.accent,
  },
  stepScore: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    marginTop: 1,
  },
  stepCheck: {
    color: COLORS.green,
    fontSize: 16,
    fontFamily: FONTS.display,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  controlDisabled: {
    opacity: 0.3,
  },
  controlIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  playButton: {
    borderRadius: 30,
    ...SHADOWS.medium,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
  },
  playButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: COLORS.bg,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  shareReplayButton: {
    flex: 1,
    backgroundColor: COLORS.accent + '20',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  shareReplayText: {
    color: COLORS.accent,
    fontSize: 14,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
  },
  closeButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  closeButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: FONTS.display,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
});

export default ReplayViewer;
