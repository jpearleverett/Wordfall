import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS, SCREEN_WIDTH } from '../../constants';
import { CachedImage } from './CachedImage';
import { BACKGROUND_ASSETS } from '../../utils/assetUrls';

interface AmbientBackdropProps {
  variant?: 'home' | 'library' | 'game' | 'collections' | 'profile';
}

// ─── Floating Nebula Orb ────────────────────────────────────────────────
function NebulaOrb({
  color,
  size,
  top,
  left,
  duration,
  xOffset,
  yOffset,
  opacity = 0.35,
}: {
  color: string;
  size: number;
  top: DimensionValue;
  left: DimensionValue;
  duration: number;
  xOffset: number;
  yOffset: number;
  opacity?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim, duration]);

  return (
    <View pointerEvents="none" style={[styles.orb, { top, left }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: anim.interpolate({
            inputRange: [0, 0.3, 0.7, 1],
            outputRange: [opacity * 0.6, opacity, opacity * 0.8, opacity * 0.6],
          }),
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-xOffset, xOffset, -xOffset] }) },
            { translateY: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [yOffset, -yOffset, yOffset] }) },
            { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.88, 1.12, 0.88] }) },
          ],
        }}
      />
    </View>
  );
}

// ─── Twinkling Star ─────────────────────────────────────────────────────
function TwinklingStar({
  top,
  left,
  color,
  size,
  delay,
  duration,
}: {
  top: DimensionValue;
  left: DimensionValue;
  color: string;
  size: number;
  delay: number;
  duration: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        Animated.delay(1500),
      ]),
    ).start();
  }, [anim, delay, duration]);

  return (
    <View pointerEvents="none" style={[styles.sparkle, { top, left }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.95, 0.1] }),
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.3, 0.4] }) },
          ],
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: size * 2,
        }}
      />
    </View>
  );
}

// ─── Synthwave Sun ──────────────────────────────────────────────────────
// The iconic retrowave setting sun with horizontal stripe cutouts
function SynthwaveSun() {
  const sunSize = 180;
  const stripeCount = 6;
  const stripeGap = 3;

  return (
    <View style={styles.sunContainer} pointerEvents="none">
      {/* Outer glow ring */}
      <View style={[styles.sunGlow, { width: sunSize + 80, height: (sunSize + 80) / 2 }]}>
        <LinearGradient
          colors={['rgba(255,145,0,0.15)', 'rgba(255,45,149,0.12)', 'rgba(107,0,128,0.05)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ width: sunSize + 80, height: sunSize + 80, borderRadius: (sunSize + 80) / 2 }}
        />
      </View>

      {/* Sun body — clipped to top half */}
      <View style={[styles.sunBody, { width: sunSize, height: sunSize / 2 }]}>
        <View style={{ width: sunSize, height: sunSize, borderRadius: sunSize / 2, overflow: 'hidden' }}>
          <LinearGradient
            colors={GRADIENTS.synthwaveSun as unknown as [string, string, ...string[]]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ width: sunSize, height: sunSize }}
          />

          {/* Horizontal stripe cutouts — classic retrowave look */}
          {Array.from({ length: stripeCount }, (_, i) => {
            const yPos = sunSize * 0.35 + i * (sunSize * 0.11);
            const stripeHeight = stripeGap + i * 0.8;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  top: yPos,
                  left: 0,
                  right: 0,
                  height: stripeHeight,
                  backgroundColor: '#0a0012',
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Perspective Grid Floor ─────────────────────────────────────────────
// The classic synthwave receding grid — all static Views, zero perf cost
function PerspectiveGrid() {
  const gridColor = 'rgba(255, 45, 149, 0.18)';
  const gridColorBright = 'rgba(255, 45, 149, 0.30)';

  // Horizontal lines with exponentially increasing spacing
  const hLines = useMemo(() => {
    const lines = [];
    let y = 0;
    for (let i = 0; i < 10; i++) {
      const spacing = 6 + i * i * 1.8;
      y += spacing;
      const opacity = 0.12 + (i / 10) * 0.22;
      lines.push({ y, opacity, key: i });
    }
    return lines;
  }, []);

  // Vertical lines fanning out from center vanishing point
  const vLines = useMemo(() => {
    const angles = [-32, -22, -14, -7, 0, 7, 14, 22, 32];
    return angles.map((angle, i) => ({ angle, key: i }));
  }, []);

  return (
    <View style={styles.gridFloor} pointerEvents="none">
      {/* Horizon glow line */}
      <View style={styles.horizonGlow}>
        <LinearGradient
          colors={['transparent', gridColorBright, 'transparent'] as [string, string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: '100%', height: 2 }}
        />
      </View>

      {/* Horizontal receding lines */}
      {hLines.map((line) => (
        <View
          key={line.key}
          style={{
            position: 'absolute',
            top: line.y,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: gridColor,
            opacity: line.opacity,
          }}
        />
      ))}

      {/* Vertical converging lines */}
      {vLines.map((line) => (
        <View
          key={line.key}
          style={{
            position: 'absolute',
            top: 0,
            left: SCREEN_WIDTH / 2 - 0.5,
            width: 1,
            height: 220,
            backgroundColor: gridColor,
            opacity: 0.22,
            transform: [
              { rotate: `${line.angle}deg` },
            ],
            transformOrigin: 'top center',
          }}
        />
      ))}
    </View>
  );
}

// ─── Background image for variant ───────────────────────────────────────
function getBackgroundUri(variant: string): string | null {
  switch (variant) {
    case 'home':
      return BACKGROUND_ASSETS.homeBg;
    case 'game':
      return BACKGROUND_ASSETS.gameplayBg;
    case 'library':
      return BACKGROUND_ASSETS.libraryBg;
    case 'collections':
      return BACKGROUND_ASSETS.collectionBg;
    case 'profile':
      return BACKGROUND_ASSETS.profileBg;
    default:
      return null;
  }
}

export function AmbientBackdrop({ variant = 'home' }: AmbientBackdropProps) {
  const isGame = variant === 'game';
  const bgUri = getBackgroundUri(variant);

  // 10 stars with synthwave neon colors
  const stars = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => ({
        id: index,
        top: `${4 + ((index * 17) % 88)}%` as DimensionValue,
        left: `${2 + ((index * 23) % 94)}%` as DimensionValue,
        color:
          index % 5 === 0
            ? '#ff6eb4'                      // hot pink
            : index % 4 === 0
            ? '#e0b0ff'                      // lavender
            : index % 3 === 0
            ? '#00fff5'                      // electric cyan
            : index % 2 === 0
            ? 'rgba(255,240,245,0.9)'        // warm white
            : 'rgba(255,200,230,0.6)',       // soft pink
        size: 1.5 + (index % 5) * 0.7,
        delay: (index * 320) % 3000,
        duration: 1200 + (index % 4) * 500,
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      {/* Deep synthwave background gradient */}
      <LinearGradient
        colors={GRADIENTS.bg as unknown as [string, string, ...string[]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Background image with purple-tinted overlay */}
      {bgUri && (
        <CachedImage
          uri={bgUri}
          overlayColor="rgba(10, 0, 18, 0.80)"
          overlayOpacity={0.80}
          blurRadius={2}
        />
      )}

      {/* Synthwave sky gradient — adds the purple horizon glow */}
      <LinearGradient
        colors={['transparent', 'rgba(107,0,128,0.08)', 'rgba(45,0,96,0.15)', 'rgba(107,0,128,0.06)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Nebula orbs — hot pink and violet glow */}
      <NebulaOrb
        color={isGame ? 'rgba(255,45,149,0.50)' : 'rgba(199,125,255,0.45)'}
        size={280}
        top="-8%"
        left="58%"
        duration={7000}
        xOffset={14}
        yOffset={16}
        opacity={0.4}
      />
      <NebulaOrb
        color={isGame ? 'rgba(199,125,255,0.45)' : 'rgba(255,45,149,0.50)'}
        size={240}
        top="18%"
        left="-14%"
        duration={8200}
        xOffset={18}
        yOffset={20}
        opacity={0.35}
      />

      {/* THE iconic synthwave sun — half-circle with horizontal stripes */}
      <SynthwaveSun />

      {/* Perspective grid floor — the classic receding neon grid lines */}
      <PerspectiveGrid />

      {/* Twinkling stars — neon pink, cyan, lavender */}
      {stars.map((star) => (
        <TwinklingStar
          key={star.id}
          top={star.top}
          left={star.left}
          color={star.color}
          size={star.size}
          delay={star.delay}
          duration={star.duration}
        />
      ))}

      {/* Bottom gradient fade — deep purple */}
      <LinearGradient
        colors={['transparent', 'rgba(10,0,18,0.5)'] as [string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomFade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  // Synthwave sun
  sunContainer: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sunGlow: {
    position: 'absolute',
    overflow: 'hidden',
    top: -20,
  },
  sunBody: {
    overflow: 'hidden',
  },
  // Perspective grid floor
  gridFloor: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  horizonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
