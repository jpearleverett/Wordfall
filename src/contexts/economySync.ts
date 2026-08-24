/**
 * economySync.ts — pure decision + settlement helpers for EconomyContext,
 * extracted to a .ts module so they stay unit-testable (jest in this repo
 * cannot load .tsx providers — same convention as playerDataSync.ts).
 *
 * Three decision points, each of which destroyed or withheld player value
 * when it lived inline:
 *
 * 1. `shouldAdoptCloudEconomy` — the sync-in adopted the cloud doc on
 *    `cloudModified >= localModified`, and the persist writer stamps ONE
 *    Date.now() into both AsyncStorage and Firestore, so the stamps are
 *    byte-equal after every clean online exit: the adopt fired on
 *    essentially every launch and spread yesterday's snapshot over any
 *    mutation made between hydration and getDoc resolving (app-open inbox
 *    claims — whose server-side claimed flag is already burned — daily
 *    logins, ad rewards).
 * 2. `creditLives` — granted lives were added to the RAW stored count with
 *    `lastRefillTime: Date.now()`, discarding accrued-but-unbanked refills
 *    and wiping partial progress toward the next natural life, so a "free"
 *    rewarded-ad life silently cost up to a full refill interval of regen.
 * 3. `settleSeasonPassReward` — the claim switch had an empty arm for
 *    'rare_tile' and 'mystery_box': the tier was marked claimed, analytics
 *    logged a claim, and nothing was delivered — ten premium tiers behind
 *    the 500-gem pass plus the free mystery-box tiers 30/50.
 */

import { LIVES } from '../constants';
import { computeRefilledLives, LivesData } from '../utils/lives';
import { MysteryBoxReward, openMysteryBox } from '../data/mysteryWheel';
import type { PassReward } from '../data/seasonPass';

// ─── Cloud adoption ──────────────────────────────────────────────────────────

/**
 * Adopt the cloud economy doc only when it is STRICTLY newer than the
 * hydrated local blob (PlayerContext convention, see PlayerContext's
 * `cloudModified > localModified`), or when the local blob is unstamped —
 * a fresh install / reinstall or a legacy pre-stamp save, where cloud
 * winning is the old blind-spread behavior the stamps were added to refine.
 * Exact equality means "same snapshot, already hydrated": adopting it again
 * would revert every mutation made since hydration.
 */
export function shouldAdoptCloudEconomy(
  localModified: number,
  cloudModified: number,
): boolean {
  if (!localModified) return true;
  return cloudModified > localModified;
}

// ─── Lives crediting ─────────────────────────────────────────────────────────

/**
 * Credit granted lives (rewarded ad, purchase bonus) the way spendLife
 * spends them: bank refills accrued since lastRefillTime FIRST, then add
 * the grant capped at LIVES.max, keeping the banked refill anchor while
 * below max. The anchor resets to now only at max, where the timer is
 * dormant until the next spend — mirroring computeRefilledLives.
 */
export function creditLives(lives: LivesData, count: number): LivesData {
  const banked = computeRefilledLives(lives);
  const next = Math.min(banked.current + count, LIVES.max);
  return {
    current: next,
    lastRefillTime: next >= LIVES.max ? Date.now() : banked.lastRefillTime,
  };
}

// ─── Season pass claim settlement ────────────────────────────────────────────

/** Currency/consumable amounts a claim credits directly into EconomyState. */
export interface SeasonPassEconomyCredit {
  coins: number;
  gems: number;
  hintTokens: number;
  boosterTokens: { wildcardTile: number; spotlight: number; smartShuffle: number };
}

/**
 * Item grants the ECONOMY cannot hold — surfaced to the claiming screen,
 * which owns the PlayerContext delivery (unlockCosmetic / addRareTile).
 */
export interface SeasonPassClaimGrant {
  /** Cosmetic to unlock via PlayerContext.unlockCosmetic. */
  cosmetic?: { type: string; id: string };
  /**
   * Rare tiles to grant via PlayerContext.addRareTile — one random letter
   * per count, mirroring App.tsx's mystery-wheel and login-calendar claims.
   */
  rareTiles?: number;
  /** Labels of rolled mystery-box contents, for the claim UI / toast. */
  mysteryBoxLabels?: string[];
}

/**
 * Every PassReward.type the claim path actually delivers. Guarded by
 * economyGuards.test: each type authored in SEASON_PASS_TIERS must be a
 * member, so adding a reward type without a delivery arm fails CI instead
 * of charging (premium lane) and paying nothing.
 */
export const DELIVERED_SEASON_PASS_REWARD_TYPES: ReadonlySet<PassReward['type']> =
  new Set<PassReward['type']>([
    'coins',
    'gems',
    'hints',
    'booster',
    'cosmetic',
    'rare_tile',
    'mystery_box',
  ]);

/**
 * Resolve a season-pass tier reward into an economy credit plus the item
 * grants the caller must deliver. Pure given the injected roll — the caller
 * settles ONCE outside its setState updater so mystery-box rolls are pinned
 * (updaters can re-run) and the same outcome is applied and returned.
 */
export function settleSeasonPassReward(
  reward: PassReward,
  rollMysteryBox: () => MysteryBoxReward = openMysteryBox,
): { credit: SeasonPassEconomyCredit; grant: SeasonPassClaimGrant } {
  const credit: SeasonPassEconomyCredit = {
    coins: 0,
    gems: 0,
    hintTokens: 0,
    boosterTokens: { wildcardTile: 0, spotlight: 0, smartShuffle: 0 },
  };
  const grant: SeasonPassClaimGrant = {};

  switch (reward.type) {
    case 'coins':
      credit.coins += reward.amount ?? 0;
      break;
    case 'gems':
      credit.gems += reward.amount ?? 0;
      break;
    case 'hints':
      credit.hintTokens += reward.amount ?? 0;
      break;
    case 'booster':
      credit.boosterTokens.wildcardTile += reward.amount ?? 1;
      break;
    case 'cosmetic':
      if (reward.cosmeticId) {
        grant.cosmetic = { type: 'frame', id: reward.cosmeticId };
      }
      break;
    case 'rare_tile':
      grant.rareTiles = (grant.rareTiles ?? 0) + (reward.amount ?? 1);
      break;
    case 'mystery_box': {
      const boxes = reward.amount ?? 1;
      const labels: string[] = [];
      for (let i = 0; i < boxes; i++) {
        const roll = rollMysteryBox();
        labels.push(roll.label);
        const contents = roll.reward;
        if (contents.coins) credit.coins += contents.coins;
        if (contents.gems) credit.gems += contents.gems;
        if (contents.hints) credit.hintTokens += contents.hints;
        // Wheel-booster rolls have no economy slot — same substitution the
        // mystery-wheel host applies (App.tsx handleWheelSpin): 3 hints.
        if (contents.booster) credit.hintTokens += 3;
        if (contents.rareTile) grant.rareTiles = (grant.rareTiles ?? 0) + 1;
      }
      grant.mysteryBoxLabels = labels;
      break;
    }
  }

  return { credit, grant };
}
