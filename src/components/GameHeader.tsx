import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, MODE_CONFIGS } from '../constants';
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
  const modeLabel = isDaily ? 'Daily' : mode !== 'classic' ? modeConfig.name : `Lv ${level}`;
  const progress = totalWords > 0 ? (foundWords / totalWords) * 100 : 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.chromeCard}>
        <LinearGradient
          colors={GRADIENTS.header as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
        />
        {/* Subtle mode-colored glow */}
        <View style={[styles.chromeGlow, { backgroundColor: `${modeConfig.color}18` }]} />

        <View style={styles.topRow}>
          {/* Back button */}
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.btnPressed]}
            onPress={onBack}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>

          {/* Center: mode + progress */}
          <View style={styles.centerBlock}>
            <View style={[styles.modeBadge, { borderColor: `${modeConfig.color}44` }]}>
              <Text style={styles.modeIcon}>{modeConfig.icon}</Text>
              <Text style={styles.modeText}>{modeLabel}</Text>
              <Text style={styles.progressCount}>{foundWords}/{totalWords}</Text>
            </View>
          </View>

          {/* Score */}
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
            {combo > 1 && (
              <Text style={styles.comboTag}>{combo}x</Text>
            )}
          </View>

          {/* Action buttons */}
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
                {undosLeft > 0 && !modeConfig.rules.unlimitedUndo && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{undosLeft}</Text>
                  </View>
                )}
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
                {hintsLeft > 0 && (
                  <View style={[styles.countBadge, styles.hintCountBadge]}>
                    <Text style={styles.countBadgeText}>{hintsLeft}</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Thin progress bar at bottom */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: modeConfig.color }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 4,
  },
  chromeCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  chromeGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    right: -40,
    top: -50,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  centerBlock: {
    flex: 1,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  modeIcon: {
    fontSize: 13,
  },
  modeText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  progressCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  scoreBlock: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    alignSelf: 'center',
  },
  scoreValue: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 10,
  },
  comboTag: {
    color: COLORS.coral,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hintButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  actionDisabled: {
    opacity: 0.35,
  },
  actionIcon: {
    fontSize: 16,
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  hintCountBadge: {
    backgroundColor: COLORS.gold,
  },
  countBadgeText: {
    color: COLORS.bg,
    fontSize: 10,
    fontWeight: '900',
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  btnPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.8,
  },
});
