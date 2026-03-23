import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, MODE_CONFIGS } from '../constants';
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
  const modeLabel = isDaily ? 'Daily' : `Lv ${level}`;
  const scoreAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scoreAnim, { toValue: 1.12, duration: 110, useNativeDriver: true }),
      Animated.spring(scoreAnim, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]).start();
  }, [score, scoreAnim]);

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 8) + 2 }]}> 
      <View style={styles.row}>
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={onBack}>
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(88,113,180,0.08)', 'rgba(11,16,45,0.88)']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.buttonInnerStroke} />
          <Ionicons name="chevron-back" size={30} color="#eef1ff" />
        </Pressable>

        <View style={styles.progressShell}>
          <LinearGradient
            colors={['rgba(124,75,208,0.88)', 'rgba(39,40,102,0.92)', 'rgba(14,19,57,0.96)']}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 1, y: 0.6 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.progressCap}>
            <LinearGradient
              colors={['rgba(102,247,255,1)', 'rgba(44,201,234,0.92)', 'rgba(128,255,255,0.55)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
          <View style={styles.progressCapRight} />
          <View style={styles.progressContent}>
            <Text style={styles.modeIcon}>{modeConfig.icon}</Text>
            <Text style={styles.modeText}>{modeLabel}</Text>
            <View style={styles.divider} />
            <Text style={styles.progressText}>{foundWords}/{totalWords}</Text>
          </View>
        </View>

        <View style={styles.scoreStack}>
          <Animated.Text style={[styles.scoreValue, { transform: [{ scale: scoreAnim }] }]}>{score}</Animated.Text>
          <View style={styles.scoreBase} />
          {combo > 1 && (
            <View style={styles.comboBadge}>
              <Text style={styles.comboText}>{combo}x</Text>
            </View>
          )}
        </View>

        <View style={styles.actionGroup}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed, undosLeft <= 0 && styles.disabled]}
            onPress={onUndo}
            disabled={undosLeft <= 0}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(84,108,176,0.08)', 'rgba(15,21,58,0.9)']}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.buttonInnerStroke} />
            <Ionicons name="arrow-undo" size={26} color="#ff71ed" />
            {undosLeft > 0 && <View style={[styles.badge, styles.blueBadge]}><Text style={styles.badgeText}>{undosLeft}</Text></View>}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed, hintsLeft <= 0 && styles.disabled]}
            onPress={onHint}
            disabled={hintsLeft <= 0}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(84,108,176,0.08)', 'rgba(15,21,58,0.9)']}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.buttonInnerStroke} />
            <Ionicons name="bulb-outline" size={24} color="#ff71ed" />
            {hintsLeft > 0 && <View style={[styles.badge, styles.blueBadge]}><Text style={styles.badgeText}>{hintsLeft}</Text></View>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(198,225,255,0.55)',
    overflow: 'hidden',
    shadowColor: '#6ce8ff',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  progressShell: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(197,217,255,0.42)',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingLeft: 24,
    paddingRight: 20,
    shadowColor: '#41e8ff',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 12,
  },
  progressCap: {
    position: 'absolute',
    left: 8,
    top: 6,
    bottom: 6,
    width: 20,
    borderRadius: 9,
    overflow: 'hidden',
    shadowColor: '#5cf7ff',
    shadowOpacity: 0.85,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  progressCapRight: {
    position: 'absolute',
    right: -2,
    top: 16,
    width: 10,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(154,182,255,0.55)',
    shadowColor: '#6ce8ff',
    shadowOpacity: 0.75,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeIcon: {
    fontSize: 21,
  },
  modeText: {
    color: '#f5f2ff',
    fontSize: 21,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  divider: {
    width: 2,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: 2,
  },
  progressText: {
    color: '#49e7ff',
    fontSize: 21,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  scoreStack: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  scoreValue: {
    color: '#5ceeff',
    fontSize: 48,
    lineHeight: 52,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: 'rgba(92,238,255,0.45)',
    textShadowRadius: 16,
  },
  scoreBase: {
    width: 44,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(88,233,255,0.28)',
    shadowColor: '#64efff',
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    marginTop: -3,
  },
  comboBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: 'rgba(255,88,178,0.18)',
    borderColor: 'rgba(255,120,198,0.38)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  comboText: {
    color: '#ff8fe6',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 66,
    height: 66,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(198,225,255,0.5)',
    overflow: 'hidden',
    shadowColor: '#6ce8ff',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  buttonInnerStroke: {
    position: 'absolute',
    inset: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -4,
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(32,100,120,0.5)',
    shadowColor: '#5cf7ff',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 12,
  },
  blueBadge: {
    backgroundColor: '#47e7ff',
  },
  badgeText: {
    color: '#143349',
    fontSize: 21,
    lineHeight: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.38,
  },
});
