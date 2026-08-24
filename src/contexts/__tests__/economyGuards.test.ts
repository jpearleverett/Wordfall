/**
 * Guard rails for EconomyContext's pure sync/settlement helpers
 * (src/contexts/economySync.ts), plus source-scan pins on the provider and
 * the IAP settlement flow (jest in this repo cannot render .tsx providers —
 * same convention as playerSyncGuards.test).
 *
 * Each block pins a fixed defect:
 *  - shouldAdoptCloudEconomy: the `>=` adopt re-applied yesterday's cloud
 *    snapshot on every launch (both stores carry the identical stamp),
 *    reverting app-open inbox claims whose server flag was already burned.
 *  - creditLives: granted lives discarded accrued refills and wiped partial
 *    progress toward the next natural life.
 *  - settleSeasonPassReward: 'rare_tile' / 'mystery_box' tiers were marked
 *    claimed and delivered nothing.
 *  - source pins: the daily-value-pack drip claim is actually wired, the
 *    local persist queue is decoupled from the never-settling offline
 *    setDoc, and the IAP flow delivers + flushes BEFORE consuming.
 */
import * as fs from 'fs';
import * as path from 'path';
import { LIVES } from '../../constants';
import { SEASON_PASS_TIERS } from '../../data/seasonPass';
import type { MysteryBoxReward } from '../../data/mysteryWheel';
import {
  creditLives,
  shouldAdoptCloudEconomy,
  settleSeasonPassReward,
  DELIVERED_SEASON_PASS_REWARD_TYPES,
} from '../economySync';

const REFILL_MS = LIVES.refillMinutes * 60 * 1000;

describe('shouldAdoptCloudEconomy', () => {
  it('does NOT adopt on exact stamp equality (the every-launch re-adopt)', () => {
    expect(shouldAdoptCloudEconomy(1000, 1000)).toBe(false);
  });

  it('adopts only a strictly newer cloud doc', () => {
    expect(shouldAdoptCloudEconomy(1000, 1001)).toBe(true);
    expect(shouldAdoptCloudEconomy(1000, 999)).toBe(false);
  });

  it('lets cloud win over an unstamped local blob (fresh install / legacy save)', () => {
    expect(shouldAdoptCloudEconomy(0, 0)).toBe(true);
    expect(shouldAdoptCloudEconomy(0, 12345)).toBe(true);
  });
});

describe('creditLives', () => {
  const NOW = 1_700_000_000_000;
  let nowSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('preserves partial progress toward the next natural life', () => {
    // 1 minute short of a refill: the old raw add reset the anchor to now,
    // silently discarding almost a full interval of regen.
    const anchor = NOW - (REFILL_MS - 60_000);
    const result = creditLives({ current: 2, lastRefillTime: anchor }, 1);
    expect(result.current).toBe(3);
    expect(result.lastRefillTime).toBe(anchor);
  });

  it('banks accrued whole refills before crediting the grant', () => {
    // Two full intervals + 1 minute elapsed: both accrued lives must be
    // banked (anchor advanced by exactly two intervals) before the +1.
    const anchor = NOW - (2 * REFILL_MS + 60_000);
    const start = LIVES.max - 4;
    const result = creditLives({ current: start, lastRefillTime: anchor }, 1);
    expect(result.current).toBe(start + 3);
    if (result.current >= LIVES.max) {
      expect(result.lastRefillTime).toBe(NOW);
    } else {
      expect(result.lastRefillTime).toBe(anchor + 2 * REFILL_MS);
    }
  });

  it('caps at max and parks the anchor at now (timer dormant at max)', () => {
    const result = creditLives(
      { current: LIVES.max - 1, lastRefillTime: NOW - 60_000 },
      5,
    );
    expect(result.current).toBe(LIVES.max);
    expect(result.lastRefillTime).toBe(NOW);
  });
});

describe('settleSeasonPassReward', () => {
  const coinRoll: MysteryBoxReward = {
    label: '300 Coins',
    icon: 'x',
    reward: { coins: 300 },
    weight: 1,
  };

  it('delivers something for EVERY authored tier reward in both lanes', () => {
    for (const tier of SEASON_PASS_TIERS) {
      for (const reward of [tier.freeReward, tier.premiumReward]) {
        expect(DELIVERED_SEASON_PASS_REWARD_TYPES.has(reward.type)).toBe(true);
        const { credit, grant } = settleSeasonPassReward(reward, () => coinRoll);
        const creditSum =
          credit.coins +
          credit.gems +
          credit.hintTokens +
          credit.boosterTokens.wildcardTile +
          credit.boosterTokens.spotlight +
          credit.boosterTokens.smartShuffle;
        const delivered =
          creditSum > 0 || !!grant.cosmetic || (grant.rareTiles ?? 0) > 0;
        expect(delivered).toBe(true);
      }
    }
  });

  it('surfaces rare_tile tiers as a caller-deliverable grant', () => {
    const { credit, grant } = settleSeasonPassReward({
      type: 'rare_tile',
      amount: 1,
      label: 'Rare Tile',
      icon: 'x',
    });
    expect(grant.rareTiles).toBe(1);
    expect(credit.coins + credit.gems + credit.hintTokens).toBe(0);
  });

  it('opens one mystery box per amount and credits the rolled contents', () => {
    const rolls: MysteryBoxReward[] = [
      { label: '10 Gems', icon: 'x', reward: { gems: 10 }, weight: 1 },
      { label: 'Rare Tile!', icon: 'x', reward: { rareTile: true }, weight: 1 },
    ];
    let i = 0;
    const { credit, grant } = settleSeasonPassReward(
      { type: 'mystery_box', amount: 2, label: '2 Mystery Boxes', icon: 'x' },
      () => rolls[i++],
    );
    expect(i).toBe(2);
    expect(credit.gems).toBe(10);
    expect(grant.rareTiles).toBe(1);
    expect(grant.mysteryBoxLabels).toEqual(['10 Gems', 'Rare Tile!']);
  });

  it('substitutes 3 hints for wheel-booster rolls (App.tsx handleWheelSpin parity)', () => {
    const { credit } = settleSeasonPassReward(
      { type: 'mystery_box', amount: 1, label: 'Mystery Box', icon: 'x' },
      () => ({
        label: 'Freeze Booster',
        icon: 'x',
        reward: { booster: 'freezeColumn' },
        weight: 1,
      }),
    );
    expect(credit.hintTokens).toBe(3);
  });
});

describe('source pins (provider + IAP settlement ordering)', () => {
  const economySrc = fs.readFileSync(
    path.resolve(__dirname, '../EconomyContext.tsx'),
    'utf8',
  );
  const iapSrc = fs.readFileSync(
    path.resolve(__dirname, '../../services/iap.ts'),
    'utf8',
  );

  it('daily-value-pack drip claim has a real call site (paid SKU must pay out)', () => {
    expect(economySrc).toMatch(/claimDailyValuePackDrip\(\);/);
    expect(economySrc).toMatch(/dailyValuePackExpiry > Date\.now\(\)/);
  });

  it('local persist queue is decoupled from the cloud queue (offline wedge)', () => {
    expect(economySrc).toContain("'economy-local'");
    expect(economySrc).toContain("'economy-firestore'");
    // The fused single-queue label must stay gone.
    expect(economySrc).not.toMatch(/'economy'\)/);
    // The AsyncStorage writer body must not await Firestore.
    const localStart = economySrc.indexOf('persistLocalQueueRef');
    const cloudStart = economySrc.indexOf('persistCloudQueueRef');
    expect(localStart).toBeGreaterThan(-1);
    expect(cloudStart).toBeGreaterThan(localStart);
    const localWriter = economySrc.slice(localStart, cloudStart);
    expect(localWriter).not.toContain('setDoc');
  });

  it('cloud adopt is strict recency via shouldAdoptCloudEconomy', () => {
    expect(economySrc).not.toContain('cloudModified >= localModified');
    expect(economySrc).toContain('shouldAdoptCloudEconomy(');
  });

  it('season-pass claim settles every reward (no empty rare_tile/mystery_box arm)', () => {
    expect(economySrc).toContain('settleSeasonPassReward(');
    expect(economySrc).not.toMatch(/case 'rare_tile':\s*\r?\n\s*case 'mystery_box':/);
  });

  it('life grants route through creditLives (no raw add + anchor reset)', () => {
    expect(economySrc).toMatch(/creditLives\(prev\.lives,/);
    expect(economySrc).not.toMatch(/current: Math\.min\(prev\.lives\.current \+/);
  });

  it('IAP delivers + flushes the grant BEFORE consuming the purchase', () => {
    const deliverIdx = iapSrc.indexOf(
      'this.resolvePendingPurchase(storeId, successResult)',
    );
    const flushIdx = iapSrc.indexOf('await this.flushFulfillment()');
    const consumeIdx = iapSrc.indexOf(
      'consumePurchaseAndroid(purchase.purchaseToken)',
    );
    expect(deliverIdx).toBeGreaterThan(-1);
    expect(flushIdx).toBeGreaterThan(deliverIdx);
    expect(consumeIdx).toBeGreaterThan(flushIdx);
  });
});
