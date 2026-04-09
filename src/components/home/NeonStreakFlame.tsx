import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, cancelAnimation } from 'react-native-reanimated';
import { COLORS, FONTS, SHADOWS } from '../../constants';

interface NeonStreakFlameProps {
  streakDays: number;
  size?: 'small' | 'medium' | 'large';
}

const FLAME_PINK = '#ff2d95';
const FLAME_PURPLE = '#c84dff';
const FLAME_CYAN = '#00e5ff';
const FLAME_GOLD = '#ffb800';

type Tier = 'spark' | 'medium' | 'large' | 'inferno';

function getTier(days: number): Tier {
  if (days >= 30) return 'inferno';
  if (days >= 14) return 'large';
  if (days >= 7) return 'medium';
  return 'spark';
}

const SIZE_SCALE = { small: 0.7, medium: 1, large: 1.35 };

const TIER_CONFIG = {
  spark: { height: 24, width: 16, layers: 1, sparkCount: 0, flickerSpeed: 1600, flickerMin: 0.8 },
  medium: { height: 32, width: 20, layers: 2, sparkCount: 0, flickerSpeed: 800, flickerMin: 0.7 },
  large: { height: 44, width: 28, layers: 3, sparkCount: 3, flickerSpeed: 600, flickerMin: 0.7 },
  inferno: { height: 56, width: 34, layers: 4, sparkCount: 5, flickerSpeed: 450, flickerMin: 0.65 },
};

// Extracted spark component — each manages its own shared values (hooks rules)
function Spark({ delayMs, offsetX, scale, flameWidth, flameHeight }: {
  delayMs: number;
  offsetX: number;
  scale: number;
  flameWidth: number;
  flameHeight: number;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 900 }),
        ),
        -1,
      ),
    );
    translateY.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 100 }),
          withTiming(-20 * scale, { duration: 900 }),
        ),
        -1,
      ),
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [delayMs, scale]);

  const sparkStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: (flameWidth + 12) / 2 + offsetX - 1.5,
    bottom: flameHeight * 0.6,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: FLAME_CYAN,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={sparkStyle} />;
}

const NeonStreakFlame: React.FC<NeonStreakFlameProps> = ({ streakDays, size = 'medium' }) => {
  const tier = getTier(streakDays);
  const config = TIER_CONFIG[tier];
  const scale = SIZE_SCALE[size];

  const flicker = useSharedValue(1);

  const sparkData = useMemo(() => {
    return Array.from({ length: config.sparkCount }, (_, i) => ({
      delay: (i * 1000) / config.sparkCount,
      offsetX: ((i % 3) - 1) * 6 * scale,
    }));
  }, [config.sparkCount, scale]);

  // Flicker animation
  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(
        withTiming(config.flickerMin, { duration: config.flickerSpeed / 2 }),
        withTiming(1, { duration: config.flickerSpeed / 2 }),
      ),
      -1,
    );
    return () => cancelAnimation(flicker);
  }, [config.flickerMin, config.flickerSpeed]);

  const flameHeight = config.height * scale;
  const flameWidth = config.width * scale;

  const glowShadow =
    tier === 'inferno'
      ? { shadowColor: FLAME_PINK, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 24, elevation: 16 }
      : tier === 'large'
        ? SHADOWS.glow(FLAME_PINK)
        : tier === 'medium'
          ? SHADOWS.soft
          : {};

  const flickerStyle = useAnimatedStyle(() => ({
    opacity: flicker.value,
  }));

  const renderFlameLayer = (
    color: string,
    widthRatio: number,
    heightRatio: number,
    zIndex: number,
  ) => {
    const w = flameWidth * widthRatio;
    const h = flameHeight * heightRatio;
    return (
      <View
        key={`${color}-${zIndex}`}
        style={[
          styles.flameLayer,
          {
            width: w,
            height: h,
            backgroundColor: color,
            borderTopLeftRadius: w * 0.45,
            borderTopRightRadius: w * 0.45,
            borderBottomLeftRadius: w * 0.5,
            borderBottomRightRadius: w * 0.5,
            zIndex,
            bottom: 0,
          },
        ]}
      />
    );
  };

  const flameLayers: React.ReactNode[] = [];

  // Build layers based on tier
  flameLayers.push(renderFlameLayer(FLAME_PINK, 1, 1, 1));

  if (config.layers >= 2) {
    flameLayers.push(renderFlameLayer(FLAME_PURPLE, 0.65, 0.75, 2));
  }

  if (config.layers >= 3) {
    flameLayers.push(renderFlameLayer(FLAME_CYAN, 0.4, 0.55, 3));
  }

  if (config.layers >= 4) {
    flameLayers.push(renderFlameLayer(FLAME_GOLD, 0.25, 0.35, 4));
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.flameContainer,
          {
            width: flameWidth + 12,
            height: flameHeight + 8,
          },
          flickerStyle,
          glowShadow,
        ]}
      >
        {flameLayers}

        {/* Sparks — each is its own component to satisfy hooks rules */}
        {sparkData.map((data, i) => (
          <Spark
            key={`spark-${i}`}
            delayMs={data.delay}
            offsetX={data.offsetX}
            scale={scale}
            flameWidth={flameWidth}
            flameHeight={flameHeight}
          />
        ))}
      </Animated.View>

      <Text style={[styles.streakText, { fontSize: 12 * scale }]}>
        {streakDays}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  flameContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  flameLayer: {
    position: 'absolute',
    alignSelf: 'center',
  },
  streakText: {
    fontFamily: FONTS.display,
    color: COLORS.accent,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default React.memo(NeonStreakFlame);
