import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, MODE_CONFIGS } from '../constants';
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
  hintsLeft,
  undosLeft,
  foundWords,
  totalWords,
  isDaily,
  mode = 'classic',
  onHint,
  onUndo,
  onBack,
}: GameHeaderProps) {
  const insets = useSafeAreaInsets();
  const modeConfig = MODE_CONFIGS[mode];
  const modeLabel = isDaily ? 'Daily' : mode !== 'classic' ? modeConfig.name : `Lv ${level}`;
  const progress = totalWords > 0 ? (foundWords / totalWords) * 100 : 0;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scoreAnim, { toValue: 1.08, duration: 90, useNativeDriver: true }),
      Animated.spring(scoreAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [score, scoreAnim]);

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      friction: 8,
      tension: 55,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.chromeCard}>
        <LinearGradient
          colors={['rgba(25, 18, 65, 0.94)', 'rgba(14, 9, 38, 0.92)'] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.edgeHighlight} />
        <View style={styles.topRow}>
          <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} onPress={onBack}>
            <LinearGradient
              colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)'] as [string, string]}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
            />
            <Ionicons name="chevron-back" size={30} color="#eef2ff" />
          </Pressable>

          <View style={styles.levelSection}>
            <View style={styles.levelCapsule}>
              <LinearGradient
                colors={['#8055ff', '#1a0f47'] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.capsuleGlass} />
              <LinearGradient
                colors={['#7ef7ff', '#30dbff', '#22b8ff'] as [string, string, string]}
                style={styles.capsuleBattery}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              <View style={styles.capsuleSideCapLeft} />
              <View style={styles.capsuleSideCapRight} />
              <Text style={styles.modeIcon}>{modeConfig.icon}</Text>
              <Text style={styles.modeText}>{modeLabel}</Text>
              <View style={styles.progressDivider} />
              <Text style={[styles.progressCount, { color: '#45e9ff' }]}>{foundWords}/{totalWords}</Text>
            </View>
          </View>

          <View style={styles.scoreSection}>
            <Animated.Text style={[styles.scoreValue, { transform: [{ scale: scoreAnim }] }]}>
              {score}
            </Animated.Text>
            <View style={styles.scorePedestal} />
            {combo > 1 && (
              <View style={styles.comboChip}>
                <Text style={styles.comboTag}>{combo}x</Text>
              </View>
            )}
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.iconButton, styles.hintButton, hintsLeft <= 0 && styles.actionDisabled, pressed && styles.pressed]}
              onPress={onHint}
              disabled={hintsLeft <= 0}
            >
              <LinearGradient
                colors={['rgba(255,0,214,0.16)', 'rgba(255,255,255,0.03)'] as [string, string]}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
              />
              <Ionicons name="bulb-outline" size={25} color="#f66cff" />
              {hintsLeft > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{hintsLeft}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.iconButton, undosLeft <= 0 && styles.actionDisabled, pressed && styles.pressed]}
              onPress={onUndo}
              disabled={undosLeft <= 0}
            >
              <LinearGradient
                colors={['rgba(170,75,255,0.16)', 'rgba(255,255,255,0.03)'] as [string, string]}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
              />
              <Ionicons name="arrow-undo" size={25} color="#ff72ff" />
              {undosLeft > 0 && !modeConfig.rules.unlimitedUndo && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{undosLeft}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth as any }]} />
          <Animated.View style={[styles.progressGlowDot, { left: progressWidth as any }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  chromeCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(164, 217, 255, 0.14)',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 18,
  },
  edgeHighlight: {
    position: 'absolute',
    top: 1,
    left: 18,
    right: 18,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.25,
    borderColor: 'rgba(218, 239, 255, 0.18)',
    overflow: 'visible',
    backgroundColor: 'rgba(13, 11, 44, 0.82)',
    shadowColor: '#60edff',
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  levelSection: {
    flex: 1,
    justifyContent: 'center',
  },
  levelCapsule: {
    height: 58,
    borderRadius: 20,
    paddingLeft: 58,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(175, 210, 255, 0.26)',
    overflow: 'hidden',
    shadowColor: '#45e9ff',
    shadowOpacity: 0.24,
    shadowRadius: 14,
  },
  capsuleGlass: {
    position: 'absolute',
    top: 2,
    left: 18,
    right: 18,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  capsuleBattery: {
    position: 'absolute',
    top: 7,
    bottom: 7,
    left: 16,
    width: 28,
    borderRadius: 8,
    shadowColor: '#52efff',
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  capsuleSideCapLeft: {
    position: 'absolute',
    left: 10,
    top: 17,
    width: 8,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'rgba(238, 237, 255, 0.5)',
  },
  capsuleSideCapRight: {
    position: 'absolute',
    right: 10,
    top: 18,
    width: 7,
    height: 22,
    borderRadius: 4,
    backgroundColor: 'rgba(238, 237, 255, 0.4)',
  },
  modeIcon: {
    fontSize: 21,
    marginRight: 8,
  },
  modeText: {
    color: '#eef2ff',
    fontSize: 17,
    fontFamily: FONTS.bodyBold,
  },
  progressDivider: {
    width: 2,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginHorizontal: 10,
  },
  progressCount: {
    fontSize: 17,
    fontFamily: FONTS.display,
    textShadowColor: 'rgba(69,233,255,0.55)',
    textShadowRadius: 12,
  },
  scoreSection: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  scoreValue: {
    color: '#53efff',
    fontSize: 46,
    lineHeight: 50,
    fontFamily: FONTS.display,
    textShadowColor: 'rgba(83,239,255,0.42)',
    textShadowRadius: 22,
  },
  scorePedestal: {
    marginTop: -4,
    width: 48,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(93, 239, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(173,247,255,0.35)',
    shadowColor: '#53efff',
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  comboChip: {
    position: 'absolute',
    right: 2,
    top: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 102, 224, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 102, 224, 0.35)',
  },
  comboTag: {
    color: '#ff8ef0',
    fontSize: 10,
    fontFamily: FONTS.display,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  hintButton: {
    shadowColor: '#f66cff',
  },
  actionDisabled: {
    opacity: 0.28,
  },
  countBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#41eafc',
    borderWidth: 2,
    borderColor: 'rgba(16, 7, 46, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#41eafc',
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  countBadgeText: {
    color: '#11304d',
    fontSize: 15,
    fontFamily: FONTS.display,
  },
  progressTrack: {
    marginTop: 12,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(136, 164, 255, 0.14)',
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#51ecff',
    shadowColor: '#51ecff',
    shadowOpacity: 0.85,
    shadowRadius: 14,
  },
  progressGlowDot: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    backgroundColor: '#4eedff',
    shadowColor: '#4eedff',
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
});
