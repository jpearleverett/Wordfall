/**
 * Colorblind-mode preference as a tiny external store.
 *
 * Every mounted LetterCell (up to ~64 during play) plus WordBank used to
 * subscribe to the full SettingsContext just to read `colorblindMode` —
 * so ANY settings write (volume slider, haptics toggle, parental-control
 * spend recording, hydration `loaded` flip) re-rendered the whole board
 * through their memos. Mirroring the motionPreference pattern: the value
 * lives here, SettingsContext publishes into it on change, and gameplay
 * components subscribe to exactly this one field.
 *
 * SettingsContext remains the source of truth for persistence and the
 * Settings UI; this store is a read-optimized mirror for hot components.
 */
import { useSyncExternalStore } from 'react';
import type { ColorblindMode } from '../contexts/SettingsContext';

let mode: ColorblindMode = 'off';
const listeners = new Set<() => void>();

/** Called by SettingsContext whenever colorblindMode changes (incl. hydration). */
export function publishColorblindMode(next: ColorblindMode): void {
  if (next === mode) return;
  mode = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): ColorblindMode => mode;

export function useColorblindMode(): ColorblindMode {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
