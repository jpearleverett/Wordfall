import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, interpolate } from 'react-native-reanimated';
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
  themeColors?: {
    bg: string;
    surface: string;
    accent: string;
    cellSelected: string;
  };
  onHint: () => void;
  onUndo: () => void;
  onBack: () => void;
}

export const GameHeader = React.memo(function GameHeader({
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
  themeColors,
  onHint,
  onUndo,
  onBack,
}: GameHeaderProps) {
  const insets = useSafeAreaInsets();
  const modeConfig = MODE_CONFIGS[mode];
  const accentColor = themeColors?.accent ?? COLORS.accent;
  const surfaceColor = themeColors?.surface ?? '#1a0a2e';
  const bgColor = themeColors?.bg ?? '#0a0015';
  const selectedColor = themeColors?.cellSelected ?? accentColor;
  const modeLabel = isDaily ? 'Daily' : mode !== 'classic' ? modeConfig.name : `Lv ${level}`;
  const progress = totalWords > 0 ? (foundWords / totalWords) * 100 : 0;
  const scoreScale = useSharedValue(1);
  const progressValue = useSharedValue(0);

  // Animate score pop on change
  useEffect(() => {
    scoreScale.value = withSequence(
      withTiming(1.15, { duration: 80 }),
      withSpring(1, { damping: 8 }),
    );
  }, [score]);

  // Animate progress bar smoothly — Reanimated handles layout props on UI thread
  useEffect(() => {
    progressValue.value = withSpring(progress, { damping: 16, stiffness: 60 });
  }, [progress]);

  const scoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progressValue.value, [0, 100], [0, 100])}%`,
  }));

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 6) + 4 }]}>
      <View style={styles.chromeCard}>
        <LinearGradient
          colors={[surfaceColor, bgColor] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
        />
        {/* Glass top edge highlight */}
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)', 'transparent'] as [string, string, string]}
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
            accessibilityLabel="Go back"
            accessibilityHint="Return to the home screen"
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
                {progress > 0 && (
                  <View style={[styles.batteryFill, { width: `${progress}%` }]} />
                )}
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
          <View style={styles.scoreBlock} accessibilityLabel={`Current score: ${score}`}>
            <Animated.Text
              style={[
                styles.scoreValue,
                scoreStyle,
                  { color: accentColor, textShadowColor: `${accentColor}AA` },
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
                accessibilityLabel="Undo last move"
                accessibilityHint={undosLeft > 0 ? `${undosLeft} undos remaining` : 'No undos remaining'}
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
                  { borderColor: `${selectedColor}45` },
                ]}
                onPress={onHint}
                disabled={hintsLeft <= 0}
                accessibilityLabel="Use hint"
                accessibilityHint="Reveals the next word to find"
              >
                <LinearGradient
                  colors={[`${selectedColor}33`, `${selectedColor}14`] as [string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 13 }]}
                />
                {/* Glow beam from bulb */}
                {hintsLeft > 0 && (
                  <View style={[styles.hintGlow, { backgroundColor: `${selectedColor}44` }]} />
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
          <Animated.View style={[styles.progressFill, progressBarStyle, { backgroundColor: selectedColor }]}>
            {/* Shimmer on progress fill */}
            <View style={styles.progressShimmer} />
          </Animated.View>
          {/* Glow dot at progress tip — hidden when no progress */}
          {progress > 0 && (
            <Animated.View
              style={[
                styles.progressGlowDot,
                {
                  left: `${progress}%` as any,
                  backgroundColor: selectedColor,
                  shadowColor: selectedColor,
                },
              ]}
            />
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 4,
  },
  chromeCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(200,77,255,0.25)',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 18,
  },
  glassEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  chromeGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -55,
    top: -70,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  },
  batteryContainer: {
    position: 'relative',
    width: 180,
    height: 50,
    marginLeft: -2,
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
    opacity: 0.80,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
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
    color: COLORS.accent,
    fontSize: 19,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 18,
  },
  comboChip: {
    backgroundColor: 'rgba(255, 82, 82, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.40)',
    marginBottom: 2,
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  comboTag: {
    color: COLORS.coral,
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  actionButton: {
    width: 40,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 77, 255, 0.30)',
    overflow: 'visible',
    backgroundColor: 'rgba(26, 10, 46, 0.7)',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  hintButton: {
    borderColor: 'rgba(255, 184, 0, 0.40)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  hintGlow: {
    position: 'absolute',
    top: -8,
    left: '20%' as unknown as number,
    right: '20%' as unknown as number,
    height: 16,
    backgroundColor: 'rgba(255, 184, 0, 0.18)',
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
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    top: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.8,
  },
});
