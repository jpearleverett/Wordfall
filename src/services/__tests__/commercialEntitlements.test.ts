import {
  activateTemporaryEntitlement,
  applyCatalogPurchase,
  CommercialStateShape,
  isTemporaryEntitlementActive,
  LEGACY_ENTITLEMENT_MIGRATION_VERSION,
  migrateLegacyEntitlements,
  splitPlayerGrantIds,
} from '../commercialEntitlements';

function createBaseState(): CommercialStateShape {
  return {
    coins: 0,
    gems: 0,
    hintTokens: 0,
    eventStars: 0,
    libraryPoints: 0,
    boosterTokens: { wildcardTile: 0, spotlight: 0, smartShuffle: 0 },
    totalEarned: {
      coins: 0,
      gems: 0,
      hintTokens: 0,
      eventStars: 0,
      libraryPoints: 0,
    },
    purchaseHistory: [],
    isAdFreeFlag: false,
    isPremiumPassFlag: false,
    dailyValuePackExpiry: 0,
    dailyValuePackLastClaim: '',
    starterPackExpiresAt: 0,
    undoTokens: 0,
    isVipSubscriber: false,
    vipExpiresAt: 0,
    vipDailyLastClaim: '',
    vipStreakWeeks: 0,
    vipStreakBonusClaimed: false,
    vipStreakLastChecked: 0,
    temporaryEntitlements: {},
    entitlementMigrationVersion: 0,
  };
}

describe('commercialEntitlements', () => {
  describe('splitPlayerGrantIds', () => {
    it('separates profile cosmetics and decorations', () => {
      const grants = splitPlayerGrantIds([
        'frame_royal_legendary',
        'title_royal_collector',
        'decoration_whale_trophy',
      ]);

      expect(grants.cosmetics).toEqual(
        expect.arrayContaining(['frame_royal_legendary', 'title_royal_collector']),
      );
      expect(grants.decorations).toEqual(['decoration_whale_trophy']);
    });
  });

  describe('applyCatalogPurchase', () => {
    it('applies premium pass entitlements and records history', () => {
      const result = applyCatalogPurchase(createBaseState(), 'premium_pass', {
        source: 'purchase',
        transactionId: 'tx-premium-pass',
        amount: 4.99,
        currency: 'USD',
        now: 1000,
      });

      expect(result.applied).toBe(true);
      expect(result.nextState.isPremiumPassFlag).toBe(true);
      expect(result.nextState.purchaseHistory).toHaveLength(1);
      expect(result.nextState.purchaseHistory[0]).toMatchObject({
        item: 'premium_pass',
        transactionId: 'tx-premium-pass',
        amount: 4.99,
        currency: 'USD',
        source: 'purchase',
      });
    });

    it('maps boardPreview boosters into spotlight tokens', () => {
      const result = applyCatalogPurchase(createBaseState(), 'chapter_bundle', {
        transactionId: 'tx-chapter-bundle',
      });

      expect(result.applied).toBe(true);
      expect(result.nextState.gems).toBe(20);
      expect(result.nextState.hintTokens).toBe(10);
      expect(result.nextState.boosterTokens.spotlight).toBe(1);
      expect(result.grants.decorations).toContain('chapter_decoration');
    });

    it('ignores duplicate transaction ids', () => {
      const first = applyCatalogPurchase(createBaseState(), 'ad_removal', {
        transactionId: 'tx-duplicate',
      });

      const second = applyCatalogPurchase(first.nextState, 'ad_removal', {
        transactionId: 'tx-duplicate',
      });

      expect(first.applied).toBe(true);
      expect(second.applied).toBe(false);
      expect(second.nextState.purchaseHistory).toHaveLength(1);
    });
  });

  describe('migrateLegacyEntitlements', () => {
    it('migrates legacy purchase flags once', () => {
      const migrated = migrateLegacyEntitlements(
        createBaseState(),
        { adsRemoved: true, premiumPass: true },
        5000,
      );

      expect(migrated.applied).toBe(true);
      expect(migrated.nextState.isAdFreeFlag).toBe(true);
      expect(migrated.nextState.isPremiumPassFlag).toBe(true);
      expect(migrated.nextState.entitlementMigrationVersion).toBe(
        LEGACY_ENTITLEMENT_MIGRATION_VERSION,
      );
      expect(migrated.nextState.purchaseHistory.map((entry) => entry.source)).toEqual([
        'migration',
        'migration',
      ]);

      const secondPass = migrateLegacyEntitlements(
        migrated.nextState,
        { adsRemoved: true, premiumPass: true },
        6000,
      );

      expect(secondPass.applied).toBe(false);
      expect(secondPass.nextState.purchaseHistory).toHaveLength(2);
    });
  });

  describe('temporary entitlements', () => {
    it('tracks active temporary effects by expiry', () => {
      const activated = activateTemporaryEntitlement(
        createBaseState(),
        'double_coins',
        30,
        1000,
      );

      expect(isTemporaryEntitlementActive(activated.temporaryEntitlements, 'double_coins', 1001)).toBe(true);
      expect(isTemporaryEntitlementActive(activated.temporaryEntitlements, 'double_coins', 1000 + 30 * 60 * 1000 + 1)).toBe(false);
    });
  });
});
