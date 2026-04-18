/**
 * useColors — palette hook that merges the app's static COLORS with the
 * user's colorblind-mode overrides from Settings.
 *
 * Components that carry gameplay meaning (LetterCell, word list, word-found
 * flash, error banners) should pull their semantic colors through this hook
 * instead of importing COLORS directly, so the CVD toggle takes effect.
 *
 * Neutral / synthwave decorative colors still import from `constants.ts`;
 * there is no value in recoloring a background gradient for CVD safety.
 */

import { useMemo } from 'react';
import { COLORS } from '../constants';
import { useSettings } from '../contexts/SettingsContext';
import { getColorblindOverrides } from '../services/colorblind';

export type AppColors = typeof COLORS;

export function useColors(): AppColors {
  const { colorblindMode } = useSettings();
  return useMemo(() => {
    const overrides = getColorblindOverrides(colorblindMode);
    if (!overrides) return COLORS;
    return { ...COLORS, ...overrides };
  }, [colorblindMode]);
}
