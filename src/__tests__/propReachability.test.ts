/**
 * A prop declared on a component and never passed by its mount is a feature
 * that renders as nothing. The repo guards routes, ceremonies and (now)
 * modules; this is the fourth reachability class, and an Aug 2026 sweep found
 * four live instances of it:
 *
 *   ModeUnlockCeremony.onTryNow   The "TRY IT NOW" CTA is gated on the prop
 *                                 being present, and CeremonyRouter mounted
 *                                 the ceremony without it — so a player
 *                                 unlocked a mode and was given no way in.
 *                                 `ceremony.tryItNow` was translated in all
 *                                 six locales, which is the tell.
 *   GameHeader.themeColors        GameScreen resolved the equipped cosmetic
 *                                 theme into a useMemo nothing read. A
 *                                 purchased theme showed on Profile, on
 *                                 EditProfile and in the store — every surface
 *                                 except the game.
 *   HomeScreen.onOpenLibrary      The level-9 "EXPLORE the Grand Library"
 *                                 onboarding banner rendered, took the press,
 *                                 and did nothing.
 *   buildClubInviteLink           Not a prop, same shape: the RECEIVING half
 *                                 of club invites shipped (parse, route,
 *                                 confirm-before-join) with nothing to
 *                                 generate the link. The growth loop had no
 *                                 outbound edge.
 *
 * These are checked by source scan because each is a wiring fact between two
 * files that no unit test observes — the same reason screenReachability and
 * ceremonyCoverage read source.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** [what it is, where it is declared, where it must be passed, the token] */
const WIRINGS: Array<[string, string, string, RegExp]> = [
  [
    'ModeUnlockCeremony gets a way to open the mode it just unlocked',
    'src/components/ModeUnlockCeremony.tsx',
    'src/App/CeremonyRouter.tsx',
    /onTryNow=\{/,
  ],
  [
    'CeremonyRouter is given that callback by the app',
    'src/App/CeremonyRouter.tsx',
    'App.tsx',
    /onTryMode=\{/,
  ],
  [
    'the equipped cosmetic theme reaches the game header',
    'src/components/GameHeader.tsx',
    'src/screens/GameScreen.tsx',
    /themeColors=\{/,
  ],
  [
    'the onboarding library banner can open the library',
    'src/screens/HomeScreen.tsx',
    'App.tsx',
    /onOpenLibrary=\{/,
  ],
  [
    'club invites can be generated, not just accepted',
    'src/utils/deepLinking.ts',
    'src/screens/ClubScreen.tsx',
    /buildClubInviteLink\(/,
  ],
];

describe('prop reachability', () => {
  it.each(WIRINGS)('%s', (_what, declaredIn, passedIn, token) => {
    // Both halves must exist: the declaration, so the test is not pinning a
    // prop that was renamed away, and the pass-through.
    expect(fs.existsSync(path.join(ROOT, declaredIn))).toBe(true);
    expect(read(passedIn)).toMatch(token);
  });

  it('ModeUnlockCeremony still gates its CTA on the callback', () => {
    // If the gate goes away the wiring test above stops meaning anything —
    // the button would render regardless and the bug would be invisible.
    expect(read('src/components/ModeUnlockCeremony.tsx')).toMatch(/\{onTryNow && \(/);
  });

  it('GameHeader still falls back when no theme is equipped', () => {
    const header = read('src/components/GameHeader.tsx');
    expect(header).toMatch(/themeColors\?\.accent \?\?/);
  });
});
