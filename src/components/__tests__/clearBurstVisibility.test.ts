/**
 * Nothing may stand still on top of the word the player just cleared.
 *
 * `delayedTiming` bakes a stagger into a native easing by pinning its driver
 * at exactly 0 for the lead-in. That is a faithful substitute for a delayed
 * start ONLY when the animation is invisible at 0. For anything already
 * visible there — a fade-out, a white stamp, a ghost standing in for a tile
 * that was just removed — it inverts the intent: instead of arriving late it
 * arrives immediately and then freezes, leaving a motionless copy of the
 * cleared letters sitting at their old position while the board falls past.
 *
 * That is what "a brief ghost flicker of the word in its original position"
 * was. These pin it shut.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (p: string) =>
  fs.readFileSync(path.resolve(__dirname, p), 'utf8');

const GAME_SCREEN = read('../../screens/GameScreen.tsx');
const GRID = read('../Grid.tsx');

/** The body of a top-level function component, comments stripped. */
function componentBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const after = source.slice(start);
  // A top-level function ends at the first closing brace in column zero.
  const end = after.indexOf('\n}');
  expect(end).toBeGreaterThan(-1);
  return after
    .slice(0, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/** Every `outputRange: [...]` in a body, as arrays of raw entries. */
function outputRanges(body: string): string[][] {
  return [...body.matchAll(/outputRange:\s*\[([^\]]*)\]/g)].map(m =>
    m[1].split(',').map(v => v.trim()),
  );
}

function opacityStartsHidden(body: string): boolean {
  const opacity = body.slice(body.indexOf('opacity:'));
  const range = outputRanges(opacity)[0];
  return range !== undefined && Number(range[0]) === 0;
}

describe('staggered clear-burst layers', () => {
  test.each([
    ['WordClearParticle', GAME_SCREEN],
    ['StarSpark', GAME_SCREEN],
  ])('%s uses a baked lead-in AND is invisible at zero', (name, source) => {
    const body = componentBody(source, name);
    expect(body).toContain('delayedTiming');
    expect(opacityStartsHidden(body)).toBe(true);
  });

  test('GhostTile is visible at zero, so it must NOT hold', () => {
    const body = componentBody(GRID, 'GhostTile');
    // Visible at rest — the precondition does not hold for it.
    expect(opacityStartsHidden(body)).toBe(false);
    // ...so it starts on frame one. The stagger is in the DURATION.
    expect(body).not.toContain('delayedTiming');
    expect(body).not.toContain('Animated.delay');
    expect(body).not.toMatch(/\bdelay:/);
  });

  test('the ghost begins losing opacity immediately, with no plateau', () => {
    // A [0, 0.3] -> [1, 0.95] shelf keeps it ~fully opaque for the first
    // ~50-75ms, which is the entire window before the first tile moves: the
    // board falls out from under a solid copy of the word.
    const body = componentBody(GRID, 'GhostTile');
    const opacity = body.slice(body.indexOf('opacity:'));
    const range = outputRanges(opacity)[0];
    expect(range).toBeDefined();
    const first = Number(range[0]);
    const second = Number(range[1]);
    expect(first).toBe(1);
    // Meaningfully translucent by the second stop, not a 5% shelf.
    expect(second).toBeLessThanOrEqual(0.85);
  });

  test('the per-cell white clear flash is gone, not merely un-staggered', () => {
    // It landed a commit after the ghosts and covered the letters at 65%
    // white, then decayed fast enough to let them re-emerge — an on/off/on of
    // the word at its original position.
    expect(GAME_SCREEN).not.toContain('CellClearFlash');
    expect(GAME_SCREEN).not.toContain('pushCellFlashes');
  });

  test('the ghost sweep is expressed as duration, not as a hold', () => {
    const body = componentBody(GRID, 'GhostTile');
    expect(body).toMatch(/duration:[\s\S]*?GHOST_STAGGER_MS/);
  });

  test('delayedTiming documents the precondition it depends on', () => {
    const helper = read('../../utils/motionTiming.ts');
    expect(helper).toContain('INVISIBLE at progress zero');
  });
});

describe('screen entry does not resize the board', () => {
  const MOTION = read('../../navigation/motionOptions.ts');

  test('the push transition never scales the card', () => {
    // Scaling the card scales the board inside it, so the puzzle appears at
    // the wrong size and grows into place as the transition settles — most
    // visible when board generation is fast and the grid paints early.
    const interpolator = MOTION.slice(
      MOTION.indexOf('function cardSpringFadeInterpolator('),
      MOTION.indexOf('const commonStackOptions'),
    );
    expect(interpolator.length).toBeGreaterThan(0);
    expect(interpolator).not.toContain('scale');
    expect(interpolator).toContain('translateX');
    expect(interpolator).toContain('opacity');
  });

  test('the grid area is seeded from the last measurement, not from zero', () => {
    // Unmeasured, the grid falls back to a width-derived cell size — the
    // largest it can ever be — and paints one oversized frame per entry.
    expect(GAME_SCREEN).toContain('let lastMeasuredGridArea');
    expect(GAME_SCREEN).toContain('useState(() => lastMeasuredGridArea)');
  });
});

describe('the ghost is a continuation of the tile it replaces', () => {
  // A cleared tile is replaced on the very next frame by a ghost standing at
  // the same pixels. Every value the two disagree on is a hard one-frame
  // change on every letter of the word at once, which reads as the word
  // blinking and being redrawn rather than as a dissolve. These are the ones
  // that were actually wrong: a 7% scale shrink, a font-family swap (the
  // rounded-display flag defaults ON, so the tile was Baloo and the ghost was
  // SpaceGrotesk), an 8% glyph shrink, and every material layer vanishing.
  const CELL = read('../LetterCell.tsx');
  const ghost = componentBody(GRID, 'GhostTile');

  test('both build their face from the shared definition', () => {
    for (const token of [
      'TILE_BODY_VALID',
      'TILE_HIGHLIGHT_VALID',
      'TILE_GRADIENT_START',
      'TILE_GRADIENT_END',
      'TILE_LETTER_SIZE_FACTOR',
      'TILE_LETTER_SPACING',
      'TILE_RADIUS_FACTOR',
      'TILE_BEVEL',
      'TILE_SPECULAR',
      'TILE_BOTTOM_SHADE',
      'tileInsetRadius',
    ]) {
      expect(CELL).toContain(token);
      expect(GRID).toContain(token);
    }
  });

  test('the ghost starts at the scale a selected tile rests at', () => {
    expect(CELL).toContain('withSpring(TILE_SELECTED_REST_SCALE');
    expect(ghost).toContain('TILE_SELECTED_REST_SCALE');
    // It swells FROM that rest scale rather than snapping to 1 first.
    expect(ghost).toContain('outputRange: [restScale');
  });

  test('the ghost honours the same letter font as the tile', () => {
    // roundedDisplayFontEnabled defaults ON, so a hard-coded family here is a
    // font swap on the substitution frame, not a hypothetical.
    expect(ghost).toContain('useRoundedFont');
    expect(ghost).toContain('FONTS.displayRounded');
  });

  test('the ghost carries the tile material, not a flat swatch', () => {
    // Highlight, bevel, specular, bottom band and the 2px rim all used to
    // vanish on the swap frame — eight simultaneous discontinuities.
    expect(ghost).toContain('TILE_HIGHLIGHT_VALID');
    expect(ghost).toContain('TILE_BEVEL.width');
    expect(ghost).toContain('TILE_SPECULAR.raised');
    expect(ghost).toContain('TILE_BOTTOM_SHADE.color');
    expect(ghost).toContain('borderWidth: 2');
  });

  test('the ghost follows the colourblind palette the tile was wearing', () => {
    expect(ghost).toContain('getColorblindTileRamps');
  });
});
