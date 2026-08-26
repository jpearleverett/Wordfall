/**
 * Pre-level booster-commit sheet — eligibility matrix. The sheet is the
 * genre's top-converting placement; the matrix pins that it fires ONLY on
 * spike levels, once per entry, never over tutorials or the daily/weekly/
 * relax surfaces, and dies with its RC kill switch.
 */
import { shouldShowPreLevelBoosterSheet } from '../preLevelBoosterLogic';
import { isSpikeLevel } from '../../constants';

const base = {
  enabled: true,
  level: 26, // 13 × 2 — a spike (first spike, 13, doubles as the calibrated first-purchase level)
  mode: 'classic' as const,
  isDaily: false,
  alreadyShownThisLevel: false,
  tutorialActive: false,
};

describe('shouldShowPreLevelBoosterSheet', () => {
  it('fires on a spike-level entry in classic mode', () => {
    expect(isSpikeLevel(base.level)).toBe(true);
    expect(shouldShowPreLevelBoosterSheet(base)).toBe(true);
  });

  it('the first spike (level 13) is also the calibrated first-purchase moment', () => {
    expect(shouldShowPreLevelBoosterSheet({ ...base, level: 13 })).toBe(true);
  });

  it('never fires on a non-spike level', () => {
    expect(shouldShowPreLevelBoosterSheet({ ...base, level: 27 })).toBe(false);
  });

  it('never fires on breather levels even at spike multiples (65 = LCM)', () => {
    expect(shouldShowPreLevelBoosterSheet({ ...base, level: 65 })).toBe(false);
  });

  it('suppressed for daily, weekly, and relax surfaces', () => {
    expect(shouldShowPreLevelBoosterSheet({ ...base, isDaily: true })).toBe(false);
    expect(shouldShowPreLevelBoosterSheet({ ...base, mode: 'weekly' as never })).toBe(false);
    expect(shouldShowPreLevelBoosterSheet({ ...base, mode: 'relax' as never })).toBe(false);
  });

  it('fires at most once per level entry and never over a tutorial', () => {
    expect(shouldShowPreLevelBoosterSheet({ ...base, alreadyShownThisLevel: true })).toBe(false);
    expect(shouldShowPreLevelBoosterSheet({ ...base, tutorialActive: true })).toBe(false);
  });

  it('dies with the RC kill switch', () => {
    expect(shouldShowPreLevelBoosterSheet({ ...base, enabled: false })).toBe(false);
  });
});
