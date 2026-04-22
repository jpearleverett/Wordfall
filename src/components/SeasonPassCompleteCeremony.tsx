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
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, TYPOGRAPHY } from '../constants';
import { SparkleField } from './effects/ParticleSystem';

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
  const fade = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const iconPulse = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 13, stiffness: 160 });
    iconPulse.value = withDelay(
      300,
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(iconPulse.value, [0, 0.5, 1], [0, 1.5, 1]) }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <SparkleField
        count={32}
        intensity="intense"
        colors={[COLORS.gold, '#fff', COLORS.purple]}
      />
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={styles.ribbon}>
            {(seasonName ?? 'SEASON').toUpperCase()} COMPLETE
          </Text>

          <Animated.View style={iconStyle}>
            <View style={styles.iconBg}>
              <Text style={styles.icon}>{'\u{1F451}'}</Text>
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
              <Text style={styles.cosmeticLabel}>
                ✨ Legendary set unlocked
              </Text>
            </View>
          )}

          <Pressable
            onPress={onDismiss}
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
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
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
  icon: {
    fontSize: 54,
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
  },
  cosmeticLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.purpleLight,
    textAlign: 'center',
    width: '100%',
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
