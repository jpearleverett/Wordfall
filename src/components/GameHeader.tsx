import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, MODE_CONFIGS } from '../constants';
import { GameMode } from '../types';

interface GameHeaderProps {
  level: number;
  score: number;
  combo: number;
  moves: number;
  hintsLeft: number;
  undosLeft: number;
  foundWords: number;
  totalWords: number;
  isDaily?: boolean;
  mode?: GameMode;
  maxMoves?: number;
  timeRemaining?: number;
  cascadeMultiplier?: number;
  onHint: () => void;
  onUndo: () => void;
  onBack: () => void;
}

export function GameHeader({
  level,
  score,
  combo,
  moves,
  hintsLeft,
  undosLeft,
  foundWords,
  totalWords,
  isDaily,
  mode = 'classic',
  maxMoves = 0,
  timeRemaining = 0,
  cascadeMultiplier = 1,
  onHint,
  onUndo,
  onBack,
}: GameHeaderProps) {
  const modeConfig = MODE_CONFIGS[mode];
  const modeLabel = isDaily ? 'Daily Challenge' : mode !== 'classic' ? modeConfig.name : `Level ${level}`;
  const progress = totalWords > 0 ? (foundWords / totalWords) * 100 : 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.chromeCard}>
        <View style={[styles.chromeGlow, { backgroundColor: `${modeConfig.color}22` }]} />

        <View style={styles.topRow}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.btnPressed]}
            onPress={onBack}
          >
            <Text style={styles.backText}>{'‹'}</Text>
          </Pressable>

          <View style={styles.centerBlock}>
            <View style={[styles.modeBadge, { borderColor: `${modeConfig.color}66`, backgroundColor: `${modeConfig.color}16` }]}>
              <Text style={styles.modeIcon}>{modeConfig.icon}</Text>
              <Text style={styles.modeText}>{modeLabel}</Text>
            </View>
            <Text style={styles.progressCopy}>{foundWords}/{totalWords} target words solved</Text>
          </View>

          <View style={styles.scoreBlock}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: modeConfig.color }]} />
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Text style={styles.metricLabel}>Combo</Text>
            <Text style={[styles.metricValue, combo > 1 && styles.metricValueHot]}>{combo > 1 ? `${combo}x` : '—'}</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricLabel}>{maxMoves > 0 ? 'Moves' : 'Progress'}</Text>
            <Text style={styles.metricValue}>{maxMoves > 0 ? `${moves}/${maxMoves}` : `${Math.round(progress)}%`}</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricLabel}>{mode === 'cascade' ? 'Cascade' : 'Tempo'}</Text>
            <Text style={[styles.metricValue, mode === 'cascade' && styles.metricValueGold]}>
              {mode === 'cascade' ? `${cascadeMultiplier.toFixed(1)}x` : timeRemaining > 0 ? `${timeRemaining}s` : 'Steady'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {modeConfig.rules.allowUndo && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                undosLeft <= 0 && styles.actionDisabled,
                pressed && styles.btnPressed,
              ]}
              onPress={onUndo}
              disabled={undosLeft <= 0}
            >
              <Text style={styles.actionIcon}>↩</Text>
              <View>
                <Text style={styles.actionTitle}>Undo</Text>
                <Text style={styles.actionCount}>{modeConfig.rules.unlimitedUndo ? 'Unlimited' : `${undosLeft} left`}</Text>
              </View>
            </Pressable>
          )}

          {modeConfig.rules.allowHints && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.hintButton,
                hintsLeft <= 0 && styles.actionDisabled,
                pressed && styles.btnPressed,
              ]}
              onPress={onHint}
              disabled={hintsLeft <= 0}
            >
              <Text style={styles.actionIcon}>💡</Text>
              <View>
                <Text style={styles.actionTitle}>Hint</Text>
                <Text style={styles.actionCount}>{hintsLeft} ready</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  chromeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 10,
  },
  chromeGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    right: -50,
    top: -40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginTop: -2,
  },
  centerBlock: {
    flex: 1,
    paddingHorizontal: 12,
  },
  modeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  modeIcon: {
    fontSize: 14,
  },
  modeText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  progressCopy: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  scoreBlock: {
    minWidth: 88,
    alignItems: 'flex-end',
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  scoreValue: {
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.bgLight,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricPill: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  metricValueHot: {
    color: COLORS.coral,
  },
  metricValueGold: {
    color: COLORS.gold,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bgLight,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  hintButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderColor: 'rgba(255, 215, 0, 0.24)',
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  actionCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  btnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.88,
  },
});
