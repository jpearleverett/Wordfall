import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, StyleSheet, View, DimensionValue } from 'react-native';
import { COLORS } from '../../constants';
import { LOCAL_IMAGES } from '../../utils/localAssets';
import { useReduceMotion } from '../../hooks/useReduceMotion';

// ─── Floating Diamond Sparkle ───────────────────────────────────────────
interface SparkleProps {
  size: number;
  color: string;
  top: DimensionValue;
  left: DimensionValue;
  delay: number;
  duration: number;
}

function DiamondSparkle({ size, color, top, left, delay, duration }: SparkleProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: duration * 0.4, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: duration * 0.6, useNativeDriver: true }),
      ]),
      { iterations: 3 },
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [anim, delay, duration]);

  const halfSize = size / 2;

  return (
    <View pointerEvents="none" style={[styles.sparkleWrap, { top, left }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
          transform: [
            { rotate: '45deg' },
            { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.2, 0.3] }) },
          ],
        }}
      >
        {/* 4-point star shape via overlapping views */}
        <View
          style={{
            position: 'absolute',
            top: halfSize - size * 0.08,
            left: 0,
            width: size,
            height: size * 0.16,
            backgroundColor: color,
            borderRadius: size * 0.08,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: halfSize - size * 0.08,
            width: size * 0.16,
            height: size,
            backgroundColor: color,
            borderRadius: size * 0.08,
          }}
        />
        {/* Center glow dot */}
        <View
          style={{
            position: 'absolute',
            top: halfSize - size * 0.15,
            left: halfSize - size * 0.15,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: size * 0.15,
            backgroundColor: '#fff',
            opacity: 0.9,
          }}
        />
      </Animated.View>
    </View>
  );
}

// ─── Rising Particle (for celebrations) ─────────────────────────────────
interface RisingParticleProps {
  color: string;
  startX: number;
  startY: number;
  size: number;
  delay: number;
  duration: number;
}

function RisingParticle({ color, startX, startY, size, delay, duration }: RisingParticleProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Used by CelebrationBurst — this is a ONE-SHOT burst, not a persistent
    // effect. The previous implementation wrapped the rise in Animated.loop
    // AND nested another Animated.loop for sway, producing two infinite
    // animations per particle with no cleanup. Every ceremony / word solve
    // would accumulate dozens of them and never release them.
    //
    // Now: run the rise once, and run the sway as a finite sequence timed to
    // complete before the particle fades. Both are stopped on unmount.
    const swayCycles = Math.ceil(duration / 1000);
    const swayAnimations: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < swayCycles; i++) {
      swayAnimations.push(
        Animated.timing(sway, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 600, useNativeDriver: true }),
      );
    }

    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.sequence(swayAnimations),
      ]),
    ]);
    animation.start();
    return () => {
      animation.stop();
    };
  }, [anim, delay, duration, sway]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: anim.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 0.8, 0.6, 0] }),
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -200] }) },
          { translateX: sway.interpolate({ inputRange: [-1, 1], outputRange: [-15, 15] }) },
          { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.2] }) },
        ],
      }}
    />
  );
}

// ─── Shimmer Line (light sweep across surfaces) ─────────────────────────
interface ShimmerProps {
  width: number;
  height: number;
  color?: string;
  duration?: number;
  delay?: number;
}

export function ShimmerEffect({ width, height, color = 'rgba(255,255,255,0.08)', duration = 3000, delay = 0 }: ShimmerProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.delay(1000),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [anim, delay, duration]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          width: width * 0.4,
          height,
          backgroundColor: color,
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.4, width * 1.4] }) },
            { skewX: '-20deg' },
          ],
          opacity: 0.6,
        }}
      />
    </View>
  );
}

// ─── Image-based Sparkle (uses sparkle-sprites asset) ───────────────────
function ImageSparkle({
  top,
  left,
  size,
  delay,
  duration,
}: {
  top: DimensionValue;
  left: DimensionValue;
  size: number;
  delay: number;
  duration: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: duration * 0.4, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: duration * 0.6, useNativeDriver: true }),
      ]),
      { iterations: 3 },
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [anim, delay, duration]);

  return (
    <View pointerEvents="none" style={[styles.sparkleWrap, { top, left }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.9, 0] }),
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.3, 0.4] }) },
            { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
          ],
        }}
      >
        <Image
          source={LOCAL_IMAGES.sparkleSprites}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

// ─── Ambient Sparkle Field ──────────────────────────────────────────────
interface SparkleFieldProps {
  count?: number;
  colors?: string[];
  intensity?: 'subtle' | 'medium' | 'intense';
}

const SPARKLE_COLORS = [
  '#fff',
  COLORS.accent,
  COLORS.gold,
  COLORS.purple,
  'rgba(255,255,255,0.7)',
  COLORS.teal,
];

// Hard cap on particles. Every ceremony used to pass counts of 18–26, which
// with DiamondSparkle's looping animation × 5+ ceremonies queued back-to-back
// meant 100+ infinite UI-thread animations running concurrently. Ceremonies
// are transient — users glance at them for <3s — so a smaller, tighter field
// reads just as celebratory while keeping the animation driver light.
const MAX_SPARKLES = 8;
const MAX_IMAGE_SPARKLES = 2;

export function SparkleField({
  count = 20,
  colors = SPARKLE_COLORS,
  intensity = 'subtle',
}: SparkleFieldProps) {
  count = Math.min(count, MAX_SPARKLES);
  const sizeRange = intensity === 'intense' ? [4, 12] : intensity === 'medium' ? [3, 8] : [2, 6];

  const sparkles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
        color: colors[i % colors.length],
        top: `${5 + ((i * 17 + 7) % 85)}%` as DimensionValue,
        left: `${3 + ((i * 23 + 11) % 92)}%` as DimensionValue,
        delay: (i * 280) % 3200,
        duration: 2000 + Math.random() * 2000,
      })),
    [count, colors, intensity],
  );

  // Add some image-based sparkles for intense fields (capped)
  const imageSparkles = useMemo(
    () =>
      intensity === 'intense'
        ? Array.from({ length: Math.min(MAX_IMAGE_SPARKLES, Math.max(2, Math.floor(count / 6))) }, (_, i) => ({
            id: `img_${i}`,
            size: sizeRange[1] + 4 + Math.random() * 6,
            top: `${10 + ((i * 29 + 3) % 75)}%` as DimensionValue,
            left: `${8 + ((i * 37 + 5) % 80)}%` as DimensionValue,
            delay: (i * 500) % 4000,
            duration: 2500 + Math.random() * 2000,
          }))
        : [],
    [count, intensity, sizeRange],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {sparkles.map((s) => (
        <DiamondSparkle
          key={s.id}
          size={s.size}
          color={s.color}
          top={s.top}
          left={s.left}
          delay={s.delay}
          duration={s.duration}
        />
      ))}
      {imageSparkles.map((s) => (
        <ImageSparkle
          key={s.id}
          size={s.size}
          top={s.top}
          left={s.left}
          delay={s.delay}
          duration={s.duration}
        />
      ))}
    </View>
  );
}

// ─── Celebration Burst ──────────────────────────────────────────────────
interface CelebrationBurstProps {
  centerX?: number;
  centerY?: number;
  particleCount?: number;
  colors?: string[];
}

// Bumped from 12 → 24 to match the celebratory intent of default
// `particleCount`. Still gated behind `tileBloomEnabled` Remote Config so
// Ops can drop to 12 (or disable entirely) if low-end-Android perf telemetry
// flags frame drops during celebration bursts.
const MAX_BURST_PARTICLES = 24;

export function CelebrationBurst({
  centerX = 180,
  centerY = 300,
  particleCount = 24,
  colors = SPARKLE_COLORS,
}: CelebrationBurstProps) {
  const reduceMotion = useReduceMotion();
  const cappedCount = Math.min(particleCount, MAX_BURST_PARTICLES);
  const particles = useMemo(
    () =>
      Array.from({ length: cappedCount }, (_, i) => ({
        id: i,
        color: colors[i % colors.length],
        startX: centerX + (Math.random() - 0.5) * 120,
        startY: centerY + (Math.random() - 0.5) * 40,
        size: 3 + Math.random() * 6,
        delay: Math.random() * 600,
        duration: 1800 + Math.random() * 1200,
      })),
    [centerX, centerY, cappedCount, colors],
  );

  if (reduceMotion) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p) => (
        <RisingParticle key={p.id} {...p} />
      ))}
    </View>
  );
}

// ─── Pulsing Glow Ring ──────────────────────────────────────────────────
interface GlowRingProps {
  size: number;
  color: string;
  pulseScale?: number;
}

export function PulsingGlowRing({ size, color, pulseScale = 1.15 }: GlowRingProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
      { iterations: 4 },
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [anim, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.6, 0.2] }),
        transform: [
          { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, pulseScale, 1] }) },
        ],
      }}
    />
  );
}

const styles = StyleSheet.create({
  sparkleWrap: {
    position: 'absolute',
  },
});
