import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants';

export function HomeHeroIllustration() {
  return (
    <View style={styles.homeScene}>
      <LinearGradient
        colors={['rgba(8, 12, 35, 0.85)', 'rgba(14, 18, 52, 0.65)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.boardCard}
      >
        {/* Subtle inner glow overlay */}
        <View style={styles.boardCardGlow} />

        <View style={styles.boardRow}>
          {['W', 'O', 'R', 'D'].map((letter, index) => {
            const gradientColors =
              index === 1
                ? (GRADIENTS.tile.selected as unknown as [string, string])
                : index === 2
                ? (GRADIENTS.tile.hint as unknown as [string, string])
                : (GRADIENTS.tile.default as unknown as [string, string]);
            const isAccent = index === 1;
            const isGold = index === 2;
            return (
              <View
                key={letter}
                style={[
                  styles.tileOuter,
                  isAccent && styles.tileAccentShadow,
                  isGold && styles.tileGoldShadow,
                ]}
              >
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tile}
                >
                  <Text style={styles.tileLetter}>{letter}</Text>
                </LinearGradient>
              </View>
            );
          })}
        </View>
        <View style={styles.boardRow}>
          {['F', 'A', 'L', 'L'].map((letter, index) => {
            const isAccent = index === 3;
            const gradientColors = isAccent
              ? (GRADIENTS.tile.selected as unknown as [string, string])
              : (GRADIENTS.tile.default as unknown as [string, string]);
            return (
              <View
                key={`${letter}-${index}`}
                style={[styles.tileOuter, isAccent && styles.tileAccentShadow]}
              >
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tile}
                >
                  <Text style={styles.tileLetter}>{letter}</Text>
                </LinearGradient>
              </View>
            );
          })}
        </View>

        {/* Combo pill with gradient */}
        <LinearGradient
          colors={['rgba(255, 107, 107, 0.28)', 'rgba(255, 70, 70, 0.12)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.comboPill}
        >
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
      <LinearGradient
        colors={['rgba(14, 18, 50, 0.72)', 'rgba(9, 13, 34, 0.58)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.archFrame}
      >
        {/* Window glow with layered radial feel */}
        <View style={styles.windowGlow} />
        <View style={styles.windowGlowInner} />

        <View style={styles.bookshelf}>
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shelf}
          />
          <View style={styles.bookRow}>
            <LinearGradient colors={['#00e5ff', '#0099cc']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={['#ffd700', '#f0a500']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={['#c084fc', '#7c3aed']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={['#ffb347', '#ff8c00']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          </View>
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shelf}
          />
          <View style={styles.bookRow}>
            <LinearGradient colors={['#4caf50', '#2e7d32']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={['#00e5ff', '#0099cc']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={['#c084fc', '#7c3aed']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={['#ffd700', '#f0a500']} style={styles.book} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          </View>
        </View>
      </LinearGradient>

      {/* Floor glow - layered for richer effect */}
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
  boardCard: {
    alignSelf: 'stretch',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.12)',
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  boardCardGlow: {
    position: 'absolute',
    top: -40,
    left: '20%',
    width: '60%',
    height: 80,
    backgroundColor: 'rgba(0, 212, 255, 0.06)',
    borderRadius: 60,
  },
  boardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tileOuter: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  tileAccentShadow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  tileGoldShadow: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tileLetter: {
    color: COLORS.textPrimary,
    fontWeight: '900',
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  comboPill: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    shadowColor: COLORS.coral,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  comboText: {
    color: COLORS.coral,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: COLORS.coralGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  heroBadge: {
    marginTop: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroBadgeIcon: {
    color: COLORS.gold,
    fontSize: 14,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
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
  archFrame: {
    width: 180,
    height: 210,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
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
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  floorGlowOuter: {
    marginTop: 6,
    width: 180,
    height: 30,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 212, 255, 0.06)',
  },
  floorGlow: {
    marginTop: -18,
    width: 130,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    alignSelf: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
});
