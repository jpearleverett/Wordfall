import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated as RNAnimated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, interpolate, cancelAnimation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';
import { LOCAL_IMAGES } from '../utils/localAssets';
import GameIcon from './icons/GameIcon';
import { useCeremonyTransition, CEREMONY_LAYER } from '../hooks/useCeremonyTransition';

interface AchievementCeremonyProps {
  icon: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold';
  reward: { coins: number; gems: number };
  onDismiss: () => void;
}

const TIER_COLORS = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
};

export function AchievementCeremony({
  icon,
  name,
  description,
  tier,
  reward,
  onDismiss,
}: AchievementCeremonyProps) {
  const { t } = useTranslation();
  // Shared ceremony transition: one entrance, one faster exit, instant
  // settle + instant dismiss under reduced motion, stop-on-unmount.
  const { reduceMotion, animateDecorations, overlayStyle, cardStyle, requestDismiss } =
    useCeremonyTransition(onDismiss);
  const badge = useSharedValue(reduceMotion ? 1 : 0);
  const decorationsMounted = useDeferredMount(280);

  useEffect(() => {
    if (!animateDecorations) return undefined; // reduced motion: mounted settled
    badge.value = withDelay(200, withSpring(1, { damping: 14, stiffness: 200 }));
    return () => {
      cancelAnimation(badge);
    };
    // Mount-only: the motion plan is latched for this ceremony's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(badge.value, [0, 0.6, 1], [0, 1.2, 1]) }],
  }));

  const tierColor = TIER_COLORS[tier];

  return (
    <RNAnimated.View
      style={[styles.overlay, overlayStyle]}
      accessibilityViewIsModal
      accessibilityRole="alert"
      accessibilityLabel={`${t('ceremony.achievementUnlocked')}. ${name}. ${description}`}
    >
      {decorationsMounted && animateDecorations && (
        <SparkleField count={22} intensity="intense" colors={[tierColor, '#fff', COLORS.gold, COLORS.accent]} />
      )}
      <RNAnimated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={[styles.ribbon, { color: tierColor }]}>{t('ceremony.achievementUnlocked')}</Text>

          <Animated.View
            style={[
              styles.badgeContainer,
              badgeStyle,
            ]}
          >
            <View style={[styles.badge, { borderColor: tierColor, backgroundColor: tierColor + '20' }]}>
              <Image source={LOCAL_IMAGES.achievementBadge} style={styles.badgeFrame} resizeMode="contain" />
              <Text style={styles.badgeIcon}>{icon}</Text>
            </View>
            <View style={[styles.tierTag, { backgroundColor: tierColor }]}>
              <Text style={styles.tierText}>{tier.toUpperCase()}</Text>
            </View>
          </Animated.View>

          <Text style={styles.name}>{name}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <GameIcon name="coin" size={18} />
              <Text style={styles.rewardAmount}>+{reward.coins}</Text>
            </View>
            {reward.gems > 0 && (
              <View style={[styles.rewardChip, styles.rewardChipGems]}>
                <GameIcon name="gem" size={18} />
                <Text style={[styles.rewardAmount, { color: COLORS.accent }]}>+{reward.gems}</Text>
              </View>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={requestDismiss}
            accessibilityRole="button"
            accessibilityLabel={t('ceremony.claimA11y')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LinearGradient
              colors={[tierColor, tierColor + 'CC']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>{t('ceremony.claim')}</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </RNAnimated.View>
    </RNAnimated.View>
  );
}

const AnimatedText = Animated.createAnimatedComponent(Text);

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
    marginBottom: 20,
  },
  badgeContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  badgeFrame: {
    ...StyleSheet.absoluteFillObject,
    width: 72,
    height: 72,
    opacity: 0.4,
  },
  badgeIcon: {
    fontSize: 36,
  },
  rewardIconImg: {
    width: 18,
    height: 18,
  },
  tierTag: {
    marginTop: -8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tierText: {
    color: COLORS.bg,
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
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
  rewardChipGems: {
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  rewardEmoji: {
    fontSize: 16,
  },
  rewardAmount: {
    color: COLORS.gold,
    fontFamily: FONTS.display,
    fontSize: 14,
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
