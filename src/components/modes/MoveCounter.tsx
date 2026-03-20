import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

const COLORS = {
  surface: '#1a1f45',
  surfaceLight: '#252b5e',
  textPrimary: '#ffffff',
  textSecondary: '#8890b5',
  green: '#4caf50',
  gold: '#ffd700',
  coral: '#ff6b6b',
};

interface MoveCounterProps {
  current: number;
  max: number;
  style?: any;
}

function getMoveColor(fraction: number): string {
  if (fraction > 0.5) return COLORS.green;
  if (fraction > 0.25) return COLORS.gold;
  return COLORS.coral;
}

export default function MoveCounter({ current, max, style }: MoveCounterProps) {
  const fraction = max > 0 ? current / max : 0;
  const color = getMoveColor(fraction);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCurrent = useRef(current);

  useEffect(() => {
    if (current !== prevCurrent.current) {
      prevCurrent.current = current;
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 24,
          bounciness: 12,
        }),
      ]).start();
    }
  }, [current, scaleAnim]);

  // Progress bar width
  const fillWidth = max > 0 ? `${(current / max) * 100}%` : '0%';

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Moves</Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Text style={[styles.count, { color }]}>
            {current}
            <Text style={styles.separator}>/</Text>
            <Text style={styles.max}>{max}</Text>
          </Text>
        </Animated.View>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: fillWidth as any,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const TRACK_HEIGHT = 6;

const styles = StyleSheet.create({
  container: {
    minWidth: 100,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  count: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  separator: {
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  max: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});
