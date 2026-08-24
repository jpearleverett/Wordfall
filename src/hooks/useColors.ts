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
import { useColorblindMode } from '../services/colorblindPreference';
import { getColorblindOverrides } from '../services/colorblind';

export type AppColors = typeof COLORS;

export function useColors(): AppColors {
  // Narrow external-store read (NOT useSettings): useColors mounts in every
  // LetterCell, so a full SettingsContext subscription re-rendered the
  // whole board on any unrelated settings write.
  const colorblindMode = useColorblindMode();
  return useMemo(() => {
    const overrides = getColorblindOverrides(colorblindMode);
    if (!overrides) return COLORS;
    return { ...COLORS, ...overrides };
  }, [colorblindMode]);
}
