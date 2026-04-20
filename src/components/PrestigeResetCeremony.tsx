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
import { PermanentBonus } from '../data/prestigeSystem';

interface Props {
  level: number;
  label: string;
  icon: string;
  xpMultiplier: number;
  permanentBonuses: PermanentBonus[];
  cosmeticReward?: { type: string; id: string };
  onDismiss: () => void;
}

function formatBonus(b: PermanentBonus): string {
  switch (b.type) {
    case 'hint_bonus':
      return `+${b.value} Hint per day`;
    case 'coin_bonus':
      return `+${Math.round(b.value * 100)}% Coin Reward`;
    case 'gem_bonus':
      return `+${Math.round(b.value * 100)}% Gem Reward`;
    case 'xp_bonus':
      return `+${Math.round(b.value * 100)}% XP`;
    case 'booster_bonus':
      return `+${b.value} Booster per day`;
    default:
      return `${b.type}: ${b.value}`;
  }
}

export default function PrestigeResetCeremony({
  level,
  label,
  icon,
  xpMultiplier,
  permanentBonuses,
  cosmeticReward,
  onDismiss,
}: Props) {
  const fade = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const iconPulse = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 13, stiffness: 160 });
    iconPulse.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 200 }));
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(iconPulse.value, [0, 0.5, 1], [0, 1.5, 1]) }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <SparkleField count={28} intensity="high" colors={[COLORS.gold, '#fff', COLORS.purple]} />
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={styles.ribbon}>PRESTIGE {level}</Text>

          <Animated.View style={iconStyle}>
            <View style={styles.iconBg}>
              <Text style={styles.icon}>{icon}</Text>
            </View>
          </Animated.View>

          <Text style={styles.title}>{label}</Text>
          <Text style={styles.subtitle}>You have ascended!</Text>

          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>Permanent XP Multiplier</Text>
            <Text style={styles.rewardValue}>{xpMultiplier.toFixed(2)}x</Text>
          </View>

          {permanentBonuses.map((b, idx) => (
            <View key={`${b.type}-${idx}`} style={styles.rewardRow}>
              <Text style={styles.rewardLabel}>{formatBonus(b)}</Text>
              <Text style={styles.rewardCheck}>✓</Text>
            </View>
          ))}

          {cosmeticReward && (
            <View style={[styles.rewardRow, styles.cosmeticRow]}>
              <Text style={styles.cosmeticLabel}>✨ Exclusive cosmetic unlocked</Text>
            </View>
          )}

          <Pressable onPress={onDismiss}>
            <LinearGradient
              colors={[COLORS.gold, '#ff9900']}
              style={[styles.button, SHADOWS.glow(COLORS.gold)]}
            >
              <Text style={styles.buttonText}>ENTER PRESTIGE {level}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
    fontSize: 14,
    letterSpacing: 3,
    marginBottom: 16,
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
    marginBottom: 20,
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
  rewardValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.gold,
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
    marginTop: 18,
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
