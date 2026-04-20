/**
 * Pending referral reward inbox — reads users/{uid}/rewards where
 * type === 'referral' and claimed === false, renders a Claim CTA per
 * row, and on tap flips the doc to claimed + applies the local economy
 * grant (mirrors the gift inbox pattern).
 *
 * Mounted by HomeScreen only when the user is signed in and has
 * unclaimed referral rewards.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS, GRADIENTS } from '../constants';
import { firestoreService } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useEconomy } from '../contexts/EconomyContext';
import { analytics } from '../services/analytics';
import { getRemoteBoolean } from '../services/remoteConfig';

interface PendingRewardRow {
  id: string;
  gems: number;
  coins: number;
  hintTokens: number;
  lane: 'referrer' | 'referred';
  createdAt: number;
}

const ReferralPendingRewards: React.FC = () => {
  const { user } = useAuth();
  const { addCoins, addGems, addHintTokens } = useEconomy();
  const [rewards, setRewards] = useState<PendingRewardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await firestoreService.getPendingReferralRewards(user.uid);
      setRewards(list);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!getRemoteBoolean('referralEnabled')) return;
    void refresh();
  }, [refresh]);

  const handleClaim = useCallback(
    async (row: PendingRewardRow) => {
      if (!user || claimingId) return;
      setClaimingId(row.id);
      try {
        const ok = await firestoreService.markReferralRewardClaimed(
          user.uid,
          row.id,
        );
        if (!ok) return;
        if (row.coins > 0) addCoins(row.coins);
        if (row.gems > 0) addGems(row.gems);
        if (row.hintTokens > 0) addHintTokens(row.hintTokens);
        analytics.logEvent('referral_reward_claimed', {
          lane: row.lane,
          gems: row.gems,
          coins: row.coins,
          hint_tokens: row.hintTokens,
        });
        setRewards((prev) => prev.filter((r) => r.id !== row.id));
      } finally {
        setClaimingId(null);
      }
    },
    [user, claimingId, addCoins, addGems, addHintTokens],
  );

  if (!getRemoteBoolean('referralEnabled')) return null;
  if (!user) return null;
  if (!loading && rewards.length === 0) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={GRADIENTS.surfaceCard as unknown as readonly [string, string, ...string[]]}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerIcon}>{'\uD83C\uDF81'}</Text>
          <Text style={styles.title}>Referral Rewards Ready</Text>
        </View>
        {rewards.map((row) => {
          const parts: string[] = [];
          if (row.coins > 0) parts.push(`+${row.coins} coins`);
          if (row.gems > 0) parts.push(`+${row.gems} gems`);
          if (row.hintTokens > 0) parts.push(`+${row.hintTokens} hints`);
          const label =
            row.lane === 'referrer' ? 'A friend joined!' : 'Welcome bonus!';
          return (
            <View key={row.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowSublabel}>{parts.join(' · ')}</Text>
              </View>
              <Pressable
                onPress={() => handleClaim(row)}
                disabled={claimingId === row.id}
                style={({ pressed }) => [
                  styles.claimBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <LinearGradient
                  colors={GRADIENTS.button.primary as unknown as readonly [string, string, ...string[]]}
                  style={styles.claimBtnInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.claimBtnText}>
                    {claimingId === row.id ? '\u2026' : 'CLAIM'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          );
        })}
      </LinearGradient>
    </View>
  );
};

export default ReferralPendingRewards;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    ...SHADOWS.medium,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  rowSublabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  claimBtn: {
    borderRadius: 10,
    marginLeft: 10,
  },
  claimBtnInner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  claimBtnText: {
    fontFamily: FONTS.display,
    fontSize: 12,
    color: '#fff',
    letterSpacing: 1.5,
  },
});
