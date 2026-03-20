import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

const COLORS = {
  bg: '#0a0e27',
  surface: '#1a1f45',
  surfaceLight: '#252b5e',
  textPrimary: '#ffffff',
  textSecondary: '#8890b5',
  accent: '#00d4ff',
  green: '#4caf50',
  gold: '#ffd700',
  coral: '#ff6b6b',
  textMuted: '#4a5280',
};

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
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const onTimeUpRef = useRef(onTimeUp);

  // Keep callback ref up to date
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Reset when totalSeconds changes
  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

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
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [remaining, totalSeconds, paused, pulseAnim]);

  const fraction = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const color = getTimerColor(fraction);

  // Progress ring values
  const ringSize = 80;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        { transform: [{ scale: pulseAnim }] },
      ]}
    >
      {/* Background ring */}
      <View style={[styles.ring, { width: ringSize, height: ringSize }]}>
        <View
          style={[
            styles.ringTrack,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: strokeWidth,
              borderColor: COLORS.surfaceLight,
            },
          ]}
        />
        {/* Foreground ring segments (approximated with bordered views) */}
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
            },
          ]}
        />
        {/* Center text */}
        <View style={styles.ringCenter}>
          <Text style={[styles.time, { color }]}>{formatTime(remaining)}</Text>
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
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  pausedLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
});
