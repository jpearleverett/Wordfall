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
import { usePlayer } from '../contexts/PlayerContext';
import {
  getAssignedVariant,
  trackExperimentExposure,
  ExperimentVariant,
} from '../services/experiments';

/**
 * Flatten `PlayerSegments` into a single string[] so experiments.ts can
 * intersect against `targetSegments` without knowing the dimension names.
 * Segments are passed as individual strings (e.g. 'non_payer', 'lapsed',
 * 'competitor', 'intermediate') — the experiment lists any of these
 * buckets verbatim in `targetSegments`.
 */
function flattenSegments(segments: any): string[] | undefined {
  if (!segments) return undefined;
  const out: string[] = [];
  if (typeof segments.engagement === 'string') out.push(segments.engagement);
  if (typeof segments.spending === 'string') out.push(segments.spending);
  if (typeof segments.skill === 'string') out.push(segments.skill);
  if (Array.isArray(segments.motivations)) {
    for (const m of segments.motivations) {
      if (typeof m === 'string') out.push(m);
    }
  }
  return out;
}

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
  const player = usePlayer();
  const userId = user?.uid ?? 'anonymous';
  const segmentList = useMemo(
    () => flattenSegments((player as any)?.segments),
    [(player as any)?.segments],
  );

  const variant = useMemo(
    () => getAssignedVariant(experimentId, userId, segmentList),
    [experimentId, userId, segmentList],
  );

  const config = useMemo(() => variant.config, [variant]);

  const trackExposure = useCallback(() => {
    trackExperimentExposure(experimentId, userId);
  }, [experimentId, userId]);

  return { variant, config, trackExposure };
}
