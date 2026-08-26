/**
 * The word band must not change height mid-puzzle.
 *
 * It sits above a flex:1 grid area, so anything that re-wraps the chip panel
 * re-measures the grid and changes cellSize — one to three frames after the
 * word-clear commit, which is while the gravity cascade is still in its hold.
 * Grid re-targets a pitch change now rather than snapping every airborne tile
 * to its slot, but the cheapest fix is for the chips never to change size in
 * the first place. That is a numeric property, so it is pinned numerically.
 */
import * as fs from 'fs';
import * as path from 'path';
import { CHIP_BOX, chipBoxHeightDelta, chipBoxWidthDelta } from '../wordChipBox';

const SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../WordBank.tsx'),
  'utf8',
);

describe('word chip measured box', () => {
  test('an emphasized chip is exactly the same size as a resting one', () => {
    expect(chipBoxWidthDelta()).toBe(0);
    expect(chipBoxHeightDelta()).toBe(0);
  });

  test('the emphasis border is actually thicker (the state still reads)', () => {
    expect(CHIP_BOX.emphasis.borderWidth).toBeGreaterThan(
      CHIP_BOX.resting.borderWidth,
    );
  });

  test('both states are built from the shared box, not hand-written numbers', () => {
    expect(SOURCE).toContain('...CHIP_BOX.emphasis');
    expect(SOURCE).toContain('paddingHorizontal: CHIP_BOX.resting.paddingHorizontal');
    expect(SOURCE).toContain('borderWidth: CHIP_BOX.resting.borderWidth');
  });

  test('the found badge is always mounted, and only faded', () => {
    // Mounting it on the found transition grew the chip by the badge plus the
    // row gap — enough to push a chip onto a new line on many boards.
    expect(SOURCE).toContain('style={[styles.checkContainer, { opacity: foundAnim }]}');
    // The badge element itself is not behind a `found &&` guard; only its
    // contents are.
    const badgeSite = SOURCE.indexOf('styles.checkContainer, { opacity: foundAnim }');
    expect(badgeSite).toBeGreaterThan(-1);
    const preceding = SOURCE.slice(Math.max(0, badgeSite - 200), badgeSite);
    expect(preceding).not.toContain('wordPlacement.found &&');
  });

  test('the valid state does not swap font family', () => {
    // Inter and SpaceGrotesk have different glyph advances, so swapping them
    // re-measured the chip on the valid flash — 50ms before submit, right into
    // the cascade's setup frame.
    const validStyle = SOURCE.slice(
      SOURCE.indexOf('wordTextValid: {'),
      SOURCE.indexOf('checkContainer: {'),
    ).replace(/^\s*\/\/.*$/gm, '');
    expect(validStyle.length).toBeGreaterThan(0);
    expect(validStyle).toContain('color:');
    expect(validStyle).not.toContain('fontFamily');
  });
});
