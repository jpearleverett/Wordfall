import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS } from '../constants';

interface ShareCardProps {
  score: number;
  stars: 1 | 2 | 3;
  level: number;
  mode: string;
  /** Deep-link URL to include at the bottom of the card. */
  shareUrl?: string;
}

/**
 * Off-screen renderable victory card for Phase 4C share-to-social.
 * Captured via `react-native-view-shot` and handed to `expo-sharing`.
 * Keep the layout fixed-size (1080x1080) so captures are consistent
 * across devices.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { score, stars, level, mode, shareUrl = 'wordfallgame.app' },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={styles.root}>
      <LinearGradient
        colors={[...GRADIENTS.surfaceCard]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Text style={styles.brand}>WORDFALL</Text>
      <Text style={styles.modeLabel}>{mode.toUpperCase()} · LEVEL {level}</Text>
      <View style={styles.starsRow} accessibilityLabel={`${stars} of 3 stars`}>
        {[1, 2, 3].map((i) => (
          <Text
            key={i}
            style={[styles.star, i > stars && styles.starEmpty]}
          >
            {i <= stars ? '★' : '☆'}
          </Text>
        ))}
      </View>
      <Text style={styles.scoreLabel}>SCORE</Text>
      <Text style={styles.score}>{score.toLocaleString()}</Text>
      <View style={styles.footer}>
        <Text style={styles.cta}>Beat my score</Text>
        <Text style={styles.url}>{shareUrl}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    width: 1080,
    height: 1080,
    padding: 80,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: FONTS.display ?? 'System',
    fontSize: 72,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 4,
  },
  modeLabel: {
    fontFamily: FONTS.bodyMedium ?? 'System',
    fontSize: 32,
    color: COLORS.textSecondary ?? '#B7B9E0',
    letterSpacing: 2,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  star: {
    fontSize: 180,
    color: COLORS.gold,
    marginHorizontal: 12,
  },
  starEmpty: {
    color: COLORS.purple ?? '#4A4A8A',
    opacity: 0.4,
  },
  scoreLabel: {
    fontFamily: FONTS.bodyMedium ?? 'System',
    fontSize: 36,
    color: COLORS.textSecondary ?? '#B7B9E0',
    letterSpacing: 4,
  },
  score: {
    fontFamily: FONTS.display ?? 'System',
    fontSize: 140,
    fontWeight: '900',
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  cta: {
    fontFamily: FONTS.display ?? 'System',
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.gold,
    marginBottom: 8,
  },
  url: {
    fontFamily: FONTS.bodyMedium ?? 'System',
    fontSize: 32,
    color: COLORS.textSecondary ?? '#B7B9E0',
  },
});
