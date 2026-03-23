import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants';
import { CachedImage } from './CachedImage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HORIZON_Y = SCREEN_HEIGHT * 0.34;

function PalmTree({ side, bottom, scale = 1 }: { side: 'left' | 'right'; bottom: number; scale?: number }) {
  const isLeft = side === 'left';

  return (
    <View
      pointerEvents="none"
      style={[
        styles.palmWrap,
        {
          [side]: isLeft ? -26 : -18,
          bottom,
          transform: [{ scaleX: isLeft ? 1 : -1 }, { scale }],
        },
      ]}
    >
      <View style={styles.palmGlow} />
      <View style={styles.palmTrunk} />
      <View style={[styles.frond, styles.frondUp]} />
      <View style={[styles.frond, styles.frondFarUp]} />
      <View style={[styles.frond, styles.frondMid]} />
      <View style={[styles.frond, styles.frondLow]} />
      <View style={[styles.frond, styles.frondDrop]} />
    </View>
  );
}

function Skyline() {
  const buildings = [
    { left: '2%', width: 26, height: 62 },
    { left: '9%', width: 34, height: 92 },
    { left: '17%', width: 22, height: 52 },
    { left: '73%', width: 24, height: 84 },
    { left: '79%', width: 32, height: 114 },
    { left: '89%', width: 18, height: 70 },
    { left: '95%', width: 16, height: 56 },
  ];

  return (
    <View pointerEvents="none" style={styles.skylineWrap}>
      {buildings.map((building, index) => (
        <View
          key={`${building.left}-${index}`}
          style={[
            styles.building,
            {
              left: building.left as any,
              width: building.width,
              height: building.height,
            },
          ]}
        >
          <View style={styles.buildingEdge} />
        </View>
      ))}
    </View>
  );
}

export function SynthwaveBackdrop() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  const sunStripes = useMemo(
    () => Array.from({ length: 9 }, (_, index) => ({ id: index, top: 46 + index * 40 })),
    [],
  );

  const verticalSunLines = useMemo(
    () => Array.from({ length: 7 }, (_, index) => ({ id: index, left: `${12 + index * 12}%` })),
    [],
  );

  const horizontalGridLines = useMemo(
    () => Array.from({ length: 14 }, (_, index) => ({ id: index, top: index * 26 })),
    [],
  );

  const perspectiveLines = useMemo(
    () => Array.from({ length: 8 }, (_, index) => ({ id: index, offset: -220 + index * 62 })),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={['#10011f', '#230840', '#461267', '#32104f', '#160428'] as [string, string, string, string, string]}
        locations={[0, 0.18, 0.48, 0.72, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <CachedImage
        uri="https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200&q=80&auto=format"
        overlayColor="rgba(22, 0, 44, 0.78)"
        overlayOpacity={0.48}
        blurRadius={1}
      />

      <View style={styles.topNebula} />
      <View style={styles.upperGlow} />

      <Animated.View
        style={[
          styles.sunAura,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.42],
            }),
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1.06],
                }),
              },
            ],
          },
        ]}
      />

      <View style={styles.sunWrap}>
        <LinearGradient
          colors={['#61f4ff', '#71defa', '#b497ff', '#ef67d8', '#ff66c8'] as [string, string, string, string, string]}
          locations={[0, 0.26, 0.52, 0.78, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.sunDisc}
        />
        {sunStripes.map((stripe) => (
          <View key={stripe.id} style={[styles.sunStripe, { top: stripe.top }]} />
        ))}
        {verticalSunLines.map((line) => (
          <View key={line.id} style={[styles.sunVerticalLine, { left: line.left as any }]} />
        ))}
        <View style={styles.sunHorizonLine} />
      </View>

      <View style={styles.traceRow}>
        <View style={styles.traceDot} />
        <LinearGradient
          colors={['rgba(67,240,255,1)', 'rgba(202,118,255,0.6)', 'rgba(202,118,255,0)'] as [string, string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.traceLine}
        />
      </View>
      <View style={styles.glitchLine} />
      <View style={[styles.glitchLine, styles.glitchLine2]} />
      <View style={styles.glitchDust} />

      <Skyline />
      <PalmTree side="left" bottom={SCREEN_HEIGHT * 0.39} scale={1.06} />
      <PalmTree side="right" bottom={SCREEN_HEIGHT * 0.41} scale={1.1} />

      <View style={styles.horizonGlow} />
      <View style={styles.groundWrap}>
        {horizontalGridLines.map((line) => (
          <View
            key={line.id}
            style={[
              styles.gridHorizontal,
              {
                top: line.top,
                opacity: Math.max(0.18, 0.84 - line.id * 0.045),
              },
            ]}
          />
        ))}
        {perspectiveLines.map((line) => (
          <View key={line.id} style={[styles.gridPerspective, { left: SCREEN_WIDTH / 2 + line.offset }]} />
        ))}
      </View>

      <LinearGradient
        colors={['rgba(18, 0, 35, 0)', 'rgba(10, 0, 22, 0.3)', 'rgba(7, 0, 16, 0.8)'] as [string, string, string]}
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
  topNebula: {
    position: 'absolute',
    top: -120,
    left: -40,
    right: -40,
    height: 340,
    borderRadius: 220,
    backgroundColor: 'rgba(58, 0, 118, 0.28)',
    shadowColor: '#8d4dff',
    shadowOpacity: 0.55,
    shadowRadius: 90,
  },
  upperGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.12,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 1.08,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: SCREEN_WIDTH * 0.28,
    backgroundColor: 'rgba(60, 0, 140, 0.18)',
  },
  sunAura: {
    position: 'absolute',
    top: HORIZON_Y - 86,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.82,
    height: SCREEN_WIDTH * 0.46,
    borderRadius: SCREEN_WIDTH * 0.26,
    backgroundColor: 'rgba(93, 239, 255, 0.35)',
    shadowColor: '#59f0ff',
    shadowOpacity: 0.9,
    shadowRadius: 70,
  },
  sunWrap: {
    position: 'absolute',
    top: HORIZON_Y - 52,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.56,
    height: SCREEN_WIDTH * 0.56,
    borderRadius: SCREEN_WIDTH * 0.28,
    overflow: 'hidden',
  },
  sunDisc: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SCREEN_WIDTH * 0.28,
  },
  sunStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(43, 14, 92, 0.64)',
  },
  sunVerticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(52, 38, 124, 0.5)',
  },
  sunHorizonLine: {
    position: 'absolute',
    top: '52%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  traceRow: {
    position: 'absolute',
    top: HORIZON_Y + 96,
    left: '20%',
    width: '60%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  traceDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#52efff',
    shadowColor: '#52efff',
    shadowOpacity: 1,
    shadowRadius: 14,
    marginRight: 8,
  },
  traceLine: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    shadowColor: '#52efff',
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  glitchLine: {
    position: 'absolute',
    top: HORIZON_Y + 130,
    left: '7%',
    width: '86%',
    height: 2,
    backgroundColor: 'rgba(247, 108, 226, 0.18)',
  },
  glitchLine2: {
    top: HORIZON_Y + 154,
    width: '70%',
    left: '18%',
    opacity: 0.75,
  },
  glitchDust: {
    position: 'absolute',
    top: HORIZON_Y + 126,
    left: '16%',
    width: '68%',
    height: 40,
    opacity: 0.22,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(110, 228, 255, 0.12)',
  },
  skylineWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SCREEN_HEIGHT * 0.34,
    height: 132,
  },
  building: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(8, 12, 42, 0.7)',
    borderColor: 'rgba(71, 228, 255, 0.52)',
    borderWidth: 2,
    borderBottomWidth: 0,
  },
  buildingEdge: {
    position: 'absolute',
    top: 10,
    left: 4,
    right: 4,
    bottom: 10,
    borderColor: 'rgba(71, 228, 255, 0.18)',
    borderWidth: 1,
  },
  palmWrap: {
    position: 'absolute',
    width: 170,
    height: 300,
  },
  palmGlow: {
    position: 'absolute',
    top: 24,
    left: 12,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 77, 232, 0.10)',
    shadowColor: '#f45cff',
    shadowOpacity: 0.45,
    shadowRadius: 24,
  },
  palmTrunk: {
    position: 'absolute',
    bottom: 0,
    left: 68,
    width: 12,
    height: 190,
    borderRadius: 8,
    backgroundColor: 'rgba(18, 0, 34, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 102, 224, 0.18)',
    transform: [{ rotate: '-14deg' }],
  },
  frond: {
    position: 'absolute',
    top: 44,
    left: 30,
    width: 100,
    height: 2,
    backgroundColor: 'rgba(255, 96, 235, 0.55)',
    shadowColor: '#f45cff',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  frondUp: {
    transform: [{ rotate: '-68deg' }],
  },
  frondFarUp: {
    width: 92,
    top: 62,
    transform: [{ rotate: '-34deg' }],
  },
  frondMid: {
    top: 78,
    width: 108,
    transform: [{ rotate: '-6deg' }],
  },
  frondLow: {
    top: 98,
    width: 108,
    transform: [{ rotate: '24deg' }],
  },
  frondDrop: {
    top: 120,
    width: 90,
    transform: [{ rotate: '54deg' }],
  },
  horizonGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SCREEN_HEIGHT * 0.334,
    height: 22,
    backgroundColor: 'rgba(58, 229, 255, 0.4)',
    shadowColor: '#58e5ff',
    shadowOpacity: 0.9,
    shadowRadius: 26,
  },
  groundWrap: {
    position: 'absolute',
    left: -SCREEN_WIDTH * 0.05,
    right: -SCREEN_WIDTH * 0.05,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.42,
    overflow: 'hidden',
  },
  gridHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(110, 201, 255, 0.95)',
    shadowColor: '#66d3ff',
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },
  gridPerspective: {
    position: 'absolute',
    top: -14,
    bottom: -120,
    width: 2,
    backgroundColor: 'rgba(119, 191, 255, 0.72)',
    transform: [{ perspective: 500 }, { rotateX: '68deg' }],
    shadowColor: '#74c6ff',
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 290,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(0,0,0,0.26)',
    borderWidth: 28,
  },
});
