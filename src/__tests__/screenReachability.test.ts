/**
 * EVERY REGISTERED SCREEN NEEDS A WAY IN.
 *
 * ClubScreen was registered in the Profile stack and nothing navigated to it.
 * The whole social layer — club goals, shared goals, member chat, the gift
 * inbox, browse-clubs — was reachable only by following someone else's invite
 * deep link, and onboarding's economy primer taught the player what Clubs are
 * before giving them any way to open one. Nothing failed: the route existed,
 * the screen compiled, the tests passed.
 *
 * This is a source-level check rather than a render test because that is what
 * the bug actually was — not a broken screen, but an absent caller. It reads
 * the navigator's registered route names and asserts each is either navigated
 * to somewhere, or listed below as deliberately entry-less with a reason.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
// The app's real navigators live in App.tsx. A previous version of this
// test scanned src/navigation/MainNavigator.tsx — which turned out to be
// imported by nothing, so the test was auditing dead code while the live
// navigator went unchecked. That file is deleted; if a dedicated navigator
// module returns, point this at wherever the screens are actually
// registered.
const NAVIGATOR = path.join(SRC, '../App.tsx');
const SCAFFOLD = path.join(SRC, 'components/common/ScreenScaffold.tsx');
const HOME_SCREEN = path.join(SRC, 'screens/HomeScreen.tsx');

/**
 * Routes with no in-app navigation on purpose. Each needs a reason, so that
 * adding one is a decision rather than an oversight.
 */
const INTENTIONALLY_UNREACHABLE: Record<string, string> = {
  // RootStack renders `Onboarding OR MainTabs` via a ternary on onboarding
  // state, so BOTH are initial routes of their branch — but only the first
  // declared one is caught by the initial-route heuristic below. Nothing
  // navigates to MainTabs by name; it mounts by construction.
  MainTabs: 'conditionally-rendered root — the non-onboarding branch of RootStack',
  //
  // Not listed: WeeklyLeaderboardScreen. It is not a registered route at all
  // — the file exists but no navigator declares it — so it never reaches this
  // check. That is deliberate: weeklyCompetitionEnabled defaults false and
  // its own comment says the screen stays dark until reward tiers and copy
  // are final and the Cloud Function has produced real leaderboard data.
  // Registering a route for it would ship the feature the flag exists to
  // withhold.
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('navigator route reachability', () => {
  const navigatorSource = fs.readFileSync(NAVIGATOR, 'utf8');

  // The FIRST screen declared inside a given stack is that stack's initial
  // route — React Navigation does not need an explicit initialRouteName — so
  // it is reachable by construction and must not be flagged. Group screens by
  // their stack and drop each group's first entry.
  // Stack routes only. A Tab.Screen is reachable by construction — the tab
  // bar renders a button for it — so a tab needs no navigate() call and
  // including them would only produce noise.
  const byStack = new Map<string, string[]>();
  for (const m of navigatorSource.matchAll(/<(\w*Stack)\.Screen\s+name="([^"]+)"/g)) {
    const [, stack, name] = m;
    if (!byStack.has(stack)) byStack.set(stack, []);
    byStack.get(stack)!.push(name);
  }
  const initialRoutes = new Set(
    Array.from(byStack.values(), (names) => names[0]).filter(Boolean),
  );
  const routeNames = Array.from(byStack.values())
    .flat()
    .filter((name) => !initialRoutes.has(name));

  // All app source plus the root App.tsx, which owns deep links.
  const sources = [...walk(SRC), path.join(SRC, '../App.tsx')]
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');

  it('finds routes to check', () => {
    // If the regex stops matching (navigator refactor), this suite would
    // silently pass while checking nothing.
    expect(routeNames.length).toBeGreaterThan(3);
  });

  it.each(routeNames)('%s is reachable from somewhere in the app', (route) => {
    if (INTENTIONALLY_UNREACHABLE[route]) return;

    // A route is reachable if anything navigates to it, or a deep link
    // resolves to it (`screen: 'Club'`), or it is a stack's initial screen.
    const patterns = [
      new RegExp(`navigate\\(\\s*['"\`]${route}['"\`]`),
      new RegExp(`screen:\\s*['"\`]${route}['"\`]`),
      new RegExp(`replace\\(\\s*['"\`]${route}['"\`]`),
      new RegExp(`push\\(\\s*['"\`]${route}['"\`]`),
      new RegExp(`initialRouteName=['"\`{]*${route}`),
    ];
    const reachable = patterns.some((p) => p.test(sources));

    if (!reachable) {
      throw new Error(
        `Route "${route}" is registered in the navigator but nothing navigates to it. ` +
          `Either wire an entry point, or add it to INTENTIONALLY_UNREACHABLE with a reason.`,
      );
    }
  });
});

describe('screen transition ownership', () => {
  const appSource = fs.readFileSync(NAVIGATOR, 'utf8');
  const scaffoldSource = fs.readFileSync(SCAFFOLD, 'utf8');
  const homeSource = fs.readFileSync(HOME_SCREEN, 'utf8');

  it('leaves full-screen entrance motion to navigation', () => {
    expect(appSource).not.toContain("from './src/components/ScreenEntrance'");
    expect(scaffoldSource).not.toContain('Animated.timing(enterAnim');
    expect(homeSource).not.toContain('Animated.spring(titleAnim');
  });
});
