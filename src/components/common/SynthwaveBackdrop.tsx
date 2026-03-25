import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, DimensionValue, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants';
import { LOCAL_IMAGES, LOCAL_VIDEOS } from '../../utils/localAssets';
import { VideoBackground } from './VideoBackground';

const { width: SW, height: SH } = Dimensions.get('window');

const HORIZON_Y = SH * 0.38;
const SUN_SIZE = SW * 0.38;

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
        Animated.delay(1200),
      ]),
    ).start();
  }, [anim, delay, duration]);

  return (
    <View pointerEvents="none" style={[styles.absolute, { top, left }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.08, 0.9, 0.08] }),
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.4, 0.3] }) },
          ],
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: size * 3,
        }}
      />
    </View>
  );
}

function PerspectiveGridFloor() {
  const verticalLines = useMemo(() => {
    const lines = [];
    const count = 15;
    const centerX = SW / 2;
    const spread = SW * 1.8;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const bottomX = centerX - spread / 2 + spread * t;
      const topX = centerX + (bottomX - centerX) * 0.08;
      const distFromCenter = Math.abs(t - 0.5) * 2;
      const opacity = 0.15 + (1 - distFromCenter) * 0.25;
      lines.push(
        <View
          key={`v${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: topX,
            width: 1,
            height: '100%',
            backgroundColor: `rgba(255, 45, 149, ${opacity})`,
            transform: [
              { perspective: 200 },
              { rotateZ: `${(bottomX - topX) * 0.03}deg` },
            ],
            shadowColor: COLORS.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: opacity * 0.6,
            shadowRadius: 3,
          }}
        />,
      );
    }
    return lines;
  }, []);

  const horizontalLines = useMemo(() => {
    const lines = [];
    const count = 12;
    const totalHeight = SH - HORIZON_Y;
    for (let i = 0; i < count; i++) {
      const t = Math.pow(i / count, 1.8);
      const y = t * totalHeight;
      const opacity = 0.08 + t * 0.20;
      const color = i % 3 === 0 ? COLORS.accent : COLORS.purple;
      lines.push(
        <View
          key={`h${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: y,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: color,
            opacity,
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: opacity * 0.5,
            shadowRadius: 4,
          }}
        />,
      );
    }
    return lines;
  }, []);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: HORIZON_Y,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['rgba(26,5,51,0.0)', 'rgba(26,5,51,0.60)', 'rgba(10,0,21,0.90)'] as [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
      />
      {horizontalLines}
      {verticalLines}
    </View>
  );
}

function NeonSun() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  const sunTop = HORIZON_Y - SUN_SIZE * 0.55;
  const sunLeft = (SW - SUN_SIZE) / 2;

  return (
    <View pointerEvents="none">
      <Animated.View
        style={{
          position: 'absolute',
          top: sunTop - SUN_SIZE * 0.4,
          left: sunLeft - SUN_SIZE * 0.4,
          width: SUN_SIZE * 1.8,
          height: SUN_SIZE * 1.8,
          borderRadius: SUN_SIZE * 0.9,
          backgroundColor: 'rgba(255, 45, 149, 0.08)',
          opacity: pulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 0.7],
          }),
          transform: [
            { scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) },
          ],
        }}
      />

      <Image
        source={LOCAL_IMAGES.neonSun}
        style={{
          position: 'absolute',
          top: sunTop,
          left: sunLeft,
          width: SUN_SIZE,
          height: SUN_SIZE,
          borderRadius: SUN_SIZE / 2,
        }}
        resizeMode="cover"
      />

      <View
        style={{
          position: 'absolute',
          top: HORIZON_Y - 2,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: COLORS.accent,
          opacity: 0.5,
          shadowColor: COLORS.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
        }}
      />

      <Animated.View
        style={{
          position: 'absolute',
          top: HORIZON_Y - 1,
          left: SW * 0.1,
          right: SW * 0.1,
          height: SW * 0.06,
          borderRadius: SW * 0.03,
          backgroundColor: 'rgba(0, 229, 255, 0.15)',
          opacity: pulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 0.6],
          }),
        }}
      />
    </View>
  );
}

export function SynthwaveBackdrop({ playerLevel = 1 }: { playerLevel?: number } = {}) {
  // Background evolution based on player level
  const evolution = playerLevel <= 5 ? 'easy' : playerLevel <= 15 ? 'medium' : playerLevel <= 30 ? 'hard' : 'expert';
  const starCount = evolution === 'easy' ? 10 : evolution === 'medium' ? 15 : evolution === 'hard' ? 20 : 25;

  const stars = useMemo(
    () =>
      Array.from({ length: starCount }, (_, i) => ({
        id: i,
        top: `${2 + ((i * 7 + 3) % 34)}%` as DimensionValue,
        left: `${1 + ((i * 19 + 5) % 96)}%` as DimensionValue,
        color:
          i % 7 === 0
            ? '#ff2d95'
            : i % 5 === 0
            ? '#00e5ff'
            : i % 4 === 0
            ? '#c84dff'
            : i % 3 === 0
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(255,255,255,0.6)',
        size: 1.2 + (i % 5) * 0.8,
        delay: (i * 230) % 3500,
        duration: 1000 + (i % 5) * 400,
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={['#050008', '#0d0020', '#1a0533', '#2a0845', '#1a0533', '#0d0020'] as [string, string, ...string[]]}
        locations={[0, 0.15, 0.3, 0.42, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Image
        source={LOCAL_IMAGES.bgGameplay}
        style={styles.bgImage}
        resizeMode="cover"
      />

      <VideoBackground
        source={LOCAL_VIDEOS.synthwaveGridFlow}
        opacity={0.35}
        overlayColor="rgba(26,5,51,0.3)"
      />

      <View style={styles.colorTint} />

      <NeonSun />

      <PerspectiveGridFloor />

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

      {/* Mountain silhouettes — appear at medium+ levels */}
      {(evolution === 'medium' || evolution === 'hard' || evolution === 'expert') && (
        <View pointerEvents="none" style={{ position: 'absolute', top: HORIZON_Y - SW * 0.12, left: SW * 0.05, zIndex: 1 }}>
          <View style={{
            width: 0, height: 0,
            borderLeftWidth: SW * 0.18,
            borderRightWidth: SW * 0.18,
            borderBottomWidth: SW * 0.12,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: '#2a0845',
            opacity: 0.7,
          }} />
        </View>
      )}
      {(evolution === 'hard' || evolution === 'expert') && (
        <View pointerEvents="none" style={{ position: 'absolute', top: HORIZON_Y - SW * 0.18, left: SW * 0.55, zIndex: 1 }}>
          <View style={{
            width: 0, height: 0,
            borderLeftWidth: SW * 0.22,
            borderRightWidth: SW * 0.22,
            borderBottomWidth: SW * 0.18,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: '#1a0533',
            opacity: 0.6,
          }} />
        </View>
      )}

      {/* Aurora effect — expert only */}
      {evolution === 'expert' && (
        <View pointerEvents="none" style={{
          position: 'absolute',
          top: HORIZON_Y * 0.5,
          left: SW * 0.1,
          right: SW * 0.1,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0,229,255,0.06)',
          shadowColor: '#00e5ff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 30,
        }} />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(10, 0, 21, 0.85)'] as [string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomFade}
      />

      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  absolute: {
    position: 'absolute',
  },
  colorTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(80, 0, 100, 0.12)',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SW,
    height: SH,
    opacity: 0.55,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 80,
  },
});
