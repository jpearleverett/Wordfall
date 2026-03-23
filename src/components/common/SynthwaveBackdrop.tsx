import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  DimensionValue,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants';
import { CachedImage } from './CachedImage';
import { BACKGROUND_ASSETS, UI_ASSETS } from '../../utils/assetUrls';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function GlowDot({
  top,
  left,
  size,
  color,
  opacity,
}: {
  top: DimensionValue;
  left: DimensionValue;
  size: number;
  color: string;
  opacity: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.absolute,
        {
          top,
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: size * 2.2,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    />
  );
}

function GridPlane() {
  const verticalLines = Array.from({ length: 10 }, (_, index) => index);
  const horizontalLines = Array.from({ length: 15 }, (_, index) => index);

  return (
    <View pointerEvents="none" style={styles.gridPlane}>
      {verticalLines.map((index) => {
        const center = SCREEN_WIDTH / 2;
        const x = (index / (verticalLines.length - 1)) * SCREEN_WIDTH;
        const delta = x - center;
        return (
          <View
            key={`v-${index}`}
            style={[
              styles.gridVertical,
              {
                left: x,
                transform: [
                  { translateX: -1 },
                  { perspective: 900 },
                  { rotateX: '66deg' },
                  { skewX: `${delta * 0.022}deg` },
                ],
                opacity: index === 0 || index === verticalLines.length - 1 ? 0.45 : 0.75,
              },
            ]}
          />
        );
      })}
      {horizontalLines.map((index) => (
        <View
          key={`h-${index}`}
          style={[
            styles.gridHorizontal,
            {
              bottom: 8 + index * 24,
              opacity: Math.max(0.12, 0.92 - index * 0.05),
              transform: [{ scaleX: 1 + index * 0.13 }],
            },
          ]}
        />
      ))}
    </View>
  );
}

function Skyline() {
  const buildings = [
    { left: 0.03, width: 0.05, height: 0.12 },
    { left: 0.08, width: 0.08, height: 0.18 },
    { left: 0.16, width: 0.09, height: 0.14 },
    { left: 0.75, width: 0.07, height: 0.13 },
    { left: 0.82, width: 0.08, height: 0.19 },
    { left: 0.9, width: 0.07, height: 0.11 },
  ];

  return (
    <View pointerEvents="none" style={styles.skylineWrap}>
      {buildings.map((building, index) => (
        <View
          key={index}
          style={[
            styles.building,
            {
              left: `${building.left * 100}%`,
              width: `${building.width * 100}%`,
              height: SCREEN_HEIGHT * building.height,
            },
          ]}
        />
      ))}
    </View>
  );
}

function Palm({
  side,
  bottom,
}: {
  side: 'left' | 'right';
  bottom: number;
}) {
  const isLeft = side === 'left';
  return (
    <View
      pointerEvents="none"
      style={[
        styles.palmWrap,
        isLeft ? { left: -8 } : { right: -8 },
        { bottom },
        !isLeft && { transform: [{ scaleX: -1 }] },
      ]}
    >
      <View style={styles.palmTrunk} />
      {[0, 1, 2, 3, 4].map((index) => (
        <View
          key={index}
          style={[
            styles.palmLeaf,
            {
              transform: [
                { rotate: `${-62 + index * 28}deg` },
                { translateX: 22 + index * 2 },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function SunDisc() {
  const stripes = Array.from({ length: 8 }, (_, index) => index);
  return (
    <View pointerEvents="none" style={styles.sunWrap}>
      <View style={styles.sunGlowOuter} />
      <LinearGradient
        colors={['#7cf4ff', '#7ee9ff', '#c189ff', '#ff68cf'] as [string, string, string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.sunDisc}
      >
        {stripes.map((index) => (
          <View
            key={index}
            style={[
              styles.sunStripe,
              {
                top: 18 + index * 34,
                opacity: 0.85 - index * 0.06,
              },
            ]}
          />
        ))}
        {Array.from({ length: 7 }, (_, index) => (
          <View
            key={`v-${index}`}
            style={[
              styles.sunVertical,
              { left: 34 + index * 47 },
            ]}
          />
        ))}
      </LinearGradient>
      <View style={styles.sunBaseGlow} />
    </View>
  );
}

export function SynthwaveBackdrop() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  const dots = useMemo(
    () => [
      { top: '8%' as DimensionValue, left: '14%' as DimensionValue, size: 2, color: '#fff', opacity: 0.65 },
      { top: '10%' as DimensionValue, left: '28%' as DimensionValue, size: 2.2, color: '#85f5ff', opacity: 0.85 },
      { top: '12%' as DimensionValue, left: '62%' as DimensionValue, size: 1.6, color: '#fff', opacity: 0.55 },
      { top: '7%' as DimensionValue, left: '78%' as DimensionValue, size: 2.2, color: '#ff67d2', opacity: 0.7 },
      { top: '17%' as DimensionValue, left: '86%' as DimensionValue, size: 1.8, color: '#8ef4ff', opacity: 0.72 },
    ],
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={['#12002f', '#1f0b4d', '#2c0f5d', '#15032f'] as [string, string, string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <CachedImage
        uri={BACKGROUND_ASSETS.gameplayBg}
        overlayColor="rgba(32, 0, 54, 0.76)"
        overlayOpacity={0.76}
        blurRadius={1}
      />

      <CachedImage
        uri={UI_ASSETS.scanlines}
        overlayColor="transparent"
        overlayOpacity={0}
        style={styles.scanlineImage}
        blurRadius={0}
      />

      <Animated.View
        style={[
          styles.topGlow,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.22, 0.38],
            }),
          },
        ]}
      />

      <SunDisc />
      <Skyline />
      <Palm side="left" bottom={SCREEN_HEIGHT * 0.2} />
      <Palm side="right" bottom={SCREEN_HEIGHT * 0.2} />
      <GridPlane />

      <View style={styles.midBeam} />
      <View style={styles.horizonGlow} />
      <View style={styles.bottomShade} />

      {dots.map((dot, index) => (
        <GlowDot key={index} {...dot} />
      ))}

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(9, 0, 26, 0.18)', 'rgba(5, 0, 16, 0.55)'] as [string, string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.readabilityFade}
      />
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
  scanlineImage: {
    opacity: 0.06,
    transform: [{ scale: 1.2 }],
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: -SCREEN_WIDTH * 0.1,
    right: -SCREEN_WIDTH * 0.1,
    height: SCREEN_HEIGHT * 0.42,
    backgroundColor: 'rgba(115, 76, 255, 0.55)',
    borderRadius: SCREEN_WIDTH,
  },
  sunWrap: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.14,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.44,
    height: SCREEN_WIDTH * 0.44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunGlowOuter: {
    position: 'absolute',
    width: '132%',
    height: '132%',
    borderRadius: 999,
    backgroundColor: 'rgba(125, 240, 255, 0.18)',
    shadowColor: '#86f7ff',
    shadowOpacity: 0.9,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  sunDisc: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(124, 248, 255, 0.55)',
  },
  sunStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(92, 72, 194, 0.85)',
  },
  sunVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(86, 72, 182, 0.7)',
  },
  sunBaseGlow: {
    position: 'absolute',
    bottom: -12,
    width: '88%',
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 93, 220, 0.3)',
    shadowColor: '#ff60d4',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  skylineWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SCREEN_HEIGHT * 0.265,
    height: SCREEN_HEIGHT * 0.17,
  },
  building: {
    position: 'absolute',
    bottom: 0,
    borderWidth: 1.3,
    borderColor: 'rgba(63, 223, 255, 0.72)',
    backgroundColor: 'rgba(27, 14, 61, 0.22)',
    shadowColor: '#40deff',
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  palmWrap: {
    position: 'absolute',
    width: 160,
    height: 240,
  },
  palmTrunk: {
    position: 'absolute',
    left: 62,
    bottom: 0,
    width: 10,
    height: 148,
    borderRadius: 10,
    backgroundColor: 'rgba(72, 245, 255, 0.38)',
    shadowColor: '#51efff',
    shadowOpacity: 0.65,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  palmLeaf: {
    position: 'absolute',
    left: 66,
    top: 24,
    width: 95,
    height: 2,
    backgroundColor: 'rgba(105, 242, 255, 0.68)',
    shadowColor: '#6bf1ff',
    shadowOpacity: 0.75,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  gridPlane: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SCREEN_HEIGHT * 0.105,
    height: SCREEN_HEIGHT * 0.39,
    overflow: 'hidden',
  },
  gridVertical: {
    position: 'absolute',
    bottom: -26,
    width: 2,
    height: '115%',
    backgroundColor: 'rgba(110, 159, 255, 0.72)',
    shadowColor: '#6cf4ff',
    shadowOpacity: 0.85,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  gridHorizontal: {
    position: 'absolute',
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.94,
    height: 2,
    backgroundColor: 'rgba(150, 121, 255, 0.9)',
    shadowColor: '#7fefff',
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  midBeam: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.255,
    left: '10%',
    right: '10%',
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(118, 242, 255, 0.55)',
    shadowColor: '#7af7ff',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  horizonGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SCREEN_HEIGHT * 0.285,
    height: 44,
    backgroundColor: 'rgba(0, 227, 255, 0.18)',
  },
  bottomShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.24,
    backgroundColor: 'rgba(9, 0, 28, 0.18)',
  },
  readabilityFade: {
    ...StyleSheet.absoluteFillObject,
  },
});
