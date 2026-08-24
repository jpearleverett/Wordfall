/**
 * comebackRewards — maps the reward ids emitted by
 * PlayerProgressContext.checkComebackRewards() (`comeback_3day_*`,
 * `comeback_7day_*`, `comeback_30day_*`) to the coin/hint amounts the
 * welcome-back modal grants and displays.
 *
 * Kept as a pure module because the generator and its App.tsx consumer used
 * to disagree: the consumer branched on '14day' (which nothing emits), so
 * the top tier (500 coins / 15 hints) was unreachable and a 30+ day
 * returner was paid the bottom tier — less than an 8-day absence earned.
 */

export interface ComebackAmounts {
  coins: number;
  hints: number;
}

export function comebackAmounts(rewardIds: string[]): ComebackAmounts {
  const is30day = rewardIds.some((r) => r.includes('30day'));
  const is7day = rewardIds.some((r) => r.includes('7day'));
  if (is30day) return { coins: 500, hints: 15 };
  if (is7day) return { coins: 350, hints: 10 };
  return { coins: 200, hints: 5 };
}
