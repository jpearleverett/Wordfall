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
  const progress = totalWords > 0 ? foundWords / totalWords : 0;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(progress)).current;
  const scanlineAnim = useRef(new Animated.Value(0)).current;

  void combo;
  void moves;
  void isDaily;
  void maxMoves;
  void timeRemaining;
  void cascadeMultiplier;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scoreAnim, { toValue: 1.12, duration: 90, useNativeDriver: true }),
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
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const scanlineTranslate = scanlineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 320],
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
        </Pressable>

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
      </View>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth as any, backgroundColor: modeConfig.color }]}
          >
            <View style={styles.progressShimmer} />
          </Animated.View>
          <Animated.View
            style={[
              styles.scanlineNode,
              {
                left: progressWidth as any,
                backgroundColor: modeConfig.color,
                shadowColor: modeConfig.color,
                opacity: progress > 0 ? 1 : 0.45,
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
    paddingBottom: 8,
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
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  backBezel: {
    borderRadius: 18,
  },
  backInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: headerTheme.glassEdgeHeight,
    borderTopLeftRadius: headerTheme.cardRadius,
    borderTopRightRadius: headerTheme.cardRadius,
  },
  backCore: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backCoreFill: {
    borderRadius: 15,
  },
  chevronWrap: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -2,
  },
  chevronStroke: {
    position: 'absolute',
    width: headerTheme.chromeGlow.size,
    height: headerTheme.chromeGlow.size,
    borderRadius: headerTheme.chromeGlow.radius,
    right: headerTheme.chromeGlow.right,
    top: headerTheme.chromeGlow.top,
  },
  chevronTop: {
    transform: [{ rotate: '-45deg' }, { translateX: -2 }, { translateY: -4 }],
  },
  chevronBottom: {
    transform: [{ rotate: '45deg' }, { translateX: -2 }, { translateY: 4 }],
  },
  levelModule: {
    flex: 1,
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(126, 160, 212, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },
  levelModuleFill: {
    borderRadius: 28,
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
    transform: [{ skewY: '-8deg' }],
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
    borderColor: 'rgba(255,255,255,0.25)',
  },
  levelCopy: {
    justifyContent: 'center',
    gap: 2,
  },
  levelLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.display,
    letterSpacing: 0.3,
  },
  levelModeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  levelDivider: {
    width: 1,
    height: 12,
    backgroundColor: headerTheme.modeBadge.dividerColor,
    marginHorizontal: 2,
  },
  levelProgressCopy: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  levelProgressLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
  },
  levelProgressValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.display,
  },
  scoreModule: {
    width: 108,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },
  scoreModuleFill: {
    borderRadius: 18,
  },
  scorePedestal: {
    position: 'absolute',
    bottom: 6,
    width: 72,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 203, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(17, 203, 255, 0.22)',
  },
  scoreHologram: {
    position: 'absolute',
    top: 10,
    width: 64,
    height: 26,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  scoreCaption: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.4,
    marginTop: 2,
  },
  scoreValue: {
    color: headerTheme.score.color,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: headerTheme.score.glowColor,
    textShadowRadius: 14,
    marginTop: 1,
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
    gap: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },
  hintButton: {
    borderColor: headerTheme.hintBorderColor,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  actionModuleSheen: {
    position: 'absolute',
    top: headerTheme.hintGlow.top,
    left: headerTheme.hintGlow.horizontalInset as unknown as number,
    right: headerTheme.hintGlow.horizontalInset as unknown as number,
    height: headerTheme.hintGlow.height,
    backgroundColor: headerTheme.hintGlow.backgroundColor,
    borderRadius: headerTheme.hintGlow.radius,
  },
  actionDisabled: {
    opacity: 0.35,
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
  cyanBadgeText: {
    color: COLORS.bg,
    fontSize: 10,
    fontFamily: FONTS.display,
  },
  progressTrack: {
    height: headerTheme.progress.trackHeight,
    borderRadius: 999,
    backgroundColor: headerTheme.progress.trackColor,
    overflow: 'visible',
    marginTop: headerTheme.progress.marginTop,
    position: 'relative',
  },
  hintCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffe673',
    borderWidth: 1,
    borderColor: '#fff6b4',
    shadowColor: '#ffe673',
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  hintStem: {
    position: 'absolute',
    bottom: 3,
    width: 8,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ffc84a',
  },
  hintSparkLeft: {
    position: 'absolute',
    left: 3,
    top: 7,
    width: 5,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#fff6b4',
    transform: [{ rotate: '-34deg' }],
  },
  hintSparkRight: {
    position: 'absolute',
    right: 3,
    top: 7,
    width: 5,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#fff6b4',
    transform: [{ rotate: '34deg' }],
  },
  hintSparkTop: {
    position: 'absolute',
    top: 1,
    width: 2,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#fff6b4',
  },
  undoGlyph: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  undoArrowHead: {
    position: 'absolute',
    left: 3,
    top: 8,
    width: 9,
    height: 9,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#a6f0ff',
    transform: [{ rotate: '45deg' }],
  },
  undoArc: {
    position: 'absolute',
    right: 3,
    top: 5,
    width: 14,
    height: 14,
    borderWidth: 3,
    borderColor: '#a6f0ff',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRadius: 10,
    transform: [{ rotate: '-20deg' }],
  },
  undoTail: {
    position: 'absolute',
    left: 8,
    top: 7,
    width: 9,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#a6f0ff',
  },
  scanlineWrap: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  scanlineTrack: {
    height: 14,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  scanlineRail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: headerTheme.progress.shimmerHeight,
    backgroundColor: headerTheme.progress.shimmerColor,
    borderRadius: 999,
    backgroundColor: 'rgba(110,140,190,0.18)',
  },
  scanlineFill: {
    position: 'absolute',
    top: headerTheme.progress.glowDotOffset,
    width: headerTheme.progress.glowDotSize,
    height: headerTheme.progress.glowDotSize,
    borderRadius: headerTheme.progress.glowDotSize / 2,
    marginLeft: headerTheme.progress.glowDotMarginLeft,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  scanlinePulse: {
    position: 'absolute',
    width: 110,
    height: 10,
    borderRadius: 999,
  },
  scanlineNode: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 8,
  },
  btnPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
});
