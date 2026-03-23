import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CachedImage } from './CachedImage';
import { BACKGROUND_ASSETS } from '../../utils/assetUrls';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SynthwaveBackdrop() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 3800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 3800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const horizonLines = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    top: SCREEN_HEIGHT * 0.19 + i * 32,
    opacity: 0.06 - i * 0.004,
  })), []);

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={['#110224', '#23104c', '#3b1560', '#30104e', '#140024'] as [string, string, string, string, string]}
        locations={[0, 0.18, 0.48, 0.68, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <CachedImage
        uri={BACKGROUND_ASSETS.gameplayBg}
        overlayColor="rgba(24, 2, 48, 0.35)"
        overlayOpacity={0.35}
        blurRadius={0}
      />

      <LinearGradient
        colors={['rgba(17,2,36,0.58)', 'rgba(77,19,121,0.16)', 'rgba(16,2,34,0.44)'] as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.sunGlow,
          {
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.58, 0.82] }),
            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }],
          },
        ]}
      />

      <View style={styles.sunCore}>
        {horizonLines.map((line, index) => (
          <View key={index} style={[styles.horizonLine, { top: line.top, opacity: line.opacity }]} />
        ))}
      </View>

      <View style={styles.scanBeamLeft} />
      <View style={styles.scanBeamRight} />

      <LinearGradient
        colors={['rgba(0,255,255,0)', 'rgba(88,244,255,0.22)', 'rgba(0,255,255,0)'] as [string, string, string]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.midLaser}
      />

      <LinearGradient
        colors={['rgba(7,0,18,0)', 'rgba(8,0,20,0.08)', 'rgba(7,0,18,0.68)'] as [string, string, string]}
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
  sunGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.12,
    left: SCREEN_WIDTH * 0.14,
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    borderRadius: SCREEN_WIDTH * 0.36,
    backgroundColor: 'rgba(84, 245, 255, 0.28)',
    shadowColor: '#7cf0ff',
    shadowOpacity: 0.7,
    shadowRadius: 60,
  },
  sunCore: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.145,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.48,
    height: SCREEN_WIDTH * 0.48,
    borderRadius: SCREEN_WIDTH * 0.24,
    backgroundColor: 'rgba(100, 245, 255, 0.08)',
  },
  horizonLine: {
    position: 'absolute',
    left: SCREEN_WIDTH * 0.29,
    right: SCREEN_WIDTH * 0.29,
    height: 2,
    backgroundColor: '#71f5ff',
  },
  scanBeamLeft: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.11,
    left: SCREEN_WIDTH * 0.05,
    width: SCREEN_WIDTH * 0.36,
    height: SCREEN_HEIGHT * 0.55,
    backgroundColor: 'rgba(88,244,255,0.05)',
    transform: [{ skewY: '-18deg' }],
  },
  scanBeamRight: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.09,
    right: SCREEN_WIDTH * 0.14,
    width: SCREEN_WIDTH * 0.24,
    height: SCREEN_HEIGHT * 0.34,
    backgroundColor: 'rgba(88,244,255,0.05)',
    transform: [{ skewY: '14deg' }],
  },
  midLaser: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.245,
    left: SCREEN_WIDTH * 0.18,
    right: SCREEN_WIDTH * 0.18,
    height: 7,
    borderRadius: 999,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.48,
  },
});
