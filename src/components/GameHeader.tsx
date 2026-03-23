import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, MODE_CONFIGS, FONTS } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { GameMode } from '../types';
import { LOCAL_IMAGES } from '../utils/localAssets';

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
          colors={GRADIENTS.header as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
        />
        {/* Glass top edge highlight */}
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'transparent'] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glassEdge}
        />
        {/* Mode-colored ambient glow */}
        <View style={[styles.chromeGlow, { backgroundColor: `${modeConfig.color}20` }]} />

        <View style={styles.topRow}>
          {/* Back button with glass effect */}
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.btnPressed]}
            onPress={onBack}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] as [string, string]}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 13 }]}
            />
            <Image source={LOCAL_IMAGES.iconBack} style={{ width: 20, height: 20 }} resizeMode="contain" />
          </Pressable>

          {/* Center: battery progress indicator */}
          <View style={styles.centerBlock}>
            <View style={styles.batteryContainer}>
              {/* Battery shell */}
              <Image source={LOCAL_IMAGES.iconBattery} style={styles.batteryShell} resizeMode="contain" />
              {/* Battery fill (width proportional to progress) */}
              <View style={styles.batteryFillContainer}>
                <View style={[styles.batteryFill, { width: `${Math.max(progress, 4)}%` }]} />
              </View>
              {/* Label overlay */}
              <View style={styles.batteryLabelOverlay}>
                <Text style={styles.modeIcon}>{modeConfig.icon}</Text>
                <Text style={styles.batteryText}>{modeLabel}</Text>
                <View style={styles.progressDivider} />
                <Text style={[styles.progressCount, { color: modeConfig.color }]}>
                  {foundWords}/{totalWords}
                </Text>
              </View>
            </View>
          </View>

          {/* Score with animated pop */}
          <View style={styles.scoreBlock}>
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
                  colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as [string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 13 }]}
                />
                <Image source={LOCAL_IMAGES.iconUndo} style={{ width: 18, height: 18 }} resizeMode="contain" />
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
                  colors={['rgba(255,215,0,0.18)', 'rgba(255,215,0,0.06)'] as [string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 13 }]}
                />
                {/* Glow beam from bulb */}
                {hintsLeft > 0 && (
                  <View style={styles.hintGlow} />
                )}
                <Image source={LOCAL_IMAGES.iconHint} style={{ width: 22, height: 22 }} resizeMode="contain" />
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
          <Animated.View style={[styles.progressFill, { width: progressWidth as any, backgroundColor: modeConfig.color }]}>
            {/* Shimmer on progress fill */}
            <View style={styles.progressShimmer} />
          </Animated.View>
          {/* Glow dot at progress tip */}
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
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
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
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
  batteryContainer: {
    position: 'relative',
    width: 180,
    height: 50,
    alignSelf: 'flex-start',
  },
  batteryShell: {
    position: 'absolute',
    width: 180,
    height: 50,
  },
  batteryFillContainer: {
    position: 'absolute',
    top: 8,
    left: 10,
    width: 140,
    height: 34,
    borderRadius: 6,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 5,
    opacity: 0.75,
  },
  batteryLabelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingRight: 12,
  },
  batteryText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
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
    backgroundColor: 'rgba(255,255,255,0.12)',
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
  },
  scoreValue: {
    color: COLORS.gold,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 14,
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
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'visible',
  },
  hintButton: {
    borderColor: 'rgba(255, 215, 0, 0.35)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  hintGlow: {
    position: 'absolute',
    top: -8,
    left: '20%' as unknown as number,
    right: '20%' as unknown as number,
    height: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
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
    backgroundColor: COLORS.accent,
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
    color: COLORS.bg,
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'visible',
    marginTop: 10,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
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
