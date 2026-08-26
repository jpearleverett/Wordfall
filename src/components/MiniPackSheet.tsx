/**
 * MiniPackSheet — the lightweight store bridge for zero-conversion moments.
 *
 * Before this existed, every "player wants X but has none" moment was a
 * silent dead end: the hint button was disabled at 0 tokens, booster taps
 * with empty inventory returned without a word, and every insufficient-funds
 * branch in the contextual-offer accept handler closed the offer as if the
 * player had declined. This sheet is what those moments open instead: the
 * relevant coin-shop items, the matching real-money SKUs, and (for hints)
 * the rewarded-ad path, in one dismissible modal.
 *
 * All option content comes from the pure `buildMiniPackOptions` in
 * monetizationModel.ts so display, charge, and tests share one source.
 * Coin purchases honour ShopScreen's persisted daily-limit ledger (same
 * AsyncStorage key) so the sheet cannot bypass the anti-hoarding caps.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { useEconomyStore, useEconomyActions, selectCoins, selectGems } from '../stores/economyStore';
import { useCommerce } from '../hooks/useCommerce';
import { adManager } from '../services/ads';
import { iapManager } from '../services/iap';
import { analytics } from '../services/analytics';
import { soundManager } from '../services/sound';
import GameIcon from './icons/GameIcon';
import {
  buildMiniPackOptions,
  applyCoinPurchaseToCounts,
  COIN_SHOP_TRACKING_KEY,
  MiniPackNeed,
  MiniPackOption,
} from './monetizationModel';

interface MiniPackSheetProps {
  need: MiniPackNeed;
  /** Where the sheet was opened from — analytics only. */
  source?: string;
  /**
   * 'overlay' (default): absolute-fill View, same layering scheme as
   * ContextualOffer/PostLossModal — sits UNDER MockAdModal (zIndex 999) so
   * dev-mode mock ads triggered from the sheet stay visible.
   * 'modal': wrapped in a native RN Modal — required when the sheet must
   * stack above another native Modal (NoLivesModal's gem CTA in App.tsx).
   */
  presentation?: 'overlay' | 'modal';
  /**
   * Deliver a first-letter partial hint NOW (GameScreen checks the board can
   * produce one and dispatches USE_PARTIAL_HINT). Returning true means
   * delivered; the sheet then charges FIRST_LETTER_HINT_COST_COINS was
   * already spent by the handler — charge and delivery live together at the
   * call site so the sheet can never charge-and-deliver-nothing. Only passed
   * when the sheet is opened mid-run over a live board.
   */
  onPartialHint?: () => boolean;
  onClose: () => void;
}

const NEED_TITLES: Record<MiniPackNeed, { ribbon: string; title: string }> = {
  hints: { ribbon: 'OUT OF HINTS', title: 'Get Hints' },
  gems: { ribbon: 'NOT ENOUGH GEMS', title: 'Get Gems' },
  coins: { ribbon: 'NOT ENOUGH COINS', title: 'Get Coins' },
  boosters: { ribbon: 'OUT OF BOOSTERS', title: 'Get Boosters' },
  undo: { ribbon: 'OUT OF UNDOS', title: 'Get Undos' },
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MiniPackSheet({ need, source, presentation = 'overlay', onPartialHint, onClose }: MiniPackSheetProps) {
  const coins = useEconomyStore(selectCoins);
  const gems = useEconomyStore(selectGems);
  const {
    spendCoins,
    addHintTokens,
    addBoosterToken,
    addUndoTokens,
    processAdReward,
  } = useEconomyActions();
  const { purchaseProduct } = useCommerce();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [purchasesToday, setPurchasesToday] = useState<Record<string, number>>({});
  const [iapPrices, setIapPrices] = useState<Record<string, string>>({});

  // Warm currency-localized store prices; catalog fallbacks render meanwhile.
  useEffect(() => {
    let cancelled = false;
    void iapManager
      .loadProducts()
      .then((products) => {
        if (cancelled) return;
        const prices: Record<string, string> = {};
        for (const p of products) {
          if (p.internalId && p.price) prices[p.internalId] = p.price;
        }
        setIapPrices(prices);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate the coin-shop daily ledger (shared with ShopScreen) on open so
  // sheet purchases count against the same caps.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(COIN_SHOP_TRACKING_KEY);
        if (!stored || cancelled) return;
        const parsed = JSON.parse(stored) as { date: string; counts: Record<string, number> };
        if (parsed.date === todayKey()) {
          setPurchasesToday(parsed.counts ?? {});
        }
      } catch {
        // Unreadable ledger reads as a fresh day — fail open, same as ShopScreen.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void analytics.logEvent('mini_pack_shown', { need, source: source ?? 'unknown' });
    // Fire once per mount — the sheet is mounted fresh per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdFree = adManager.getAdsRemoved();
  const options = useMemo(
    () =>
      buildMiniPackOptions(need, {
        coins,
        adAvailable: adManager.canShowAd('hint_reward'),
        isAdFree,
        purchasesToday,
        iapPriceFor: (productId) => iapPrices[productId],
        partialHintAvailable: onPartialHint !== undefined,
      }),
    [need, coins, isAdFree, purchasesToday, iapPrices, onPartialHint],
  );

  const persistCounts = useCallback((counts: Record<string, number>) => {
    void AsyncStorage.setItem(
      COIN_SHOP_TRACKING_KEY,
      JSON.stringify({ date: todayKey(), counts }),
    ).catch(() => {});
  }, []);

  const grantCoinItem = useCallback(
    (option: Extract<MiniPackOption, { kind: 'coin_item' }>): boolean => {
      const reward = option.item.reward;
      switch (reward.type) {
        case 'hint':
          addHintTokens(reward.amount ?? 1);
          return true;
        case 'booster':
          if (reward.boosterType) {
            addBoosterToken(reward.boosterType, reward.amount ?? 1);
            return true;
          }
          return false;
        case 'undo':
          addUndoTokens(reward.amount ?? 1);
          return true;
        default:
          // The sheet only lists hint/booster/undo coin items; anything else
          // is a catalog drift bug — refuse rather than charge-and-deliver-nothing.
          return false;
      }
    },
    [addHintTokens, addBoosterToken, addUndoTokens],
  );

  const handleOption = useCallback(
    async (option: MiniPackOption) => {
      if (busyId) return;
      if (option.kind === 'partial_hint') {
        if (!option.affordable || !onPartialHint) return;
        // Charge + delivery both live in the handler (GameScreen), keeping
        // the charge-and-deliver-nothing class impossible from the sheet.
        if (!onPartialHint()) return;
        void soundManager.playSound('buttonPress');
        void analytics.logEvent('mini_pack_purchase', {
          need,
          kind: 'partial_hint',
          id: option.id,
          source: source ?? 'unknown',
        });
        onClose();
        return;
      }
      if (option.kind === 'coin_item') {
        if (option.dailyLimitReached) {
          Alert.alert('Daily Limit Reached', `You've hit today's limit for ${option.title}.`);
          return;
        }
        if (!option.affordable) return;
        if (!spendCoins(option.costCoins)) return;
        if (!grantCoinItem(option)) return;
        const nextCounts = applyCoinPurchaseToCounts(purchasesToday, option.id);
        setPurchasesToday(nextCounts);
        persistCounts(nextCounts);
        void soundManager.playSound('buttonPress');
        setConfirmation(`${option.title} purchased!`);
        void analytics.logEvent('mini_pack_purchase', {
          need,
          kind: 'coin_item',
          item_id: option.id,
          cost_coins: option.costCoins,
        });
        return;
      }
      if (option.kind === 'iap') {
        setBusyId(option.id);
        try {
          const result = await purchaseProduct(option.id);
          if (result.success) {
            setConfirmation(`${option.title} purchased!`);
            void analytics.logEvent('mini_pack_purchase', {
              need,
              kind: 'iap',
              item_id: option.id,
            });
          } else if (result.error && !/cancel/i.test(result.error)) {
            Alert.alert('Purchase Failed', result.error);
          }
        } finally {
          setBusyId(null);
        }
        return;
      }
      // Rewarded ad path (hints only). adManager auto-grants for ad-free users.
      setBusyId(option.id);
      try {
        const result = await adManager.showRewardedAd(option.adRewardType);
        if (result.rewarded) {
          processAdReward(option.adRewardType);
          void soundManager.playSound('hintUsed');
          setConfirmation('+1 hint added!');
          void analytics.logEvent('mini_pack_purchase', {
            need,
            kind: 'ad',
            item_id: option.id,
          });
        }
      } finally {
        setBusyId(null);
      }
    },
    [busyId, grantCoinItem, need, persistCounts, purchasesToday, purchaseProduct, processAdReward, spendCoins, onPartialHint, onClose, source],
  );

  const handleClose = useCallback(() => {
    void analytics.logEvent('mini_pack_dismissed', { need });
    onClose();
  }, [need, onClose]);

  const header = NEED_TITLES[need];
  const balanceLabel =
    need === 'gems' ? `You have ${gems} gems` : `You have ${coins.toLocaleString()} coins`;

  const sheetBody = (
    <View style={presentation === 'modal' ? styles.overlay : [StyleSheet.absoluteFillObject, styles.overlay, styles.overlayInline]}>
        <View style={styles.card}>
          <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
            <Text style={styles.ribbon}>{header.ribbon}</Text>
            <Text style={styles.title}>{header.title}</Text>
            <Text style={styles.balance}>{balanceLabel}</Text>

            {confirmation && (
              <View style={styles.confirmBanner}>
                <Text style={styles.confirmText}>{'✓'} {confirmation}</Text>
              </View>
            )}

            <ScrollView
              style={styles.optionsScroll}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {options.map((option) => {
                const disabled =
                  option.kind === 'coin_item' && (!option.affordable || option.dailyLimitReached);
                const busy = busyId === option.id;
                return (
                  <Pressable
                    key={`${option.kind}:${option.id}`}
                    style={({ pressed }) => [
                      styles.optionRow,
                      option.kind === 'ad' && styles.optionRowAd,
                      disabled && styles.optionRowDisabled,
                      pressed && !disabled && styles.optionPressed,
                    ]}
                    disabled={disabled || busyId !== null}
                    onPress={() => void handleOption(option)}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.title}. ${option.detail}`}
                    accessibilityState={{ disabled, busy }}
                  >
                    <View style={styles.optionIcon}>
                      <GameIcon glyph={option.icon} size={26} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle} numberOfLines={1}>{option.title}</Text>
                      <Text style={styles.optionDetail} numberOfLines={2}>
                        {option.kind === 'coin_item' && option.dailyLimitReached
                          ? 'Daily limit reached'
                          : option.detail}
                      </Text>
                    </View>
                    <View style={styles.optionPrice}>
                      {busy ? (
                        <ActivityIndicator color={COLORS.accent} />
                      ) : option.kind === 'coin_item' || option.kind === 'partial_hint' ? (
                        <View style={styles.priceRow}>
                          <GameIcon name="coin" size={14} />
                          <Text style={[styles.priceText, !option.affordable && styles.priceTextDim]}>
                            {option.costCoins}
                          </Text>
                        </View>
                      ) : option.kind === 'iap' ? (
                        <Text style={styles.priceText}>{option.priceLabel}</Text>
                      ) : (
                        <Text style={styles.priceFree}>FREE</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
              {need === 'boosters' && (
                <Text style={styles.footnote}>
                  Single-booster 5-packs are also in the Shop.
                </Text>
              )}
            </ScrollView>

            <Pressable
              style={styles.dismissButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.dismissText}>Not now</Text>
            </Pressable>
          </LinearGradient>
        </View>
    </View>
  );

  if (presentation === 'modal') {
    // Native Modal: needed when the sheet must stack above another native
    // Modal (e.g. NoLivesModal's gem CTA in App.tsx) — plain Views can never
    // paint over a native Modal.
    return (
      <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
        {sheetBody}
      </Modal>
    );
  }
  // Overlay (default): absolute-fill sibling of the game surfaces. MUST NOT
  // be a native Modal here — dev-mode mock ads (MockAdModal, zIndex 999) are
  // plain overlays too, and a native Modal would paint over the mock ad the
  // sheet's own "watch ad" option triggers, leaving the promise stuck behind
  // an invisible dialog.
  return sheetBody;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  // Overlay presentation: above ContextualOffer (190) / PostLossModal (100),
  // below MockAdModal (999) so mock ads stay visible and interactive.
  overlayInline: {
    zIndex: 600,
    elevation: 600,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
    ...SHADOWS.strong,
  },
  cardInner: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ribbon: {
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 4,
  },
  balance: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
  },
  confirmBanner: {
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    borderColor: 'rgba(0, 255, 135, 0.35)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignSelf: 'center',
  },
  confirmText: {
    color: COLORS.green,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  optionsScroll: {
    flexGrow: 0,
  },
  optionsContent: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  optionRowAd: {
    backgroundColor: 'rgba(0, 255, 135, 0.07)',
    borderColor: 'rgba(0, 255, 135, 0.25)',
  },
  optionRowDisabled: {
    opacity: 0.45,
  },
  optionPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
  },
  optionDetail: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  optionPrice: {
    minWidth: 58,
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    color: COLORS.gold,
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
  priceTextDim: {
    color: COLORS.textMuted,
  },
  priceFree: {
    color: COLORS.green,
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.5,
  },
  footnote: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  dismissButton: {
    marginTop: 14,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  dismissText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});

export default MiniPackSheet;
