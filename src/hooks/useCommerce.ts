import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEconomyActions } from '../stores/economyStore';
import { usePlayerActions } from '../stores/playerStore';
import { useSettings } from '../contexts/SettingsContext';
import { analytics } from '../services/analytics';
import { funnelTracker } from '../services/funnelTracker';
import { iapManager, PurchaseResult } from '../services/iap';
import { recordPurchaseForFollowup } from '../data/dynamicPricing';

export interface PurchasePreflightResult {
  allowed: boolean;
  reason?: string;
  priceAmount: number;
  requiresPin: boolean;
}

export interface CommerceStatus {
  initialized: boolean;
  isMockMode: boolean;
  billingAvailable: boolean;
  validationAvailable: boolean;
  commerceLaunchReady: boolean;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useCommerce() {
  const { user } = useAuth();
  const { applyValidatedPurchase } = useEconomyActions();
  const { unlockDecoration, unlockCosmetic, activateStreakShield } = usePlayerActions();
  const settings = useSettings();
  const [commerceStatus, setCommerceStatus] = useState<CommerceStatus>(() => iapManager.getStatus());

  const refreshStatus = useCallback(() => {
    setCommerceStatus(iapManager.getStatus());
  }, []);

  const applyPlayerGrants = useCallback((grants: { cosmetics: string[]; decorations: string[]; streakFreezeDays?: number }) => {
    for (const decorationId of grants.decorations) {
      unlockDecoration(decorationId);
    }

    for (const cosmeticId of grants.cosmetics) {
      unlockCosmetic(cosmeticId);
    }

    if (grants.streakFreezeDays && grants.streakFreezeDays > 0) {
      activateStreakShield();
    }
  }, [unlockDecoration, unlockCosmetic, activateStreakShield]);

  const recordSpend = useCallback((priceAmount: number) => {
    if (!settings.spendingLimitEnabled) return;

    const currentMonth = currentMonthKey();
    const currentSpent =
      settings.monthlySpentResetDate === currentMonth ? settings.monthlySpent : 0;

    settings.updateSetting('monthlySpent', currentSpent + priceAmount);
    settings.updateSetting('monthlySpentResetDate', currentMonth);
  }, [settings]);

  /**
   * Fulfil a purchase that arrived WITHOUT an awaiting `purchase()` caller:
   * the app was killed between the store charge and fulfilment (recovered by
   * processPendingPurchases on next launch), Play Billing redelivered, or the
   * in-app 120s timeout already resolved the promise. Before this existed the
   * result was broadcast to an empty listener list while the purchase had
   * already been acknowledged AND consumed — the player was charged real
   * money, got nothing, and Restore could not recover it (consumed purchases
   * disappear from getAvailablePurchases and re-validation is a replay).
   *
   * Held in a ref so the subscription effect below keeps stable deps and
   * never unsubscribes mid-recovery.
   */
  const fulfilOrphanedPurchaseRef = useRef<(result: PurchaseResult) => void>(() => {});
  fulfilOrphanedPurchaseRef.current = (result: PurchaseResult) => {
    if (!result.success || !result.transactionId) return;
    const priceAmount = iapManager.getPriceAmount(result.productId);
    // applyCatalogPurchase dedupes on transactionId, so this is idempotent
    // even if the same recovery runs twice or several useCommerce consumers
    // are mounted at once.
    const applied = applyValidatedPurchase(result.productId, {
      source: 'purchase',
      transactionId: result.transactionId,
      currency: 'USD',
      amount: priceAmount,
      expiresAt: result.expiresAt,
    });
    if (!applied.applied) return;
    applyPlayerGrants(applied.grants);
    recordSpend(priceAmount);
    void analytics.trackIAPCompleted(result.productId, priceAmount, priceAmount);
    void analytics.trackRevenue(result.productId, priceAmount, 'USD');
    void funnelTracker.trackPurchase('iap_completed', result.productId);
    // An orphaned fulfilment is still a genuine real-money charge (the app
    // died between store charge and delivery), so it participates in the
    // second-purchase follow-up funnel exactly like an in-app purchase.
    // Redeliveries can't double-record: applyValidatedPurchase dedupes on
    // transactionId and we returned above when it refused.
    const followup = recordPurchaseForFollowup(result.productId);
    if (followup === 'followup_converted') {
      void analytics.logEvent('offer_followup_converted', {
        product_id: result.productId,
        price: priceAmount,
      });
    }
  };

  useEffect(() => {
    let active = true;
    // Subscribe BEFORE init(): processPendingPurchases runs inside init(),
    // so registering afterwards would miss the very recovery pass this
    // listener exists to catch.
    const unsubscribe = iapManager.onPurchase((result) => {
      fulfilOrphanedPurchaseRef.current(result);
    });

    iapManager.init().catch(() => undefined).finally(() => {
      if (active) {
        refreshStatus();
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refreshStatus]);

  const checkPurchaseAllowed = useCallback((productId: string): PurchasePreflightResult => {
    const priceAmount = iapManager.getPriceAmount(productId);
    const requiresPin =
      settings.spendingLimitEnabled &&
      settings.requirePurchasePin &&
      !!settings.purchasePin;

    if (!settings.spendingLimitEnabled) {
      return { allowed: true, priceAmount, requiresPin };
    }

    const currentMonth = currentMonthKey();
    const monthlySpent =
      settings.monthlySpentResetDate === currentMonth ? settings.monthlySpent : 0;

    if (monthlySpent + priceAmount > settings.monthlySpendingLimit) {
      return {
        allowed: false,
        reason: `Monthly spending limit of $${settings.monthlySpendingLimit} would be exceeded. Current spend: $${monthlySpent.toFixed(2)}.`,
        priceAmount,
        requiresPin,
      };
    }

    return { allowed: true, priceAmount, requiresPin };
  }, [settings]);

  const purchaseProduct = useCallback(async (productId: string): Promise<PurchaseResult> => {
    const priceAmount = iapManager.getPriceAmount(productId);
    await analytics.trackIAPInitiated(productId, priceAmount);
    await funnelTracker.trackPurchase('iap_initiated', productId);

    const result = await iapManager.purchase(productId, user?.uid);

    if (!result.success) {
      if (result.error && result.error !== 'User cancelled') {
        await funnelTracker.trackPurchase('iap_failed', productId);
      }
      refreshStatus();
      return result;
    }

    const applied = applyValidatedPurchase(result.productId, {
      source: 'purchase',
      transactionId: result.transactionId,
      currency: 'USD',
      amount: priceAmount,
      expiresAt: result.expiresAt,
    });

    if (applied.applied) {
      applyPlayerGrants(applied.grants);
      recordSpend(priceAmount);
      await analytics.trackIAPCompleted(result.productId, priceAmount, priceAmount);
      await analytics.trackRevenue(result.productId, priceAmount, 'USD');
      await funnelTracker.trackPurchase('iap_completed', result.productId);
      // Second-purchase ladder: a player's FIRST real-money purchase opens
      // a 48h follow-up window (the shop's For You carousel surfaces the
      // "thanks — next one's better" offer); buying the follow-up SKU
      // closes it. Restores/migrations never reach this path, so the
      // window only ever opens on a genuine charge.
      const followup = recordPurchaseForFollowup(result.productId);
      if (followup === 'followup_converted') {
        void analytics.logEvent('offer_followup_converted', {
          product_id: result.productId,
          price: priceAmount,
        });
      }
    }

    refreshStatus();
    return result;
  }, [
    applyPlayerGrants,
    applyValidatedPurchase,
    recordSpend,
    refreshStatus,
    user?.uid,
  ]);

  const restorePurchases = useCallback(async (): Promise<{
    results: PurchaseResult[];
    restoredCount: number;
  }> => {
    const results = await iapManager.restorePurchases(user?.uid);
    let restoredCount = 0;

    for (const result of results) {
      if (!result.success) continue;

      const applied = applyValidatedPurchase(result.productId, {
        source: 'restore',
        transactionId: result.transactionId,
        currency: 'USD',
        amount: iapManager.getPriceAmount(result.productId),
        expiresAt: result.expiresAt,
      });

      if (applied.applied) {
        applyPlayerGrants(applied.grants);
        restoredCount += 1;
      }
    }

    refreshStatus();
    return { results, restoredCount };
  }, [applyPlayerGrants, applyValidatedPurchase, refreshStatus, user?.uid]);

  return useMemo(() => ({
    commerceStatus,
    refreshStatus,
    checkPurchaseAllowed,
    purchaseProduct,
    restorePurchases,
  }), [
    commerceStatus,
    refreshStatus,
    checkPurchaseAllowed,
    purchaseProduct,
    restorePurchases,
  ]);
}
