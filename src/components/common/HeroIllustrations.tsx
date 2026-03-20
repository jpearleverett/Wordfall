import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants';

export function HomeHeroIllustration() {
  return (
    <View style={styles.homeScene}>
      <View style={styles.boardCard}>
        <View style={styles.boardRow}>
          {['W', 'O', 'R', 'D'].map((letter, index) => (
            <View key={letter} style={[styles.tile, index === 1 && styles.tileAccent, index === 2 && styles.tileGold]}>
              <Text style={styles.tileLetter}>{letter}</Text>
            </View>
          ))}
        </View>
        <View style={styles.boardRow}>
          {['F', 'A', 'L', 'L'].map((letter, index) => (
            <View key={`${letter}-${index}`} style={[styles.tile, index === 3 && styles.tileAccent]}>
              <Text style={styles.tileLetter}>{letter}</Text>
            </View>
          ))}
        </View>
        <View style={styles.comboPill}>
          <Text style={styles.comboText}>3x CHAIN</Text>
        </View>
      </View>
      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeIcon}>★</Text>
        <Text style={styles.heroBadgeText}>Premium puzzle flow</Text>
      </View>
    </View>
  );
}

export function LibraryHeroIllustration() {
  return (
    <View style={styles.libraryScene}>
      <View style={styles.archFrame}>
        <View style={styles.windowGlow} />
        <View style={styles.bookshelf}>
          <View style={styles.shelf} />
          <View style={styles.bookRow}>
            <View style={[styles.book, styles.bookCyan]} />
            <View style={[styles.book, styles.bookGold]} />
            <View style={[styles.book, styles.bookPurple]} />
            <View style={[styles.book, styles.bookOrange]} />
          </View>
          <View style={styles.shelf} />
          <View style={styles.bookRow}>
            <View style={[styles.book, styles.bookGreen]} />
            <View style={[styles.book, styles.bookCyan]} />
            <View style={[styles.book, styles.bookPurple]} />
            <View style={[styles.book, styles.bookGold]} />
          </View>
        </View>
      </View>
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
    backgroundColor: 'rgba(8, 12, 35, 0.65)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  boardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.cellDefault,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tileAccent: {
    backgroundColor: COLORS.accent,
  },
  tileGold: {
    backgroundColor: COLORS.gold,
  },
  tileLetter: {
    color: COLORS.textPrimary,
    fontWeight: '900',
    fontSize: 18,
  },
  comboPill: {
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 107, 107, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  comboText: {
    color: COLORS.coral,
    fontWeight: '800',
    letterSpacing: 1,
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
  },
  heroBadgeIcon: {
    color: COLORS.gold,
    fontSize: 14,
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
    backgroundColor: 'rgba(9, 13, 34, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  windowGlow: {
    position: 'absolute',
    top: 24,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.goldGlow,
  },
  bookshelf: {
    width: 130,
    marginBottom: 26,
  },
  shelf: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
  },
  bookCyan: { backgroundColor: COLORS.accent },
  bookGold: { backgroundColor: COLORS.gold },
  bookPurple: { backgroundColor: COLORS.purple },
  bookOrange: { backgroundColor: COLORS.orange },
  bookGreen: { backgroundColor: COLORS.green },
  floorGlow: {
    marginTop: 10,
    width: 150,
    height: 24,
    borderRadius: 999,
    backgroundColor: COLORS.accentGlow,
  },
});
