import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SCREEN_WIDTH } from '../../constants';
import { CachedImage } from './CachedImage';
import { BACKGROUND_ASSETS } from '../../utils/assetUrls';

interface AmbientBackdropProps {
  variant?: 'home' | 'library' | 'game' | 'collections' | 'profile';
}

type BackdropVariant = NonNullable<AmbientBackdropProps['variant']>;

const VARIANT_CONFIG: Record<BackdropVariant, {
  sky: [string, string, string, string];
  horizon: [string, string, string];
  orbA: string;
  orbB: string;
  grid: string;
  sunTop: string;
  skylineAccent: string;
}> = {
  home: {
    sky: ['#07000f', '#150028', '#3a0a62', '#09142f'],
    horizon: ['rgba(255,60,172,0)', 'rgba(255,60,172,0.32)', 'rgba(0,255,245,0)'],
    orbA: 'rgba(255, 45, 149, 0.55)',
    orbB: 'rgba(0, 255, 245, 0.38)',
    grid: 'rgba(255, 78, 197, 0.22)',
    sunTop: '46%',
    skylineAccent: 'rgba(0,255,245,0.6)',
  },
  game: {
    sky: ['#040009', '#120021', '#26064d', '#0c1f3d'],
    horizon: ['rgba(255,145,0,0)', 'rgba(255,145,0,0.24)', 'rgba(255,45,149,0)'],
    orbA: 'rgba(255, 145, 0, 0.4)',
    orbB: 'rgba(255, 45, 149, 0.45)',
    grid: 'rgba(255, 145, 0, 0.18)',
    sunTop: '42%',
    skylineAccent: 'rgba(255,145,0,0.45)',
  },
  library: {
    sky: ['#06000b', '#10001d', '#2e0d53', '#081731'],
    horizon: ['rgba(199,125,255,0)', 'rgba(199,125,255,0.24)', 'rgba(0,255,245,0)'],
    orbA: 'rgba(199, 125, 255, 0.42)',
    orbB: 'rgba(0, 255, 245, 0.24)',
    grid: 'rgba(199,125,255,0.18)',
    sunTop: '44%',
    skylineAccent: 'rgba(199,125,255,0.48)',
  },
  collections: {
    sky: ['#07000f', '#170127', '#42085a', '#101d3d'],
    horizon: ['rgba(255,45,149,0)', 'rgba(255,45,149,0.28)', 'rgba(255,215,0,0)'],
    orbA: 'rgba(255, 45, 149, 0.52)',
    orbB: 'rgba(255, 215, 0, 0.18)',
    grid: 'rgba(255,45,149,0.2)',
    sunTop: '47%',
    skylineAccent: 'rgba(255,215,0,0.5)',
  },
  profile: {
    sky: ['#08000f', '#140020', '#39084f', '#0b1833'],
    horizon: ['rgba(0,255,245,0)', 'rgba(0,255,245,0.24)', 'rgba(255,45,149,0)'],
    orbA: 'rgba(0, 255, 245, 0.3)',
    orbB: 'rgba(255, 45, 149, 0.45)',
    grid: 'rgba(0,255,245,0.16)',
    sunTop: '45%',
    skylineAccent: 'rgba(0,255,245,0.55)',
  },
};

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
            inputRange: [0, 0.35, 0.7, 1],
            outputRange: [opacity * 0.45, opacity, opacity * 0.72, opacity * 0.45],
          }),
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-xOffset, xOffset, -xOffset] }) },
            { translateY: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [yOffset, -yOffset, yOffset] }) },
            { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 1.12, 0.9] }) },
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
        Animated.delay(1200),
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
          opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.08, 1, 0.08] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1.35, 0.35] }) }],
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: size * 2.5,
        }}
      />
    </View>
  );
}

function ScanlineLayer() {
  return (
    <View pointerEvents="none" style={styles.scanlineLayer}>
      {Array.from({ length: 28 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.scanline,
            {
              top: index * 18,
              opacity: index % 3 === 0 ? 0.1 : 0.05,
            },
          ]}
        />
      ))}
    </View>
  );
}

function LightBeams() {
  return (
    <View pointerEvents="none" style={styles.beamLayer}>
      <LinearGradient
        colors={['rgba(255,45,149,0.18)', 'rgba(255,45,149,0)']}
        start={{ x: 0, y: 0.1 }}
        end={{ x: 1, y: 1 }}
        style={[styles.beam, styles.beamPrimary]}
      />
      <LinearGradient
        colors={['rgba(0,255,245,0.14)', 'rgba(0,255,245,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.beam, styles.beamSecondary]}
      />
    </View>
  );
}

function SynthwaveSun({ top }: { top: string }) {
  const sunSize = 220;

  return (
    <View style={[styles.sunContainer, { top }]} pointerEvents="none">
      <View style={styles.sunHaloLarge} />
      <View style={styles.sunHaloSmall} />
      <View style={[styles.sunGlow, { width: sunSize + 120, height: (sunSize + 120) / 2 }]}>
        <LinearGradient
          colors={['rgba(255,225,97,0.24)', 'rgba(255,45,149,0.2)', 'rgba(107,0,128,0.06)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ width: sunSize + 120, height: sunSize + 120, borderRadius: (sunSize + 120) / 2 }}
        />
      </View>
      <View style={[styles.sunBody, { width: sunSize, height: sunSize / 2 }]}>
        <View style={{ width: sunSize, height: sunSize, borderRadius: sunSize / 2, overflow: 'hidden' }}>
          <LinearGradient
            colors={GRADIENTS.synthwaveSun as unknown as [string, string, ...string[]]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ width: sunSize, height: sunSize }}
          />
          {Array.from({ length: 7 }, (_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: sunSize * 0.34 + i * (sunSize * 0.1),
                left: 0,
                right: 0,
                height: 3 + i,
                backgroundColor: COLORS.bg,
                opacity: 0.94,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function PerspectiveGrid({ color }: { color: string }) {
  const hLines = useMemo(() => {
    const lines = [];
    let y = 0;
    for (let i = 0; i < 12; i += 1) {
      const spacing = 7 + i * i * 2.1;
      y += spacing;
      lines.push({ y, opacity: 0.11 + i * 0.03, key: i });
    }
    return lines;
  }, []);

  const vLines = useMemo(() => [-42, -30, -18, -10, -4, 0, 4, 10, 18, 30, 42], []);

  return (
    <View style={styles.gridFloor} pointerEvents="none">
      <View style={styles.horizonGlow}>
        <LinearGradient
          colors={['transparent', color, 'transparent'] as [string, string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: '100%', height: 3 }}
        />
      </View>

      {hLines.map((line) => (
        <View
          key={line.key}
          style={{
            position: 'absolute',
            top: line.y,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: color,
            opacity: line.opacity,
          }}
        />
      ))}

      {vLines.map((angle) => (
        <View
          key={angle}
          style={{
            position: 'absolute',
            top: 0,
            left: SCREEN_WIDTH / 2 - 0.5,
            width: 1,
            height: 280,
            backgroundColor: color,
            opacity: 0.24,
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      ))}
    </View>
  );
}

function Skyline({ accent }: { accent: string }) {
  const buildings = [
    { left: '0%', width: 34, height: 98 },
    { left: '10%', width: 28, height: 128 },
    { left: '19%', width: 42, height: 84 },
    { left: '32%', width: 36, height: 152 },
    { left: '45%', width: 56, height: 118 },
    { left: '59%', width: 26, height: 92 },
    { left: '69%', width: 44, height: 144 },
    { left: '82%', width: 32, height: 105 },
    { left: '90%', width: 24, height: 74 },
  ] as const;

  return (
    <View pointerEvents="none" style={styles.skylineLayer}>
      {buildings.map((building, index) => (
        <View
          key={`${building.left}-${index}`}
          style={[
            styles.building,
            {
              left: building.left,
              width: building.width,
              height: building.height,
            },
          ]}
        >
          <View style={[styles.buildingRim, { backgroundColor: accent }]} />
          {Array.from({ length: Math.max(2, Math.floor(building.height / 34)) }, (_, row) => (
            <View key={row} style={styles.windowRow}>
              {Array.from({ length: Math.max(2, Math.floor(building.width / 10)) }, (_, col) => (
                <View
                  key={`${row}-${col}`}
                  style={[
                    styles.window,
                    {
                      opacity: (row + col + index) % 2 === 0 ? 0.8 : 0.2,
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      ))}
      <View style={styles.skylineGlowBase} />
    </View>
  );
}

function PalmSilhouette({ side }: { side: 'left' | 'right' }) {
  const trunkStyles = side === 'left' ? styles.palmLeft : styles.palmRight;
  return (
    <View pointerEvents="none" style={[styles.palm, trunkStyles]}>
      <View style={styles.palmTrunk} />
      <View style={[styles.frond, styles.frondA]} />
      <View style={[styles.frond, styles.frondB]} />
      <View style={[styles.frond, styles.frondC]} />
      <View style={[styles.frond, styles.frondD]} />
    </View>
  );
}

function getBackgroundUri(variant: BackdropVariant): string | null {
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
  const config = VARIANT_CONFIG[variant];
  const bgUri = getBackgroundUri(variant);

  const stars = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => ({
        id: index,
        top: `${3 + ((index * 11) % 50)}%` as DimensionValue,
        left: `${2 + ((index * 19) % 95)}%` as DimensionValue,
        color:
          index % 4 === 0
            ? '#ff7bc4'
            : index % 4 === 1
              ? '#00fff5'
              : index % 4 === 2
                ? '#fff0f5'
                : '#ffd76d',
        size: 1.6 + (index % 4) * 0.9,
        delay: (index * 240) % 2000,
        duration: 900 + (index % 5) * 360,
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={config.sky}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {bgUri && (
        <CachedImage
          uri={bgUri}
          overlayColor="rgba(5, 0, 10, 0.84)"
          overlayOpacity={0.86}
          blurRadius={2}
        />
      )}

      <LightBeams />
      <ScanlineLayer />

      <LinearGradient
        colors={config.horizon}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.horizonBand}
      />

      <NebulaOrb color={config.orbA} size={320} top="-10%" left="58%" duration={7600} xOffset={16} yOffset={16} opacity={0.42} />
      <NebulaOrb color={config.orbB} size={260} top="18%" left="-12%" duration={8800} xOffset={18} yOffset={22} opacity={0.34} />
      <NebulaOrb color="rgba(255, 215, 0, 0.12)" size={220} top="58%" left="68%" duration={9200} xOffset={12} yOffset={18} opacity={0.22} />

      <SynthwaveSun top={config.sunTop} />
      <Skyline accent={config.skylineAccent} />
      <PalmSilhouette side="left" />
      <PalmSilhouette side="right" />
      <PerspectiveGrid color={config.grid} />

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
        colors={['transparent', 'rgba(5, 0, 10, 0.42)', 'rgba(5, 0, 10, 0.88)']}
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
    shadowColor: '#ff2d95',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 34,
  },
  sparkle: {
    position: 'absolute',
  },
  beamLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  beam: {
    position: 'absolute',
    width: '90%',
    height: 220,
    borderRadius: 180,
  },
  beamPrimary: {
    top: -70,
    left: '-18%',
    transform: [{ rotate: '-16deg' }],
  },
  beamSecondary: {
    top: 60,
    right: '-28%',
    transform: [{ rotate: '24deg' }],
  },
  scanlineLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  horizonBand: {
    position: 'absolute',
    top: '49%',
    left: 0,
    right: 0,
    height: 90,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
  },
  sunContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sunHaloLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 45, 149, 0.07)',
    top: -82,
  },
  sunHaloSmall: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    top: -26,
  },
  sunGlow: {
    position: 'absolute',
    overflow: 'hidden',
    top: -24,
  },
  sunBody: {
    overflow: 'hidden',
  },
  skylineLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '33%',
    height: 170,
    justifyContent: 'flex-end',
  },
  skylineGlowBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 16,
    backgroundColor: 'rgba(255, 45, 149, 0.35)',
    opacity: 0.16,
  },
  building: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(4, 7, 18, 0.92)',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingTop: 12,
    paddingHorizontal: 5,
  },
  buildingRim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    opacity: 0.7,
  },
  windowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  window: {
    width: 4,
    height: 7,
    borderRadius: 2,
    backgroundColor: '#8ef9ff',
    shadowColor: '#8ef9ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  palm: {
    position: 'absolute',
    bottom: '19%',
    width: 110,
    height: 190,
    opacity: 0.82,
  },
  palmLeft: {
    left: -24,
    transform: [{ rotate: '-8deg' }],
  },
  palmRight: {
    right: -16,
    transform: [{ rotate: '8deg' }],
  },
  palmTrunk: {
    position: 'absolute',
    bottom: 0,
    left: 48,
    width: 8,
    height: 160,
    borderRadius: 8,
    backgroundColor: 'rgba(5, 8, 16, 0.95)',
  },
  frond: {
    position: 'absolute',
    top: 8,
    left: 26,
    width: 62,
    height: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(5, 8, 16, 0.95)',
  },
  frondA: {
    transform: [{ rotate: '-44deg' }],
    top: 18,
    left: 10,
  },
  frondB: {
    transform: [{ rotate: '-10deg' }],
    top: 8,
    left: 30,
    width: 72,
  },
  frondC: {
    transform: [{ rotate: '18deg' }],
    top: 12,
    left: 26,
    width: 72,
  },
  frondD: {
    transform: [{ rotate: '48deg' }],
    top: 28,
    left: 18,
    width: 56,
  },
  gridFloor: {
    position: 'absolute',
    top: '57%',
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
