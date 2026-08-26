/**
 * Pure logic for the pre-level booster-commit sheet — kept free of React
 * Native imports so plain ts-jest tests can import it (same convention as
 * monetizationModel.ts).
 */
import { isSpikeLevel } from '../constants';
import type { GameMode } from '../types';

export interface BoosterCounts {
  wildcardTile: number;
  spotlight: number;
  smartShuffle: number;
}

/**
 * Whether the sheet should show for this level entry. The sheet is the
 * genre's top-converting placement, so the matrix is deliberately tight:
 * spike levels only, once per entry, never over tutorials or the
 * daily/weekly/relax surfaces, dead with its RC kill switch.
 */
export function shouldShowPreLevelBoosterSheet(args: {
  enabled: boolean;
  level: number;
  mode: GameMode;
  isDaily: boolean;
  alreadyShownThisLevel: boolean;
  tutorialActive: boolean;
}): boolean {
  const { enabled, level, mode, isDaily, alreadyShownThisLevel, tutorialActive } = args;
  if (!enabled || alreadyShownThisLevel || tutorialActive) return false;
  if (isDaily || mode === 'weekly' || mode === 'relax') return false;
  return isSpikeLevel(level);
}
