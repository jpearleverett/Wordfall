import { isHardEnergyEnabled, tryStartLevel, onLevelFailed, getNextLifeAtMs } from '../hardEnergy';

/**
 * Verify Phase 4B wire-up is a safe no-op by default. The Remote Config
 * default for `hardEnergyEnabled` is false, so none of these helpers
 * should lock the player out of play.
 */
describe('hardEnergy (Phase 4B — default OFF)', () => {
  it('isHardEnergyEnabled returns false by default', () => {
    expect(isHardEnergyEnabled()).toBe(false);
  });

  it('tryStartLevel returns canPlay=true when flag is off', () => {
    expect(tryStartLevel()).toEqual({ canPlay: true });
  });

  it('onLevelFailed is a no-op when flag is off', () => {
    expect(() => onLevelFailed()).not.toThrow();
  });

  it('getNextLifeAtMs returns null when flag is off', () => {
    expect(getNextLifeAtMs()).toBeNull();
  });
});
