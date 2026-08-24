/**
 * Mini-event progress units + reward-key delivery contract.
 *
 * Three of the five mini-event templates author tier thresholds in units
 * other than score (stars / puzzles / rare tiles). Feeding raw puzzle score
 * to all of them made every tier claimable after one ordinary puzzle — a
 * recurring coin + gem faucet. onPuzzleComplete must route the increment by
 * the active template's bonusType, and the tier display/claim payload must
 * use `hintTokens` (the key EventScreen credits), not the authored `hints`.
 */

jest.mock('../remoteConfig', () => ({
  getRemoteString: jest.fn(() => ''),
  getRemoteBoolean: jest.fn(() => true),
  getRemoteNumber: jest.fn(() => 0),
}));

import { eventManager } from '../eventManager';
import { MINI_EVENT_TEMPLATES } from '../../data/eventLayers';
import { EVENT_TEMPLATES } from '../../data/events';

const DAY_MS = 24 * 60 * 60 * 1000;
// Days since epoch for 2026-02-01 — after the event calendar's reference
// date so the main weekly rotation is live too.
const BASE_DAY = Math.floor(Date.UTC(2026, 1, 1) / DAY_MS);

/** First epoch day >= BASE_DAY that STARTS the mini event at template `index`. */
function miniStartDay(index: number): number {
  for (let d = BASE_DAY; d < BASE_DAY + 3 * MINI_EVENT_TEMPLATES.length + 3; d++) {
    if (d % 3 === 0 && d % MINI_EVENT_TEMPLATES.length === index) return d;
  }
  throw new Error(`no start day found for template index ${index}`);
}

function pinDay(day: number): void {
  jest.setSystemTime(new Date(day * DAY_MS + 6 * 60 * 60 * 1000));
}

function activeBuiltinMini() {
  return eventManager
    .getActiveEvents()
    .find((e) => e.type === 'mini' && e.id.startsWith('mini_'));
}

describe('eventManager mini-event progress units', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('star_shower accrues STARS, not score — one puzzle reaches no tier', () => {
    pinDay(miniStartDay(1)); // star_shower is template index 1
    eventManager.init({});
    eventManager.onPuzzleComplete(1000, 3, false);

    const mini = activeBuiltinMini();
    expect(mini).toBeDefined();
    expect(mini!.name).toBe('Star Shower');
    expect(mini!.progress).toBe(3);
    // Thresholds are 10/25/50 stars — 3 stars reaches nothing.
    expect(mini!.rewards.filter((r) => r.reached)).toHaveLength(0);
  });

  it('hint_frenzy accrues PUZZLES and pays hintTokens (not a dead `hints` key)', () => {
    pinDay(miniStartDay(2)); // hint_frenzy is template index 2
    eventManager.init({});
    for (let i = 0; i < 5; i++) {
      eventManager.onPuzzleComplete(800, 2, false);
    }

    const mini = activeBuiltinMini();
    expect(mini).toBeDefined();
    expect(mini!.name).toBe('Hint Frenzy');
    expect(mini!.progress).toBe(5); // 5 puzzles vs thresholds 5/15/30
    expect(mini!.rewards[0].reached).toBe(true);
    expect(mini!.rewards[1].reached).toBe(false);

    // The display/claim contract only understands hintTokens.
    expect(mini!.rewards[0].rewards.hintTokens).toBe(5);
    expect('hints' in mini!.rewards[0].rewards).toBe(false);

    const claimed = eventManager.claimEventReward(mini!.id, 'bronze');
    expect(claimed).not.toBeNull();
    expect(claimed!.hintTokens).toBe(5);
  });

  it('rare_hunt accrues RARE TILES via onRareTileEarned, not completions', () => {
    pinDay(miniStartDay(3)); // rare_hunt is template index 3
    eventManager.init({});
    eventManager.onPuzzleComplete(2000, 3, true);

    let mini = activeBuiltinMini();
    expect(mini).toBeDefined();
    expect(mini!.name).toBe('Rare Tile Hunt');
    expect(mini!.progress).toBe(0);
    expect(mini!.rewards.filter((r) => r.reached)).toHaveLength(0);

    eventManager.onRareTileEarned();
    eventManager.onRareTileEarned();
    mini = activeBuiltinMini();
    expect(mini!.progress).toBe(2); // thresholds 2/5/10 rare tiles
    expect(mini!.rewards[0].reached).toBe(true);
    expect(mini!.rewards[1].reached).toBe(false);
  });

  it('onRareTileEarned is a no-op outside a rare_tile_boost mini event', () => {
    pinDay(miniStartDay(0)); // coin_rush day
    eventManager.init({});
    eventManager.onRareTileEarned();
    const mini = activeBuiltinMini();
    expect(mini!.progress).toBe(0);
  });

  it('coin_rush keeps score-scaled progress', () => {
    pinDay(miniStartDay(0)); // coin_rush is template index 0
    eventManager.init({});
    eventManager.onPuzzleComplete(600, 3, false);

    const mini = activeBuiltinMini();
    expect(mini).toBeDefined();
    expect(mini!.name).toBe('Coin Rush');
    expect(mini!.progress).toBe(600); // thresholds 500/1500/3000 points
    expect(mini!.rewards[0].reached).toBe(true);
    expect(mini!.rewards[1].reached).toBe(false);
  });
});

describe('event reward keys are limited to what the claim path delivers', () => {
  it('main-event tiers only author coins/gems/hintTokens/decoration', () => {
    // EventScreen's claim handler credits coins/gems/hintTokens and grants
    // decoration via unlockDecoration. There is no client badge ledger, so
    // a `badge` key here would be silently dropped at claim time.
    const handled = new Set(['coins', 'gems', 'hintTokens', 'decoration']);
    for (const template of EVENT_TEMPLATES) {
      for (const tier of template.rewards) {
        for (const key of Object.keys(tier.rewards)) {
          expect(handled.has(key)).toBe(true);
        }
      }
    }
  });

  it('mini-event tiers only author coins/gems/hints (mapped to hintTokens)', () => {
    const handled = new Set(['coins', 'gems', 'hints']);
    for (const template of MINI_EVENT_TEMPLATES) {
      for (const tier of template.rewards) {
        for (const key of Object.keys(tier.reward)) {
          expect(handled.has(key)).toBe(true);
        }
      }
    }
  });
});
