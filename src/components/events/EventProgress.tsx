import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

const COLORS = {
  bg: '#0a0e27',
  surface: '#1a1f45',
  surfaceLight: '#252b5e',
  textPrimary: '#ffffff',
  textSecondary: '#8890b5',
  textMuted: '#4a5280',
  accent: '#00d4ff',
  green: '#4caf50',
  gold: '#ffd700',
};

interface Reward {
  threshold: number;
  name: string;
  claimed: boolean;
}

interface EventProgressProps {
  current: number;
  target: number;
  rewards: Reward[];
}

export default function EventProgress({
  current,
  target,
  rewards,
}: EventProgressProps) {
  const progress = target > 0 ? Math.min(1, current / target) : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  const widthInterpolation = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.progressLabel}>Event Progress</Text>
        <Text style={styles.progressValue}>
          {current} / {target}
        </Text>
      </View>

      {/* Track + milestones */}
      <View style={styles.trackWrapper}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              {
                width: widthInterpolation,
              },
            ]}
          />
        </View>

        {/* Milestone markers */}
        {rewards.map((reward, index) => {
          const position =
            target > 0 ? (reward.threshold / target) * 100 : 0;
          const reached = current >= reward.threshold;

          return (
            <View
              key={index}
              style={[styles.milestone, { left: `${position}%` }]}
            >
              <View
                style={[
                  styles.milestoneCircle,
                  reward.claimed && styles.milestoneClaimed,
                  reached && !reward.claimed && styles.milestoneReached,
                  !reached && styles.milestoneUnreached,
                ]}
              >
                {reward.claimed ? (
                  <Text style={styles.milestoneCheck}>{'\u2713'}</Text>
                ) : (
                  <Text
                    style={[
                      styles.milestoneIcon,
                      reached && styles.milestoneIconReached,
                    ]}
                  >
                    {'\u2605'}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Reward labels underneath */}
      <View style={styles.rewardLabels}>
        {rewards.map((reward, index) => {
          const position =
            target > 0 ? (reward.threshold / target) * 100 : 0;
          return (
            <View
              key={index}
              style={[styles.rewardLabelWrapper, { left: `${position}%` }]}
            >
              <Text
                style={[
                  styles.rewardName,
                  reward.claimed && styles.rewardNameClaimed,
                ]}
                numberOfLines={1}
              >
                {reward.name}
              </Text>
              <Text style={styles.rewardThreshold}>{reward.threshold}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const TRACK_HEIGHT = 10;
const MILESTONE_SIZE = 26;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  progressValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  trackWrapper: {
    height: MILESTONE_SIZE + 4,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: TRACK_HEIGHT,
    backgroundColor: COLORS.accent,
    borderRadius: TRACK_HEIGHT / 2,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  milestone: {
    position: 'absolute',
    marginLeft: -(MILESTONE_SIZE / 2),
    alignItems: 'center',
  },
  milestoneCircle: {
    width: MILESTONE_SIZE,
    height: MILESTONE_SIZE,
    borderRadius: MILESTONE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  milestoneClaimed: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  milestoneReached: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  milestoneUnreached: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceLight,
  },
  milestoneCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  milestoneIcon: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  milestoneIconReached: {
    color: COLORS.gold,
  },
  rewardLabels: {
    height: 36,
    marginTop: 6,
  },
  rewardLabelWrapper: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -30,
    width: 60,
  },
  rewardName: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  rewardNameClaimed: {
    color: COLORS.green,
  },
  rewardThreshold: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
});
