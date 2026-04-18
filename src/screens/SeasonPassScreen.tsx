/**
 * SeasonPassScreen — 50-tier ladder with free + premium reward lanes.
 *
 * XP accrues from puzzle completion (wired in `useRewardWiring`). Tiers unlock
 * automatically as XP crosses thresholds; players claim rewards per-tier on
 * this screen. Premium lane is gated on `isPremium`; unlocking premium via
 * IAP (`season_pass_premium`) retroactively allows claiming all already-reached
 * premium tiers.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import {
  useEconomyStore,
  useEconomyActions,
  selectSeasonPass,
} from '../stores/economyStore';
import {
  SEASON_PASS_TIERS,
  MAX_SEASON_TIER,
  getXPProgress,
  getCurrentSeason,
  type PassReward,
  type SeasonPassState,
} from '../data/seasonPass';
import { useCommerce } from '../hooks/useCommerce';
import { usePlayerActions } from '../stores/playerStore';

interface SeasonPassScreenProps {
  onBack?: () => void;
}

const SeasonPassScreen: React.FC<SeasonPassScreenProps> = ({ onBack }) => {
  const pass = useEconomyStore(selectSeasonPass);
  const { claimSeasonPassTier } = useEconomyActions();
  const { unlockCosmetic } = usePlayerActions();
  const commerce = useCommerce();

  const [purchasing, setPurchasing] = useState(false);
  const season = useMemo(() => getCurrentSeason(), []);

  const state: SeasonPassState = pass ?? {
    seasonId: season.id,
    currentXP: 0,
    currentTier: 0,
    isPremium: false,
    claimedFreeTiers: [],
    claimedPremiumTiers: [],
    seasonStartDate: season.startDate,
    seasonEndDate: season.endDate,
  };

  const progress = useMemo(
    () => getXPProgress(state.currentXP, state.currentTier),
    [state.currentXP, state.currentTier],
  );

  const handleBuyPremium = useCallback(async () => {
    if (state.isPremium || purchasing) return;
    setPurchasing(true);
    try {
      const result = await commerce.purchaseProduct('season_pass_premium');
      if (result.success) {
        Alert.alert('Premium Unlocked!', 'You can now claim premium rewards on every reached tier.');
      } else if (result.error && result.error !== 'User cancelled') {
        Alert.alert('Purchase Failed', result.error);
      }
    } catch (e: any) {
      Alert.alert('Purchase Error', e?.message ?? 'Something went wrong');
    } finally {
      setPurchasing(false);
    }
  }, [commerce, state.isPremium, purchasing]);

  const handleClaim = useCallback(
    (tier: number, lane: 'free' | 'premium') => {
      const grant = claimSeasonPassTier(tier, lane);
      if (grant?.cosmetic) {
        void unlockCosmetic(grant.cosmetic.id);
      }
    },
    [claimSeasonPassTier, unlockCosmetic],
  );

  const renderReward = (reward: PassReward) => (
    <View style={styles.rewardInner}>
      <Text style={styles.rewardIcon}>{reward.icon}</Text>
      <Text style={styles.rewardLabel} numberOfLines={2}>
        {reward.label}
      </Text>
    </View>
  );

  const renderTier = (tier: number) => {
    const def = SEASON_PASS_TIERS[tier - 1];
    const reached = state.currentTier >= tier;
    const freeClaimed = state.claimedFreeTiers.includes(tier);
    const premiumClaimed = state.claimedPremiumTiers.includes(tier);
    const isMilestone = tier % 5 === 0;

    return (
      <View
        key={tier}
        style={[
          styles.tierRow,
          reached && styles.tierRowReached,
          isMilestone && styles.tierRowMilestone,
        ]}
      >
        <View style={styles.tierBadge}>
          <Text style={styles.tierBadgeText}>{tier}</Text>
        </View>

        <View style={[styles.rewardCell, freeClaimed && styles.rewardCellClaimed]}>
          {renderReward(def.freeReward)}
          <TouchableOpacity
            style={[
              styles.claimButton,
              (!reached || freeClaimed) && styles.claimButtonDisabled,
            ]}
            disabled={!reached || freeClaimed}
            onPress={() => handleClaim(tier, 'free')}
            accessibilityRole="button"
            accessibilityLabel={`Claim free reward for tier ${tier}`}
          >
            <Text style={styles.claimButtonText}>
              {freeClaimed ? 'CLAIMED' : reached ? 'CLAIM' : 'LOCKED'}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.rewardCell,
            styles.premiumCell,
            premiumClaimed && styles.rewardCellClaimed,
          ]}
        >
          {renderReward(def.premiumReward)}
          <TouchableOpacity
            style={[
              styles.claimButton,
              styles.claimButtonPremium,
              (!reached || premiumClaimed || !state.isPremium) && styles.claimButtonDisabled,
            ]}
            disabled={!reached || premiumClaimed || !state.isPremium}
            onPress={() => handleClaim(tier, 'premium')}
            accessibilityRole="button"
            accessibilityLabel={`Claim premium reward for tier ${tier}`}
          >
            <Text style={styles.claimButtonText}>
              {!state.isPremium
                ? 'PREMIUM'
                : premiumClaimed
                  ? 'CLAIMED'
                  : reached
                    ? 'CLAIM'
                    : 'LOCKED'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="shop" />

      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityLabel="Back">
            <Text style={styles.backText}>{'\u2190'}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>SEASON PASS</Text>
          <Text style={styles.headerSubtitle}>{season.name}</Text>
        </View>
      </View>

      <View style={styles.progressCard}>
        <LinearGradient
          colors={[COLORS.purple + '30', COLORS.cyan + '15', COLORS.surface]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.progressRow}>
          <Text style={styles.progressTier}>
            Tier {state.currentTier} / {MAX_SEASON_TIER}
          </Text>
          {state.isPremium && (
            <View style={styles.premiumPill}>
              <Text style={styles.premiumPillText}>{'\u{1F451}'} PREMIUM</Text>
            </View>
          )}
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${progress.percent}%` }]} />
        </View>
        <Text style={styles.progressXP}>
          {state.currentTier >= MAX_SEASON_TIER
            ? 'Max tier reached!'
            : `${progress.current} / ${progress.required} XP to next tier`}
        </Text>
      </View>

      {!state.isPremium && (
        <TouchableOpacity
          style={styles.premiumCta}
          onPress={handleBuyPremium}
          disabled={purchasing}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Premium Season Pass for $9.99"
        >
          <LinearGradient
            colors={[COLORS.gold, COLORS.orange]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          {purchasing ? (
            <ActivityIndicator size="small" color={COLORS.bg} />
          ) : (
            <Text style={styles.premiumCtaText}>{'UPGRADE TO PREMIUM \u2014 $9.99'}</Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.laneHeader}>
        <Text style={styles.laneHeaderText}>TIER</Text>
        <Text style={[styles.laneHeaderText, styles.laneHeaderCenter]}>FREE</Text>
        <Text style={[styles.laneHeaderText, styles.laneHeaderCenter]}>PREMIUM</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: MAX_SEASON_TIER }, (_, i) => renderTier(i + 1))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backText: { color: COLORS.textPrimary, fontSize: 20 },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.purple + '50',
    ...SHADOWS.medium,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressTier: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
  },
  premiumPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: COLORS.gold + '30',
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  premiumPillText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '800',
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.purple,
  },
  progressXP: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  premiumCta: {
    marginHorizontal: 16,
    marginBottom: 12,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  premiumCtaText: {
    color: COLORS.bg,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  laneHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  laneHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
    width: 48,
  },
  laneHeaderCenter: {
    flex: 1,
    textAlign: 'center',
    width: undefined,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.textMuted + '25',
    overflow: 'hidden',
    minHeight: 80,
  },
  tierRowReached: {
    borderColor: COLORS.purple + '55',
  },
  tierRowMilestone: {
    borderColor: COLORS.gold + '55',
  },
  tierBadge: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  tierBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  rewardCell: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumCell: {
    backgroundColor: COLORS.purple + '18',
  },
  rewardCellClaimed: {
    opacity: 0.55,
  },
  rewardInner: {
    alignItems: 'center',
    marginBottom: 6,
  },
  rewardIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  rewardLabel: {
    fontSize: 11,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
  claimButton: {
    minWidth: 76,
    height: 26,
    borderRadius: 6,
    paddingHorizontal: 8,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonPremium: {
    backgroundColor: COLORS.purple,
  },
  claimButtonDisabled: {
    backgroundColor: COLORS.textMuted + '40',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default SeasonPassScreen;
