import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS } from '../../constants';

export function NeonPalmHero() {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2600,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.stageGlow} />
      <View style={styles.skyline}>
        {[68, 88, 72, 118, 84, 106, 78].map((height, index) => (
          <View key={index} style={[styles.building, { height, width: index % 3 === 0 ? 34 : 24 }]}>
            <View style={styles.buildingTopGlow} />
            {Array.from({ length: Math.max(2, Math.floor(height / 28)) }, (_, row) => (
              <View key={row} style={styles.windowRow}>
                {Array.from({ length: 2 }, (_, column) => (
                  <View key={column} style={[styles.window, { opacity: (row + column + index) % 2 === 0 ? 0.92 : 0.24 }]} />
                ))}
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.sunWrap}>
        <LinearGradient
          colors={GRADIENTS.synthwaveSun as unknown as [string, string, ...string[]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.sun}
        />
        {Array.from({ length: 5 }, (_, index) => (
          <View key={index} style={[styles.sunStripe, { top: 42 + index * 14, height: 3 + index }]} />
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: 6 }, (_, index) => (
          <View key={index} style={[styles.gridLineHorizontal, { top: 18 + index * 22, opacity: 0.16 + index * 0.05 }]} />
        ))}
        {[-28, -16, -8, 0, 8, 16, 28].map((deg) => (
          <View key={deg} style={[styles.gridLineVertical, { transform: [{ rotate: `${deg}deg` }] }]} />
        ))}
      </View>

      <Animated.View style={[styles.boardShell, { transform: [{ translateY }] }]}>
        <LinearGradient
          colors={['rgba(10, 10, 24, 0.96)', 'rgba(31, 0, 58, 0.92)', 'rgba(10, 10, 24, 0.94)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.board}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.boardHighlight}
          />
          <Text style={styles.boardKicker}>MIAMI AFTER DARK</Text>
          <View style={styles.tileGrid}>
            {['W', 'A', 'V', 'E', 'F', 'A', 'L', 'L'].map((letter, index) => {
              const featured = index === 2 || index === 7;
              const cyan = index === 3 || index === 4;
              const colors: [string, string, string] = featured
                ? ['#ff8bd1', '#ff2d95', '#a70074']
                : cyan
                  ? ['#8ef9ff', '#00fff5', '#00a8c4']
                  : ['#2a1248', '#3e176d', '#220e3d'];

              return (
                <LinearGradient key={`${letter}-${index}`} colors={colors} style={styles.tile}>
                  <Text style={[styles.tileLetter, (featured || cyan) && styles.tileLetterBright]}>{letter}</Text>
                </LinearGradient>
              );
            })}
          </View>
          <View style={styles.heroPillRow}>
            <LinearGradient colors={['rgba(255,45,149,0.22)', 'rgba(255,45,149,0.08)']} style={styles.heroPill}>
              <Text style={styles.heroPillText}>NEON CASCADE</Text>
            </LinearGradient>
            <LinearGradient colors={['rgba(0,255,245,0.2)', 'rgba(0,255,245,0.06)']} style={styles.heroPill}>
              <Text style={[styles.heroPillText, styles.heroPillTextCyan]}>PALM CITY</Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 240,
    marginTop: 24,
    marginBottom: 12,
    justifyContent: 'flex-end',
  },
  stageGlow: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: '78%',
    height: 144,
    borderRadius: 120,
    backgroundColor: 'rgba(255,45,149,0.12)',
  },
  skyline: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 74,
    height: 126,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  building: {
    backgroundColor: 'rgba(6, 10, 22, 0.9)',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingHorizontal: 5,
    paddingTop: 10,
  },
  buildingTopGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: 'rgba(0,255,245,0.45)',
  },
  windowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 6,
  },
  window: {
    width: 5,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#8ef9ff',
    shadowColor: '#8ef9ff',
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
  },
  sunWrap: {
    position: 'absolute',
    top: 18,
    alignSelf: 'center',
    width: 132,
    height: 74,
    overflow: 'hidden',
  },
  sun: {
    width: 132,
    height: 132,
    borderRadius: 66,
  },
  sunStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: COLORS.bg,
  },
  grid: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 52,
    height: 86,
    overflow: 'hidden',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,45,149,0.4)',
  },
  gridLineVertical: {
    position: 'absolute',
    left: '50%',
    width: 1,
    height: 96,
    backgroundColor: 'rgba(255,45,149,0.22)',
  },
  boardShell: {
    marginHorizontal: 6,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.38,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 20,
  },
  board: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  boardHighlight: {
    ...StyleSheet.absoluteFillObject,
  },
  boardKicker: {
    color: COLORS.teal,
    fontFamily: FONTS.display,
    fontSize: 10,
    letterSpacing: 2.8,
    marginBottom: 12,
    textShadowColor: COLORS.tealGlow,
    textShadowRadius: 12,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#ff2d95',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
  tileLetter: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
    fontSize: 28,
    textShadowColor: 'rgba(255,255,255,0.18)',
    textShadowRadius: 8,
  },
  tileLetterBright: {
    color: '#fff7fb',
    textShadowColor: 'rgba(255,255,255,0.32)',
  },
  heroPillRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  heroPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroPillText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  heroPillTextCyan: {
    color: COLORS.teal,
  },
});
