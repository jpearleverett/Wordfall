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

  test.each([
    ['CellClearFlash', () => GAME_SCREEN],
    ['GhostTile', () => GRID],
  ])('%s is visible at zero, so it must NOT hold', (name, source) => {
    const body = componentBody(source(), name);
    // Visible at rest — the precondition does not hold for these.
    expect(opacityStartsHidden(body)).toBe(false);
    // ...so they start on frame one. A stagger, if any, is in the DURATION.
    expect(body).not.toContain('delayedTiming');
    expect(body).not.toContain('Animated.delay');
    expect(body).not.toMatch(/\bdelay:/);
  });

  test('the ghost sweep is expressed as duration, not as a hold', () => {
    const body = componentBody(GRID, 'GhostTile');
    expect(body).toMatch(/duration:[\s\S]*?GHOST_STAGGER_MS/);
  });

  test('the cell flash no longer carries a per-tile delay through the queue', () => {
    // It is stamped on every cleared cell at once and fades immediately.
    expect(GAME_SCREEN).toContain('<CellClearFlash key={f.id} x={f.x} y={f.y} size={f.size} />');
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
