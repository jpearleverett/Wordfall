import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CachedImage } from './CachedImage';
import { BACKGROUND_ASSETS } from '../../utils/assetUrls';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function GridLines() {
  return (
    <View style={styles.gridScene}>
      <View style={styles.horizonGlow} />
      {Array.from({ length: 9 }).map((_, index) => (
        <View
          key={`h-${index}`}
          style={[
            styles.horizontalLine,
            {
              bottom: index * 26,
              opacity: Math.max(0.16, 0.9 - index * 0.08),
            },
          ]}
        />
      ))}
      {Array.from({ length: 11 }).map((_, index) => {
        const offset = (index - 5) * 38;
        return (
          <View key={`v-${index}`} style={[styles.verticalLine, { left: SCREEN_WIDTH / 2 + offset, transform: [{ skewX: `${offset < 0 ? 24 : -24}deg` }] }]} />
        );
      })}
    </View>
  );
}

function Palm({ side }: { side: 'left' | 'right' }) {
  const mirrored = side === 'right';
  return (
    <View style={[styles.palmWrap, mirrored ? styles.rightPalm : styles.leftPalm]}>
      <View style={[styles.trunk, mirrored && { transform: [{ scaleX: -1 }] }]} />
      {Array.from({ length: 5 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.frond,
            {
              top: 22 + index * 14,
              transform: [
                { rotate: `${mirrored ? 36 - index * 13 : -36 + index * 13}deg` },
                { scaleX: mirrored ? -1 : 1 },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function Skyline() {
  return (
    <View style={styles.skyline}>
      {Array.from({ length: 12 }).map((_, index) => {
        const width = 18 + (index % 4) * 14;
        const height = 46 + (index % 5) * 28;
        return <View key={index} style={[styles.building, { width, height }]} />;
      })}
    </View>
  );
}

export function SynthwaveBackdrop() {
  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={['#0a0320', '#24104d', '#47145f', '#7b1c84', '#19072d']}
        locations={[0, 0.28, 0.55, 0.82, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <CachedImage uri={BACKGROUND_ASSETS.gameplayBg} overlayColor="rgba(26, 3, 50, 0.50)" overlayOpacity={0.5} blurRadius={1} />
      <View style={styles.sceneTint} />

      <View style={styles.sunWrap}>
        <LinearGradient
          colors={['#5cf7ff', '#7be8ff', '#cb7dff', '#ff6edf', '#ff67b7']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.sun}
        />
        {Array.from({ length: 8 }).map((_, index) => (
          <View key={index} style={[styles.sunStripe, { top: 38 + index * 28 }]} />
        ))}
      </View>
      <View style={styles.sunHalo} />
      <View style={styles.horizonBeam} />
      <Skyline />
      <Palm side="left" />
      <Palm side="right" />
      <GridLines />
      <LinearGradient
        colors={['rgba(7, 0, 23, 0)', 'rgba(5, 0, 18, 0.65)', 'rgba(4, 0, 16, 0.95)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomShade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  sceneTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(86, 0, 112, 0.18)',
  },
  sunWrap: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.145,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.46,
    height: SCREEN_WIDTH * 0.46,
    borderTopLeftRadius: SCREEN_WIDTH * 0.23,
    borderTopRightRadius: SCREEN_WIDTH * 0.23,
    overflow: 'hidden',
  },
  sun: {
    flex: 1,
    borderTopLeftRadius: SCREEN_WIDTH * 0.23,
    borderTopRightRadius: SCREEN_WIDTH * 0.23,
  },
  sunStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  sunHalo: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.125,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.62,
    height: SCREEN_WIDTH * 0.62,
    borderRadius: SCREEN_WIDTH * 0.31,
    backgroundColor: 'rgba(91,244,255,0.18)',
    shadowColor: '#71f1ff',
    shadowOpacity: 0.6,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
  },
  horizonBeam: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.235,
    right: 72,
    width: 54,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(119,241,255,0.26)',
    shadowColor: '#7ef6ff',
    shadowOpacity: 0.9,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  skyline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 250,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  building: {
    borderWidth: 1.5,
    borderColor: 'rgba(90,245,255,0.65)',
    backgroundColor: 'rgba(25, 29, 64, 0.16)',
    shadowColor: '#57efff',
    shadowOpacity: 0.42,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  palmWrap: {
    position: 'absolute',
    width: 120,
    height: 240,
    bottom: 315,
  },
  leftPalm: {
    left: -6,
  },
  rightPalm: {
    right: -8,
  },
  trunk: {
    position: 'absolute',
    bottom: 0,
    left: 40,
    width: 18,
    height: 138,
    borderRadius: 9,
    backgroundColor: 'rgba(27, 7, 42, 0.94)',
    transform: [{ rotate: '-12deg' }],
  },
  frond: {
    position: 'absolute',
    left: 18,
    width: 112,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,90,231,0.66)',
    shadowColor: '#ff69df',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  gridScene: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.45,
  },
  horizonGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 36,
    height: 12,
    backgroundColor: 'rgba(99,246,255,0.9)',
    shadowColor: '#63f6ff',
    shadowOpacity: 0.9,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  horizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(169,116,255,0.85)',
  },
  verticalLine: {
    position: 'absolute',
    bottom: 0,
    width: 2,
    height: SCREEN_HEIGHT * 0.43,
    backgroundColor: 'rgba(96,220,255,0.85)',
  },
  bottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
  },
});
