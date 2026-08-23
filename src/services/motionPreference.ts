import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

export interface MotionSnapshot {
  reduceMotion: boolean;
  resolved: boolean;
}

export interface MotionAccessibilityAdapter {
  isReduceMotionEnabled(): Promise<boolean>;
  addReduceMotionListener(listener: (enabled: boolean) => void): () => void;
}

export interface MotionPreferenceStore {
  getSnapshot(): MotionSnapshot;
  subscribe(listener: () => void): () => void;
}

const INITIAL: MotionSnapshot = { reduceMotion: true, resolved: false };

export function createMotionPreferenceStore(
  adapter: MotionAccessibilityAdapter,
): MotionPreferenceStore {
  let snapshot = INITIAL;
  let initialized = false;
  let generation = 0;
  let removeNativeListener: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const publish = (next: MotionSnapshot) => {
    if (
      snapshot.reduceMotion === next.reduceMotion &&
      snapshot.resolved === next.resolved
    ) {
      return;
    }
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const initialize = () => {
    if (initialized) return;
    initialized = true;
    const currentGeneration = ++generation;
    removeNativeListener = adapter.addReduceMotionListener((reduceMotion) => {
      if (currentGeneration === generation) {
        publish({ reduceMotion, resolved: true });
      }
    });
    adapter
      .isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (currentGeneration === generation) {
          publish({ reduceMotion, resolved: true });
        }
      })
      .catch(() => {
        if (currentGeneration === generation) {
          publish({ reduceMotion: true, resolved: true });
        }
      });
  };

  const dispose = () => {
    generation += 1;
    initialized = false;
    removeNativeListener?.();
    removeNativeListener = null;
    snapshot = INITIAL;
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      initialize();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) dispose();
      };
    },
  };
}

const motionPreferenceStore = createMotionPreferenceStore({
  isReduceMotionEnabled: () => AccessibilityInfo.isReduceMotionEnabled(),
  addReduceMotionListener: (listener) => {
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      listener,
    );
    return () => subscription.remove();
  },
});

export function useMotionPreference(): MotionSnapshot {
  return useSyncExternalStore(
    motionPreferenceStore.subscribe,
    motionPreferenceStore.getSnapshot,
    motionPreferenceStore.getSnapshot,
  );
}
