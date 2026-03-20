import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants';

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

function getMoveGlow(fraction: number): string {
  if (fraction > 0.5) return COLORS.greenGlow;
  if (fraction > 0.25) return COLORS.goldGlow;
  return COLORS.coralGlow;
}

export default function MoveCounter({ current, max, style }: MoveCounterProps) {
  const fraction = max > 0 ? current / max : 0;
  const color = getMoveColor(fraction);
  const glowColor = getMoveGlow(fraction);
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
          <Text
            style={[
              styles.count,
              {
                color,
                textShadowColor: glowColor,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 8,
              },
            ]}
          >
            {current}
            <Text style={styles.separator}>/</Text>
            <Text style={styles.max}>{max}</Text>
          </Text>
        </Animated.View>
      </View>

      <View style={styles.trackOuter}>
        <LinearGradient
          colors={['rgba(37, 43, 94, 0.6)', 'rgba(26, 31, 69, 0.4)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.track}
        >
          <View
            style={[
              styles.fill,
              {
                width: fillWidth as any,
                backgroundColor: color,
                shadowColor: color,
              },
            ]}
          >
            {/* Inner highlight on fill bar */}
            <View style={styles.fillHighlight} />
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const TRACK_HEIGHT = 8;

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
  trackOuter: {
    borderRadius: TRACK_HEIGHT / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  fillHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TRACK_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderTopLeftRadius: TRACK_HEIGHT / 2,
    borderTopRightRadius: TRACK_HEIGHT / 2,
  },
});
