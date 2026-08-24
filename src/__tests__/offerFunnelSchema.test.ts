/**
 * ONE EVENT NAME, ONE PARAM SCHEMA.
 *
 * GameScreen's in-game contextual offers — the highest-value monetization
 * surface in the game — logged offer_shown / offer_accepted / offer_dismissed
 * with a camelCase `offerType`, while PostLossModal and the typed analytics
 * helpers logged the same three event names with snake_case `offer_type`.
 * Firebase Analytics and the Firestore analytics_events mirror treat those as
 * unrelated parameters, so any funnel query grouping by offer_type saw NULL
 * for every in-game offer and the surface looked like it converted nothing.
 *
 * Source scan rather than a render test, because the defect was a spelling —
 * both call sites worked, logged, and typechecked.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const FUNNEL_EVENTS = /logEvent\(\s*'(offer_shown|offer_accepted|offer_dismissed)'\s*,\s*\{([^}]*)\}/g;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'node_modules'
        ? []
        : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('offer funnel analytics schema', () => {
  const callSites = sourceFiles(SRC).flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return [...source.matchAll(FUNNEL_EVENTS)].map(([, event, params]) => ({
      file: path.relative(SRC, file),
      event,
      params,
    }));
  });

  test('the funnel is actually emitted somewhere', () => {
    expect(callSites.length).toBeGreaterThan(0);
  });

  test('every call site identifies the offer with offer_type', () => {
    const offenders = callSites.filter(
      (site) => !/\boffer_type\s*:/.test(site.params) || /\bofferType\s*:/.test(site.params),
    );

    expect(
      offenders.map((site) => `${site.file} — ${site.event}`),
    ).toEqual([]);
  });
});
