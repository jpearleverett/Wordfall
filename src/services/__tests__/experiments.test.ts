jest.mock('../analytics', () => ({
  analytics: { logEvent: jest.fn() },
}));

(global as any).__DEV__ = false;

import {
  getExperiment,
  getAllActiveExperiments,
  getAssignedVariant,
  getExperimentConfig,
  isInExperiment,
  trackExperimentExposure,
} from '../experiments';
import { analytics } from '../analytics';

describe('getExperiment', () => {
  it('returns the experiment for a valid ID', () => {
    const exp = getExperiment('onboarding_flow');
    expect(exp).not.toBeNull();
    expect(exp!.id).toBe('onboarding_flow');
    expect(exp!.name).toBe('Onboarding Flow');
    expect(exp!.enabled).toBe(true);
    expect(exp!.variants.length).toBeGreaterThanOrEqual(2);
  });

  it('returns null for an invalid ID', () => {
    expect(getExperiment('nonexistent_experiment')).toBeNull();
  });

  it('returns all 6 known experiments by ID', () => {
    const ids = [
      'onboarding_flow',
      'energy_cap',
      'hint_rescue_price',
      'first_purchase_offer',
      'daily_reward_generosity',
      'mystery_wheel_free_frequency',
    ];
    for (const id of ids) {
      const exp = getExperiment(id);
      expect(exp).not.toBeNull();
      expect(exp!.id).toBe(id);
    }
  });
});

describe('getAllActiveExperiments', () => {
  it('returns all 6 experiments (all enabled, no date restrictions)', () => {
    const active = getAllActiveExperiments();
    expect(active).toHaveLength(6);
    const ids = active.map(e => e.id);
    expect(ids).toContain('onboarding_flow');
    expect(ids).toContain('energy_cap');
    expect(ids).toContain('hint_rescue_price');
    expect(ids).toContain('first_purchase_offer');
    expect(ids).toContain('daily_reward_generosity');
    expect(ids).toContain('mystery_wheel_free_frequency');
  });

  it('every returned experiment is enabled', () => {
    const active = getAllActiveExperiments();
    for (const exp of active) {
      expect(exp.enabled).toBe(true);
    }
  });
});

describe('getAssignedVariant', () => {
  it('is deterministic — same userId + experimentId always returns same variant', () => {
    const v1 = getAssignedVariant('onboarding_flow', 'user_abc');
    const v2 = getAssignedVariant('onboarding_flow', 'user_abc');
    expect(v1.id).toBe(v2.id);
    expect(v1.name).toBe(v2.name);
  });

  it('returned variant has id, name, weight, and config', () => {
    const variant = getAssignedVariant('energy_cap', 'user_xyz');
    expect(variant).toHaveProperty('id');
    expect(variant).toHaveProperty('name');
    expect(variant).toHaveProperty('weight');
    expect(variant).toHaveProperty('config');
    expect(typeof variant.id).toBe('string');
    expect(typeof variant.name).toBe('string');
    expect(typeof variant.weight).toBe('number');
    expect(typeof variant.config).toBe('object');
  });

  it('returns fallback control variant for unknown experiment', () => {
    const variant = getAssignedVariant('does_not_exist', 'user_123');
    expect(variant.id).toBe('control');
    expect(variant.name).toContain('fallback');
    expect(variant.weight).toBe(100);
    expect(variant.config).toEqual({});
  });

  it('different userIds can produce different variants', () => {
    // Try many users — at least two distinct variants should appear for a 2-variant experiment
    const variants = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const v = getAssignedVariant('onboarding_flow', `user_${i}`);
      variants.add(v.id);
    }
    expect(variants.size).toBeGreaterThanOrEqual(2);
  });
});

describe('getExperimentConfig', () => {
  it('returns the config value from the assigned variant', () => {
    // energy_cap has energyCap key in all variants (25, 30, or 35)
    const energyCap = getExperimentConfig<number>('energy_cap', 'energyCap', 'user_abc', 99);
    expect([25, 30, 35]).toContain(energyCap);
  });

  it('returns defaultValue for a missing config key', () => {
    const result = getExperimentConfig<string>(
      'energy_cap',
      'nonexistentKey',
      'user_abc',
      'fallback_value',
    );
    expect(result).toBe('fallback_value');
  });

  it('returns defaultValue for an unknown experiment', () => {
    const result = getExperimentConfig<number>(
      'nonexistent',
      'someKey',
      'user_abc',
      42,
    );
    expect(result).toBe(42);
  });
});

describe('isInExperiment', () => {
  it('returns true when user is assigned to the specified variant', () => {
    const variant = getAssignedVariant('onboarding_flow', 'test_user');
    const result = isInExperiment('onboarding_flow', variant.id, 'test_user');
    expect(result).toBe(true);
  });

  it('returns false when user is not in the specified variant', () => {
    const variant = getAssignedVariant('onboarding_flow', 'test_user');
    const otherVariantId = variant.id === 'A' ? 'B' : 'A';
    const result = isInExperiment('onboarding_flow', otherVariantId, 'test_user');
    expect(result).toBe(false);
  });

  it('returns false for unknown experiment', () => {
    const result = isInExperiment('nonexistent', 'A', 'test_user');
    expect(result).toBe(false);
  });
});

describe('trackExperimentExposure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs an experiment_exposure event via analytics', () => {
    trackExperimentExposure('onboarding_flow', 'user_123');
    expect(analytics.logEvent).toHaveBeenCalledTimes(1);
    expect(analytics.logEvent).toHaveBeenCalledWith(
      'experiment_exposure',
      expect.objectContaining({
        experiment_id: 'onboarding_flow',
        user_id: 'user_123',
      }),
    );
  });

  it('includes variant info in the logged event', () => {
    trackExperimentExposure('energy_cap', 'user_456');
    const call = (analytics.logEvent as jest.Mock).mock.calls[0];
    const payload = call[1];
    expect(payload).toHaveProperty('variant_id');
    expect(payload).toHaveProperty('variant_name');
    expect(payload).toHaveProperty('experiment_name');
    expect(payload).toHaveProperty('timestamp');
  });
});
