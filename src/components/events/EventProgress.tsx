import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../../constants';

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
          <Text style={styles.progressCurrent}>{current}</Text>
          <Text style={styles.progressSeparator}> / </Text>
          {target}
        </Text>
      </View>

      {/* Track + milestones */}
      <View style={styles.trackWrapper}>
        <LinearGradient
          colors={['rgba(37, 43, 94, 0.6)', 'rgba(26, 31, 69, 0.4)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.track}
        >
          <Animated.View
            style={[
              styles.fillOuter,
              {
                width: widthInterpolation,
              },
            ]}
          >
            <LinearGradient
              colors={['#ff6eb4', '#ff2d95', '#cc0066']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fill}
            >
              {/* Inner highlight */}
              <View style={styles.fillHighlight} />
            </LinearGradient>
          </Animated.View>
        </LinearGradient>

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
                  styles.milestoneCircleOuter,
                  reward.claimed && styles.milestoneClaimedGlow,
                  reached && !reward.claimed && styles.milestoneReachedGlow,
                ]}
              >
                {reward.claimed ? (
                  <LinearGradient
                    colors={['#66ff88', '#4caf50', '#2e7d32']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.milestoneCircle}
                  >
                    <Text style={styles.milestoneCheck}>{'\u2713'}</Text>
                  </LinearGradient>
                ) : reached ? (
                  <LinearGradient
                    colors={['#ffe066', '#ffd700', '#f0a500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.milestoneCircle, styles.milestoneReachedBorder]}
                  >
                    <Text style={styles.milestoneIconReached}>{'\u2605'}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.milestoneCircle, styles.milestoneUnreached]}>
                    <Text style={styles.milestoneIcon}>{'\u2605'}</Text>
                  </View>
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
    paddingVertical: 14,
    paddingHorizontal: 2,
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
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255,255,255,0.06)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  progressValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
  },
  progressCurrent: {
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  progressSeparator: {
    color: COLORS.textSecondary,
  },
  trackWrapper: {
    height: MILESTONE_SIZE + 4,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  fillOuter: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.accent),
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  fill: {
    flex: 1,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  fillHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TRACK_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderTopLeftRadius: TRACK_HEIGHT / 2,
    borderTopRightRadius: TRACK_HEIGHT / 2,
  },
  milestone: {
    position: 'absolute',
    marginLeft: -(MILESTONE_SIZE / 2),
    alignItems: 'center',
  },
  milestoneCircleOuter: {
    borderRadius: MILESTONE_SIZE / 2 + 2,
    padding: 1,
  },
  milestoneClaimedGlow: {
    ...SHADOWS.glow(COLORS.green),
    shadowOpacity: 0.8,
    shadowRadius: 14,
  },
  milestoneReachedGlow: {
    ...SHADOWS.glow(COLORS.gold),
    shadowOpacity: 0.8,
    shadowRadius: 14,
  },
  milestoneCircle: {
    width: MILESTONE_SIZE,
    height: MILESTONE_SIZE,
    borderRadius: MILESTONE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneReachedBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  milestoneUnreached: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  milestoneCheck: {
    color: '#fff',
    fontSize: 12,
    fontFamily: FONTS.display,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  milestoneIcon: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  milestoneIconReached: {
    color: '#000',
    fontSize: 11,
    fontFamily: FONTS.display,
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
    fontFamily: FONTS.bodySemiBold,
    textAlign: 'center',
  },
  rewardNameClaimed: {
    color: COLORS.green,
  },
  rewardThreshold: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: FONTS.bodyMedium,
    marginTop: 1,
  },
});
