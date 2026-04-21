/**
 * FlawlessStreakCard — home-screen card that surfaces the player's current
 * flawless-solve streak (consecutive puzzles solved without hints/undos/
 * shuffle). Mirrors the compact season-pass / piggy-bank card pattern.
 *
 * Empty state: teaches what earns the streak.
 * Active state: shows the current number with a milestone hint to next tier.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants';
import { bentoPanel } from '../styles/bentoPanel';

interface FlawlessStreakCardProps {
  currentStreak: number;
  bestStreak: number;
}

const MILESTONES = [3, 5, 7, 10, 15, 20];

function getNextMilestone(current: number): number | null {
  for (const m of MILESTONES) {
    if (m > current) return m;
  }
  return null;
}

export const FlawlessStreakCard: React.FC<FlawlessStreakCardProps> = React.memo(
  ({ currentStreak, bestStreak }) => {
    const nextMilestone = useMemo(() => getNextMilestone(currentStreak), [currentStreak]);
    const toNext = nextMilestone != null ? nextMilestone - currentStreak : 0;
    const isActive = currentStreak > 0;

    return (
      <View
        style={[styles.card, isActive && styles.cardActive]}
        accessibilityRole="summary"
        accessibilityLabel={
          isActive
            ? `Flawless streak: ${currentStreak}. Best: ${bestStreak}.`
            : 'No flawless streak yet. Solve without hints, undos, or shuffle to start one.'
        }
      >
        <LinearGradient
          colors={
            isActive
              ? ([COLORS.gold + '30', COLORS.surface, COLORS.surface] as [string, string, string])
              : ([COLORS.surface, COLORS.surface, COLORS.surface] as [string, string, string])
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={styles.row}>
          <Text style={styles.icon}>{isActive ? '\u{1F31F}' : '\u{2728}'}</Text>
          <View style={styles.info}>
            <Text style={styles.title}>Flawless Streak</Text>
            {isActive ? (
              <Text style={styles.subtitle}>
                {nextMilestone != null
                  ? `${toNext} more to reach ${nextMilestone}`
                  : 'Max milestone reached!'}
              </Text>
            ) : (
              <Text style={styles.subtitleMuted}>
                Solve without hints, undos, or shuffle
              </Text>
            )}
          </View>
          <View style={styles.counter}>
            <Text style={isActive ? styles.counterNumberActive : styles.counterNumber}>
              {currentStreak}
            </Text>
            <Text style={styles.counterLabel}>
              Best {bestStreak}
            </Text>
          </View>
        </View>
      </View>
    );
  },
);

FlawlessStreakCard.displayName = 'FlawlessStreakCard';

const styles = StyleSheet.create({
  card: {
    ...bentoPanel('pink'),
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: COLORS.gold + '80',
    shadowColor: COLORS.gold,
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 30,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.gold,
    marginTop: 2,
    fontWeight: '600',
  },
  subtitleMuted: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  counter: {
    alignItems: 'center',
    minWidth: 56,
  },
  counterNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textSecondary,
    fontFamily: FONTS.display,
  },
  counterNumberActive: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.gold,
    fontFamily: FONTS.display,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 10,
  },
  counterLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
    letterSpacing: 1,
  },
});

export default FlawlessStreakCard;
