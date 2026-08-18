/**
 * Events must PLAY their rules. The Play button used to hardcode classic
 * and ignore event.rules entirely; getEventPlayConfig is the mapping layer
 * onto the shipped mode machinery. These pins keep every authored event
 * type either mapped to a real mode or deliberately classic.
 */
import { EVENT_TEMPLATES, getEventForWeek, getEventPlayConfig } from '../events';

function eventOfType(type: string) {
  for (let w = 0; w < EVENT_TEMPLATES.length; w++) {
    const e = getEventForWeek(w);
    if (e.type === type) return e;
  }
  throw new Error(`no template of type ${type}`);
}

describe('getEventPlayConfig', () => {
  it('null event → classic', () => {
    expect(getEventPlayConfig(null)).toEqual({ mode: 'classic' });
  });

  it('speedSolve → timePressure with the authored time limit', () => {
    const cfg = getEventPlayConfig(eventOfType('speedSolve'));
    expect(cfg.mode).toBe('timePressure');
    expect(cfg.timeLimitSeconds).toBe(60);
  });

  it('perfectClear → perfectSolve', () => {
    expect(getEventPlayConfig(eventOfType('perfectClear')).mode).toBe('perfectSolve');
  });

  it('expertGauntlet → perfectSolve at expert difficulty', () => {
    const cfg = getEventPlayConfig(eventOfType('expertGauntlet'));
    expect(cfg.mode).toBe('perfectSolve');
    expect(cfg.difficulty).toBe('expert');
  });

  it('gravityFlipChampionship → gravityFlip', () => {
    expect(getEventPlayConfig(eventOfType('gravityFlipChampionship')).mode).toBe('gravityFlip');
  });

  it('themeWeek → classic with a non-empty curated word list', () => {
    const cfg = getEventPlayConfig(eventOfType('themeWeek'));
    expect(cfg.mode).toBe('classic');
    expect(cfg.themeWords && cfg.themeWords.length).toBeGreaterThanOrEqual(24);
  });

  it('every template resolves to a real GameMode without throwing', () => {
    for (let w = 0; w < EVENT_TEMPLATES.length; w++) {
      const cfg = getEventPlayConfig(getEventForWeek(w));
      expect(typeof cfg.mode).toBe('string');
      expect(cfg.mode.length).toBeGreaterThan(0);
    }
  });
});
