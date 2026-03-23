import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, MODE_CONFIGS, FONTS } from '../constants';
import { Ionicons } from '@expo/vector-icons';
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
  const insets = useSafeAreaInsets();
  const modeConfig = MODE_CONFIGS[mode];
  const modeLabel = isDaily ? 'Daily' : mode !== 'classic' ? modeConfig.name : `Lv ${level}`;
  const progress = totalWords > 0 ? (foundWords / totalWords) * 100 : 0;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animate score pop on change
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scoreAnim, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.spring(scoreAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [score]);

  // Animate progress bar smoothly
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 6) + 4 }]}>
      <View style={styles.chromeCard}>
        <LinearGradient
          colors={['rgba(31, 23, 83, 0.92)', 'rgba(18, 12, 54, 0.96)', 'rgba(11, 9, 35, 0.98)'] as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.02)', 'transparent'] as [string, string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glassEdge}
        />
        <View style={styles.outerChrome} />
        <View style={[styles.chromeGlow, { backgroundColor: `${modeConfig.color}20` }]} />

        <View style={styles.topRow}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.btnPressed]}
            onPress={onBack}
          >
            <LinearGradient
              colors={['rgba(116, 146, 255, 0.28)', 'rgba(34, 30, 88, 0.94)', 'rgba(14, 13, 48, 0.98)'] as [string, string, string]}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 13 }]}
            />
            <View style={styles.buttonInnerStroke} />
            <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
          </Pressable>

          <View style={styles.centerBlock}>
            <View style={[styles.modeBadge, { borderColor: `${modeConfig.color}55` }]}>
              <LinearGradient
                colors={['rgba(137, 255, 255, 0.88)', 'rgba(41, 211, 255, 0.65)', 'rgba(20, 118, 198, 0.35)'] as [string, string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modeBatteryCapLeft}
              />
              <View style={styles.modeBatteryCapRight} />
              <Text style={styles.modeIcon}>{modeConfig.icon}</Text>
              <Text style={styles.modeText}>{modeLabel}</Text>
              <View style={styles.progressDivider} />
              <Text style={[styles.progressCount, { color: modeConfig.color }]}>
                {foundWords}/{totalWords}
              </Text>
            </View>
          </View>

          {/* Score with animated pop */}
          <View style={styles.scoreBlock}>
            <View style={styles.scoreBeam} />
            <Animated.Text
              style={[
                styles.scoreValue,
                { transform: [{ scale: scoreAnim }] },
              ]}
            >
              {score.toLocaleString()}
            </Animated.Text>
            {combo > 1 && (
              <View style={styles.comboChip}>
                <Text style={styles.comboTag}>{combo}x</Text>
              </View>
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
                <LinearGradient
                  colors={['rgba(113, 139, 252, 0.24)', 'rgba(35, 30, 89, 0.94)', 'rgba(11, 10, 38, 0.98)'] as [string, string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 13 }]}
                />
                <View style={styles.buttonInnerStroke} />
                <Ionicons name="arrow-undo" size={18} color={COLORS.textPrimary} />
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
                <LinearGradient
                  colors={['rgba(75, 41, 103, 0.96)', 'rgba(30, 24, 72, 0.98)', 'rgba(11, 10, 38, 0.98)'] as [string, string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 13 }]}
                />
                <View style={[styles.buttonInnerStroke, styles.hintInnerStroke]} />
                {hintsLeft > 0 && (
                  <View style={styles.hintGlow} />
                )}
                <Ionicons name="bulb" size={18} color={COLORS.gold} />
                {hintsLeft > 0 && (
                  <View style={[styles.countBadge, styles.hintCountBadge]}>
                    <Text style={styles.countBadgeText}>{hintsLeft}</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Animated progress bar */}
        <View style={styles.progressTrack}>
          <View style={styles.progressTrackInner} />
          <Animated.View style={[styles.progressFill, { width: progressWidth as any, backgroundColor: modeConfig.color }]}>
            <View style={styles.progressShimmer} />
          </Animated.View>
          <Animated.View
            style={[
              styles.progressGlowDot,
              {
                left: progressWidth as any,
                backgroundColor: modeConfig.color,
                shadowColor: modeConfig.color,
              },
            ]}
          />
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
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(149, 173, 255, 0.22)',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 14,
  },
  outerChrome: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  glassEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  chromeGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    right: -50,
    top: -60,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(180, 220, 255, 0.22)',
    overflow: 'hidden',
    shadowColor: 'rgba(105, 157, 255, 0.55)',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  buttonInnerStroke: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  hintInnerStroke: {
    borderColor: 'rgba(255, 112, 255, 0.28)',
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  centerBlock: {
    flex: 1,
    overflow: 'hidden',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(22, 18, 74, 0.62)',
    borderWidth: 1.1,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    shadowColor: '#75edff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  modeBatteryCapLeft: {
    position: 'absolute',
    left: 5,
    top: 4,
    bottom: 4,
    width: 22,
    borderRadius: 6,
  },
  modeBatteryCapRight: {
    position: 'absolute',
    right: -4,
    top: 11,
    width: 6,
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(175, 200, 255, 0.45)',
  },
  modeIcon: {
    fontSize: 12,
  },
  modeText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  progressDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: 2,
  },
  progressCount: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  scoreBlock: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    alignSelf: 'center',
    flexShrink: 0,
    position: 'relative',
    minWidth: 34,
    justifyContent: 'center',
  },
  scoreBeam: {
    position: 'absolute',
    bottom: -7,
    left: '50%',
    marginLeft: -16,
    width: 32,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(120, 245, 255, 0.28)',
    shadowColor: '#7cf3ff',
    shadowOpacity: 0.85,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  scoreValue: {
    color: '#79f0ff',
    fontSize: 26,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: 'rgba(121, 240, 255, 0.85)',
    textShadowRadius: 16,
  },
  comboChip: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    marginBottom: 2,
  },
  comboTag: {
    color: COLORS.coral,
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(180, 220, 255, 0.18)',
    overflow: 'visible',
  },
  hintButton: {
    borderColor: 'rgba(255, 132, 249, 0.45)',
    shadowColor: 'rgba(255, 95, 238, 0.9)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  hintGlow: {
    position: 'absolute',
    top: -4,
    left: 6,
    right: 6,
    height: 14,
    backgroundColor: 'rgba(255, 112, 240, 0.22)',
    borderRadius: 8,
  },
  actionDisabled: {
    opacity: 0.3,
  },
  actionIcon: {
    fontSize: 16,
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#43f1ff',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
  },
  hintCountBadge: {
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
  },
  countBadgeText: {
    color: '#16203d',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(112, 110, 180, 0.2)',
    overflow: 'visible',
    marginTop: 10,
    position: 'relative',
  },
  progressTrackInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#62f5ff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 999,
  },
  progressGlowDot: {
    position: 'absolute',
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.8,
  },
});
