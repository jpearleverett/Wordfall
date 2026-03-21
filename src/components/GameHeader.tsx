import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, MODE_CONFIGS, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '../constants';
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
  const modeLabel = isDaily ? 'Daily Rift' : mode !== 'classic' ? modeConfig.name : `Level ${level}`;
  const progress = totalWords > 0 ? foundWords / totalWords : 0;
  const assistLabel = modeConfig.rules.allowHints ? `${hintsLeft} hints` : 'No hints';
  const undoLabel = modeConfig.rules.allowUndo
    ? modeConfig.rules.unlimitedUndo ? '∞ undo' : `${undosLeft} undo`
    : 'No undo';

  return (
    <View style={styles.shell}>
      <LinearGradient colors={GRADIENTS.panel} style={styles.container}>
        <View style={styles.topRow}>
          <Pressable style={styles.iconButton} onPress={onBack}>
            <Text style={styles.iconButtonText}>‹</Text>
          </Pressable>

          <View style={styles.titleBlock}>
            <View style={styles.modePill}>
              <Text style={styles.modeIcon}>{modeConfig.icon}</Text>
              <Text style={styles.modeText}>{modeLabel.toUpperCase()}</Text>
            </View>
            <Text style={styles.subtitle}>{foundWords}/{totalWords} words claimed</Text>
          </View>

          <LinearGradient colors={GRADIENTS.gold} style={styles.scoreBadge}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </LinearGradient>
        </View>

        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[modeConfig.color || COLORS.accent, COLORS.accentStrong]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.progressFill, { width: `${Math.max(progress * 100, 8)}%` }]}
          />
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.statusRow}>
            {combo > 1 ? (
              <View style={[styles.metricPill, styles.metricHot]}>
                <Text style={styles.metricLabel}>Chain</Text>
                <Text style={styles.metricValue}>{combo}×</Text>
              </View>
            ) : (
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Moves</Text>
                <Text style={styles.metricValue}>{moves}{maxMoves > 0 ? `/${maxMoves}` : ''}</Text>
              </View>
            )}
            {mode === 'cascade' && cascadeMultiplier > 1 ? (
              <View style={[styles.metricPill, styles.metricGold]}>
                <Text style={styles.metricLabel}>Gravity</Text>
                <Text style={styles.metricValue}>{cascadeMultiplier.toFixed(1)}×</Text>
              </View>
            ) : timeRemaining > 0 ? (
              <View style={[styles.metricPill, styles.metricGold]}>
                <Text style={styles.metricLabel}>Time</Text>
                <Text style={styles.metricValue}>{timeRemaining}s</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            {modeConfig.rules.allowUndo && (
              <Pressable
                style={[styles.actionButton, undosLeft <= 0 && styles.actionDisabled]}
                onPress={onUndo}
                disabled={undosLeft <= 0}
              >
                <Text style={styles.actionIcon}>↺</Text>
                <Text style={styles.actionText}>{undoLabel}</Text>
              </Pressable>
            )}
            {modeConfig.rules.allowHints && (
              <Pressable
                style={[styles.actionButton, styles.actionButtonHint, hintsLeft <= 0 && styles.actionDisabled]}
                onPress={onHint}
                disabled={hintsLeft <= 0}
              >
                <Text style={styles.actionIcon}>✦</Text>
                <Text style={styles.actionText}>{assistLabel}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  container: {
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconButtonText: {
    color: COLORS.textPrimary,
    fontSize: 28,
    lineHeight: 28,
    fontFamily: TYPOGRAPHY.display,
  },
  titleBlock: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  modePill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  modeIcon: {
    fontSize: 14,
  },
  modeText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    letterSpacing: 1.8,
    fontFamily: TYPOGRAPHY.display,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 6,
    fontFamily: TYPOGRAPHY.ui,
  },
  scoreBadge: {
    minWidth: 82,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  scoreLabel: {
    color: COLORS.textOnAccent,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    opacity: 0.72,
    fontFamily: TYPOGRAPHY.ui,
  },
  scoreValue: {
    color: COLORS.textOnAccent,
    fontSize: 20,
    fontFamily: TYPOGRAPHY.display,
  },
  progressTrack: {
    height: 10,
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADII.pill,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  statusRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  metricPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    minWidth: 76,
  },
  metricHot: {
    borderWidth: 1,
    borderColor: COLORS.coral,
    backgroundColor: 'rgba(255,124,114,0.14)',
  },
  metricGold: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,207,90,0.14)',
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    fontFamily: TYPOGRAPHY.ui,
  },
  metricValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    marginTop: 2,
    fontFamily: TYPOGRAPHY.display,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexShrink: 1,
  },
  actionButton: {
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceGlassStrong,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  actionButtonHint: {
    borderColor: 'rgba(255,207,90,0.42)',
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionIcon: {
    color: COLORS.accentStrong,
    fontSize: 12,
    marginBottom: 2,
  },
  actionText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontFamily: TYPOGRAPHY.ui,
  },
});
