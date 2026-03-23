import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, MODE_CONFIGS } from '../constants';
import { puzzleReferenceTheme } from '../theme/puzzleReferenceTheme';
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

const headerTheme = puzzleReferenceTheme.header;

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

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scoreAnim, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.spring(scoreAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [score, scoreAnim]);

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

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
          style={[StyleSheet.absoluteFillObject, { borderRadius: headerTheme.cardRadius }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'transparent'] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glassEdge}
        />
        <View
          style={[
            styles.chromeGlow,
            { backgroundColor: `${modeConfig.color}${headerTheme.chromeGlow.opacitySuffix}` },
          ]}
        />

        <View style={styles.topRow}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.btnPressed]}
            onPress={onBack}
          >
            <LinearGradient
              colors={headerTheme.buttonGradient as [string, string]}
              style={[StyleSheet.absoluteFillObject, { borderRadius: headerTheme.buttonRadius + 2 }]}
            />
            <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
          </Pressable>

          <View style={styles.centerBlock}>
            <View style={[styles.modeBadge, { borderColor: `${modeConfig.color}55` }]}>
              <Text style={styles.modeIcon}>{modeConfig.icon}</Text>
              <Text style={styles.modeText}>{modeLabel}</Text>
              <View style={styles.progressDivider} />
              <Text style={[styles.progressCount, { color: modeConfig.color }]}>
                {foundWords}/{totalWords}
              </Text>
            </View>
          </View>

          <View style={styles.scoreBlock}>
            <Animated.Text style={[styles.scoreValue, { transform: [{ scale: scoreAnim }] }]}>
              {score.toLocaleString()}
            </Animated.Text>
            {combo > 1 && (
              <View style={styles.comboChip}>
                <Text style={styles.comboTag}>{combo}x</Text>
              </View>
            )}
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
                <LinearGradient
                  colors={headerTheme.actionGradient as [string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: headerTheme.buttonRadius + 2 }]}
                />
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
                  colors={headerTheme.hintGradient as [string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: headerTheme.buttonRadius + 2 }]}
                />
                {hintsLeft > 0 && <View style={styles.hintGlow} />}
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

        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth as any, backgroundColor: modeConfig.color }]}
          >
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
    borderRadius: headerTheme.cardRadius,
    borderWidth: headerTheme.cardBorderWidth,
    borderColor: headerTheme.cardBorderColor,
    paddingHorizontal: headerTheme.paddingHorizontal,
    paddingTop: headerTheme.paddingTop,
    paddingBottom: headerTheme.paddingBottom,
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
    height: headerTheme.glassEdgeHeight,
    borderTopLeftRadius: headerTheme.cardRadius,
    borderTopRightRadius: headerTheme.cardRadius,
  },
  chromeGlow: {
    position: 'absolute',
    width: headerTheme.chromeGlow.size,
    height: headerTheme.chromeGlow.size,
    borderRadius: headerTheme.chromeGlow.radius,
    right: headerTheme.chromeGlow.right,
    top: headerTheme.chromeGlow.top,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButton: {
    width: headerTheme.buttonSize,
    height: headerTheme.buttonSize,
    borderRadius: headerTheme.buttonRadius,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: headerTheme.buttonBorderColor,
    overflow: 'hidden',
  },
  centerBlock: {
    flex: 1,
    overflow: 'hidden',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: headerTheme.modeBadge.gap,
    borderRadius: headerTheme.modeBadge.borderRadius,
    paddingHorizontal: headerTheme.modeBadge.paddingHorizontal,
    paddingVertical: headerTheme.modeBadge.paddingVertical,
    backgroundColor: headerTheme.modeBadge.backgroundColor,
    borderWidth: 1,
    alignSelf: 'flex-start',
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
    backgroundColor: headerTheme.modeBadge.dividerColor,
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
    color: headerTheme.score.color,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: headerTheme.score.glowColor,
    textShadowRadius: 14,
  },
  comboChip: {
    backgroundColor: headerTheme.comboChip.backgroundColor,
    borderRadius: headerTheme.comboChip.borderRadius,
    paddingHorizontal: headerTheme.comboChip.paddingHorizontal,
    paddingVertical: headerTheme.comboChip.paddingVertical,
    borderWidth: 1,
    borderColor: headerTheme.comboChip.borderColor,
    marginBottom: headerTheme.comboChip.marginBottom,
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
    width: headerTheme.buttonSize,
    height: headerTheme.buttonSize,
    borderRadius: headerTheme.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: headerTheme.buttonBorderColor,
    overflow: 'visible',
  },
  hintButton: {
    borderColor: headerTheme.hintBorderColor,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  hintGlow: {
    position: 'absolute',
    top: headerTheme.hintGlow.top,
    left: headerTheme.hintGlow.horizontalInset as unknown as number,
    right: headerTheme.hintGlow.horizontalInset as unknown as number,
    height: headerTheme.hintGlow.height,
    backgroundColor: headerTheme.hintGlow.backgroundColor,
    borderRadius: headerTheme.hintGlow.radius,
  },
  actionDisabled: {
    opacity: 0.3,
  },
  countBadge: {
    position: 'absolute',
    top: headerTheme.countBadge.top,
    right: headerTheme.countBadge.right,
    backgroundColor: headerTheme.countBadge.backgroundColor,
    borderRadius: headerTheme.countBadge.radius,
    minWidth: headerTheme.countBadge.minWidth,
    height: headerTheme.countBadge.height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: headerTheme.countBadge.paddingHorizontal,
    shadowColor: headerTheme.countBadge.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
  },
  hintCountBadge: {
    backgroundColor: headerTheme.hintCountBadge.backgroundColor,
    shadowColor: headerTheme.hintCountBadge.shadowColor,
  },
  countBadgeText: {
    color: COLORS.bg,
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  progressTrack: {
    height: headerTheme.progress.trackHeight,
    borderRadius: 999,
    backgroundColor: headerTheme.progress.trackColor,
    overflow: 'visible',
    marginTop: headerTheme.progress.marginTop,
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
    height: headerTheme.progress.shimmerHeight,
    backgroundColor: headerTheme.progress.shimmerColor,
    borderRadius: 999,
  },
  progressGlowDot: {
    position: 'absolute',
    top: headerTheme.progress.glowDotOffset,
    width: headerTheme.progress.glowDotSize,
    height: headerTheme.progress.glowDotSize,
    borderRadius: headerTheme.progress.glowDotSize / 2,
    marginLeft: headerTheme.progress.glowDotMarginLeft,
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
