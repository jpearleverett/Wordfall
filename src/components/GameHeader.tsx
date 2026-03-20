import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants';

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
  onHint,
  onUndo,
  onBack,
}: GameHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Top row: back, level info, score */}
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>{'<'}</Text>
        </Pressable>

        <View style={styles.levelInfo}>
          <Text style={styles.levelText}>
            {isDaily ? 'DAILY' : `LEVEL ${level}`}
          </Text>
          <Text style={styles.progressText}>
            {foundWords}/{totalWords} words
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarOuter}>
        <View
          style={[
            styles.progressBarInner,
            { width: `${(foundWords / totalWords) * 100}%` },
          ]}
        />
      </View>

      {/* Bottom row: combo, action buttons */}
      <View style={styles.bottomRow}>
        <View style={styles.comboContainer}>
          {combo > 1 && (
            <Text style={styles.comboText}>
              {combo}x COMBO
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[
              styles.actionButton,
              undosLeft <= 0 && styles.actionDisabled,
            ]}
            onPress={onUndo}
            disabled={undosLeft <= 0}
          >
            <Text style={styles.actionIcon}>↩</Text>
            <Text style={styles.actionCount}>{undosLeft}</Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              styles.hintButton,
              hintsLeft <= 0 && styles.actionDisabled,
            ]}
            onPress={onHint}
            disabled={hintsLeft <= 0}
          >
            <Text style={styles.actionIcon}>💡</Text>
            <Text style={styles.actionCount}>{hintsLeft}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  levelInfo: {
    alignItems: 'center',
  },
  levelText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  scoreValue: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: '800',
  },
  progressBarOuter: {
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  comboContainer: {
    minHeight: 24,
    justifyContent: 'center',
  },
  comboText: {
    color: COLORS.coral,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    gap: 4,
  },
  hintButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionCount: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
