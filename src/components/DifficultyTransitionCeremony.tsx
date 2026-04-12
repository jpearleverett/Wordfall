import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';

interface DifficultyTransitionCeremonyProps {
  from: string;
  to: string;
  onDismiss: () => void;
}

const DIFFICULTY_META: Record<string, { color: string; icon: string; label: string }> = {
  easy: { color: COLORS.green, icon: '\u{1F331}', label: 'EASY' },
  medium: { color: COLORS.accent, icon: '\u{1F525}', label: 'MEDIUM' },
  hard: { color: COLORS.orange, icon: '\u{26A1}', label: 'HARD' },
  expert: { color: COLORS.coral, icon: '\u{1F480}', label: 'EXPERT' },
};

export function DifficultyTransitionCeremony({
  from,
  to,
  onDismiss,
}: DifficultyTransitionCeremonyProps) {
  const fade = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const arrow = useSharedValue(0);
  const toProgress = useSharedValue(0);
  const decorationsMounted = useDeferredMount(280);

  const fromMeta = DIFFICULTY_META[from] ?? DIFFICULTY_META.easy;
  const toMeta = DIFFICULTY_META[to] ?? DIFFICULTY_META.medium;

  useEffect(() => {
    fade.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    arrow.value = withDelay(350, withSpring(1, { damping: 12, stiffness: 120 }));
    toProgress.value = withDelay(550, withSpring(1, { damping: 8, stiffness: 150 }));
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const arrowStyle = useAnimatedStyle(() => ({ opacity: arrow.value, transform: [{ scale: arrow.value }] }));
  const toStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(toProgress.value, [0, 0.5, 1], [0, 1.3, 1]) }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {decorationsMounted && (
        <SparkleField count={20} intensity="intense" colors={[toMeta.color, COLORS.gold, '#fff']} />
      )}
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={[styles.ribbon, { color: toMeta.color }]}>NEW CHALLENGE TIER</Text>

          <View style={styles.transitionRow}>
            <View style={[styles.tierBadge, { borderColor: fromMeta.color, backgroundColor: fromMeta.color + '20' }]}>
              <Text style={styles.tierIcon}>{fromMeta.icon}</Text>
              <Text style={[styles.tierLabel, { color: fromMeta.color }]}>{fromMeta.label}</Text>
            </View>

            <Animated.View style={arrowStyle}>
              <Text style={styles.arrow}>{'\u{27A1}\u{FE0F}'}</Text>
            </Animated.View>

            <Animated.View
              style={toStyle}
            >
              <View style={[styles.tierBadge, styles.tierBadgeTo, { borderColor: toMeta.color, backgroundColor: toMeta.color + '20' }]}>
                <Text style={styles.tierIcon}>{toMeta.icon}</Text>
                <Text style={[styles.tierLabel, { color: toMeta.color }]}>{toMeta.label}</Text>
              </View>
            </Animated.View>
          </View>

          <Text style={styles.description}>
            Puzzles will be tougher — but the rewards are bigger!
          </Text>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={onDismiss}
          >
            <LinearGradient
              colors={[toMeta.color, toMeta.color + 'CC']}
              style={[styles.button, SHADOWS.glow(toMeta.color)]}
            >
              <Text style={styles.buttonText}>BRING IT ON</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 20, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 200,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    ...SHADOWS.strong,
  },
  cardInner: {
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ribbon: {
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    marginBottom: 24,
  },
  transitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  tierBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  tierBadgeTo: {
    width: 80,
    height: 80,
    borderRadius: 22,
    borderWidth: 3,
  },
  tierIcon: {
    fontSize: 28,
    marginBottom: 2,
  },
  tierLabel: {
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  arrow: {
    fontSize: 24,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 260,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  buttonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
});
