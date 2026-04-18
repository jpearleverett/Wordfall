/**
 * MockAdModal — simulated rewarded ad experience for development.
 *
 * Shows a full-screen overlay with a 5-second countdown timer. The player
 * can dismiss early (no reward) or wait for the countdown to finish (reward
 * granted). This keeps the full UI flow working without a real ad SDK.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { AdRewardType, AD_REWARD_VALUES } from '../services/ads';

const AD_DURATION_SECONDS = 5;

const REWARD_LABELS: Record<AdRewardType, string> = {
  hint_reward: '+1 Hint',
  undo_reward: '+1 Undo',
  spin_reward: '+1 Mystery Wheel Spin',
  coins_reward: '+50 Coins',
  double_reward: 'Double Rewards',
  life_reward: '+1 Life',
};

interface MockAdModalProps {
  rewardType: AdRewardType;
  onComplete: (watched: boolean) => void;
}

export function MockAdModal({ rewardType, onComplete }: MockAdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION_SECONDS);
  const fadeAnim = useSharedValue(0);
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 200 });
    progressAnim.value = withTiming(1, { duration: AD_DURATION_SECONDS * 1000 });
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressAnim.value }],
  }));

  useEffect(() => {
    if (secondsLeft <= 0) {
      // Ad complete — grant reward after a brief pause
      const timer = setTimeout(() => onComplete(true), 300);
      return () => clearTimeout(timer);
    }
    const interval = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(interval);
  }, [secondsLeft, onComplete]);

  const handleSkip = () => {
    onComplete(false);
  };

  const isComplete = secondsLeft <= 0;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <View style={styles.card}>
        <LinearGradient
          colors={GRADIENTS.surfaceCard as unknown as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>{'\uD83C\uDFAC'}</Text>
          <Text style={styles.headerText}>REWARDED AD</Text>
          <Text style={styles.headerSub}>(Development Mode)</Text>
        </View>

        {/* Simulated ad area */}
        <View style={styles.adArea}>
          <LinearGradient
            colors={['rgba(255,45,149,0.08)', 'rgba(200,77,255,0.06)']}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.adEmoji}>{'\uD83C\uDFAE'}</Text>
          <Text style={styles.adText}>Simulated Ad Content</Text>
          <Text style={styles.adSubtext}>
            In production, a real video ad would play here
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: '100%', transformOrigin: 'left' },
              progressBarStyle,
            ]}
          />
        </View>

        {/* Reward info */}
        <View style={styles.rewardInfo}>
          <Text style={styles.rewardLabel}>Reward: {REWARD_LABELS[rewardType]}</Text>
        </View>

        {/* Timer / Complete */}
        {isComplete ? (
          <Pressable
            style={({ pressed }) => [styles.claimButton, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
            onPress={() => onComplete(true)}
          >
            <LinearGradient
              colors={GRADIENTS.button.green as unknown as [string, string, ...string[]]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={styles.claimButtonText}>CLAIM REWARD</Text>
          </Pressable>
        ) : (
          <View style={styles.timerRow}>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{secondsLeft}s</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.7 }]}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>Skip (no reward)</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  card: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    ...SHADOWS.strong,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  headerText: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  headerSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  adArea: {
    marginHorizontal: 16,
    marginTop: 12,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  adEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  adText: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  adSubtext: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  rewardInfo: {
    alignItems: 'center',
    marginTop: 12,
  },
  rewardLabel: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  timerBadge: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  timerText: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
  claimButton: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.green),
  },
  claimButtonText: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.bg,
    letterSpacing: 1.5,
  },
});
