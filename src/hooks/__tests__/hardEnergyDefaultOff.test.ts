/**
 * Hard energy (Phase 4B) must be a safe no-op until a Remote Config
 * experiment turns it on.
 *
 * This coverage used to point at `src/services/hardEnergy.ts`, a duplicate
 * implementation that nothing imported — so the property was asserted against
 * a module the game never ran, while the live path (`useHardEnergy`, composed
 * into App.tsx's GameScreenWrapper) had no test at all. The duplicate is
 * deleted; this checks the real one.
 *
 * The hook reads React context, so rather than mount it, this pins the two
 * facts that make it a no-op: the flag defaults false, and `canPlay` is
 * short-circuited by the flag before lives are ever consulted.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getRemoteBoolean } from '../../services/remoteConfig';

const HOOK = fs.readFileSync(path.join(__dirname, '../useHardEnergy.ts'), 'utf8');

describe('hard energy is off by default', () => {
  it('the Remote Config flag defaults to false', () => {
    expect(getRemoteBoolean('hardEnergyEnabled')).toBe(false);
  });

  it('canPlay ignores lives entirely while the flag is off', () => {
    // `!enabled ||` first means a player with zero lives is never blocked
    // until someone flips the flag.
    expect(HOOK).toMatch(/const canPlay = !enabled \|\| livesRemaining > 0;/);
  });

  it('reads the flag rather than assuming it', () => {
    expect(HOOK).toMatch(/getRemoteBoolean\('hardEnergyEnabled'\)/);
  });

  it('there is exactly one hard-energy implementation', () => {
    expect(fs.existsSync(path.join(__dirname, '../../services/hardEnergy.ts'))).toBe(false);
  });
});
