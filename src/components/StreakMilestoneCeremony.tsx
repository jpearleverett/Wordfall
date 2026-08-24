import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated as RNAnimated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, cancelAnimation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS, STREAK } from '../constants';
import { SparkleField, CelebrationBurst } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';
import GameIcon from './icons/GameIcon';
import { useCeremonyTransition, CEREMONY_LAYER } from '../hooks/useCeremonyTransition';

interface StreakMilestoneCeremonyProps {
  milestone: number;
  onDismiss: () => void;
}

export function StreakMilestoneCeremony({ milestone, onDismiss }: StreakMilestoneCeremonyProps) {
  const { t } = useTranslation();
  // Shared ceremony transition: one entrance, one faster exit, instant
  // settle + instant dismiss under reduced motion, stop-on-unmount.
  const { animateDecorations, overlayStyle, cardStyle, requestDismiss } =
    useCeremonyTransition(onDismiss);
  // Burst origin follows the real window (the old hardcoded 180/250 was
  // tuned for one device width and drifted off-center everywhere else).
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // Fire pulse rests at 1, so it is already settled under reduced motion.
  const fire = useSharedValue(1);
  const decorationsMounted = useDeferredMount(280);

  const reward = STREAK.milestoneRewards[milestone as keyof typeof STREAK.milestoneRewards] || { coins: 0, gems: 0 };

  useEffect(() => {
    if (!animateDecorations) return undefined; // reduced motion: mounted settled
    fire.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      5,
    );
    return () => {
      cancelAnimation(fire);
    };
    // Mount-only: animateDecorations is latched for this ceremony's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fireStyle = useAnimatedStyle(() => ({ transform: [{ scale: fire.value }] }));

  return (
    <RNAnimated.View
      style={[styles.overlay, overlayStyle]}
      accessibilityViewIsModal
      accessibilityRole="alert"
      accessibilityLabel={`${t('ceremony.streakMilestone')}. ${milestone} ${t('ceremony.days')}. ${t('ceremony.incredibleDedication')}`}
    >
      {decorationsMounted && animateDecorations && (
        <SparkleField count={24} intensity="intense" colors={[COLORS.coral, COLORS.gold, COLORS.orange, '#fff']} />
      )}
      {decorationsMounted && animateDecorations && (
        <CelebrationBurst centerX={windowWidth / 2} centerY={windowHeight * 0.31} particleCount={16} colors={[COLORS.coral, COLORS.gold, COLORS.orange]} />
      )}
      <RNAnimated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={styles.ribbon}>{t('ceremony.streakMilestone')}</Text>

          <Animated.View style={[styles.fireEmoji, fireStyle]}>
            <GameIcon name="flame" size={69} />
          </Animated.View>

          <Text style={styles.milestoneCount}>{milestone}</Text>
          <Text style={styles.milestoneLabel}>{t('ceremony.days')}</Text>
          <Text style={styles.subtitle}>{t('ceremony.incredibleDedication')}</Text>

          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <GameIcon name="coin" size={18} />
              <Text style={styles.rewardAmount}>+{reward.coins}</Text>
            </View>
            {reward.gems > 0 && (
              <View style={styles.rewardChip}>
                <GameIcon name="gem" size={18} />
                <Text style={[styles.rewardAmount, { color: COLORS.accent }]}>+{reward.gems}</Text>
              </View>
            )}
          </View>

          {'cosmetic' in reward && (
            <View style={styles.cosmeticBadge}>
              <Text style={styles.cosmeticText}>{t('ceremony.exclusiveCosmeticReward')}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={requestDismiss}
          >
            <LinearGradient
              colors={[COLORS.orange, '#ff6b35']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>{t('ceremony.amazing')}</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </RNAnimated.View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 2, 14, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: CEREMONY_LAYER,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    ...SHADOWS.strong,
  },
  cardInner: {
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.orange + '30',
  },
  ribbon: {
    color: COLORS.orange,
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    marginBottom: 16,
  },
  fireEmoji: {
    marginBottom: 8,
  },
  milestoneCount: {
    color: COLORS.orange,
    fontSize: 48,
    fontFamily: FONTS.display,
    textShadowColor: COLORS.orangeGlow,
    textShadowRadius: 20,
  },
  milestoneLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.display,
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rewardEmoji: {
    fontSize: 16,
  },
  rewardIconImg: {
    width: 18,
    height: 18,
  },
  rewardAmount: {
    color: COLORS.gold,
    fontFamily: FONTS.display,
    fontSize: 14,
  },
  cosmeticBadge: {
    backgroundColor: COLORS.purple + '20',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.purple + '40',
  },
  cosmeticText: {
    color: COLORS.purple,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    ...SHADOWS.glow(COLORS.orange),
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
