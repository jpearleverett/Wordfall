/**
 * Monetization surfaces — display/charge convergence guards (Aug 2026).
 *
 * The audit behind these tests found four trust defects with one root
 * cause: a price or reward the UI displayed and the value the handler
 * actually moved lived in different places. These tests pin the structural
 * fix — every such pair now reads ONE constant in
 * `src/components/monetizationModel.ts` — plus the pure logic of that
 * module (doubler grant exactly-once, rescue price scaling, wheel odds
 * formatting, mini-pack option building).
 *
 * Component render behavior can't run under the node test environment
 * (testMatch is *.test.ts only), so UI-side halves are pinned the same way
 * feelPolish.test.ts pins GameScreen: source-shape assertions on the load-
 * bearing lines.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  applyCoinPurchaseToCounts,
  buildMiniPackOptions,
  computeDoubleRewardGrant,
  formatOddsPercent,
  getOfferPrice,
  getRescuePriceMultiplier,
  MiniPackContext,
  OFFER_HINT_GRANTS,
  POST_LOSS_HINT_PACK,
  PricedOfferType,
  RESCUE_MULTIPLIER_LEVEL_BANDS,
  RESCUE_PRICE_MULTIPLIER,
  roundPriceToFive,
  TIMEOUT_CONTINUE_GEM_COST,
  TIMEOUT_CONTINUE_SECONDS,
} from '../components/monetizationModel';
import { COIN_SHOP_ITEMS } from '../data/coinShop';
import { getRemoteNumber } from '../services/remoteConfig';

import en from '../locales/en.json';
import de from '../locales/de.json';
import es419 from '../locales/es-419.json';
import fr from '../locales/fr.json';
import ja from '../locales/ja.json';
import ptBR from '../locales/pt-BR.json';

function readSource(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
}

// ── getOfferPrice: single source for offer display AND charge ─────────────

describe('getOfferPrice', () => {
  it('scales the coin rescues by difficulty tier, rounded to 5', () => {
    // hint_rescue base 80: x1 / x1.5 / x2.5 / x4
    expect(getOfferPrice('hint_rescue', 'easy')).toEqual({ currency: 'coins', amount: 80 });
    expect(getOfferPrice('hint_rescue', 'medium')).toEqual({ currency: 'coins', amount: 120 });
    expect(getOfferPrice('hint_rescue', 'hard')).toEqual({ currency: 'coins', amount: 200 });
    expect(getOfferPrice('hint_rescue', 'expert')).toEqual({ currency: 'coins', amount: 320 });
    // close_finish base 25 (37.5 → 40, 62.5 → 65)
    expect(getOfferPrice('close_finish', 'easy').amount).toBe(25);
    expect(getOfferPrice('close_finish', 'medium').amount).toBe(40);
    expect(getOfferPrice('close_finish', 'hard').amount).toBe(65);
    expect(getOfferPrice('close_finish', 'expert').amount).toBe(100);
    // post_puzzle base 150
    expect(getOfferPrice('post_puzzle', 'easy').amount).toBe(150);
    expect(getOfferPrice('post_puzzle', 'medium').amount).toBe(225);
    expect(getOfferPrice('post_puzzle', 'hard').amount).toBe(375);
    expect(getOfferPrice('post_puzzle', 'expert').amount).toBe(600);
  });

  it('prices unknown or missing difficulty at the easy multiplier, never throwing', () => {
    expect(getOfferPrice('hint_rescue').amount).toBe(80);
    expect(getOfferPrice('hint_rescue', 'nightmare').amount).toBe(80);
  });

  it('continues the rescue ladder past the expert label with level bands (x6 at L151+, x8 at L601+)', () => {
    // The difficulty label freezes at 'expert' from L31; the level bands keep
    // the pinch alive where income keeps its late-game shape.
    expect(getOfferPrice('hint_rescue', 'expert', 150).amount).toBe(320); // x4
    expect(getOfferPrice('hint_rescue', 'expert', 151).amount).toBe(480); // x6
    expect(getOfferPrice('hint_rescue', 'expert', 600).amount).toBe(480); // x6
    expect(getOfferPrice('hint_rescue', 'expert', 601).amount).toBe(640); // x8
    expect(getOfferPrice('post_puzzle', 'expert', 700).amount).toBe(1200); // 150 x8
    // Band never lowers a price below the tier multiplier.
    expect(getRescuePriceMultiplier('expert', 30)).toBe(4);
    expect(getRescuePriceMultiplier('easy', 700)).toBe(8);
    expect(getRescuePriceMultiplier('easy')).toBe(1);
  });

  it('grants match the interpolated locale copy counts (display == grant)', () => {
    expect(OFFER_HINT_GRANTS).toEqual({ hint_rescue: 3, close_finish: 1, post_puzzle: 5 });
    // Contextual offers stay a deal but never sell below ~25c/hint at base.
    for (const [type, count] of Object.entries(OFFER_HINT_GRANTS)) {
      const perHint = getOfferPrice(type as PricedOfferType, 'easy').amount / count;
      expect(perHint).toBeGreaterThanOrEqual(25);
    }
  });

  it('keeps the gem offers flat regardless of difficulty', () => {
    for (const tier of ['easy', 'medium', 'hard', 'expert', undefined]) {
      expect(getOfferPrice('booster_pack', tier)).toEqual({ currency: 'gems', amount: 15 });
      expect(getOfferPrice('life_refill', tier)).toEqual({ currency: 'gems', amount: 10 });
      expect(getOfferPrice('streak_shield', tier)).toEqual({ currency: 'gems', amount: 30 });
    }
  });

  it('prices close_finish_premium from the same Remote Config key the old handler read', () => {
    const rc = Math.max(1, Math.round(getRemoteNumber('closeFinishPremiumGemCost')));
    expect(getOfferPrice('close_finish_premium')).toEqual({ currency: 'gems', amount: rc });
  });

  it('covers exactly the four difficulty tiers with the approved multipliers', () => {
    expect(RESCUE_PRICE_MULTIPLIER).toEqual({ easy: 1, medium: 1.5, hard: 2.5, expert: 4 });
    expect(RESCUE_MULTIPLIER_LEVEL_BANDS).toEqual([
      { minLevel: 601, multiplier: 8 },
      { minLevel: 151, multiplier: 6 },
    ]);
  });

  it('roundPriceToFive rounds to the nearest 5 with a floor of 5', () => {
    expect(roundPriceToFive(62.5)).toBe(65);
    expect(roundPriceToFive(37.5)).toBe(40);
    expect(roundPriceToFive(41)).toBe(40);
    expect(roundPriceToFive(43)).toBe(45);
    expect(roundPriceToFive(0)).toBe(5);
    expect(roundPriceToFive(-20)).toBe(5);
  });
});

// ── Locale price strings must name the currency the handler charges ───────

describe('offer price locale strings', () => {
  const LOCALES: Record<string, { bundle: any; coins: string; gems: string }> = {
    en: { bundle: en, coins: 'coin', gems: 'gem' },
    de: { bundle: de, coins: 'Münzen', gems: 'Juwelen' },
    fr: { bundle: fr, coins: 'pièces', gems: 'gemmes' },
    'es-419': { bundle: es419, coins: 'monedas', gems: 'gemas' },
    'pt-BR': { bundle: ptBR, coins: 'moedas', gems: 'gemas' },
    ja: { bundle: ja, coins: 'コイン', gems: 'ジェム' },
  };
  const OFFER_KEYS: Record<PricedOfferType, string> = {
    hint_rescue: 'hintRescue',
    close_finish: 'closeFinish',
    close_finish_premium: 'closeFinishPremium',
    post_puzzle: 'postPuzzle',
    booster_pack: 'boosterPack',
    life_refill: 'lifeRefill',
    streak_shield: 'streakShield',
    level_skip: 'levelSkip',
  };

  for (const [locale, { bundle, coins, gems }] of Object.entries(LOCALES)) {
    it(`${locale}: every offer.*.price interpolates {{amount}} and names the charged currency`, () => {
      for (const [offerType, i18nKey] of Object.entries(OFFER_KEYS)) {
        const value: string = bundle.offer[i18nKey].price;
        const charged = getOfferPrice(offerType as PricedOfferType, 'easy').currency;
        const [right, wrong] = charged === 'coins' ? [coins, gems] : [gems, coins];
        // The number always comes from getOfferPrice via interpolation —
        // a hardcoded figure here is exactly the defect this fixes.
        expect({ locale, offerType, value }).toEqual({
          locale,
          offerType,
          value: expect.stringContaining('{{amount}}'),
        });
        expect(value).toContain(right);
        expect(value).not.toContain(wrong);
      }
    });
  }
});

// ── Double-reward grant: real delta, exactly once ─────────────────────────

describe('computeDoubleRewardGrant', () => {
  it('grants a delta equal to the awarded totals (making the final total exactly 2x)', () => {
    expect(computeDoubleRewardGrant(40, 2, false)).toEqual({ coins: 40, gems: 2 });
  });

  it('doubling a zero-award completion grants nothing (repeat boards, cap-exhausted clears)', () => {
    expect(computeDoubleRewardGrant(0, 0, false)).toBeNull();
  });

  it('is exactly-once: an already-granted completion yields null', () => {
    expect(computeDoubleRewardGrant(40, 2, true)).toBeNull();
  });

  it('sanitizes hostile inputs instead of minting currency', () => {
    expect(computeDoubleRewardGrant(-50, -1, false)).toBeNull();
    expect(computeDoubleRewardGrant(Number.NaN, Number.NaN, false)).toBeNull();
    expect(computeDoubleRewardGrant(10.9, 0, false)).toEqual({ coins: 10, gems: 0 });
  });
});

describe('double-reward wiring (GameScreen + EconomyContext)', () => {
  const gameScreen = readSource('../screens/GameScreen.tsx');
  const economy = readSource('../contexts/EconomyContext.tsx');

  it('GameScreen grants the real delta after the rewarded ad resolves', () => {
    expect(gameScreen).toContain('computeDoubleRewardGrant(');
    // Grant guarded by the per-completion exactly-once ref AND an in-flight
    // ref (the granted ref only flips after the ad await, so a second tap
    // during the await would otherwise double-pay).
    expect(gameScreen).toContain('if (doubleGrantedRef.current || doubleInFlightRef.current) return;');
    expect(gameScreen).toContain('doubleInFlightRef.current = true;');
    expect(gameScreen).toContain('doubleInFlightRef.current = false;');
    expect(gameScreen).toContain('doubleGrantedRef.current = true;');
    // …and re-armed at every completion boundary (new board / retry / next).
    expect(
      gameScreen.split('doubleGrantedRef.current = false;').length - 1,
    ).toBeGreaterThanOrEqual(3);
  });

  it("EconomyContext's old display-only 'double' no-op stayed a documented no-op (GameScreen owns the grant)", () => {
    // The case must still exist (exhaustive switch) but must not credit —
    // crediting here AND in GameScreen would double-pay.
    expect(economy).toContain("case 'double':");
    const caseBlock = economy.split("case 'double':")[1].split('break;')[0];
    expect(caseBlock).not.toMatch(/addCoins|addGems|setCoins|setGems/);
    expect(caseBlock).toContain('double-pay');
  });

  it('PuzzleComplete displays authoritative totals unconditionally and doubles truthfully', () => {
    const source = readSource('../components/PuzzleComplete.tsx');
    // The zero-fallback pattern that displayed unpaid rewards must be gone.
    expect(source).not.toContain('totalCoinsAwarded > 0 ? totalCoinsAwarded : coinReward');
    expect(source).not.toContain('totalGemsAwarded > 0 ? totalGemsAwarded : perfectClearGems()');
    // undefined = not delivered (estimate ok); a number — 0 included — is law.
    expect(source).toContain("totalCoinsAwarded !== undefined ? totalCoinsAwarded : coinReward");
    // The doubled display is base x2 (the grant is a delta equal to base).
    expect(source).toContain('rewardDoubled ? 2 : 1');
    // No doubler button when there is nothing to double.
    expect(source).toContain('hasSomethingToDouble');
  });
});

// ── Post-loss hint pack: label and charge share one record ────────────────

describe('POST_LOSS_HINT_PACK', () => {
  it('pins the pack shape both surfaces read', () => {
    // 3-for-120 (40c/hint): a post-loss deal against the 100c shop hint, but
    // no longer the 16c/hint leak that undercut every hint SKU.
    expect(POST_LOSS_HINT_PACK).toEqual({ hintCount: 3, costCoins: 120 });
  });

  it('PostLossModal renders the price from the shared record (the fake "$0.99" is gone)', () => {
    const source = readSource('../components/PostLossModal.tsx');
    expect(source).toContain("import { POST_LOSS_HINT_PACK } from './monetizationModel';");
    expect(source).not.toContain('$0.99');
    expect(source).not.toContain('99 cents');
    expect(source).toContain('{POST_LOSS_HINT_PACK.costCoins} coins');
    expect(source).toContain('{POST_LOSS_HINT_PACK.hintCount} Hints');
  });

  it('GameScreen charges the same record and routes the broke case to the mini pack sheet', () => {
    const source = readSource('../screens/GameScreen.tsx');
    expect(source).toContain('spendCoins(POST_LOSS_HINT_PACK.costCoins)');
    expect(source).toContain('addHintTokens(POST_LOSS_HINT_PACK.hintCount)');
    expect(source).toContain("openMiniPack('hints', 'post_loss_broke')");
  });

  it('PostLossModal pauses its auto-dismiss while a sheet is stacked on top', () => {
    const source = readSource('../components/PostLossModal.tsx');
    expect(source).toContain('paused?: boolean;');
    // Countdown interval torn down while paused…
    expect(source).toMatch(/if \(paused\) return;\s*\n\s*const interval = setInterval/);
    // …and the zero-tick dismiss gated on it too.
    expect(source).toContain('if (timeLeft === 0 && !paused)');
    // GameScreen drives it from the sheet's visibility.
    expect(readSource('../screens/GameScreen.tsx')).toContain('paused={miniPack !== null}');
  });
});

// ── Timeout continue ──────────────────────────────────────────────────────

describe('timeout continue', () => {
  it('grants 30 seconds', () => {
    expect(TIMEOUT_CONTINUE_SECONDS).toBe(30);
  });

  it('GameScreen gates the offer on the Remote Config flag and once-per-attempt ref', () => {
    const source = readSource('../screens/GameScreen.tsx');
    expect(source).toContain("getRemoteBoolean('timeoutContinueEnabled')");
    expect(source).toContain('!timeExtendUsedRef.current');
    expect(source).toContain('extendTime(TIMEOUT_CONTINUE_SECONDS)');
  });
});

// ── Wheel odds disclosure ─────────────────────────────────────────────────

describe('formatOddsPercent', () => {
  it('keeps the standard two-decimal format for ordinary wedges', () => {
    expect(formatOddsPercent(25)).toBe('25.00%');
    expect(formatOddsPercent(0.5)).toBe('0.50%');
  });

  it('never prints a real probability as zero (widens precision for tiny wedges)', () => {
    expect(formatOddsPercent(0.1)).toBe('0.10%');
    expect(formatOddsPercent(0.004)).toBe('0.004%');
    expect(formatOddsPercent(0.0004)).toBe('0.0004%');
    // Sub-1% wedges always carry at least one significant decimal.
    for (const p of [0.9, 0.1, 0.09, 0.01, 0.004]) {
      const printed = formatOddsPercent(p);
      expect(parseFloat(printed)).toBeGreaterThan(0);
    }
  });

  it('renders exactly 0 (or garbage) as 0%', () => {
    expect(formatOddsPercent(0)).toBe('0%');
    expect(formatOddsPercent(Number.NaN)).toBe('0%');
    expect(formatOddsPercent(-1)).toBe('0%');
  });

  it('MysteryWheel routes both disclosure lists through the shared formatter', () => {
    const source = readSource('../components/MysteryWheel.tsx');
    expect(source).toContain("import { formatOddsPercent } from './monetizationModel';");
    expect(source.split('formatOddsPercent(percent)').length - 1).toBe(2);
    expect(source).not.toContain("percent.toFixed(2)}%");
  });
});

// ── Mini pack sheet options ───────────────────────────────────────────────

describe('buildMiniPackOptions', () => {
  const baseCtx: MiniPackContext = {
    coins: 1000,
    adAvailable: true,
    isAdFree: false,
  };

  it('hints: ad path first, then coin items, then the IAP bundle', () => {
    const options = buildMiniPackOptions('hints', baseCtx);
    expect(options.map((o) => o.kind)).toEqual(['ad', 'coin_item', 'coin_item', 'iap']);
    expect(options.map((o) => o.id)).toEqual(['ad_hint', 'coin_hint_1', 'coin_hint_3', 'hint_bundle_10']);
  });

  it('hints: the ad option survives for ad-free purchasers (auto-grant, honest copy)', () => {
    const options = buildMiniPackOptions('hints', { ...baseCtx, adAvailable: false, isAdFree: true });
    const ad = options.find((o) => o.kind === 'ad');
    expect(ad).toBeDefined();
    expect(ad!.title).not.toMatch(/watch ad/i);
  });

  it('hints: no ad option when no ad is available and player is not ad-free', () => {
    const options = buildMiniPackOptions('hints', { ...baseCtx, adAvailable: false });
    expect(options.some((o) => o.kind === 'ad')).toBe(false);
  });

  it('every listed id resolves to a real catalog entry (no silently dropped rows)', () => {
    for (const need of ['hints', 'gems', 'coins', 'boosters', 'undo'] as const) {
      const options = buildMiniPackOptions(need, baseCtx);
      expect(options.length).toBeGreaterThanOrEqual(3);
    }
    // The gem list specifically: gems_30 never existed — a typo there
    // silently empties the sheet the NoLivesModal broke-path opens.
    expect(buildMiniPackOptions('gems', baseCtx).map((o) => o.id)).toEqual([
      'gems_50',
      'gems_120',
      'gems_500',
    ]);
  });

  it('boosters: three coin boosters plus the crate IAP', () => {
    const options = buildMiniPackOptions('boosters', baseCtx);
    expect(options.map((o) => o.id)).toEqual([
      'coin_spotlight',
      'coin_shuffle',
      'coin_wildcard',
      'booster_crate',
    ]);
  });

  it('undo: both coin undo items plus coin liquidity (a zero-token undo tap is never a dead end)', () => {
    const options = buildMiniPackOptions('undo', baseCtx);
    expect(options.map((o) => o.id)).toEqual(['coin_undo_1', 'coin_undo_3', 'coins_500']);
  });

  it('pins the gem timeout-continue fallback price next to the ad path', () => {
    expect(TIMEOUT_CONTINUE_SECONDS).toBe(30);
    expect(TIMEOUT_CONTINUE_GEM_COST).toBe(12);
  });

  it('marks unaffordable coin items instead of hiding them', () => {
    const options = buildMiniPackOptions('hints', { ...baseCtx, coins: 0 });
    const coinRows = options.filter((o): o is Extract<typeof o, { kind: 'coin_item' }> => o.kind === 'coin_item');
    expect(coinRows.length).toBeGreaterThan(0);
    expect(coinRows.every((o) => !o.affordable)).toBe(true);
  });

  it('honours the coin-shop daily limits via the shared ledger', () => {
    const hint1 = COIN_SHOP_ITEMS.find((i) => i.id === 'coin_hint_1')!;
    const maxed = { coin_hint_1: hint1.dailyLimit ?? 99 };
    const options = buildMiniPackOptions('hints', { ...baseCtx, purchasesToday: maxed });
    const row = options.find((o) => o.id === 'coin_hint_1');
    expect(row && row.kind === 'coin_item' && row.dailyLimitReached).toBe(true);
  });

  it('prefers the live localized IAP price and falls back to the catalog price', () => {
    const localized = buildMiniPackOptions('hints', {
      ...baseCtx,
      iapPriceFor: (id) => (id === 'hint_bundle_10' ? 'R$ 9,90' : undefined),
    });
    const iap = localized.find((o) => o.kind === 'iap');
    expect(iap && iap.kind === 'iap' && iap.priceLabel).toBe('R$ 9,90');

    const fallback = buildMiniPackOptions('hints', baseCtx).find((o) => o.kind === 'iap');
    expect(fallback && fallback.kind === 'iap' && fallback.priceLabel.length).toBeGreaterThan(0);
  });

  it('applyCoinPurchaseToCounts increments immutably', () => {
    const counts = { coin_hint_1: 1 };
    const next = applyCoinPurchaseToCounts(counts, 'coin_hint_1');
    expect(next).toEqual({ coin_hint_1: 2 });
    expect(counts).toEqual({ coin_hint_1: 1 });
    expect(applyCoinPurchaseToCounts({}, 'coin_shuffle')).toEqual({ coin_shuffle: 1 });
  });
});

// ── Zero-conversion moments actually open the sheet ───────────────────────

describe('mini pack sheet wiring', () => {
  const gameScreen = readSource('../screens/GameScreen.tsx');

  it('GameScreen mounts the sheet and routes every zero-inventory moment to it', () => {
    expect(gameScreen).toContain('<MiniPackSheet');
    expect(gameScreen).toContain("openMiniPack('hints', 'hint_button_empty')");
    expect(gameScreen).toContain("openMiniPack('boosters', 'booster_wildcard_empty')");
    expect(gameScreen).toContain("openMiniPack('boosters', 'booster_spotlight_empty')");
    expect(gameScreen).toContain("openMiniPack('boosters', 'booster_shuffle_empty')");
    // Every insufficient-funds offer accept opens the sheet for the missing
    // currency instead of silently closing.
    expect(gameScreen).toContain('openMiniPack(sheetNeed, `offer_${activeOffer}`)');
  });

  it('the hint choke-point gates stay ABOVE the sheet fallback (no-hint modes see no sheet)', () => {
    const handleHint = gameScreen.split('const handleHint = useCallback')[1].split('const handleUndo')[0];
    const allowGate = handleHint.indexOf('if (!hintsAllowed) return;');
    const produceGate = handleHint.indexOf('if (!canProduceHint(store.getState())) return;');
    const sheetCall = handleHint.indexOf("openMiniPack('hints'");
    expect(allowGate).toBeGreaterThanOrEqual(0);
    expect(produceGate).toBeGreaterThan(allowGate);
    expect(sheetCall).toBeGreaterThan(produceGate);
  });

  it('GameHeader keeps the no-affordance rule for no-hint modes but stays tappable when empty', () => {
    const source = readSource('../components/GameHeader.tsx');
    expect(source).toContain('{modeConfig.rules.allowHints && (');
    // The empty-state tap must reach onHint (which opens the sheet) — the
    // old disabled={hintsLeft <= 0} silently swallowed it.
    expect(source).not.toContain('disabled={hintsLeft <= 0}');
  });

  it('NoLivesModal broke path routes to a gem sheet wired in App.tsx', () => {
    expect(readSource('../components/NoLivesModal.tsx')).toContain('onGetGems');
    const app = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
    expect(app).toContain('onGetGems={handleNoLivesGetGems}');
    expect(app).toContain('need="gems"');
    expect(app).toContain('presentation="modal"');
  });

  it('the out-of-energy wall is the designed modal at all three call sites, shop door intact', () => {
    // Aug 2026: the bare native Alert (and its 'Go to Shop' button) was
    // replaced by OutOfEnergyModal — branded, instrumented, A/B-able. The
    // shop door survives as the onGemRefill broke path: a failed gem spend
    // navigates to Shop instead of dead-ending.
    const app = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
    expect(app).not.toContain("Alert.alert('Not Enough Gems'");
    expect(app).not.toContain("Alert.alert(\n          'Take a Break!'");
    expect(app.split('<OutOfEnergyModal').length - 1).toBeGreaterThanOrEqual(3);
    expect(app.split('onGemRefill={').length - 1).toBeGreaterThanOrEqual(3);
    // Every mount's broke path opens the shop (Home mounts navigate the
    // sibling 'Shop' screen directly; the tab wrappers nest it).
    const modalBlocks = app.split('<OutOfEnergyModal').slice(1);
    for (const block of modalBlocks) {
      const handler = block.split('onClose=')[0];
      expect(handler).toContain("'Shop'");
    }
  });
});

// ── Interstitial call site ────────────────────────────────────────────────

describe('next-level interstitial', () => {
  it('is gated on the clamped Remote Config minimum level and the celebration modes', () => {
    const source = readSource('../screens/GameScreen.tsx');
    expect(source).toContain("getRemoteNumberClamped('interstitialMinLevel', 10, 1, 200)");
    expect(source).toContain("if (isDaily || mode === 'weekly') return false;");
    expect(source).toContain('adManager.canShowInterstitial()');
    expect(source).toContain('await adManager.showInterstitialAd()');
  });
});
