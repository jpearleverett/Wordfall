import * as fs from 'fs';
import * as path from 'path';
import {
  clearAnimationResources,
  clearTimeoutHandles,
  releaseOwnedAnimation,
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

  test('bulk cleanup stops animations, removes listeners, and clears maps', () => {
    const firstAnimation = { stop: jest.fn() };
    const secondAnimation = { stop: jest.fn() };
    const firstListener = { remove: jest.fn() };
    const secondListener = { remove: jest.fn() };
    const active = new Map([
      ['A', firstAnimation],
      ['B', secondAnimation],
    ]);
    const listeners = new Map([
      ['A', firstListener],
      ['B', secondListener],
    ]);
    const liveOffsets = new Map([
      ['A', { x: 0, y: 10 }],
      ['B', { x: 0, y: 20 }],
    ]);
    const animatedValues = new Map<string, object>([
      ['A', {}],
      ['B', {}],
    ]);

    clearAnimationResources(active, listeners, liveOffsets, animatedValues);

    expect(firstAnimation.stop).toHaveBeenCalledTimes(1);
    expect(secondAnimation.stop).toHaveBeenCalledTimes(1);
    expect(firstListener.remove).toHaveBeenCalledTimes(1);
    expect(secondListener.remove).toHaveBeenCalledTimes(1);
    expect(active.size).toBe(0);
    expect(listeners.size).toBe(0);
    expect(liveOffsets.size).toBe(0);
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
    const listener = { remove: jest.fn() };
    const active = new Map([['A', successor]]);
    const listeners = new Map([['A', listener]]);
    const liveOffsets = new Map([['A', { x: 0, y: 30 }]]);

    const shouldDecrement = releaseOwnedAnimation(
      active,
      listeners,
      liveOffsets,
      'A',
      predecessor,
      finished,
    );

    expect(shouldDecrement).toBe(false);
    expect(active.get('A')).toBe(successor);
    expect(listeners.get('A')).toBe(listener);
    expect(liveOffsets.get('A')).toEqual({ x: 0, y: 30 });
    expect(listener.remove).not.toHaveBeenCalled();
  });

  test('an interrupted owner releases only sequence ownership for its successor', () => {
    const sequence = {};
    const listener = { remove: jest.fn() };
    const active = new Map([['A', sequence]]);
    const listeners = new Map([['A', listener]]);
    const liveOffsets = new Map([['A', { x: 0, y: 30 }]]);

    const shouldDecrement = releaseOwnedAnimation(
      active,
      listeners,
      liveOffsets,
      'A',
      sequence,
      false,
    );

    expect(shouldDecrement).toBe(false);
    expect(active.size).toBe(0);
    expect(listeners.get('A')).toBe(listener);
    expect(liveOffsets.get('A')).toEqual({ x: 0, y: 30 });
    expect(listener.remove).not.toHaveBeenCalled();
  });

  test('a finished owner removes its listener and live offset before accounting', () => {
    const sequence = {};
    const listener = { remove: jest.fn() };
    const active = new Map([['A', sequence]]);
    const listeners = new Map([['A', listener]]);
    const liveOffsets = new Map([['A', { x: 0, y: 30 }]]);

    const shouldDecrement = releaseOwnedAnimation(
      active,
      listeners,
      liveOffsets,
      'A',
      sequence,
      true,
    );

    expect(shouldDecrement).toBe(true);
    expect(active.size).toBe(0);
    expect(listeners.size).toBe(0);
    expect(liveOffsets.size).toBe(0);
    expect(listener.remove).toHaveBeenCalledTimes(1);
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
