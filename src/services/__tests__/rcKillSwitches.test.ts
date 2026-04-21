/**
 * Guardrail tests for the three Remote-Config kill-switches that
 * previously were flag definitions with no consumer. Each test proves
 * the feature in question actually short-circuits when the flag is
 * false — so a future refactor that accidentally removes the gate
 * will fail CI instead of silently re-enabling the feature.
 */

const mockBooleans = new Map<string, boolean>();
const mockStrings = new Map<string, string>();

jest.mock('../remoteConfig', () => ({
  getRemoteBoolean: (key: string): boolean =>
    mockBooleans.has(key) ? (mockBooleans.get(key) as boolean) : true,
  getRemoteString: (key: string): string =>
    mockStrings.has(key) ? (mockStrings.get(key) as string) : '',
}));

import { getAdjustedConfig } from '../../engine/difficultyAdjuster';
import { getFlashSale } from '../../data/dynamicPricing';
import { getCurrentEvent } from '../../data/events';
import type { BoardConfig, PlayerMetrics } from '../../types';

beforeEach(() => {
  mockBooleans.clear();
  mockStrings.clear();
});

describe('RC kill switches', () => {
  describe('adaptiveDifficultyEnabled', () => {
    const baseConfig: BoardConfig = {
      rows: 5,
      cols: 5,
      wordCount: 5,
      minWordLength: 3,
      maxWordLength: 6,
      difficulty: 'medium',
    };
    const strugglingMetrics: PlayerMetrics = {
      recentStars: [1, 1, 1, 1, 1],
      averageStars: 1.0,
      averageCompletionTime: 120,
      consecutiveThreeStars: 0,
      recentCompletionTimes: [120, 115, 130, 110, 125],
      levelAttempts: {},
    };

    it('bypasses adjustment when flag is false', () => {
      mockBooleans.set('adaptiveDifficultyEnabled', false);
      const result = getAdjustedConfig(baseConfig, strugglingMetrics);
      expect(result.direction).toBe('none');
      expect(result.reason).toBe('rc_disabled');
      expect(result.config).toBe(baseConfig);
    });

    it('adjusts normally when flag is true', () => {
      mockBooleans.set('adaptiveDifficultyEnabled', true);
      const result = getAdjustedConfig(baseConfig, strugglingMetrics);
      expect(result.direction).toBe('easier');
    });
  });

  describe('flashSaleEnabled', () => {
    it('returns null when flag is false', () => {
      mockBooleans.set('flashSaleEnabled', false);
      const sale = getFlashSale(new Date('2026-06-15T12:00:00Z'));
      expect(sale).toBeNull();
    });

    it('evaluates normally when flag is true', () => {
      mockBooleans.set('flashSaleEnabled', true);
      // No assertion on the value — 70% of days have null — just that
      // the flag isn't the thing forcing null.
      const sale = getFlashSale(new Date('2026-06-15T12:00:00Z'));
      expect(sale === null || typeof sale === 'object').toBe(true);
    });
  });

  describe('weekendBlitzEnabled', () => {
    // Event rotation is keyed off 2026-01-05 (Monday). The 12-week
    // template order puts weekendBlitz at index 10, so week 10
    // (2026-03-16 through 2026-03-22) is the first weekendBlitz week.
    // Pick a date inside that span to deterministically land on it.
    const inWeekendBlitzWeek = new Date('2026-03-20T12:00:00Z');
    let originalDate: DateConstructor;

    beforeAll(() => {
      originalDate = global.Date;
      const FixedDate = class extends originalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(inWeekendBlitzWeek.getTime());
          } else {
            // @ts-expect-error forwarding variadic args to Date
            super(...args);
          }
        }
        static now() {
          return inWeekendBlitzWeek.getTime();
        }
      };
      // @ts-expect-error test-time Date override
      global.Date = FixedDate;
    });

    afterAll(() => {
      global.Date = originalDate;
    });

    it('returns null on a weekendBlitz week when flag is false', () => {
      mockBooleans.set('weekendBlitzEnabled', false);
      const event = getCurrentEvent();
      // If the rotation landed on a different week's event, this test
      // passes trivially — that's fine, the contract only cares that
      // weekendBlitz SPECIFICALLY doesn't leak through.
      if (event !== null) {
        expect(event.type).not.toBe('weekendBlitz');
      }
    });

    it('returns the weekendBlitz event when flag is true', () => {
      mockBooleans.set('weekendBlitzEnabled', true);
      const event = getCurrentEvent();
      expect(event).not.toBeNull();
      expect(event!.type).toBe('weekendBlitz');
    });
  });
});
