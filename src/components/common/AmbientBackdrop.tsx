import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants';
import { CachedImage } from './CachedImage';
import { BACKGROUND_ASSETS } from '../../utils/assetUrls';
import { SynthwaveBackdrop } from './SynthwaveBackdrop';

interface AmbientBackdropProps {
  variant?: 'home' | 'library' | 'game' | 'collections' | 'profile';
}

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
  if (variant === 'game') {
    return <SynthwaveBackdrop />;
  }

  const bgUri = getBackgroundUri(variant);

  const stars = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        id: index,
        top: `${4 + ((index * 17) % 88)}%` as DimensionValue,
        left: `${2 + ((index * 23) % 94)}%` as DimensionValue,
        color:
          index % 5 === 0
            ? '#ff2d95'
            : index % 4 === 0
            ? '#c84dff'
            : index % 3 === 0
            ? '#00e5ff'
            : index % 2 === 0
            ? 'rgba(255,255,255,0.9)'
            : 'rgba(255,255,255,0.6)',
        size: 1.5 + (index % 5) * 0.7,
        delay: (index * 320) % 3000,
        duration: 1200 + (index % 4) * 500,
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={['#08000f', '#0a0015', '#1a0533', '#12002a'] as [string, string, ...string[]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {bgUri && (
        <CachedImage
          uri={bgUri}
          overlayColor="rgba(10, 0, 21, 0.82)"
          overlayOpacity={0.82}
          blurRadius={2}
        />
      )}

      <NebulaOrb
        color="rgba(255, 45, 149, 0.35)"
        size={300}
        top="-10%"
        left="55%"
        duration={7000}
        xOffset={14}
        yOffset={16}
        opacity={0.45}
      />
      <NebulaOrb
        color="rgba(200, 77, 255, 0.30)"
        size={250}
        top="20%"
        left="-15%"
        duration={8200}
        xOffset={18}
        yOffset={20}
        opacity={0.38}
      />
      <NebulaOrb
        color="rgba(0, 229, 255, 0.20)"
        size={200}
        top="60%"
        left="70%"
        duration={9000}
        xOffset={12}
        yOffset={14}
        opacity={0.28}
      />

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

      <LinearGradient
        colors={['transparent', 'rgba(10,0,21,0.5)'] as [string, string]}
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
