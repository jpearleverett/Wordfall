import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../constants';
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
  const modeLabel = isDaily ? 'Daily' : `Lv ${level}`;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progress = totalWords > 0 ? foundWords / totalWords : 0;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scoreAnim, { toValue: 1.12, duration: 90, useNativeDriver: true }),
      Animated.spring(scoreAnim, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [score, scoreAnim]);

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      friction: 9,
      tension: 80,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 6) + 4 }]}>
      <View style={styles.row}>
        <Pressable style={({ pressed }) => [styles.squareButton, pressed && styles.pressed]} onPress={onBack}>
          <LinearGradient
            colors={['rgba(112,130,255,0.26)', 'rgba(24,18,56,0.94)'] as [string, string]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.squareInnerBorder} />
          <Ionicons name="chevron-back" size={26} color="#eef1ff" />
        </Pressable>

        <View style={styles.levelPillWrap}>
          <LinearGradient
            colors={['rgba(142, 109, 255, 0.7)', 'rgba(31, 19, 82, 0.96)', 'rgba(15, 11, 46, 0.96)'] as [string, string, string]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.levelPill}
          >
            <LinearGradient
              colors={['#53edff', '#59d7ff', '#7a63ff'] as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.levelCap}
            />
            <View style={styles.levelCapShine} />
            <View style={styles.levelContent}>
              <Text style={styles.bookIcon}>📖</Text>
              <Text style={styles.levelText}>{modeLabel}</Text>
              <View style={styles.levelDivider} />
              <Text style={styles.progressText}>{foundWords}/{totalWords}</Text>
            </View>
            <View style={styles.levelEndCap} />
          </LinearGradient>
        </View>

        <View style={styles.scoreWrap}>
          <View style={styles.scoreBeam} />
          <Animated.Text style={[styles.scoreValue, { transform: [{ scale: scoreAnim }] }]}>0</Animated.Text>
          {combo > 1 && (
            <View style={styles.comboBadge}>
              <Text style={styles.comboText}>{combo}x</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.squareButton, pressed && styles.pressed, hintsLeft <= 0 && styles.disabled]}
            onPress={onHint}
            disabled={hintsLeft <= 0}
          >
            <LinearGradient
              colors={['rgba(98,140,255,0.20)', 'rgba(27,18,58,0.96)'] as [string, string]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.squareInnerBorder} />
            <Ionicons name="bulb-outline" size={22} color="#ff68fb" />
            {hintsLeft > 0 && (
              <View style={styles.countBubble}>
                <Text style={styles.countBubbleText}>{hintsLeft}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.squareButton, pressed && styles.pressed, undosLeft <= 0 && styles.disabled]}
            onPress={onUndo}
            disabled={undosLeft <= 0}
          >
            <LinearGradient
              colors={['rgba(98,140,255,0.20)', 'rgba(27,18,58,0.96)'] as [string, string]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.squareInnerBorder} />
            <Ionicons name="arrow-undo" size={22} color="#ff68fb" />
            {undosLeft > 0 && (
              <View style={styles.countBubble}>
                <Text style={styles.countBubbleText}>{undosLeft}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.trackWrap}>
        <View style={styles.trackGlow} />
        <View style={styles.track}>
          <Animated.View style={[styles.trackFill, { width: progressWidth as any }]}>
            <LinearGradient
              colors={['#56f5ff', '#ca66ff', 'rgba(255,255,255,0.3)'] as [string, string, string]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <Animated.View style={[styles.trackDot, { left: progressWidth as any }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  squareButton: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(205, 223, 255, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    shadowColor: '#62e8ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: 'rgba(15, 8, 35, 0.92)',
  },
  squareInnerBorder: {
    position: 'absolute',
    top: 3,
    right: 3,
    bottom: 3,
    left: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  levelPillWrap: {
    flex: 1,
    marginRight: 2,
  },
  levelPill: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: 'rgba(204, 220, 255, 0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#57e7ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  levelCap: {
    width: 28,
    alignSelf: 'stretch',
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
  },
  levelCapShine: {
    position: 'absolute',
    left: 8,
    top: 8,
    bottom: 8,
    width: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  levelContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  bookIcon: {
    fontSize: 20,
  },
  levelText: {
    color: '#f4f1ff',
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
  },
  levelDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  progressText: {
    color: '#4de9ff',
    fontSize: 18,
    fontFamily: FONTS.display,
    textShadowColor: 'rgba(77,233,255,0.6)',
    textShadowRadius: 12,
  },
  levelEndCap: {
    width: 9,
    height: 28,
    marginRight: -4,
    borderRadius: 8,
    backgroundColor: 'rgba(150, 240, 255, 0.7)',
    shadowColor: '#74efff',
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  scoreWrap: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBeam: {
    position: 'absolute',
    bottom: -1,
    width: 52,
    height: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(86,245,255,0.25)',
    shadowColor: '#63efff',
    shadowOpacity: 0.8,
    shadowRadius: 14,
  },
  scoreValue: {
    color: '#56f5ff',
    fontSize: 44,
    lineHeight: 48,
    fontFamily: FONTS.display,
    textShadowColor: 'rgba(86,245,255,0.9)',
    textShadowRadius: 18,
  },
  comboBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    backgroundColor: 'rgba(12,18,48,0.96)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  comboText: {
    color: '#ffd94d',
    fontSize: 11,
    fontFamily: FONTS.display,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  countBubble: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4de9ff',
    borderWidth: 2,
    borderColor: 'rgba(12,18,48,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4de9ff',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  countBubbleText: {
    color: '#10203d',
    fontSize: 15,
    fontFamily: FONTS.display,
  },
  trackWrap: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  trackGlow: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 8,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(86,245,255,0.18)',
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(132, 146, 198, 0.28)',
    overflow: 'visible',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  trackDot: {
    position: 'absolute',
    top: -6,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#55ecff',
    shadowColor: '#55ecff',
    shadowOpacity: 0.95,
    shadowRadius: 10,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
