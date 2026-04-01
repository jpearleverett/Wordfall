/**
 * Experiment Engine
 *
 * Configurable A/B testing system with weighted multi-variant assignment,
 * segment targeting, date-gated rollouts, and analytics integration.
 *
 * Uses the same deterministic hash as analytics.ts `getVariant()` for
 * backward compatibility — a userId always maps to the same bucket.
 *
 * Usage:
 *   const variant = getAssignedVariant('onboarding_flow', userId);
 *   const skipTutorial = getExperimentConfig('onboarding_flow', 'skipTutorial', userId, false);
 */

import { analytics } from './analytics';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ExperimentVariant {
  /** Unique variant identifier (e.g. 'A', 'B', 'control') */
  id: string;
  /** Human-readable variant name */
  name: string;
  /** Relative weight for assignment (higher = more traffic) */
  weight: number;
  /** Variant-specific configuration values consumed by feature code */
  config: Record<string, any>;
}

export interface Experiment {
  /** Unique experiment identifier (snake_case) */
  id: string;
  /** Human-readable experiment name */
  name: string;
  /** What this experiment is testing */
  description: string;
  /** Ordered list of variants with weights */
  variants: ExperimentVariant[];
  /** Optional segment filter — if set, only users in these segments are enrolled */
  targetSegments?: string[];
  /** ISO date string — experiment not active before this date */
  startDate?: string;
  /** ISO date string — experiment not active after this date */
  endDate?: string;
  /** Master kill switch */
  enabled: boolean;
}

// ── Deterministic hash (matches analytics.ts simpleHash) ───────────────────────

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ── Pre-configured experiments ─────────────────────────────────────────────────

const EXPERIMENTS: Experiment[] = [
  {
    id: 'onboarding_flow',
    name: 'Onboarding Flow',
    description: 'Test current 4-phase tutorial vs shorter 3-phase skip-tutorial variant',
    enabled: true,
    variants: [
      {
        id: 'A',
        name: 'Current 4-phase',
        weight: 50,
        config: {
          phases: 4,
          skipTutorial: false,
        },
      },
      {
        id: 'B',
        name: '3-phase skip-tutorial',
        weight: 50,
        config: {
          phases: 3,
          skipTutorial: true,
        },
      },
    ],
  },
  {
    id: 'energy_cap',
    name: 'Energy Cap',
    description: 'Test different daily energy cap values for engagement impact',
    enabled: true,
    variants: [
      {
        id: 'A',
        name: '30 energy (control)',
        weight: 34,
        config: { energyCap: 30 },
      },
      {
        id: 'B',
        name: '25 energy (lower)',
        weight: 33,
        config: { energyCap: 25 },
      },
      {
        id: 'C',
        name: '35 energy (higher)',
        weight: 33,
        config: { energyCap: 35 },
      },
    ],
  },
  {
    id: 'hint_rescue_price',
    name: 'Hint Rescue Price',
    description: 'Test hint rescue offer price points for conversion optimization',
    enabled: true,
    variants: [
      {
        id: 'A',
        name: '50 coins (control)',
        weight: 34,
        config: { hintRescuePrice: 50 },
      },
      {
        id: 'B',
        name: '30 coins (cheaper)',
        weight: 33,
        config: { hintRescuePrice: 30 },
      },
      {
        id: 'C',
        name: '75 coins (premium)',
        weight: 33,
        config: { hintRescuePrice: 75 },
      },
    ],
  },
  {
    id: 'first_purchase_offer',
    name: 'First Purchase Offer',
    description: 'Test first-purchase offer price/type for initial conversion',
    enabled: true,
    targetSegments: ['non_payer'],
    variants: [
      {
        id: 'A',
        name: '$0.99 starter',
        weight: 34,
        config: {
          offerType: 'starter',
          price: 0.99,
          showOffer: true,
        },
      },
      {
        id: 'B',
        name: '$1.99 value pack',
        weight: 33,
        config: {
          offerType: 'value_pack',
          price: 1.99,
          showOffer: true,
        },
      },
      {
        id: 'C',
        name: 'No offer (control)',
        weight: 33,
        config: {
          offerType: 'none',
          price: 0,
          showOffer: false,
        },
      },
    ],
  },
  {
    id: 'daily_reward_generosity',
    name: 'Daily Reward Generosity',
    description: 'Test daily reward multipliers for retention impact',
    enabled: true,
    variants: [
      {
        id: 'A',
        name: 'Current rewards (control)',
        weight: 34,
        config: {
          rewardMultiplier: 1.0,
          frequencyModifier: 1.0,
        },
      },
      {
        id: 'B',
        name: '1.5x rewards',
        weight: 33,
        config: {
          rewardMultiplier: 1.5,
          frequencyModifier: 1.0,
        },
      },
      {
        id: 'C',
        name: '2x rewards, lower frequency',
        weight: 33,
        config: {
          rewardMultiplier: 2.0,
          frequencyModifier: 0.7,
        },
      },
    ],
  },
  {
    id: 'mystery_wheel_free_frequency',
    name: 'Mystery Wheel Free Spin Frequency',
    description: 'Test how often free spins are awarded for engagement vs monetization',
    enabled: true,
    variants: [
      {
        id: 'A',
        name: 'Every 8 puzzles (control)',
        weight: 34,
        config: { freeSpinEveryN: 8 },
      },
      {
        id: 'B',
        name: 'Every 5 puzzles (generous)',
        weight: 33,
        config: { freeSpinEveryN: 5 },
      },
      {
        id: 'C',
        name: 'Every 12 puzzles (scarce)',
        weight: 33,
        config: { freeSpinEveryN: 12 },
      },
    ],
  },
];

// ── Experiment registry (indexed for fast lookup) ──────────────────────────────

const experimentMap = new Map<string, Experiment>(
  EXPERIMENTS.map(exp => [exp.id, exp])
);

// ── Core functions ─────────────────────────────────────────────────────────────

/**
 * Look up an experiment definition by ID.
 *
 * @param experimentId - The experiment's unique identifier
 * @returns The experiment definition, or null if not found
 */
export function getExperiment(experimentId: string): Experiment | null {
  return experimentMap.get(experimentId) ?? null;
}

/**
 * Get all currently active experiments (enabled + within date window).
 *
 * @returns Array of active experiment definitions
 */
export function getAllActiveExperiments(): Experiment[] {
  const now = new Date().toISOString();
  return EXPERIMENTS.filter(exp => {
    if (!exp.enabled) return false;
    if (exp.startDate && now < exp.startDate) return false;
    if (exp.endDate && now > exp.endDate) return false;
    return true;
  });
}

/**
 * Deterministically assign a user to an experiment variant using weighted
 * distribution. The same (experimentId, userId) pair always produces the
 * same variant, even across app restarts.
 *
 * Weights are relative — variants with weight [50, 25, 25] get 50%, 25%, 25%
 * of traffic respectively.
 *
 * If the experiment is not found or not active, returns the first variant of
 * the experiment definition (or a fallback control variant).
 *
 * @param experimentId - The experiment's unique identifier
 * @param userId - The user's unique identifier (e.g. Firebase UID)
 * @returns The assigned ExperimentVariant
 */
export function getAssignedVariant(
  experimentId: string,
  userId: string,
): ExperimentVariant {
  const experiment = experimentMap.get(experimentId);

  if (!experiment || experiment.variants.length === 0) {
    return {
      id: 'control',
      name: 'Control (fallback)',
      weight: 100,
      config: {},
    };
  }

  // Check if experiment is active
  const now = new Date().toISOString();
  if (!experiment.enabled) {
    return experiment.variants[0];
  }
  if (experiment.startDate && now < experiment.startDate) {
    return experiment.variants[0];
  }
  if (experiment.endDate && now > experiment.endDate) {
    return experiment.variants[0];
  }

  // Deterministic hash-based weighted assignment
  const seed = `${userId}_${experimentId}`;
  const hashValue = simpleHash(seed);
  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  const bucket = hashValue % totalWeight;

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant;
    }
  }

  // Should never reach here, but return last variant as safety net
  return experiment.variants[experiment.variants.length - 1];
}

/**
 * Get a specific configuration value for the user's assigned variant.
 *
 * This is the primary way feature code should consume experiment config:
 * ```
 * const price = getExperimentConfig('hint_rescue_price', 'hintRescuePrice', userId, 50);
 * ```
 *
 * @param experimentId - The experiment's unique identifier
 * @param configKey - The key within the variant's config object
 * @param userId - The user's unique identifier
 * @param defaultValue - Fallback value if experiment/key not found
 * @returns The config value from the assigned variant, or defaultValue
 */
export function getExperimentConfig<T>(
  experimentId: string,
  configKey: string,
  userId: string,
  defaultValue: T,
): T {
  const variant = getAssignedVariant(experimentId, userId);
  if (configKey in variant.config) {
    return variant.config[configKey] as T;
  }
  return defaultValue;
}

/**
 * Check whether a user is assigned to a specific variant of an experiment.
 *
 * Useful for boolean feature gates:
 * ```
 * if (isInExperiment('onboarding_flow', 'B', userId)) {
 *   // Show 3-phase tutorial
 * }
 * ```
 *
 * @param experimentId - The experiment's unique identifier
 * @param variantId - The variant ID to check against
 * @param userId - The user's unique identifier
 * @returns true if the user is assigned to the specified variant
 */
export function isInExperiment(
  experimentId: string,
  variantId: string,
  userId: string,
): boolean {
  const variant = getAssignedVariant(experimentId, userId);
  return variant.id === variantId;
}

/**
 * Log an experiment exposure event to analytics. Call this when the user
 * actually sees or is affected by the experiment — not at assignment time.
 *
 * This separation allows accurate "intent to treat" vs "as treated" analysis.
 *
 * @param experimentId - The experiment's unique identifier
 * @param userId - The user's unique identifier
 */
export function trackExperimentExposure(
  experimentId: string,
  userId: string,
): void {
  const variant = getAssignedVariant(experimentId, userId);
  const experiment = experimentMap.get(experimentId);

  analytics.logEvent('experiment_exposure' as any, {
    experiment_id: experimentId,
    experiment_name: experiment?.name ?? experimentId,
    variant_id: variant.id,
    variant_name: variant.name,
    user_id: userId,
    timestamp: Date.now(),
  });

  if (__DEV__) {
    console.log(
      `[Experiments] Exposure: "${experimentId}" variant "${variant.id}" for user ${userId}`,
    );
  }
}
