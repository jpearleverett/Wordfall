/**
 * AN EVENT'S AUTHORED CLOCK MUST REACH THE GAME SCREEN.
 *
 * Speed Blitz authors a 60-second limit and the shorter clock is the whole
 * point of the event. The value survived the entire chain — events.ts ->
 * getEventPlayConfig -> App.tsx nav params -> GameScreen's `timeLimit` prop —
 * and was then dropped by one operand order:
 *
 *   modeConfig.rules.timerSeconds || timeLimit || 120
 *
 * timePressure's timerSeconds is 120, which is truthy, so `||` short-circuited
 * and the caller's 60 was never read. The prop was dead for every timer mode.
 * effectiveTimeLimit is the single source for the store's initial
 * timeRemaining, the mode-intro banner and TimerMovesBars' totalSeconds, so
 * all three symptoms followed from it: a 120s clock, a banner reading "2:00",
 * and the 30s/10s warnings firing 90s and 110s into a 60-second puzzle.
 *
 * This does not string-match the fix. It lifts the SHIPPED expression out of
 * GameScreen.tsx and evaluates it, so it survives reformatting and can only
 * pass if the real code is right.
 */
import * as fs from 'fs';
import * as path from 'path';
import { EVENT_TEMPLATES, getEventForWeek, getEventPlayConfig } from '../../data/events';
import { MODE_CONFIGS } from '../../constants';

const GAME_SCREEN = path.join(__dirname, '..', 'GameScreen.tsx');
const APP_TSX = path.join(__dirname, '..', '..', '..', 'App.tsx');

/** Evaluate GameScreen's real effectiveTimeLimit expression. */
function resolveEffectiveTimeLimit(mode: string, timeLimit: number): number {
  const src = fs.readFileSync(GAME_SCREEN, 'utf8');
  const m = src.match(/const effectiveTimeLimit = ([\s\S]*?);\n/);
  if (!m) throw new Error('effectiveTimeLimit expression not found in GameScreen.tsx');
  // eslint-disable-next-line no-new-func
  const fn = new Function('modeConfig', 'timeLimit', `return (${m[1]});`);
  return fn((MODE_CONFIGS as Record<string, unknown>)[mode], timeLimit) as number;
}

function eventOfType(type: string) {
  for (let w = 0; w < EVENT_TEMPLATES.length; w++) {
    const e = getEventForWeek(w);
    if (e.type === type) return e;
  }
  throw new Error(`no event template of type ${type}`);
}

describe("an event's authored clock reaches the game screen", () => {
  it('Speed Blitz authors 60 seconds', () => {
    expect(getEventPlayConfig(eventOfType('speedSolve')).timeLimitSeconds).toBe(60);
  });

  it('App routes the authored limit into the Game nav params', () => {
    const app = fs.readFileSync(APP_TSX, 'utf8');
    expect(app).toContain('timeLimit: eventPlay.timeLimitSeconds ?? modeConfig.rules.timerSeconds ?? 0');
  });

  it('GameScreen honours the caller-supplied limit over the mode default', () => {
    expect(resolveEffectiveTimeLimit('timePressure', 60)).toBe(60);
  });

  it('ordinary Time Pressure is still 120s', () => {
    expect(resolveEffectiveTimeLimit('timePressure', 120)).toBe(120);
    // Missing / zero prop still falls through to the mode default.
    expect(resolveEffectiveTimeLimit('timePressure', 0)).toBe(120);
  });

  it('non-timer modes stay at 0 regardless of the prop', () => {
    expect(resolveEffectiveTimeLimit('classic', 60)).toBe(0);
  });

  it("Next carries the current puzzle's clock forward", () => {
    // Without this the fix holds for the level launched from the event's Play
    // button and then reverts to the mode default from puzzle 2 onward.
    const app = fs.readFileSync(APP_TSX, 'utf8');
    expect(app).toContain('timeLimit: params.timeLimit || modeConfig.rules.timerSeconds || 0');
  });
});
