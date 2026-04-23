import { useSyncExternalStore } from 'react';

/**
 * Post-mount font-load readiness singleton.
 *
 * The app's main `useFonts()` call in `App.tsx` hard-gates the entire render
 * on the Hermes promise resolving — a stalled fetch there would block play.
 * So the rounded display font (Baloo 2 ExtraBold) is instead loaded
 * post-mount via `Font.loadAsync`, and components subscribe to this
 * singleton to know when it's safe to swap `fontFamily`. If the font never
 * resolves (offline first launch), consumers keep using the already-loaded
 * `SpaceGrotesk_700Bold` fallback — no crash, no blocking UI.
 */

let ready = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function markRoundedFontReady(): void {
  if (ready) return;
  ready = true;
  emit();
}

export function isRoundedFontReady(): boolean {
  return ready;
}

export function useRoundedFontReady(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => ready,
    () => false,
  );
}
