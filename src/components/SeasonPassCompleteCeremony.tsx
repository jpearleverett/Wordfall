/**
 * SeasonPassCompleteCeremony — MG1 in launch_blockers.md.
 *
 * Fires when the player claims Tier 50 of the Season Pass (the legendary
 * ceiling tier). Prior to this component, tier-50 claims fell through to
 * the generic `feature_unlock` ceremony, which underplayed the moment.
 *
 * Visual is modeled on PrestigeResetCeremony: full-screen overlay, sparkle
 * field, spring-in card, icon pulse, reward strip. Uses purple/gold because
 * the season-pass ceiling reward is always a legendary cosmetic set.
 */
import React, { useEffect } from 'react';
import { Animated as RNAnimated, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, TYPOGRAPHY } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';
import GameIcon from './icons/GameIcon';
import { useCeremonyTransition, CEREMONY_LAYER } from '../hooks/useCeremonyTransition';

interface Props {
  seasonName?: string;
  /** Tier that was claimed (always 50 for the ceiling ceremony). */
  tier?: number;
  /** Optional list of reward labels to print on the card. */
  rewardLabels?: string[];
  /** Optional cosmetic set id for accessibility copy. */
  cosmeticSetId?: string;
  onDismiss: () => void;
}

export default function SeasonPassCompleteCeremony({
  seasonName,
  tier = 50,
  rewardLabels = [],
  cosmeticSetId,
  onDismiss,
}: Props) {
  // Shared ceremony transition: one entrance, one faster exit, instant
  // settle + instant dismiss under reduced motion, stop-on-unmount.
  const { reduceMotion, animateDecorations, overlayStyle, cardStyle, requestDismiss } =
    useCeremonyTransition(onDismiss);
  const iconPulse = useSharedValue(reduceMotion ? 1 : 0);

  // Defer the heavy SparkleField mount so the card pops in fast and the
  // decorations arrive once the entrance has settled.
  const decorationsMounted = useDeferredMount(280);

  useEffect(() => {
    if (!animateDecorations) return undefined; // reduced motion: mounted settled
    iconPulse.value = withDelay(
      300,
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    return () => {
      cancelAnimation(iconPulse);
    };
    // Mount-only: the motion plan is latched for this ceremony's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(iconPulse.value, [0, 0.5, 1], [0, 1.5, 1]) }],
  }));

  return (
    <RNAnimated.View
      style={[styles.overlay, overlayStyle]}
      accessibilityViewIsModal
      accessibilityRole="alert"
      accessibilityLabel={`${(seasonName ?? 'Season')} complete. Tier ${tier} reached. You claimed the legendary reward — every tier earned.`}
    >
      {decorationsMounted && animateDecorations && (
        <SparkleField
          count={32}
          intensity="intense"
          colors={[COLORS.gold, '#fff', COLORS.purple]}
        />
      )}
      <RNAnimated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={styles.ribbon}>
            {(seasonName ?? 'SEASON').toUpperCase()} COMPLETE
          </Text>

          <Animated.View style={iconStyle}>
            <View style={styles.iconBg}>
              <GameIcon name="crown" size={62} />
            </View>
          </Animated.View>

          <Text style={styles.title}>Tier {tier} Reached</Text>
          <Text style={styles.subtitle}>
            You claimed the legendary reward — every tier earned.
          </Text>

          {rewardLabels.length > 0 && (
            <View style={styles.rewardList}>
              {rewardLabels.map((label, idx) => (
                <View key={`${idx}-${label}`} style={styles.rewardRow}>
                  <Text style={styles.rewardLabel}>{label}</Text>
                  <Text style={styles.rewardCheck}>✓</Text>
                </View>
              ))}
            </View>
          )}

          {cosmeticSetId && (
            <View style={[styles.rewardRow, styles.cosmeticRow]}>
              <GameIcon name="bannerDecor" size={16} />
              <Text style={styles.cosmeticLabel}>
                Legendary set unlocked
              </Text>
            </View>
          )}

          <Pressable
            onPress={requestDismiss}
            accessibilityRole="button"
            accessibilityLabel={`Dismiss tier ${tier} season pass reward`}
          >
            <LinearGradient
              colors={[COLORS.gold, '#ff9900']}
              style={[styles.button, SHADOWS.glow(COLORS.gold)]}
            >
              <Text style={styles.buttonText}>CLAIM LEGENDARY</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </RNAnimated.View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 2, 14, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: CEREMONY_LAYER,
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
  },
  cardInner: {
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  ribbon: {
    ...TYPOGRAPHY.label,
    color: COLORS.gold,
    fontSize: 13,
    letterSpacing: 2.5,
    marginBottom: 14,
    textAlign: 'center',
  },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gold + '22',
    borderColor: COLORS.gold + '55',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    ...TYPOGRAPHY.displayLarge,
    fontSize: 30,
    color: COLORS.gold,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    marginBottom: 18,
    textAlign: 'center',
  },
  rewardList: {
    width: '100%',
    marginBottom: 6,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.cellDefault + '88',
    marginBottom: 8,
  },
  rewardLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  rewardCheck: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.green,
    fontSize: 18,
  },
  cosmeticRow: {
    backgroundColor: COLORS.purple + '33',
    borderColor: COLORS.purple,
    borderWidth: 1,
    justifyContent: 'center',
    gap: 6,
  },
  cosmeticLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.purpleLight,
    textAlign: 'center',
  },
  button: {
    marginTop: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  buttonText: {
    ...TYPOGRAPHY.bodyBold,
    color: '#1a001a',
    fontSize: 16,
    letterSpacing: 2,
    textAlign: 'center',
  },
});
