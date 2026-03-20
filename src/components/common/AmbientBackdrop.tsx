import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants';
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
}: {
  top: DimensionValue;
  left: DimensionValue;
  color: string;
  size: number;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 800 + Math.random() * 1200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800 + Math.random() * 1200, useNativeDriver: true }),
        Animated.delay(Math.random() * 2000),
      ]),
    ).start();
  }, [anim, delay]);

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

// ─── Aurora Wave ────────────────────────────────────────────────────────
function AuroraWave({
  color,
  top,
  duration,
  height = 120,
}: {
  color: string;
  top: DimensionValue;
  duration: number;
  height?: number;
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
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left: '-20%',
        right: '-20%',
        height,
        backgroundColor: color,
        borderRadius: height / 2,
        opacity: anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.03, 0.08, 0.03],
        }),
        transform: [
          { translateX: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-30, 30, -30] }) },
          { scaleY: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.2, 0.8] }) },
        ],
      }}
    />
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

  const stars = useMemo(
    () =>
      Array.from({ length: 32 }, (_, index) => ({
        id: index,
        top: `${4 + ((index * 17) % 88)}%` as DimensionValue,
        left: `${2 + ((index * 23) % 94)}%` as DimensionValue,
        color:
          index % 5 === 0
            ? COLORS.goldLight
            : index % 4 === 0
            ? COLORS.purpleLight
            : index % 3 === 0
            ? COLORS.accentLight
            : index % 2 === 0
            ? 'rgba(255,255,255,0.9)'
            : 'rgba(255,255,255,0.6)',
        size: 1.5 + (index % 5) * 0.7,
        delay: (index * 320) % 3000,
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      {/* Deep space background gradient */}
      <LinearGradient
        colors={GRADIENTS.bg as unknown as [string, string, ...string[]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Background image with overlay */}
      {bgUri && (
        <CachedImage
          uri={bgUri}
          overlayColor="rgba(6, 9, 24, 0.82)"
          overlayOpacity={0.82}
          blurRadius={2}
        />
      )}

      {/* Aurora wave layers */}
      <AuroraWave color={COLORS.accent} top="15%" duration={8000} height={140} />
      <AuroraWave color={COLORS.purple} top="45%" duration={10000} height={100} />
      <AuroraWave color={COLORS.teal} top="70%" duration={12000} height={80} />

      {/* Nebula orbs — rich, deep color blobs */}
      <NebulaOrb
        color={isGame ? COLORS.accentGlow : COLORS.purpleGlow}
        size={280}
        top="-8%"
        left="58%"
        duration={7000}
        xOffset={14}
        yOffset={16}
        opacity={0.4}
      />
      <NebulaOrb
        color={isGame ? COLORS.purpleGlow : COLORS.accentGlow}
        size={240}
        top="18%"
        left="-14%"
        duration={8200}
        xOffset={18}
        yOffset={20}
        opacity={0.35}
      />
      <NebulaOrb
        color={COLORS.goldGlow}
        size={180}
        top="65%"
        left="68%"
        duration={9400}
        xOffset={16}
        yOffset={18}
        opacity={0.25}
      />
      <NebulaOrb
        color={COLORS.tealGlow}
        size={140}
        top="50%"
        left="78%"
        duration={10000}
        xOffset={12}
        yOffset={14}
        opacity={0.2}
      />
      <NebulaOrb
        color={COLORS.pinkGlow}
        size={120}
        top="80%"
        left="-5%"
        duration={11000}
        xOffset={10}
        yOffset={12}
        opacity={0.18}
      />

      {/* Twinkling stars */}
      {stars.map((star) => (
        <TwinklingStar
          key={star.id}
          top={star.top}
          left={star.left}
          color={star.color}
          size={star.size}
          delay={star.delay}
        />
      ))}

      {/* Bottom gradient fade for content readability */}
      <LinearGradient
        colors={['transparent', 'rgba(6,9,24,0.4)'] as [string, string]}
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
});
