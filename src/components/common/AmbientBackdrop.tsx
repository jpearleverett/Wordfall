import React, { useEffect, useMemo } from 'react';
import { DimensionValue, Image, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import { COLORS } from '../../constants';
import { LOCAL_IMAGES } from '../../utils/localAssets';
import SynthwaveHomeBackdrop from '../home/SynthwaveHomeBackdrop';

interface AmbientBackdropProps {
  variant?: 'home' | 'library' | 'game' | 'collections' | 'profile' | 'shop' | 'leaderboard' | 'event' | 'mastery' | 'modes' | 'settings' | 'club';
  colorOverride?: {
    bg?: string;
    surface?: string;
    accent?: string;
  };
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
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withRepeat(
      withSequence(
        withTiming(1, { duration }),
        withTiming(0, { duration }),
      ),
      -1,
    );
  }, [duration]);

  const orbStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    opacity: interpolate(anim.value, [0, 0.3, 0.7, 1], [opacity * 0.6, opacity, opacity * 0.8, opacity * 0.6]),
    transform: [
      { translateX: interpolate(anim.value, [0, 0.5, 1], [-xOffset, xOffset, -xOffset]) },
      { translateY: interpolate(anim.value, [0, 0.5, 1], [yOffset, -yOffset, yOffset]) },
      { scale: interpolate(anim.value, [0, 0.5, 1], [0.88, 1.12, 0.88]) },
    ],
  }));

  return (
    <View pointerEvents="none" style={[styles.orb, { top, left }]}>
      <Animated.View style={orbStyle} />
    </View>
  );
}

function TwinklingStar({
  top,
  left,
  color,
  size,
  delay: delayMs,
  duration,
}: {
  top: DimensionValue;
  left: DimensionValue;
  color: string;
  size: number;
  delay: number;
  duration: number;
}) {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0, { duration }),
          withDelay(1500, withTiming(0, { duration: 0 })),
        ),
        -1,
      ),
    );
  }, [delayMs, duration]);

  const starStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    opacity: interpolate(anim.value, [0, 0.5, 1], [0.1, 0.95, 0.1]),
    transform: [
      { scale: interpolate(anim.value, [0, 0.5, 1], [0.4, 1.3, 0.4]) },
    ],
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: size * 2,
  }));

  return (
    <View pointerEvents="none" style={[styles.sparkle, { top, left }]}>
      <Animated.View style={starStyle} />
    </View>
  );
}

function getLocalBg(variant: string) {
  switch (variant) {
    case 'home': return LOCAL_IMAGES.bg1;
    case 'library': return LOCAL_IMAGES.bg3;
    case 'collections': return LOCAL_IMAGES.bg3;
    case 'profile': return LOCAL_IMAGES.bg4;
    case 'shop': return LOCAL_IMAGES.bg4;
    case 'leaderboard': return LOCAL_IMAGES.bg2;
    case 'event': return LOCAL_IMAGES.bg2;
    case 'mastery': return LOCAL_IMAGES.bg4;
    case 'modes': return LOCAL_IMAGES.bg2;
    case 'settings': return LOCAL_IMAGES.bg5;
    case 'club': return LOCAL_IMAGES.bg5;
    default: return null;
  }
}

export function AmbientBackdrop({ variant = 'home', colorOverride }: AmbientBackdropProps) {
  // Gate animated children on focus. When the screen is not focused, render a
  // static version (just bg image + gradients) so we don't burn CPU/GPU running
  // 3 nebula orbs + 12 twinkling stars on every inactive screen in the stack/tabs.
  const isFocused = useIsFocused();

  if (variant === 'game') {
    const gameGradient = [
      colorOverride?.bg ?? '#050008',
      colorOverride?.surface ?? '#0d0020',
      colorOverride?.accent ?? '#1a0533',
      colorOverride?.surface ?? '#2a0845',
      colorOverride?.accent ?? '#1a0533',
      colorOverride?.bg ?? '#0d0020',
    ] as [string, string, ...string[]];
    // Game screen gets a STATIC backdrop — just the sky gradient + bg image.
    // Previously this rendered SynthwaveBackdrop with a looping H.264 video,
    // an animated NeonSun, a scrolling perspective grid, and 10-25 twinkling
    // stars all running continuously during gameplay. The player never sees
    // any of it — the grid + UI chrome cover it — but the GPU was decoding
    // and compositing all of it on every frame, eating the budget that
    // should have gone to smooth drag/tap animations.
    return (
      <View pointerEvents="none" style={styles.container}>
        <LinearGradient
          colors={gameGradient}
          locations={[0, 0.15, 0.3, 0.42, 0.55, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={LOCAL_IMAGES.bg1}
          style={{
            ...StyleSheet.absoluteFillObject,
            width: '100%',
            height: '100%',
            opacity: 0.5,
          }}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', `${colorOverride?.bg ?? '#0a0015'}CC`] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomFade}
        />
      </View>
    );
  }
  if (variant === 'home') {
    return <SynthwaveHomeBackdrop focused={isFocused} />;
  }

  const localBg = getLocalBg(variant);

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

      {localBg && (
        <Image
          source={localBg}
          style={{
            ...StyleSheet.absoluteFillObject,
            width: '100%',
            height: '100%',
            opacity: 0.65,
          }}
          resizeMode="cover"
        />
      )}

      {isFocused && (
        <>
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
        </>
      )}

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
