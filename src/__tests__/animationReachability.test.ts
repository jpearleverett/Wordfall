/**
 * Dead animation code stays dead.
 *
 * The Aug 2026 perf/animation sweep confirmed (via repo-wide import search,
 * adversarially re-verified) that these animation-bearing components had
 * ZERO production import sites — several of them running infinite Reanimated
 * loops or mounting hundreds of Animated values that could only ever waste
 * review attention and invite accidental re-mounting. They were deleted.
 *
 * This guard keeps them deleted: re-introducing one of these files without a
 * consumer fails here; re-introducing WITH a consumer means removing it from
 * this list, which is exactly the review conversation we want.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');

const DELETED = [
  'components/LevelUpCeremony.tsx',
  'components/DifficultyTransitionCeremony.tsx',
  'components/game/GravityTrailEffect.tsx',
  'components/victory/GridDissolveEffect.tsx',
  'components/victory/FlawlessBadge.tsx',
  'components/ReplayViewer.tsx',
  'components/common/SynthwaveBackdrop.tsx',
  'components/common/Modal.tsx',
  'components/common/CRTModal.tsx',
  'components/common/NeonButton.tsx',
  'components/common/NeonCard.tsx',
  'components/common/ProgressBar.tsx',
  'components/common/Tooltip.tsx',
  'components/common/CachedImage.tsx',
  'components/common/HeroIllustrations.tsx',
  'components/economy/CurrencyDisplay.tsx',
  'components/economy/ShopItem.tsx',
  'components/events/EventBanner.tsx',
  'components/events/EventProgress.tsx',
  'components/LoginCalendar.tsx',
  'components/ChallengeCard.tsx',
  'components/modes/MoveCounter.tsx',
];

test.each(DELETED)('%s stays deleted (was dead animation code)', (relative) => {
  expect(fs.existsSync(path.join(SRC, relative))).toBe(false);
});

test('no production file imports a deleted component', () => {
  const offenders: string[] = [];
  const deletedBasenames = DELETED.map((d) => path.basename(d, '.tsx'));
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== '__mocks__' && entry.name !== 'node_modules') visit(target);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const source = fs.readFileSync(target, 'utf8');
        for (const base of deletedBasenames) {
          // Match real import paths only, not homonym identifiers/comments.
          if (new RegExp(`from '[^']*/${base}'`).test(source)) {
            offenders.push(`${target} imports ${base}`);
          }
        }
      }
    }
  };
  visit(SRC);
  // App.tsx lives at the repo root, outside src/.
  const appSource = fs.readFileSync(path.resolve(SRC, '../App.tsx'), 'utf8');
  for (const base of deletedBasenames) {
    if (new RegExp(`from '[^']*/${base}'`).test(appSource)) {
      offenders.push(`App.tsx imports ${base}`);
    }
  }
  expect(offenders).toEqual([]);
});
