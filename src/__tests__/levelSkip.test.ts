/**
 * The 200-coin level skip — the churn valve for a player on a dead board with
 * undo and retry already spent.
 *
 * `handleSkipLevel` was fully implemented and had ZERO call sites: the only
 * occurrence of the name in the repo was its own declaration. Nothing in the
 * app could reach it. Wiring it up meant fixing four unsafe things in it
 * first, and those are what this pins — each one takes money or progression
 * from the player if it regresses, and none is visible to a unit test of the
 * handler because the order is the bug.
 */
import * as fs from 'fs';
import * as path from 'path';
import { LEVEL_SKIP_COST_COINS, getOfferPrice } from '../components/monetizationModel';

const ROOT = path.join(__dirname, '../..');
const app = fs.readFileSync(path.join(ROOT, 'App.tsx'), 'utf8');
const handler = app.slice(app.indexOf('const handleSkipLevel'), app.indexOf('const handleSkipLevel') + 3500);

describe('level skip', () => {
  it('charges what it displays', () => {
    expect(getOfferPrice('level_skip').amount).toBe(LEVEL_SKIP_COST_COINS);
    expect(getOfferPrice('level_skip').currency).toBe('coins');
  });

  it('is not difficulty-scaled', () => {
    // A player who is stuck is the last person to charge more.
    const easy = getOfferPrice('level_skip', 'easy', 5).amount;
    const late = getOfferPrice('level_skip', 'expert', 900).amount;
    expect(late).toBe(easy);
  });

  it('generates the replacement board BEFORE taking the coins', () => {
    // The original spent first, so a generation failure left the player
    // poorer and still on the dead board.
    expect(handler.indexOf('generateLevelBoard')).toBeGreaterThan(-1);
    expect(handler.indexOf('spendCoins')).toBeGreaterThan(handler.indexOf('generateLevelBoard'));
  });

  it('advances progression only after the charge succeeds', () => {
    expect(handler.indexOf('recordPuzzleComplete')).toBeGreaterThan(handler.indexOf('spendCoins'));
  });

  it('records one star, not zero', () => {
    // The chapter star gate is non-binding *because* every completed level
    // pays at least one star. Skipping at zero would let a player pay their
    // way below a gate and be clamped — pay to get stuck.
    expect(handler).toMatch(/recordPuzzleComplete\(currentLevel, 0, 1, false\)/);
  });

  it('refuses anything but a classic level at the frontier, once at a time', () => {
    expect(handler).toMatch(/if \(mode !== 'classic'\) return;/);
    expect(handler).toMatch(/if \(skipInFlight\.current\) return;/);
    expect(handler).toMatch(/if \(currentLevel !== player\.currentLevel\) return;/);
  });

  it('ships behind a flag that is off', () => {
    const rc = fs.readFileSync(path.join(ROOT, 'src/services/remoteConfig.ts'), 'utf8');
    expect(rc).toMatch(/levelSkipEnabled: false,/);
    const game = fs.readFileSync(path.join(ROOT, 'src/screens/GameScreen.tsx'), 'utf8');
    expect(game).toMatch(/getRemoteBoolean\('levelSkipEnabled'\)/);
  });

  it('does not charge twice', () => {
    // App.tsx does the charge; the GameScreen accept branch must not.
    const game = fs.readFileSync(path.join(ROOT, 'src/screens/GameScreen.tsx'), 'utf8');
    const branch = game
      .slice(game.indexOf("case 'level_skip':"), game.indexOf("case 'hint_rescue':"))
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))   // the comment says the word
      .join('\n');
    expect(branch).not.toMatch(/spendCoins\(/);
    expect(branch).toMatch(/onSkipLevel\(\)/);
  });
});
