import * as fs from 'fs';
import * as path from 'path';
import {
  clearFallResources,
  clearTimeoutHandles,
  releaseOwnedFall,
  startAnimationWithCleanup,
} from '../utils/animationLifecycle';

const game = fs.readFileSync(
  path.resolve(__dirname, '../screens/GameScreen.tsx'),
  'utf8',
);
const flashes = fs.readFileSync(
  path.resolve(__dirname, '../screens/game/GameFlashes.tsx'),
  'utf8',
);

describe('animation resource lifecycle', () => {
  test('effect cleanup stops the animation it started', () => {
    const animation = {
      start: jest.fn(),
      stop: jest.fn(),
    };

    const cleanup = startAnimationWithCleanup(animation);
    expect(animation.start).toHaveBeenCalledTimes(1);

    cleanup();
    expect(animation.stop).toHaveBeenCalledTimes(1);
  });

  test('bulk cleanup stops animations and clears every fall map', () => {
    const firstAnimation = { stop: jest.fn() };
    const secondAnimation = { stop: jest.fn() };
    const active = new Map([
      ['A', firstAnimation],
      ['B', secondAnimation],
    ]);
    const runs = new Map<string, object>([
      ['A', { from: { x: 0, y: 10 } }],
      ['B', { from: { x: 0, y: 20 } }],
    ]);
    const animatedValues = new Map<string, object>([
      ['A', {}],
      ['B', {}],
    ]);
    const reset = jest.fn();

    clearFallResources(active, runs, animatedValues, reset);

    expect(firstAnimation.stop).toHaveBeenCalledTimes(1);
    expect(secondAnimation.stop).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(2);
    expect(active.size).toBe(0);
    expect(runs.size).toBe(0);
    expect(animatedValues.size).toBe(0);
  });

  test('timeout cleanup prevents delayed work after unmount', () => {
    jest.useFakeTimers();
    try {
      const callback = jest.fn();
      const handles = new Set<ReturnType<typeof setTimeout>>();
      handles.add(
        setTimeout(callback, 22) as unknown as ReturnType<typeof setTimeout>,
      );

      clearTimeoutHandles(handles);
      jest.advanceTimersByTime(22);

      expect(callback).not.toHaveBeenCalled();
      expect(handles.size).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('fall sequence ownership release', () => {
  test.each([
    ['finished predecessor', true],
    ['interrupted predecessor', false],
  ])('%s cannot release successor resources', (_label, finished) => {
    const predecessor = {};
    const successor = {};
    const active = new Map([['A', successor]]);
    const runs = new Map([['A', { from: { x: 0, y: 30 } }]]);

    const shouldDecrement = releaseOwnedFall(active, runs, 'A', predecessor, finished);

    expect(shouldDecrement).toBe(false);
    expect(active.get('A')).toBe(successor);
    expect(runs.get('A')).toEqual({ from: { x: 0, y: 30 } });
  });

  test('an interrupted owner releases only sequence ownership for its successor', () => {
    const sequence = {};
    const active = new Map([['A', sequence]]);
    const runs = new Map([['A', { from: { x: 0, y: 30 } }]]);

    const shouldDecrement = releaseOwnedFall(active, runs, 'A', sequence, false);

    expect(shouldDecrement).toBe(false);
    expect(active.size).toBe(0);
    // The run descriptor survives an interruption on purpose: the successor
    // run samples it to find out where the tile actually is mid-air.
    expect(runs.get('A')).toEqual({ from: { x: 0, y: 30 } });
  });

  test('a finished owner drops its run descriptor before accounting', () => {
    const sequence = {};
    const active = new Map([['A', sequence]]);
    const runs = new Map([['A', { from: { x: 0, y: 30 } }]]);

    const shouldDecrement = releaseOwnedFall(active, runs, 'A', sequence, true);

    expect(shouldDecrement).toBe(true);
    expect(active.size).toBe(0);
    expect(runs.size).toBe(0);
  });
});

describe('dead animation path wiring', () => {
  test('undo and retry leave tile layout animation exclusively to Grid', () => {
    expect(game).not.toContain('LayoutAnimation');
  });

  test('unreachable invalid-word animation state and rendering are removed', () => {
    expect(game).not.toContain('showInvalidFlashAnim');
    expect(game).not.toContain('showInvalidFlash');
    expect(game).not.toContain('invalidFlashAnim');
    expect(flashes).not.toContain('showInvalidFlash');
    expect(flashes).not.toContain('invalidFlashAnim');
    expect(flashes).not.toContain('invalidFlashOverlay');
  });
});
