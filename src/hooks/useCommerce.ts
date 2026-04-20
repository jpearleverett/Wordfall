import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEconomyActions } from '../stores/economyStore';
import { usePlayerActions } from '../stores/playerStore';
import { useSettings } from '../contexts/SettingsContext';
import { analytics } from '../services/analytics';
import { funnelTracker } from '../services/funnelTracker';
import { iapManager, PurchaseResult } from '../services/iap';

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

  useEffect(() => {
    let active = true;
    iapManager.init().catch(() => undefined).finally(() => {
      if (active) {
        refreshStatus();
      }
    });

    return () => {
      active = false;
    };
  }, [refreshStatus]);

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
