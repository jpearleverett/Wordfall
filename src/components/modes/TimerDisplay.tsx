import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../constants';
import { errorHaptic } from '../../services/haptics';
import { soundManager } from '../../services/sound';

interface TimerDisplayProps {
  totalSeconds: number;
  onTimeUp: () => void;
  paused?: boolean;
  style?: any;
}

function getTimerColor(fraction: number): string {
  if (fraction > 0.5) return COLORS.green;
  if (fraction > 0.25) return COLORS.gold;
  return COLORS.coral;
}

function getTimerGlow(fraction: number): string {
  if (fraction > 0.5) return COLORS.greenGlow;
  if (fraction > 0.25) return COLORS.goldGlow;
  return COLORS.coralGlow;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TimerDisplay({
  totalSeconds,
  onTimeUp,
  paused = false,
  style,
}: TimerDisplayProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const pulseAnim = useSharedValue(1);
  const flashAnim = useSharedValue(0);
  const onTimeUpRef = useRef(onTimeUp);
  // C2 in launch_blockers.md: fire a visual + haptic + SFX warning once
  // when `remaining` crosses 30s and 10s. `warned30sRef` / `warned10sRef`
  // guard against re-fires across re-renders, and both reset whenever
  // `totalSeconds` changes (new puzzle started).
  const warned30sRef = useRef(false);
  const warned10sRef = useRef(false);

  // Keep callback ref up to date
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Reset when totalSeconds changes (new puzzle)
  useEffect(() => {
    setRemaining(totalSeconds);
    warned30sRef.current = false;
    warned10sRef.current = false;
  }, [totalSeconds]);

  // C2 warnings: fire once when remaining crosses 30s or 10s threshold.
  useEffect(() => {
    if (paused) return;
    const fireWarning = (slot: 'timerWarning30s' | 'timerWarning10s') => {
      void errorHaptic();
      // SFX slots are reserved in sound.ts:71–72. Stays silent on synth
      // until the real audio ships; wiring is harmless today.
      void soundManager.playSound(slot as any);
      flashAnim.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 500 }),
      );
    };
    if (!warned30sRef.current && remaining <= 30 && remaining > 10 && totalSeconds > 30) {
      warned30sRef.current = true;
      fireWarning('timerWarning30s');
    }
    if (!warned10sRef.current && remaining <= 10 && remaining > 0 && totalSeconds > 10) {
      warned10sRef.current = true;
      fireWarning('timerWarning10s');
    }
  }, [remaining, totalSeconds, paused]);

  // Countdown interval
  useEffect(() => {
    if (paused || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          onTimeUpRef.current();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paused, remaining <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pulse animation when time is critically low
  useEffect(() => {
    const fraction = totalSeconds > 0 ? remaining / totalSeconds : 0;
    if (fraction <= 0.25 && remaining > 0 && !paused) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 400 }),
          withTiming(1, { duration: 400 }),
        ),
        -1,
      );
    } else {
      pulseAnim.value = 1;
    }
  }, [remaining, totalSeconds, paused]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));
  // Red warning flash driven by C2 threshold crossings.
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashAnim.value,
  }));

  const fraction = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const color = getTimerColor(fraction);
  const glowColor = getTimerGlow(fraction);
  const isLow = fraction <= 0.25 && remaining > 0;

  // Progress ring values
  const ringSize = 80;
  const strokeWidth = 6;

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        pulseStyle,
      ]}
    >
      {/* Outer glow layer */}
      <View style={[styles.outerGlow, { shadowColor: color }]} />

      {/* C2 warning flash — fades in+out when 30s/10s threshold is crossed. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.warningFlash, flashStyle]}
      />


      {/* Background ring */}
      <View style={[styles.ring, { width: ringSize, height: ringSize }]}>
        <LinearGradient
          colors={['rgba(37, 43, 94, 0.8)', 'rgba(26, 31, 69, 0.6)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.ringTrackGradient,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: strokeWidth,
              borderColor: 'transparent',
            },
          ]}
        />
        <View
          style={[
            styles.ringTrack,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: strokeWidth,
              borderColor: 'rgba(255,255,255,0.06)',
            },
          ]}
        />
        {/* Foreground ring segments */}
        <View
          style={[
            styles.ringFill,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              borderTopColor: fraction > 0.75 ? color : 'transparent',
              borderRightColor: fraction > 0.5 ? color : 'transparent',
              borderBottomColor: fraction > 0.25 ? color : 'transparent',
              borderLeftColor: fraction > 0 ? color : 'transparent',
              transform: [{ rotate: '-90deg' }],
              opacity: fraction > 0 ? 1 : 0,
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 8,
            },
          ]}
        />
        {/* Center text */}
        <View style={styles.ringCenter}>
          <Text
            style={[
              styles.time,
              {
                color,
                textShadowColor: isLow ? glowColor : 'transparent',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: isLow ? 12 : 0,
              },
            ]}
          >
            {formatTime(remaining)}
          </Text>
          {paused && <Text style={styles.pausedLabel}>PAUSED</Text>}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  warningFlash: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.coral,
    opacity: 0,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTrackGradient: {
    position: 'absolute',
  },
  ringTrack: {
    position: 'absolute',
  },
  ringFill: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontSize: 20,
    fontFamily: FONTS.display,
    fontVariant: ['tabular-nums'],
  },
  pausedLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
    marginTop: 2,
  },
});
