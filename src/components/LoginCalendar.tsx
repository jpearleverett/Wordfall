import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS, GRADIENTS } from '../constants';
import { LOGIN_CALENDAR_REWARDS, getNextLoginRewardPreview } from '../data/loginCalendar';

interface LoginCalendarProps {
  /** Current day in the 7-day cycle (1-7) */
  currentDay: number;
  /** Whether today's reward has already been claimed */
  claimedToday: boolean;
  /** Callback when the player claims today's reward */
  onClaim: () => void;
}

const DayCircle = React.memo(function DayCircle({
  day,
  icon,
  isCurrent,
  isClaimed,
  isFuture,
  pulseAnim,
}: {
  day: number;
  icon: string;
  isCurrent: boolean;
  isClaimed: boolean;
  isFuture: boolean;
  pulseAnim: Animated.Value;
}) {
  return (
    <View style={styles.dayContainer}>
      <Animated.View
        style={[
          styles.dayCircleOuter,
          isCurrent && !isClaimed && {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.dayCircle,
            isClaimed && styles.dayCircleClaimed,
            isCurrent && styles.dayCircleCurrent,
            isFuture && styles.dayCircleFuture,
          ]}
        >
          {isClaimed ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : (
            <Text style={styles.dayNumber}>{day}</Text>
          )}
        </View>
      </Animated.View>
      <Text
        style={[
          styles.dayIcon,
          isFuture && styles.dayIconDimmed,
        ]}
      >
        {icon}
      </Text>
      {day === 7 && (
        <Text style={styles.jackpotBadge}>★</Text>
      )}
    </View>
  );
});

const LoginCalendar: React.FC<LoginCalendarProps> = ({
  currentDay,
  claimedToday,
  onClaim,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (claimedToday) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [claimedToday, pulseAnim]);

  const nextReward = getNextLoginRewardPreview(currentDay);
  const wrappedCurrent = ((currentDay - 1) % 7) + 1;

  return (
    <LinearGradient
      colors={GRADIENTS.surfaceCard as unknown as string[]}
      style={styles.container}
    >
      <Text style={styles.title}>Daily Login</Text>

      <View style={styles.daysRow}>
        {LOGIN_CALENDAR_REWARDS.map((reward) => {
          const isClaimed =
            reward.day < wrappedCurrent ||
            (reward.day === wrappedCurrent && claimedToday);
          const isCurrent = reward.day === wrappedCurrent && !claimedToday;
          const isFuture = reward.day > wrappedCurrent;

          return (
            <DayCircle
              key={reward.day}
              day={reward.day}
              icon={reward.icon}
              isCurrent={isCurrent}
              isClaimed={isClaimed}
              isFuture={isFuture}
              pulseAnim={pulseAnim}
            />
          );
        })}
      </View>

      {!claimedToday ? (
        <Pressable
          onPress={onClaim}
          style={({ pressed }) => [
            styles.claimButton,
            pressed && styles.claimButtonPressed,
          ]}
        >
          <LinearGradient
            colors={GRADIENTS.button.primary as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.claimButtonGradient}
          >
            <Text style={styles.claimButtonText}>Claim!</Text>
          </LinearGradient>
        </Pressable>
      ) : (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Tomorrow:</Text>
          <Text style={styles.previewText}>
            {nextReward.icon} {nextReward.label}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    ...SHADOWS.medium,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dayContainer: {
    alignItems: 'center',
    width: 40,
  },
  dayCircleOuter: {
    marginBottom: 4,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleClaimed: {
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    borderColor: COLORS.green,
  },
  dayCircleCurrent: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(255, 45, 149, 0.15)',
    ...SHADOWS.glow(COLORS.accent),
  },
  dayCircleFuture: {
    opacity: 0.4,
  },
  dayNumber: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  checkmark: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.green,
  },
  dayIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  dayIconDimmed: {
    opacity: 0.4,
  },
  jackpotBadge: {
    fontSize: 10,
    color: COLORS.gold,
    marginTop: 1,
  },
  claimButton: {
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.accent),
  },
  claimButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  claimButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  claimButtonText: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.textPrimary,
    letterSpacing: 1.5,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  previewLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  previewText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.gold,
  },
});

export default React.memo(LoginCalendar);
