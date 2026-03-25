import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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

const NeonStreakFlame: React.FC<NeonStreakFlameProps> = ({ streakDays, size = 'medium' }) => {
  const tier = getTier(streakDays);
  const config = TIER_CONFIG[tier];
  const scale = SIZE_SCALE[size];

  const flickerAnim = useRef(new Animated.Value(1)).current;

  const sparkAnims = useMemo(() => {
    return Array.from({ length: config.sparkCount }, () => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.sparkCount]);

  const sparkData = useMemo(() => {
    return Array.from({ length: config.sparkCount }, (_, i) => ({
      delay: (i * 1000) / config.sparkCount,
      offsetX: ((i % 3) - 1) * 6 * scale,
    }));
  }, [config.sparkCount, scale]);

  // Flicker animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flickerAnim, {
          toValue: config.flickerMin,
          duration: config.flickerSpeed / 2,
          useNativeDriver: true,
        }),
        Animated.timing(flickerAnim, {
          toValue: 1,
          duration: config.flickerSpeed / 2,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flickerAnim, config.flickerMin, config.flickerSpeed]);

  // Spark animations
  useEffect(() => {
    if (sparkAnims.length === 0) return;

    const animations = sparkAnims.map((anim, i) => {
      const delay = sparkData[i].delay;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(anim.translateY, {
              toValue: -20 * scale,
              duration: 900,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 900,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
    });

    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [sparkAnims, sparkData, scale]);

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
            opacity: flickerAnim,
          },
          glowShadow,
        ]}
      >
        {flameLayers}

        {/* Sparks */}
        {sparkAnims.map((anim, i) => (
          <Animated.View
            key={`spark-${i}`}
            style={[
              styles.spark,
              {
                left: (flameWidth + 12) / 2 + sparkData[i].offsetX - 1.5,
                bottom: flameHeight * 0.6,
                opacity: anim.opacity,
                transform: [{ translateY: anim.translateY }],
              },
            ]}
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
  spark: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: FLAME_CYAN,
  },
  streakText: {
    fontFamily: FONTS.display,
    color: COLORS.accent,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default React.memo(NeonStreakFlame);
