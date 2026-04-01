/**
 * React hook for consuming experiment variants.
 *
 * Provides memoized access to a user's assigned variant and config,
 * plus a convenience function to track exposure.
 *
 * Usage:
 * ```tsx
 * const { variant, config, trackExposure } = useExperiment('hint_rescue_price');
 * const price = (config.hintRescuePrice as number) ?? 50;
 *
 * useEffect(() => {
 *   trackExposure(); // log when the user actually sees this feature
 * }, []);
 * ```
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getAssignedVariant,
  trackExperimentExposure,
  ExperimentVariant,
} from '../services/experiments';

interface UseExperimentResult {
  /** The assigned variant object (id, name, weight, config) */
  variant: ExperimentVariant;
  /** Shorthand for variant.config — the variant-specific configuration */
  config: Record<string, any>;
  /** Call when the user is actually exposed to the experiment (sees the feature) */
  trackExposure: () => void;
}

/**
 * React hook for experiment variant access.
 *
 * Deterministically assigns the current user to an experiment variant
 * and provides the variant's configuration values.
 *
 * The assignment is memoized — it will not change across re-renders
 * unless the experimentId or userId changes.
 *
 * @param experimentId - The experiment's unique identifier
 * @returns Object with variant, config, and trackExposure function
 */
export function useExperiment(experimentId: string): UseExperimentResult {
  const { user } = useAuth();
  const userId = user?.uid ?? 'anonymous';

  const variant = useMemo(
    () => getAssignedVariant(experimentId, userId),
    [experimentId, userId],
  );

  const config = useMemo(() => variant.config, [variant]);

  const trackExposure = useCallback(() => {
    trackExperimentExposure(experimentId, userId);
  }, [experimentId, userId]);

  return { variant, config, trackExposure };
}
