/**
 * SeasonPassHomeCard — compact home-screen entry point for the season pass.
 *
 * Shows the player's current tier, XP progress to the next tier, any
 * unclaimed-tier badge, and a "View Pass" CTA. Hidden when Remote Config
 * `seasonPassEnabled` is false.
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants';
import { bentoPanel } from '../styles/bentoPanel';
import {
  useEconomyStore,
  selectSeasonPassTier,
  selectSeasonPassXP,
  selectSeasonPassIsPremium,
  selectSeasonPassFreeUnclaimed,
  selectSeasonPassPremiumUnclaimed,
} from '../stores/economyStore';
import { getXPProgress, MAX_SEASON_TIER, getCurrentSeason } from '../data/seasonPass';
import { getRemoteBoolean } from '../services/remoteConfig';
import GameIcon from './icons/GameIcon';

interface SeasonPassHomeCardProps {
  onPress: () => void;
}

const SeasonPassHomeCard: React.FC<SeasonPassHomeCardProps> = ({ onPress }) => {
  const tier = useEconomyStore(selectSeasonPassTier);
  const xp = useEconomyStore(selectSeasonPassXP);
  const isPremium = useEconomyStore(selectSeasonPassIsPremium);
  const freeUnclaimed = useEconomyStore(selectSeasonPassFreeUnclaimed);
  const premiumUnclaimed = useEconomyStore(selectSeasonPassPremiumUnclaimed);

  const progress = useMemo(() => getXPProgress(xp, tier), [xp, tier]);
  const season = useMemo(() => getCurrentSeason(), []);
  const unclaimed = freeUnclaimed + premiumUnclaimed;

  if (!getRemoteBoolean('seasonPassEnabled')) return null;

  const atMax = tier >= MAX_SEASON_TIER;
  // Season-end finish-your-track nudge: the gem tier skip was shipped and
  // buried at the bottom of SeasonPassScreen — the one moment it converts
  // (close to the end, close to the top of the ladder) had no surface. This
  // is also the only scalable recurring gem sink, the intended consumer of
  // the tightened gem economy.
  const tiersRemaining = MAX_SEASON_TIER - tier;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(season.endDate + 'T23:59:59Z').getTime() - Date.now()) / 86_400_000),
  );
  const finishTrackNudge = !atMax && tiersRemaining <= 10 && daysLeft <= 7;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Season pass tier ${tier}, ${unclaimed} unclaimed rewards`}
    >
      <LinearGradient
        colors={[COLORS.purple + '40', COLORS.cyan + '25', COLORS.surface]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.header}>
        <View style={styles.icon}>
          <GameIcon name={isPremium ? 'crown' : 'trophy'} size={32} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {season.name}
          </Text>
          <Text style={styles.subtitle}>
            Tier {tier} / {MAX_SEASON_TIER}
            {isPremium ? ' \u2022 Premium' : ''}
          </Text>
        </View>
        {unclaimed > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unclaimed}</Text>
          </View>
        )}
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${atMax ? 100 : progress.percent}%` }]} />
        <Text style={styles.barLabel}>
          {atMax
            ? 'Max tier reached!'
            : `${progress.current} / ${progress.required} XP`}
        </Text>
      </View>

      {finishTrackNudge && (
        <Text style={styles.finishNudge}>
          {'\u23F3'} {daysLeft === 0 ? 'Last day' : `${daysLeft}d left`} \u2014 only{' '}
          {tiersRemaining} {tiersRemaining === 1 ? 'tier' : 'tiers'} to finish the track
        </Text>
      )}

      <Text style={styles.cta}>
        {finishTrackNudge
          ? 'Finish your track \u203A'
          : unclaimed > 0
            ? 'Claim rewards \u203A'
            : 'View Pass \u203A'}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    ...bentoPanel('gold'),
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: COLORS.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  barTrack: {
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    marginBottom: 8,
    justifyContent: 'center',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.purple,
  },
  barLabel: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cta: {
    textAlign: 'right',
    color: COLORS.purple,
    fontSize: 13,
    fontWeight: '700',
  },
  finishNudge: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
});

export default SeasonPassHomeCard;
