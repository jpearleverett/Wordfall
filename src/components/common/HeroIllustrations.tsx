import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants';

export function HomeHeroIllustration() {
  return (
    <View style={styles.homeScene}>
      {/* Ambient glow behind the board */}
      <View style={styles.ambientGlow} />

      <LinearGradient
        colors={['rgba(8, 12, 35, 0.92)', 'rgba(14, 18, 52, 0.78)', 'rgba(8, 12, 35, 0.88)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.boardCard}
      >
        {/* Top edge highlight */}
        <LinearGradient
          colors={['rgba(0, 212, 255, 0.12)', 'rgba(0, 212, 255, 0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.boardCardTopHighlight}
        />
        {/* Inner glow overlay */}
        <View style={styles.boardCardGlow} />
        <View style={styles.boardCardGlowSecondary} />

        <View style={styles.boardRow}>
          {['W', 'O', 'R', 'D'].map((letter, index) => {
            const isAccent = index === 1;
            const isGold = index === 2;
            const gradientColors: [string, string, string] = isAccent
              ? ['#00e5ff', '#00bbdd', '#0099cc']
              : isGold
              ? ['#ffe066', '#ffd700', '#f0a500']
              : ['#1e2460', '#252d72', '#2a3078'];
            return (
              <View
                key={letter}
                style={[
                  styles.tileOuter,
                  isAccent && styles.tileAccentShadow,
                  isGold && styles.tileGoldShadow,
                  !isAccent && !isGold && styles.tileDefaultShadow,
                ]}
              >
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={styles.tile}
                >
                  {/* Inner highlight on tile */}
                  <View style={[
                    styles.tileInnerHighlight,
                    isAccent && { backgroundColor: 'rgba(255,255,255,0.25)' },
                    isGold && { backgroundColor: 'rgba(255,255,255,0.2)' },
                  ]} />
                  <Text style={[
                    styles.tileLetter,
                    isAccent && styles.tileLetterAccent,
                    isGold && styles.tileLetterGold,
                  ]}>
                    {letter}
                  </Text>
                </LinearGradient>
              </View>
            );
          })}
        </View>
        <View style={styles.boardRow}>
          {['F', 'A', 'L', 'L'].map((letter, index) => {
            const isAccent = index === 3;
            const gradientColors: [string, string, string] = isAccent
              ? ['#00e5ff', '#00bbdd', '#0099cc']
              : ['#1e2460', '#252d72', '#2a3078'];
            return (
              <View
                key={`${letter}-${index}`}
                style={[
                  styles.tileOuter,
                  isAccent && styles.tileAccentShadow,
                  !isAccent && styles.tileDefaultShadow,
                ]}
              >
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={styles.tile}
                >
                  <View style={[
                    styles.tileInnerHighlight,
                    isAccent && { backgroundColor: 'rgba(255,255,255,0.25)' },
                  ]} />
                  <Text style={[
                    styles.tileLetter,
                    isAccent && styles.tileLetterAccent,
                  ]}>
                    {letter}
                  </Text>
                </LinearGradient>
              </View>
            );
          })}
        </View>

        {/* Combo pill with rich gradient */}
        <LinearGradient
          colors={['rgba(255, 107, 107, 0.35)', 'rgba(255, 50, 50, 0.18)', 'rgba(255, 107, 107, 0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.comboPill}
        >
          <View style={styles.comboPillInnerGlow} />
          <Text style={styles.comboText}>3x CHAIN</Text>
        </LinearGradient>
      </LinearGradient>

      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeIcon}>{'\u2605'}</Text>
        <Text style={styles.heroBadgeText}>Premium puzzle flow</Text>
      </View>
    </View>
  );
}

export function LibraryHeroIllustration() {
  return (
    <View style={styles.libraryScene}>
      {/* Background ambient glow */}
      <View style={styles.libraryAmbientGlow} />

      <LinearGradient
        colors={['rgba(14, 18, 50, 0.82)', 'rgba(12, 16, 44, 0.72)', 'rgba(9, 13, 34, 0.68)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.archFrame}
      >
        {/* Window glow with layered radial feel */}
        <View style={styles.windowGlowOutermost} />
        <View style={styles.windowGlow} />
        <View style={styles.windowGlowInner} />
        <View style={styles.windowGlowCore} />

        <View style={styles.bookshelf}>
          <LinearGradient
            colors={['rgba(255,255,255,0.16)', 'rgba(255,215,0,0.06)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shelf}
          />
          <View style={styles.bookRow}>
            <LinearGradient colors={['#00f0ff', '#00bbdd', '#0088aa']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.bookSpineHighlight} />
            </LinearGradient>
            <LinearGradient colors={['#ffe066', '#ffd700', '#e6a800']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.bookSpineHighlight} />
            </LinearGradient>
            <LinearGradient colors={['#d8a5ff', '#a855f7', '#7c3aed']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.bookSpineHighlight} />
            </LinearGradient>
            <LinearGradient colors={['#ffcc70', '#ff9f43', '#e67e22']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.bookSpineHighlight} />
            </LinearGradient>
          </View>
          <LinearGradient
            colors={['rgba(255,255,255,0.16)', 'rgba(255,215,0,0.06)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shelf}
          />
          <View style={styles.bookRow}>
            <LinearGradient colors={['#66ff99', '#4caf50', '#2e7d32']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.bookSpineHighlight} />
            </LinearGradient>
            <LinearGradient colors={['#00f0ff', '#00bbdd', '#0088aa']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.bookSpineHighlight} />
            </LinearGradient>
            <LinearGradient colors={['#d8a5ff', '#a855f7', '#7c3aed']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.bookSpineHighlight} />
            </LinearGradient>
            <LinearGradient colors={['#ffe066', '#ffd700', '#e6a800']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.bookSpineHighlight} />
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>

      {/* Floor glow - layered for richer effect */}
      <View style={styles.floorGlowOutermost} />
      <View style={styles.floorGlowOuter} />
      <View style={styles.floorGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  homeScene: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 18,
  },
  ambientGlow: {
    position: 'absolute',
    top: -20,
    left: '10%',
    width: '80%',
    height: 120,
    backgroundColor: 'rgba(0, 212, 255, 0.06)',
    borderRadius: 80,
  },
  boardCard: {
    alignSelf: 'stretch',
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 212, 255, 0.22)',
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 20,
  },
  boardCardTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  boardCardGlow: {
    position: 'absolute',
    top: -50,
    left: '15%',
    width: '70%',
    height: 100,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderRadius: 60,
  },
  boardCardGlowSecondary: {
    position: 'absolute',
    bottom: -30,
    right: '10%',
    width: '50%',
    height: 60,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    borderRadius: 40,
  },
  boardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tileOuter: {
    borderRadius: 14,
  },
  tileDefaultShadow: {
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  tileAccentShadow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  tileGoldShadow: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  tileInnerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  tileLetter: {
    color: COLORS.textPrimary,
    fontWeight: '900',
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tileLetterAccent: {
    textShadowColor: 'rgba(0, 212, 255, 0.5)',
    textShadowRadius: 8,
  },
  tileLetterGold: {
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowRadius: 8,
  },
  comboPill: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    overflow: 'hidden',
  },
  comboPillInnerGlow: {
    position: 'absolute',
    top: -4,
    left: '20%',
    width: '60%',
    height: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 20,
  },
  comboText: {
    color: COLORS.coral,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontSize: 13,
    textShadowColor: COLORS.coralGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  heroBadge: {
    marginTop: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  heroBadgeIcon: {
    color: COLORS.gold,
    fontSize: 14,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  heroBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  libraryScene: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  libraryAmbientGlow: {
    position: 'absolute',
    top: 10,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 215, 0, 0.04)',
  },
  archFrame: {
    width: 180,
    height: 210,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  windowGlowOutermost: {
    position: 'absolute',
    top: 8,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  windowGlow: {
    position: 'absolute',
    top: 18,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
  },
  windowGlowInner: {
    position: 'absolute',
    top: 34,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  windowGlowCore: {
    position: 'absolute',
    top: 44,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.4)',
  },
  bookshelf: {
    width: 130,
    marginBottom: 26,
  },
  shelf: {
    height: 8,
    borderRadius: 999,
    marginBottom: 10,
  },
  bookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  book: {
    width: 24,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
  },
  bookSpineHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 6,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  floorGlowOutermost: {
    marginTop: 8,
    width: 200,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 212, 255, 0.03)',
    alignSelf: 'center',
  },
  floorGlowOuter: {
    marginTop: -24,
    width: 180,
    height: 30,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 212, 255, 0.06)',
    alignSelf: 'center',
  },
  floorGlow: {
    marginTop: -18,
    width: 130,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 212, 255, 0.16)',
    alignSelf: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
});
