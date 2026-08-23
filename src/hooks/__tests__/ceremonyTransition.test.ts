import fs from 'fs';
import path from 'path';
import { getCeremonyMotionPlan } from '../useCeremonyTransition';

const ROOT = path.join(__dirname, '../../..');
const COMPONENTS = [
  'FeatureUnlockCeremony.tsx',
  'ModeUnlockCeremony.tsx',
  'AchievementCeremony.tsx',
  'StreakMilestoneCeremony.tsx',
  'CollectionCompleteCeremony.tsx',
  'MilestoneCeremony.tsx',
  'PrestigeResetCeremony.tsx',
  'SeasonPassCompleteCeremony.tsx',
  'FirstPurchaseOfferModal.tsx',
] as const;

test('reduced motion uses settled values and instant dismissal', () => {
  expect(getCeremonyMotionPlan(true)).toEqual({
    initialOpacity: 1,
    initialScale: 1,
    enterDurationMs: 0,
    exitDurationMs: 0,
    animateDecorations: false,
  });
});

test('normal motion keeps one concise entrance and faster exit', () => {
  const plan = getCeremonyMotionPlan(false);
  expect(plan.initialOpacity).toBe(0);
  expect(plan.initialScale).toBeLessThan(1);
  expect(plan.enterDurationMs).toBeGreaterThan(plan.exitDurationMs);
  expect(plan.animateDecorations).toBe(true);
});

describe('active ceremony source contracts', () => {
  it.each(COMPONENTS)('%s uses the shared modal transition and layer', (file) => {
    const source = fs.readFileSync(path.join(ROOT, 'src/components', file), 'utf8');

    expect(source).toContain('useCeremonyTransition');
    expect(source).toContain('requestDismiss');
    expect(source).toContain('animateDecorations');
    expect(source).toContain('accessibilityViewIsModal');
    expect(source).toContain('accessibilityRole="alert"');
    expect(source).toContain('zIndex: CEREMONY_LAYER');
  });

  it.each(['PrestigeResetCeremony.tsx', 'SeasonPassCompleteCeremony.tsx'])(
    '%s defers its heavy particle field',
    (file) => {
      const source = fs.readFileSync(path.join(ROOT, 'src/components', file), 'utf8');
      expect(source).toContain('useDeferredMount(280)');
    },
  );
});

test('PuzzleComplete owns one root entrance and passes reduced motion to star bursts', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'src/components/PuzzleComplete.tsx'),
    'utf8',
  );

  expect(source.match(/const entrance = Animated\.parallel/g)).toHaveLength(1);
  expect(source).toContain('reduceMotion={suppressMotion}');
});
