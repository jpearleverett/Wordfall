import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HORIZON_Y = SCREEN_HEIGHT * 0.48;
const GRID_HEIGHT = SCREEN_HEIGHT - HORIZON_Y;
const SUN_SIZE = Math.min(SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.27);

const SUN_BANDS = Array.from({ length: 11 }, (_, index) => ({
  id: index,
  top: 18 + index * 17,
  height: index % 3 === 0 ? 5 : 8,
  opacity: index % 2 === 0 ? 0.48 : 0.36,
}));

const SKYLINE_BUILDINGS = [
  { left: 0.12, width: 0.075, height: 0.06 },
  { left: 0.2, width: 0.065, height: 0.1 },
  { left: 0.275, width: 0.085, height: 0.075 },
  { left: 0.372, width: 0.06, height: 0.12, antenna: 0.024 },
  { left: 0.44, width: 0.09, height: 0.085 },
  { left: 0.535, width: 0.07, height: 0.14, antenna: 0.035 },
  { left: 0.61, width: 0.058, height: 0.095 },
  { left: 0.676, width: 0.07, height: 0.082 },
  { left: 0.755, width: 0.08, height: 0.065 },
] as const;

const GRID_VERTICAL_LINES = Array.from({ length: 17 }, (_, index) => {
  const offset = index - 8;
  return {
    id: index,
    left: SCREEN_WIDTH / 2 + offset * SCREEN_WIDTH * 0.095,
    rotation: `${offset * 5.75}deg`,
    opacity: offset % 3 === 0 ? 0.52 : 0.3,
    width: offset % 4 === 0 ? 1.5 : 1,
  };
});

const GRID_HORIZONTAL_LINES = Array.from({ length: 10 }, (_, index) => {
  const progress = (index + 1) / 10;
  return {
    id: index,
    top: HORIZON_Y + Math.pow(progress, 1.65) * (GRID_HEIGHT - 28),
    opacity: 0.16 + progress * 0.26,
    thickness: index > 5 ? 1.5 : 1,
  };
});

const LEFT_FRONDS = [-122, -102, -78, -44, -12, 22] as const;
const RIGHT_FRONDS = [158, 134, 108, 72, 38, 6] as const;

function PalmSilhouette({
  side,
  baseX,
  baseY,
  height,
}: {
  side: 'left' | 'right';
  baseX: number;
  baseY: number;
  height: number;
}) {
  const crownX = baseX + (side === 'left' ? -42 : 42);
  const crownY = baseY - height;
  const fronds = side === 'left' ? LEFT_FRONDS : RIGHT_FRONDS;

  return (
    <View
      style={[
        styles.palmContainer,
        {
          left: baseX - 90,
          top: crownY - 120,
          width: 180,
          height: height + 150,
        },
      ]}
    >
      <View
        style={[
          styles.trunkSegment,
          {
            left: 82,
            top: height - 18,
            height: height * 0.45,
            width: 12,
            transform: [{ rotate: side === 'left' ? '-15deg' : '15deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.trunkSegment,
          {
            left: 72,
            top: height * 0.33,
            height: height * 0.42,
            width: 10,
            transform: [{ rotate: side === 'left' ? '-28deg' : '28deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.trunkSegment,
          {
            left: 62,
            top: 68,
            height: height * 0.34,
            width: 8,
            transform: [{ rotate: side === 'left' ? '-38deg' : '38deg' }],
          },
        ]}
      />

      <View
        style={[
          styles.crown,
          {
            left: crownX - baseX + 84,
            top: 72,
          },
        ]}
      >
        {fronds.map((rotation, index) => (
          <View
            key={`${side}-frond-${rotation}`}
            style={[
              styles.frond,
              {
                width: 74 + (index % 3) * 18,
                transform: [{ rotate: `${rotation}deg` }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main Synthwave Backdrop ───────────────────────────────────────────
export function SynthwaveBackdrop() {
  const skyline = useMemo(
    () =>
      SKYLINE_BUILDINGS.map((building, index) => {
        const width = SCREEN_WIDTH * building.width;
        const height = SCREEN_HEIGHT * building.height;

        return (
          <View
            key={`building-${index}`}
            style={[
              styles.building,
              {
                left: SCREEN_WIDTH * building.left,
                bottom: SCREEN_HEIGHT - (HORIZON_Y + 14),
                width,
                height,
              },
            ]}
          >
            {building.antenna ? (
              <View
                style={[
                  styles.antenna,
                  {
                    top: -(SCREEN_HEIGHT * building.antenna) + 6,
                    height: SCREEN_HEIGHT * building.antenna,
                  },
                ]}
              />
            ) : null}
          </View>
        );
      }),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      {/* Dark violet sky base */}
      <LinearGradient
        colors={['#11001f', '#1e0438', '#29054b', '#140326'] as [string, string, ...string[]]}
        locations={[0, 0.3, 0.72, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.skylineGlow} />

      <View
        style={[
          styles.sunAura,
          {
            width: SUN_SIZE * 1.34,
            height: SUN_SIZE * 1.34,
            borderRadius: SUN_SIZE,
            top: HORIZON_Y - SUN_SIZE * 0.88,
          },
        ]}
      />

      <View
        style={[
          styles.sunDisk,
          {
            width: SUN_SIZE,
            height: SUN_SIZE,
            borderRadius: SUN_SIZE / 2,
            top: HORIZON_Y - SUN_SIZE * 0.76,
          },
        ]}
      >
        <LinearGradient
          colors={['#ff9ab8', '#ffb08c', '#f5d065'] as [string, string, string]}
          locations={[0, 0.56, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {SUN_BANDS.map((band) => (
          <View
            key={`band-${band.id}`}
            style={[
              styles.sunBand,
              {
                top: `${band.top}%`,
                height: band.height,
                opacity: band.opacity,
              },
            ]}
          />
        ))}
        <View style={styles.sunMask} />
      </View>

      {/* Cyan skyline silhouette behind the board */}
      <View style={styles.skylineContainer}>{skyline}</View>

      {/* Floor perspective grid converging toward the center horizon */}
      <LinearGradient
        colors={['rgba(22, 5, 48, 0)', 'rgba(28, 7, 62, 0.86)', 'rgba(15, 4, 34, 0.96)'] as [
          string,
          string,
          string,
        ]}
        locations={[0, 0.08, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.floorBase}
      />

      <View style={styles.gridContainer}>
        {GRID_VERTICAL_LINES.map((line) => (
          <View
            key={`grid-vertical-${line.id}`}
            style={[
              styles.gridVerticalLine,
              {
                left: line.left,
                opacity: line.opacity,
                width: line.width,
                transform: [{ rotate: line.rotation }],
              },
            ]}
          />
        ))}
        {GRID_HORIZONTAL_LINES.map((line) => (
          <View
            key={`grid-horizontal-${line.id}`}
            style={[
              styles.gridHorizontalLine,
              {
                top: line.top,
                opacity: line.opacity,
                height: line.thickness,
              },
            ]}
          />
        ))}
      </View>

      <PalmSilhouette
        side="left"
        baseX={SCREEN_WIDTH * 0.19}
        baseY={SCREEN_HEIGHT * 0.83}
        height={SCREEN_HEIGHT * 0.18}
      />
      <PalmSilhouette
        side="right"
        baseX={SCREEN_WIDTH * 0.81}
        baseY={SCREEN_HEIGHT * 0.835}
        height={SCREEN_HEIGHT * 0.17}
      />

      {/* Overall color unification without reintroducing star/pulse effects */}
      <LinearGradient
        colors={['rgba(255, 71, 214, 0.06)', 'rgba(0, 0, 0, 0)', 'rgba(63, 0, 120, 0.1)'] as [
          string,
          string,
          string,
        ]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Restrained bottom fade for tray readability */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(12, 3, 24, 0.12)', 'rgba(5, 2, 14, 0.58)'] as [
          string,
          string,
          string,
        ]}
        locations={[0, 0.55, 1]}
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
  skylineGlow: {
    position: 'absolute',
    left: SCREEN_WIDTH * 0.12,
    right: SCREEN_WIDTH * 0.12,
    top: HORIZON_Y - SCREEN_HEIGHT * 0.08,
    height: SCREEN_HEIGHT * 0.16,
    borderRadius: SCREEN_WIDTH * 0.12,
    backgroundColor: 'rgba(40, 255, 245, 0.12)',
  },
  sunAura: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 111, 194, 0.17)',
  },
  sunDisk: {
    position: 'absolute',
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 219, 157, 0.22)',
  },
  sunBand: {
    position: 'absolute',
    left: '6%',
    right: '6%',
    borderRadius: 999,
    backgroundColor: 'rgba(47, 7, 73, 0.95)',
  },
  sunMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -2,
    height: '31%',
    backgroundColor: 'rgba(21, 4, 38, 0.48)',
  },
  skylineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: HORIZON_Y - SCREEN_HEIGHT * 0.14,
    height: SCREEN_HEIGHT * 0.18,
  },
  building: {
    position: 'absolute',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 239, 247, 0.82)',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  antenna: {
    position: 'absolute',
    top: '-28%',
    width: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(66, 239, 247, 0.82)',
  },
  floorBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: GRID_HEIGHT,
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridVerticalLine: {
    position: 'absolute',
    bottom: -SCREEN_HEIGHT * 0.02,
    height: GRID_HEIGHT * 1.12,
    backgroundColor: '#3de7ff',
  },
  gridHorizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#42ebff',
  },
  palmContainer: {
    position: 'absolute',
  },
  trunkSegment: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#14071f',
  },
  crown: {
    position: 'absolute',
    width: 1,
    height: 1,
  },
  frond: {
    position: 'absolute',
    height: 6,
    borderRadius: 999,
    backgroundColor: '#14071f',
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.28,
  },
});
