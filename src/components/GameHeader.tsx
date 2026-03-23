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
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 8) + 4 }]}>
      <View style={styles.topRow}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.btnPressed]}
          onPress={onBack}
        >
          <LinearGradient
            colors={['rgba(93,108,183,0.38)', 'rgba(31,35,78,0.92)'] as [string, string]}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 17 }]}
          />
          <View style={styles.chromeOutline} />
          <Ionicons name="chevron-back" size={34} color={COLORS.textPrimary} />
        </Pressable>

        <View style={styles.centerCluster}>
          <View style={styles.modeCapsule}>
            <LinearGradient
              colors={['rgba(108,121,212,0.86)', 'rgba(41, 26, 95, 0.96)', 'rgba(21, 16, 57, 0.98)'] as [string, string, string]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
            />
            <View style={styles.modeTubeCapLeft} />
            <View style={styles.modeTubeCapRight} />
            <Text style={styles.modeIcon}>{modeConfig.icon}</Text>
            <Text style={styles.modeText}>{modeLabel}</Text>
            <View style={styles.progressDivider} />
            <Text style={[styles.progressCount, { color: '#4be9ff' }]}>
              {foundWords}/{totalWords}
            </Text>
          </View>

          <View style={styles.scorePod}>
            <Animated.Text style={[styles.scoreValue, { transform: [{ scale: scoreAnim }] }]}>
              {score.toLocaleString()}
            </Animated.Text>
            <View style={styles.scoreBase} />
            {combo > 1 && (
              <View style={styles.comboChip}>
                <Text style={styles.comboTag}>{combo}x</Text>
              </View>
            )}
          </View>

          <View style={styles.actionsRow}>
            {modeConfig.rules.allowHints && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.purpleButton,
                  hintsLeft <= 0 && styles.actionDisabled,
                  pressed && styles.btnPressed,
                ]}
                onPress={onHint}
                disabled={hintsLeft <= 0}
              >
                <LinearGradient
                  colors={['rgba(242,96,255,0.20)', 'rgba(44,29,79,0.88)'] as [string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 15 }]}
                />
                <Ionicons name="bulb-outline" size={24} color="#ff6ef7" />
                {hintsLeft > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{hintsLeft}</Text>
                  </View>
                )}
              </Pressable>
            )}

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
                  colors={['rgba(116,129,214,0.24)', 'rgba(36,34,80,0.90)'] as [string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 15 }]}
                />
                <Ionicons name="arrow-undo" size={24} color="#ff6ef7" style={styles.undoIcon} />
                {undosLeft > 0 && !modeConfig.rules.unlimitedUndo && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{undosLeft}</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth as any, backgroundColor: '#50efff' }]}>
          <View style={styles.progressShimmer} />
        </Animated.View>
        <Animated.View
          style={[
            styles.progressGlowDot,
            {
              left: progressWidth as any,
              backgroundColor: '#50efff',
              shadowColor: '#50efff',
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  backButton: {
    width: 62,
    height: 62,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.4,
    borderColor: 'rgba(231, 240, 255, 0.46)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  chromeOutline: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  centerCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 2,
  },
  modeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 20,
    paddingLeft: 24,
    paddingRight: 20,
    borderWidth: 1,
    borderColor: 'rgba(227, 239, 255, 0.35)',
    overflow: 'hidden',
    shadowColor: '#41ecff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  modeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  modeText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.2,
  },
  modeTubeCapLeft: {
    position: 'absolute',
    left: 6,
    width: 12,
    top: 4,
    bottom: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(62, 238, 255, 0.84)',
    shadowColor: '#5af2ff',
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  modeTubeCapRight: {
    position: 'absolute',
    right: 5,
    width: 6,
    top: 10,
    bottom: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(129, 129, 216, 0.9)',
  },
  progressDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(223,231,255,0.22)',
    marginHorizontal: 10,
  },
  progressCount: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  scorePod: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
    marginLeft: 'auto',
  },
  scoreValue: {
    color: '#57f2ff',
    fontSize: 52,
    fontFamily: 'SpaceGrotesk_700Bold',
    lineHeight: 58,
    textShadowColor: 'rgba(98, 242, 255, 0.7)',
    textShadowRadius: 24,
  },
  scoreBase: {
    width: 54,
    height: 10,
    borderRadius: 10,
    marginTop: -8,
    backgroundColor: 'rgba(95, 245, 255, 0.20)',
    shadowColor: '#5ff4ff',
    shadowOpacity: 0.65,
    shadowRadius: 12,
  },
  comboChip: {
    position: 'absolute',
    top: 2,
    right: -4,
    backgroundColor: 'rgba(255, 82, 82, 0.26)',
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
    gap: 10,
    marginLeft: 6,
    flexShrink: 0,
  },
  actionButton: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(227, 239, 255, 0.30)',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  purpleButton: {
    shadowColor: '#ff72f4',
    shadowOpacity: 0.35,
  },
  undoIcon: {
    transform: [{ scaleX: -1 }],
  },
  actionDisabled: {
    opacity: 0.3,
  },
  countBadge: {
    position: 'absolute',
    top: -7,
    right: -5,
    backgroundColor: '#34f0ff',
    borderRadius: 16,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(18, 23, 66, 0.9)',
    shadowColor: '#45f3ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  countBadgeText: {
    color: COLORS.bg,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(146, 178, 255, 0.16)',
    overflow: 'visible',
    marginTop: 14,
    marginHorizontal: 10,
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
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 999,
  },
  progressGlowDot: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.8,
  },
});
