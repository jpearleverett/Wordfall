import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 12, style }: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 1200 }),
      ),
      -1,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.8]),
  }));

  return (
    <View style={[{ width: width as number, height, borderRadius, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)' }, style]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, shimmerStyle]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** A skeleton card that mimics a typical panel */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ borderRadius: 22, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 14 }, style]}>
      <Skeleton width="60%" height={16} borderRadius={8} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={8} borderRadius={4} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={8} borderRadius={4} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={8} borderRadius={4} />
    </View>
  );
}

/** Grid of skeleton items for profile-like screens */
export function SkeletonGrid({ rows = 2, cols = 3, itemHeight = 70 }: { rows?: number; cols?: number; itemHeight?: number }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width="auto" height={itemHeight} borderRadius={16} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
