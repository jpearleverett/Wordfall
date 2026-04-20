import { hasDecoration, isProfileCosmeticId } from '../data/cosmetics';
import { getProductById } from '../data/shopProducts';

export type PurchaseSource = 'purchase' | 'restore' | 'migration' | 'coin_shop';

export type CommercialEffectId =
  | 'double_xp'
  | 'lucky_charm'
  | 'lucky_boost'
  | 'double_coins'
  | 'vip_experience'
  | 'premium_theme_rental'
  | 'random_premium_theme'
  | 'golden_frame_rental'
  | 'board_freeze'
  | 'score_doubler';

export interface CommercialPurchaseRecord {
  id: string;
  item: string;
  currency: string;
  amount: number;
  timestamp: number;
  source: PurchaseSource;
  transactionId?: string;
}

export interface CommercialStateShape {
  coins: number;
  gems: number;
  hintTokens: number;
  eventStars: number;
  libraryPoints: number;
  boosterTokens: { wildcardTile: number; spotlight: number; smartShuffle: number };
  totalEarned: {
    coins: number;
    gems: number;
    hintTokens: number;
    eventStars: number;
    libraryPoints: number;
  };
  purchaseHistory: CommercialPurchaseRecord[];
  isAdFreeFlag: boolean;
  isPremiumPassFlag: boolean;
  dailyValuePackExpiry: number;
  dailyValuePackLastClaim: string;
  starterPackExpiresAt: number;
  undoTokens: number;
  isVipSubscriber: boolean;
  vipExpiresAt: number;
  vipDailyLastClaim: string;
  vipStreakWeeks: number;
  vipStreakBonusClaimed: boolean;
  vipStreakLastChecked: number;
  temporaryEntitlements: Partial<Record<CommercialEffectId, number>>;
  entitlementMigrationVersion: number;
  piggyBank?: {
    gems: number;
    lastFillAt: number;
    capacity: number;
  };
}

export interface PlayerGrantSummary {
  cosmetics: string[];
  decorations: string[];
  /** Consumable streak-shield charges (usually 1 per purchase) */
  streakFreezeDays?: number;
}

export interface PurchaseFulfillmentOptions {
  source?: PurchaseSource;
  transactionId?: string;
  currency?: string;
  amount?: number;
  now?: number;
  expiresAt?: number;
}

export interface PurchaseFulfillmentResult<TState extends CommercialStateShape> {
  nextState: TState;
  grants: PlayerGrantSummary;
  applied: boolean;
}

export interface LegacyEntitlementSnapshot {
  adsRemoved?: boolean;
  premiumPass?: boolean;
}

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const MILLIS_PER_MINUTE = 60 * 1000;
const SUPPORTED_BOOSTERS = new Set(['wildcardTile', 'spotlight', 'smartShuffle']);
const BOOSTER_ALIAS: Record<string, 'wildcardTile' | 'spotlight' | 'smartShuffle'> = {
  boardPreview: 'spotlight',
};

export const LEGACY_ENTITLEMENT_MIGRATION_VERSION = 1;

function emptyGrants(): PlayerGrantSummary {
  return { cosmetics: [], decorations: [] };
}

export function splitPlayerGrantIds(ids: string[] = []): PlayerGrantSummary {
  const cosmetics = new Set<string>();
  const decorations = new Set<string>();

  for (const id of ids) {
    if (hasDecoration(id)) {
      decorations.add(id);
      continue;
    }

    if (isProfileCosmeticId(id)) {
      cosmetics.add(id);
    }
  }

  return {
    cosmetics: Array.from(cosmetics),
    decorations: Array.from(decorations),
  };
}

export function activateTemporaryEntitlement<TState extends CommercialStateShape>(
  prevState: TState,
  effectId: CommercialEffectId,
  durationMinutes: number,
  now: number = Date.now(),
): TState {
  const expiresAt = now + durationMinutes * MILLIS_PER_MINUTE;
  const previousExpiry = prevState.temporaryEntitlements[effectId] ?? 0;
  return {
    ...prevState,
    temporaryEntitlements: {
      ...prevState.temporaryEntitlements,
      [effectId]: Math.max(previousExpiry, expiresAt),
    },
  };
}

export function isTemporaryEntitlementActive(
  entitlements: Partial<Record<CommercialEffectId, number>>,
  effectId: CommercialEffectId,
  now: number = Date.now(),
): boolean {
  return (entitlements[effectId] ?? 0) > now;
}

export function applyCatalogPurchase<TState extends CommercialStateShape>(
  prevState: TState,
  productId: string,
  options: PurchaseFulfillmentOptions = {},
): PurchaseFulfillmentResult<TState> {
  const product = getProductById(productId);
  if (!product) {
    return { nextState: prevState, grants: emptyGrants(), applied: false };
  }

  if (
    options.transactionId &&
    prevState.purchaseHistory.some((entry) => entry.transactionId === options.transactionId)
  ) {
    return { nextState: prevState, grants: emptyGrants(), applied: false };
  }

  const now = options.now ?? Date.now();
  const nextState: TState = {
    ...prevState,
    totalEarned: { ...prevState.totalEarned },
    boosterTokens: { ...prevState.boosterTokens },
    purchaseHistory: [...prevState.purchaseHistory],
    temporaryEntitlements: { ...prevState.temporaryEntitlements },
  };

  const rewards = product.rewards;
  // For piggy_bank_break the generic reward path is skipped — the real grant
  // is the accumulated jar contents, applied below.
  const isPiggyBankBreak = productId === 'piggy_bank_break';

  if (!isPiggyBankBreak && rewards.coins) {
    nextState.coins += rewards.coins;
    nextState.totalEarned.coins += rewards.coins;
  }
  if (!isPiggyBankBreak && rewards.gems) {
    nextState.gems += rewards.gems;
    nextState.totalEarned.gems += rewards.gems;
  }
  if (rewards.hintTokens) {
    nextState.hintTokens += rewards.hintTokens;
    nextState.totalEarned.hintTokens += rewards.hintTokens;
  }
  if (rewards.undoTokens) {
    nextState.undoTokens += rewards.undoTokens;
  }
  if (rewards.boosters) {
    for (const booster of rewards.boosters) {
      const mappedBooster =
        booster.type in BOOSTER_ALIAS
          ? BOOSTER_ALIAS[booster.type]
          : SUPPORTED_BOOSTERS.has(booster.type)
            ? (booster.type as 'wildcardTile' | 'spotlight' | 'smartShuffle')
            : null;

      if (mappedBooster) {
        nextState.boosterTokens[mappedBooster] += booster.count;
      }
    }
  }

  if (rewards.flags?.premiumPass) {
    nextState.isPremiumPassFlag = true;
  }
  if (rewards.flags?.adsRemoved) {
    nextState.isAdFreeFlag = true;
  }
  if (rewards.flags?.vipSubscriber) {
    nextState.isVipSubscriber = true;
    nextState.vipExpiresAt = options.expiresAt ?? now + 7 * MILLIS_PER_DAY;
    nextState.vipDailyLastClaim = '';
  }

  if (rewards.dripDays) {
    nextState.dailyValuePackExpiry = now + rewards.dripDays * MILLIS_PER_DAY;
    nextState.dailyValuePackLastClaim = '';
  }

  // Piggy bank break — credit the accumulated jar and reset.
  // The jar's gems are the true reward; rewards.gems above is a placeholder
  // that ensures the generic "has at least one reward" invariant holds.
  if (productId === 'piggy_bank_break' && prevState.piggyBank) {
    const jarGems = prevState.piggyBank.gems ?? 0;
    if (jarGems > 0) {
      nextState.gems += jarGems;
      nextState.totalEarned.gems += jarGems;
    }
    nextState.piggyBank = {
      ...prevState.piggyBank,
      gems: 0,
      lastFillAt: now,
    };
  }

  nextState.purchaseHistory.push({
    id: `${options.source ?? 'purchase'}_${productId}_${options.transactionId ?? now}`,
    item: productId,
    currency: options.currency ?? 'USD',
    amount: options.amount ?? product.fallbackPriceAmount,
    timestamp: now,
    source: options.source ?? 'purchase',
    transactionId: options.transactionId,
  });

  const grants = splitPlayerGrantIds(rewards.decorations);
  if (rewards.streakFreezeDays && rewards.streakFreezeDays > 0) {
    grants.streakFreezeDays = rewards.streakFreezeDays;
  }

  return {
    nextState,
    grants,
    applied: true,
  };
}

export function migrateLegacyEntitlements<TState extends CommercialStateShape>(
  prevState: TState,
  legacy: LegacyEntitlementSnapshot,
  now: number = Date.now(),
): PurchaseFulfillmentResult<TState> {
  if (prevState.entitlementMigrationVersion >= LEGACY_ENTITLEMENT_MIGRATION_VERSION) {
    return { nextState: prevState, grants: emptyGrants(), applied: false };
  }

  let nextState: TState = {
    ...prevState,
    purchaseHistory: [...prevState.purchaseHistory],
    entitlementMigrationVersion: LEGACY_ENTITLEMENT_MIGRATION_VERSION,
  };
  let applied = false;

  if (legacy.adsRemoved && !nextState.isAdFreeFlag) {
    const migrationResult = applyCatalogPurchase(nextState, 'ad_removal', {
      source: 'migration',
      transactionId: `legacy-ad-removal-v${LEGACY_ENTITLEMENT_MIGRATION_VERSION}`,
      amount: 0,
      currency: 'USD',
      now,
    });
    nextState = migrationResult.nextState;
    applied = migrationResult.applied || applied;
  }

  if (legacy.premiumPass && !nextState.isPremiumPassFlag) {
    const migrationResult = applyCatalogPurchase(nextState, 'premium_pass', {
      source: 'migration',
      transactionId: `legacy-premium-pass-v${LEGACY_ENTITLEMENT_MIGRATION_VERSION}`,
      amount: 0,
      currency: 'USD',
      now,
    });
    nextState = migrationResult.nextState;
    applied = migrationResult.applied || applied;
  }

  return { nextState, grants: emptyGrants(), applied };
}
