import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, MODE_CONFIGS } from '../constants';
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
  const modeLabel = isDaily ? 'Daily' : `Lv ${level}`;
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
          <View style={styles.centerBlock}>
            <View style={styles.batteryContainer}>
              {/* Battery shell */}
              <Image source={LOCAL_IMAGES.iconBattery} style={styles.batteryShell} resizeMode="contain" />
              {/* Battery fill (width proportional to progress) */}
              <View style={styles.batteryFillContainer}>
                {progress > 0 && (
                  <View style={[styles.batteryFill, { width: `${progress}%` }]} />
                )}
              </View>
              {/* Label overlay */}
              <View style={styles.batteryLabelOverlay}>
                <Text style={styles.batteryText}>{modeLabel}</Text>
                <View style={styles.progressDivider} />
                <Text style={styles.progressCount}>
                  {foundWords}/{totalWords}
                </Text>
              </View>
            </View>
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
                  colors={['rgba(20, 42, 70, 0.84)', 'rgba(10, 22, 44, 0.9)'] as [string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
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
                  colors={['rgba(20, 42, 70, 0.84)', 'rgba(10, 22, 44, 0.9)'] as [string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
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
          {/* Glow dot at progress tip — hidden when no progress */}
          {progress > 0 && (
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
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 2,
  },
  chromeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(140, 220, 255, 0.34)',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    overflow: 'visible',
    shadowColor: '#6be8ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  glassEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
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
    gap: 10,
    justifyContent: 'space-between',
  },
  centerBlock: {
    flex: 1,
  },
  batteryContainer: {
    position: 'relative',
    width: 210,
    height: 64,
    marginLeft: -2,
  },
  batteryShell: {
    position: 'absolute',
    width: 210,
    height: 64,
  },
  batteryFillContainer: {
    position: 'absolute',
    top: 16,
    left: 12,
    width: 178,
    height: 34,
    borderRadius: 12,
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
    gap: 10,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  batteryText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
  },
  progressDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.24)',
    marginHorizontal: 2,
  },
  progressCount: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#f4f5ff',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexShrink: 0,
  },
  actionButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(102, 238, 255, 0.7)',
    overflow: 'visible',
    backgroundColor: 'rgba(5, 24, 48, 0.65)',
  },
  hintButton: {
    borderColor: 'rgba(102, 238, 255, 0.7)',
    shadowColor: '#5be7ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
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
    backgroundColor: '#190a2f',
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
    borderWidth: 2,
    borderColor: '#f344ff',
    shadowColor: '#f344ff',
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
    color: '#fff',
    fontSize: 17,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  progressTrack: {
    height: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(57, 20, 90, 0.7)',
    borderWidth: 1.4,
    borderColor: 'rgba(245, 92, 255, 0.9)',
    overflow: 'visible',
    marginTop: 8,
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
    height: 5,
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
