/**
 * GiftInbox — renders pending gifts the current player can claim.
 *
 * Wired into ClubScreen. Reads from `firestoreService.getPendingGifts` so it
 * works with both the legacy direct-write path and the new secure
 * `sendGift` Cloud Function (same `gifts/` schema). Claim goes through
 * `claimGiftSecure`; the server just flips `claimed:true` — the grant is
 * applied locally via EconomyContext so it still works on a cold reconnect.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { firestoreService, FirestoreGift } from '../services/firestore';
import { claimGiftSecure } from '../services/gifts';
import { useEconomyActions } from '../stores/economyStore';
import { useAuth } from '../contexts/AuthContext';
import { crashReporter } from '../services/crashReporting';

const GIFT_ICON: Record<FirestoreGift['type'], string> = {
  hint: '💡',
  tile: '🔤',
  life: '❤️',
};

const GIFT_I18N_KEY: Record<FirestoreGift['type'], string> = {
  hint: 'club.gifts.hint',
  tile: 'club.gifts.tile',
  life: 'club.gifts.life',
};

export const GiftInbox: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addHintTokens, addBoosterToken, addLives } = useEconomyActions();
  const [gifts, setGifts] = useState<FirestoreGift[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const pending = await firestoreService.getPendingGifts(user.uid);
      setGifts(pending);
    } catch (err) {
      crashReporter.captureException(err as Error, { feature: 'gifts_inbox_load' });
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyGrant = useCallback(
    (gift: FirestoreGift) => {
      const amount = Math.max(1, Math.min(gift.amount ?? 1, 10));
      if (gift.type === 'hint') addHintTokens(amount);
      else if (gift.type === 'tile') addBoosterToken('wildcardTile', amount);
      else if (gift.type === 'life') addLives(amount);
    },
    [addHintTokens, addBoosterToken, addLives],
  );

  const handleClaim = useCallback(
    async (gift: FirestoreGift) => {
      if (claimingId) return;
      setClaimingId(gift.id);
      try {
        const res = await claimGiftSecure(gift.id);
        if (res.success && !res.alreadyClaimed) {
          applyGrant(gift);
        }
        setGifts((prev) => prev.filter((g) => g.id !== gift.id));
      } catch (err) {
        Alert.alert(
          t('club.gifts.couldNotClaim'),
          t('club.gifts.tryAgainMoment'),
        );
        crashReporter.captureException(err as Error, {
          feature: 'gifts_inbox_claim',
          giftId: gift.id,
        });
      } finally {
        setClaimingId(null);
      }
    },
    [applyGrant, claimingId, t],
  );

  if (!user?.uid) return null;
  if (loading && gifts.length === 0) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }
  if (gifts.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {t('common.giftCount', { count: gifts.length })}
      </Text>
      {gifts.map((gift) => {
        const itemLabel = t(GIFT_I18N_KEY[gift.type] ?? 'club.gifts.hint');
        const fromName = gift.fromDisplayName || t('club.gifts.aFriend');
        return (
          <LinearGradient
            key={gift.id}
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.giftIcon}>{GIFT_ICON[gift.type] ?? '🎁'}</Text>
            <View style={styles.info}>
              <Text style={styles.from} numberOfLines={1}>
                {fromName}
              </Text>
              <Text style={styles.detail}>
                {t('common.giftSentYou', { count: gift.amount, item: itemLabel })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleClaim(gift)}
              disabled={claimingId === gift.id}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('club.gifts.claimA11y', { item: itemLabel, from: fromName })}
              accessibilityState={{ busy: claimingId === gift.id }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <LinearGradient
                colors={[...GRADIENTS.button.primary] as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.claimBtn}
              >
                {claimingId === gift.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.claimBtnText}>{t('club.gifts.claim')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    ...SHADOWS.soft,
  },
  giftIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  from: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  detail: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  claimBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.4,
  },
  loadingRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});

export default GiftInbox;
