import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS, GRADIENTS } from '../constants';
import {
  DAILY_REWARD_TIMERS,
  getTimeRemaining,
  DailyRewardTimer,
} from '../data/dailyRewardTimers';

interface DailyRewardTimersProps {
  /** Maps timer ID to the timestamp (ms) when it was last claimed */
  timerStates: Record<string, number>;
  /** Called when the player claims a ready timer */
  onClaim: (timerId: string) => void;
}

/**
 * Formats milliseconds into a human-readable countdown string.
 * - Under 1 hour: "MM:SS"
 * - 1 hour+: "Xh YYm"
 */
function formatCountdown(ms: number): string {
  if (ms <= 0) return 'READY!';

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface TimerCardProps {
  timer: DailyRewardTimer;
  lastClaimed: number;
  onClaim: (timerId: string) => void;
}

const TimerCard = React.memo(function TimerCard({
  timer,
  lastClaimed,
  onClaim,
}: TimerCardProps) {
  const [remaining, setRemaining] = useState(() =>
    getTimeRemaining(timer.id, lastClaimed)
  );
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isReady = remaining <= 0;

  // Countdown tick — updates every second while not ready
  useEffect(() => {
    if (isReady) return;

    const interval = setInterval(() => {
      const next = getTimeRemaining(timer.id, lastClaimed);
      setRemaining(next);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.id, lastClaimed, isReady]);

  // Re-sync remaining when lastClaimed changes (e.g. after claiming)
  useEffect(() => {
    setRemaining(getTimeRemaining(timer.id, lastClaimed));
  }, [timer.id, lastClaimed]);

  // Pulse animation when ready to claim
  useEffect(() => {
    if (!isReady) {
      pulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [isReady, pulseAnim]);

  const handlePress = useCallback(() => {
    if (isReady) {
      onClaim(timer.id);
    }
  }, [isReady, onClaim, timer.id]);

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        { transform: [{ scale: pulseAnim }] },
        isReady && styles.cardOuterReady,
      ]}
    >
      <Pressable
        onPress={handlePress}
        disabled={!isReady}
        style={({ pressed }) => [
          pressed && isReady && styles.cardPressed,
        ]}
      >
        <LinearGradient
          colors={
            isReady
              ? [COLORS.surface, 'rgba(255, 45, 149, 0.15)'] as string[]
              : GRADIENTS.surfaceCard as unknown as string[]
          }
          style={[
            styles.card,
            isReady && styles.cardReady,
          ]}
        >
          <Text style={styles.cardIcon}>{timer.icon}</Text>
          <Text
            style={styles.cardLabel}
            numberOfLines={1}
          >
            {timer.label}
          </Text>
          <Text
            style={[
              styles.cardTimer,
              isReady && styles.cardTimerReady,
            ]}
          >
            {formatCountdown(remaining)}
          </Text>
          {isReady && (
            <View style={styles.claimBadge}>
              <Text style={styles.claimBadgeText}>TAP</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

const DailyRewardTimers: React.FC<DailyRewardTimersProps> = ({
  timerStates,
  onClaim,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Free Rewards</Text>
      <View style={styles.grid}>
        {DAILY_REWARD_TIMERS.map((timer) => (
          <TimerCard
            key={timer.id}
            timer={timer}
            lastClaimed={timerStates[timer.id] ?? 0}
            onClaim={onClaim}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 10,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardOuter: {
    width: '48%',
    borderRadius: 16,
  },
  cardOuterReady: {
    ...SHADOWS.glow(COLORS.accent),
  },
  card: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    minHeight: 110,
    justifyContent: 'center',
  },
  cardReady: {
    borderColor: COLORS.borderAccent,
  },
  cardPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  cardLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  cardTimer: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  cardTimerReady: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  claimBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  claimBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
});

export default React.memo(DailyRewardTimers);
