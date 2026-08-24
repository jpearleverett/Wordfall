/**
 * giftGrants — canonical gift → economy conversion shared by the two claim
 * surfaces (App.tsx Home claim-all banner, ClubScreen GiftInbox).
 *
 * Pins the contract from src/services/gifts.ts: hint → hint tokens,
 * tile → wildcardTile booster token, life → lives, amount clamped to
 * [1, 10], unknown types grant nothing (no bare-else fallthrough).
 */
import * as fs from 'fs';
import * as path from 'path';
import { applyGiftGrant, clampGiftAmount, GiftGrantActions } from '../giftGrants';

function mockActions() {
  return {
    addHintTokens: jest.fn(),
    addBoosterToken: jest.fn(),
    addLives: jest.fn(),
  } satisfies GiftGrantActions & Record<string, jest.Mock>;
}

describe('clampGiftAmount', () => {
  it('passes 1..10 through and clamps outside the range', () => {
    expect(clampGiftAmount(1)).toBe(1);
    expect(clampGiftAmount(10)).toBe(10);
    expect(clampGiftAmount(0)).toBe(1);
    expect(clampGiftAmount(-5)).toBe(1);
    expect(clampGiftAmount(99)).toBe(10);
  });

  it('defaults missing/invalid amounts to 1', () => {
    expect(clampGiftAmount(undefined)).toBe(1);
    expect(clampGiftAmount(null)).toBe(1);
    expect(clampGiftAmount(NaN)).toBe(1);
    expect(clampGiftAmount(Infinity)).toBe(1);
  });
});

describe('applyGiftGrant', () => {
  it.each([1, 10, 99] as const)('hint (amount %p) → addHintTokens only', (amount) => {
    const actions = mockActions();
    const granted = applyGiftGrant({ type: 'hint', amount }, actions);
    const clamped = Math.min(amount, 10);
    expect(actions.addHintTokens).toHaveBeenCalledTimes(1);
    expect(actions.addHintTokens).toHaveBeenCalledWith(clamped);
    expect(actions.addBoosterToken).not.toHaveBeenCalled();
    expect(actions.addLives).not.toHaveBeenCalled();
    expect(granted).toEqual({ type: 'hint', amount: clamped });
  });

  it.each([1, 10, 99] as const)(
    "tile (amount %p) → addBoosterToken('wildcardTile') only — never rare collection letters",
    (amount) => {
      const actions = mockActions();
      const granted = applyGiftGrant({ type: 'tile', amount }, actions);
      const clamped = Math.min(amount, 10);
      expect(actions.addBoosterToken).toHaveBeenCalledTimes(1);
      expect(actions.addBoosterToken).toHaveBeenCalledWith('wildcardTile', clamped);
      expect(actions.addHintTokens).not.toHaveBeenCalled();
      expect(actions.addLives).not.toHaveBeenCalled();
      expect(granted).toEqual({ type: 'tile', amount: clamped });
    },
  );

  it.each([1, 10, 99] as const)('life (amount %p) → addLives only', (amount) => {
    const actions = mockActions();
    const granted = applyGiftGrant({ type: 'life', amount }, actions);
    const clamped = Math.min(amount, 10);
    expect(actions.addLives).toHaveBeenCalledTimes(1);
    expect(actions.addLives).toHaveBeenCalledWith(clamped);
    expect(actions.addHintTokens).not.toHaveBeenCalled();
    expect(actions.addBoosterToken).not.toHaveBeenCalled();
    expect(granted).toEqual({ type: 'life', amount: clamped });
  });

  it('grants nothing for an unknown type', () => {
    const actions = mockActions();
    const granted = applyGiftGrant({ type: 'mystery_box', amount: 5 }, actions);
    expect(granted).toBeNull();
    expect(actions.addHintTokens).not.toHaveBeenCalled();
    expect(actions.addBoosterToken).not.toHaveBeenCalled();
    expect(actions.addLives).not.toHaveBeenCalled();
  });
});

describe('claim surfaces route through the shared mapper', () => {
  const read = (rel: string) =>
    fs.readFileSync(path.join(__dirname, '..', '..', '..', rel), 'utf8');

  it('App.tsx and GiftInbox.tsx both import applyGiftGrant', () => {
    expect(read('App.tsx')).toMatch(/applyGiftGrant.*from '.\/src\/utils\/giftGrants'/);
    expect(read('src/components/GiftInbox.tsx')).toMatch(
      /applyGiftGrant.*from '..\/utils\/giftGrants'/,
    );
  });

  it("App.tsx no longer branches gifts on a bare else or grants rare tiles in the claim block", () => {
    const app = read('App.tsx');
    const claimBlock = app.slice(
      app.indexOf('handleClaimAllGifts'),
      app.indexOf('setClaimingGift(false)'),
    );
    expect(claimBlock.length).toBeGreaterThan(0);
    expect(claimBlock).not.toMatch(/gift\.type === 'hint'/);
    expect(claimBlock).not.toMatch(/addRareTile/);
    expect(claimBlock).toContain('applyGiftGrant');
  });
});
