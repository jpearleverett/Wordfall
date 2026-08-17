/**
 * Difficulty-curve profile printer (diagnostic, not an assertion suite
 * beyond a few sanity invariants).
 *
 * Run `CURVE_VERBOSE=1 npx jest curveProfile` to dump the exact board a
 * player meets at each level. Useful when tuning early-game pacing, where
 * the breather remap (every 5th level plays the config from 4 levels
 * earlier) interacts with the phase bands in ways that are hard to read
 * off the source.
 */
const mockBooleans = new Map<string, boolean>();
jest.mock('../services/remoteConfig', () => ({
  getRemoteBoolean: (key: string): boolean =>
    mockBooleans.has(key) ? (mockBooleans.get(key) as boolean) : true,
}));

import { getLevelConfig, isBreatherLevel, isSpikeLevel } from '../constants';

const VERBOSE = !!process.env.CURVE_VERBOSE;

describe('difficulty curve profile', () => {
  it('prints the first 40 levels', () => {
    const lines: string[] = [];
    for (let level = 1; level <= 40; level++) {
      const c = getLevelConfig(level);
      const tag = isBreatherLevel(level) ? 'BREATHER' : isSpikeLevel(level) ? 'SPIKE' : '';
      lines.push(
        `L${String(level).padStart(2)} ${c.rows}x${c.cols} ` +
          `words=${c.wordCount} len=${c.minWordLength}-${c.maxWordLength} ` +
          `${c.difficulty.padEnd(6)} ${tag}`,
      );
    }
    if (VERBOSE) {
      // eslint-disable-next-line no-console
      console.log('\n' + lines.join('\n'));
    }
    expect(lines).toHaveLength(40);
  });

  it('a new player never sees the same board shape more than 3 levels running', () => {
    // Identical consecutive boards read as "no progress" — the single most
    // common early-churn complaint in puzzle games.
    let runLength = 1;
    let worstRun = 1;
    let worstAt = 1;
    let prevKey = '';
    for (let level = 1; level <= 20; level++) {
      const c = getLevelConfig(level);
      const key = `${c.rows}x${c.cols}w${c.wordCount}len${c.minWordLength}-${c.maxWordLength}`;
      if (key === prevKey) {
        runLength++;
        if (runLength > worstRun) {
          worstRun = runLength;
          worstAt = level;
        }
      } else {
        runLength = 1;
      }
      prevKey = key;
    }
    if (VERBOSE) {
      // eslint-disable-next-line no-console
      console.log(`\nlongest identical run in L1-20: ${worstRun} (ending L${worstAt})`);
    }
    expect(worstRun).toBeLessThanOrEqual(3);
  });

  it('grid SHAPE changes at least every 3 levels through L14', () => {
    // The full-config run guard above passes even when six straight levels
    // share the same rows×cols (a word-count bump resets the run key). But
    // the SHAPE is what the player's eye reads as "a new board" — L5-L10
    // once shipped six 6x5 grids in a row and passed. Pin shape variety
    // separately through the first-session window.
    let runLength = 1;
    let worstRun = 1;
    let prevShape = '';
    for (let level = 1; level <= 14; level++) {
      const c = getLevelConfig(level);
      const shape = `${c.rows}x${c.cols}`;
      if (shape === prevShape) {
        runLength++;
        worstRun = Math.max(worstRun, runLength);
      } else {
        runLength = 1;
      }
      prevShape = shape;
    }
    expect(worstRun).toBeLessThanOrEqual(2);
  });
});
