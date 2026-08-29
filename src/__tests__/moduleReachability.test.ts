/**
 * Every module under src/ must be imported by something.
 *
 * The repo already guards two reachability classes — registered routes
 * (screenReachability) and ceremony variants (ceremonyCoverage) — and both
 * caught real bugs and now hold. This is the third: whole modules that nothing
 * imports. A sweep in Aug 2026 found eight, of which six were dead weight and
 * are deleted:
 *
 *   hooks/useStorage.ts        legacy progression writer, superseded by
 *                              PlayerContext — and a live footgun, because it
 *                              advanced currentLevel with NO chapter star gate
 *   services/hardEnergy.ts     duplicate of the live useHardEnergy hook
 *   data/regionalPricing.ts    superseded by iap.ts reading storeProduct.price
 *   utils/assetUrls.ts         hotlinked Unsplash/picjumbo URLs
 *   utils/lazyAssets.ts        unused
 *   components/common/{Card,Button,Badge}.tsx
 *                              an unused UI kit; every screen styles inline
 *
 * The two survivors are deliberate and listed below. Anything else that turns
 * up here is either work that never got wired (fix the wiring) or work that
 * got superseded (delete it) — both are decisions, and this test makes you
 * make one.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');
const ROOT = path.join(SRC, '..');

/** Modules with no importer, on purpose. Each needs a reason. */
const DELIBERATELY_DARK: Record<string, string> = {
  'screens/WeeklyLeaderboardScreen.tsx':
    'Parked behind the weeklyCompetitionEnabled Remote Config flag; documented in screenReachability.test.ts.',
  'hooks/useExperiment.ts':
    'The A/B consumption layer. Nothing assigns a variant yet, so no experiment is ever exposed or logged — ' +
    'a real ops gap, but wiring the first experiment is a product decision, not a cleanup.',
};

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__mocks__') continue;
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function allTextFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) allTextFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('module reachability', () => {
  it('no module is dead weight', () => {
    const modules = sourceFiles(SRC);
    // Tests count as importers: a module exercised only by its own suite is
    // still reachable code, and flagging those would just push people to
    // delete tests.
    const corpus = [...allTextFiles(SRC), path.join(ROOT, 'App.tsx')].map((f) => ({
      file: f,
      text: fs.readFileSync(f, 'utf8'),
    }));

    const orphans: string[] = [];
    for (const mod of modules) {
      const base = path.basename(mod).replace(/\.tsx?$/, '');
      if (base === 'index') continue;                       // barrels
      if (/\.(web|native|ios|android)$/.test(base)) continue; // platform variants
      const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const imported = new RegExp(`from\\s+['"][^'"]*\\b${escaped}['"]`);
      const hit = corpus.some((c) => c.file !== mod && imported.test(c.text));
      if (!hit) orphans.push(path.relative(SRC, mod).split(path.sep).join('/'));
    }

    const unexplained = orphans.filter((o) => !(o in DELIBERATELY_DARK));
    expect(unexplained).toEqual([]);
  });

  it('the ledger does not outlive its entries', () => {
    // An entry that is no longer orphaned should be removed, so the ledger
    // stays an accurate list of what is dark rather than folklore.
    for (const rel of Object.keys(DELIBERATELY_DARK)) {
      expect(fs.existsSync(path.join(SRC, rel))).toBe(true);
    }
  });

  it('the deleted modules stay deleted', () => {
    for (const gone of [
      'hooks/useStorage.ts',
      'services/hardEnergy.ts',
      'data/regionalPricing.ts',
      'utils/assetUrls.ts',
      'utils/lazyAssets.ts',
      'components/common/Card.tsx',
      'components/common/Button.tsx',
      'components/common/Badge.tsx',
    ]) {
      expect(fs.existsSync(path.join(SRC, gone))).toBe(false);
    }
  });
});
