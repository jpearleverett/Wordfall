/**
 * comebackRewards — id → amount mapping for the welcome-back modal.
 *
 * The generator (PlayerProgressContext.checkComebackRewards) emits
 * comeback_3day_/comeback_7day_/comeback_30day_ ids; the consumer used to
 * branch on '14day' (emitted by nothing), so the top tier was dead and a
 * 30+ day returner got the bottom tier. Pin every emitted prefix here.
 */
import * as fs from 'fs';
import * as path from 'path';
import { comebackAmounts } from '../comebackRewards';

describe('comebackAmounts', () => {
  it('pays the top tier for a 30+ day absence', () => {
    expect(comebackAmounts(['comeback_30day_2026-08-24'])).toEqual({ coins: 500, hints: 15 });
  });

  it('pays the middle tier for a 7-29 day absence', () => {
    expect(comebackAmounts(['comeback_7day_2026-08-24'])).toEqual({ coins: 350, hints: 10 });
  });

  it('pays the bottom tier for a 3-6 day absence', () => {
    expect(comebackAmounts(['comeback_3day_2026-08-24'])).toEqual({ coins: 200, hints: 5 });
  });

  it('monotonic: a longer absence never pays less', () => {
    const three = comebackAmounts(['comeback_3day_x']);
    const seven = comebackAmounts(['comeback_7day_x']);
    const thirty = comebackAmounts(['comeback_30day_x']);
    expect(seven.coins).toBeGreaterThan(three.coins);
    expect(thirty.coins).toBeGreaterThan(seven.coins);
    expect(seven.hints).toBeGreaterThan(three.hints);
    expect(thirty.hints).toBeGreaterThan(seven.hints);
  });

  it('covers every prefix the generator emits (none map to the default by accident)', () => {
    const generator = fs.readFileSync(
      path.join(__dirname, '..', '..', 'contexts', 'PlayerProgressContext.tsx'),
      'utf8',
    );
    const emitted = [...generator.matchAll(/comeback_(\d+day)_/g)].map((m) => m[1]);
    expect(emitted.length).toBeGreaterThan(0);
    const tiers = new Set(
      [...new Set(emitted)].map((prefix) =>
        JSON.stringify(comebackAmounts([`comeback_${prefix}_2026-08-24`])),
      ),
    );
    // Each distinct emitted prefix resolves to a distinct tier — if a new
    // prefix falls through to the default it will collide with 3day's tier.
    expect(tiers.size).toBe(new Set(emitted).size);
  });
});
