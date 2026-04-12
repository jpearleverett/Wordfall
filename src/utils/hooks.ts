import { useCallback, useRef, useLayoutEffect } from 'react';

/**
 * useStableCallback — returns a callback whose identity NEVER changes across
 * renders, but which always calls the LATEST version of the provided
 * function. This is the "upstream RFC shape" polyfill for React's proposed
 * `useEvent` / `useEffectEvent` hook.
 *
 * WHY: React.memo + useCallback alone is not enough for callbacks passed to
 * memoized children. A useCallback that depends on frequently-changing state
 * (e.g. `state.score`, `economy.hintTokens`) produces a new function identity
 * on every render, which breaks the memo compare downstream.
 *
 * With useStableCallback, the callback reference is stable, so memo compares
 * succeed. The child always invokes the latest logic because we swap the
 * internal ref via a synchronous layout effect before the child's subtree
 * commits.
 *
 * USAGE:
 *   const stableOnTap = useStableCallback(() => doThingWith(latestState));
 *   <MemoedChild onTap={stableOnTap} />
 *
 * WARNING: Do NOT call the returned callback during render — it reads from
 * the ref, which is only safe in effects and event handlers. Calling it at
 * render time will give you a stale value on first render.
 */
export function useStableCallback<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
): (...args: TArgs) => TReturn {
  const ref = useRef<(...args: TArgs) => TReturn>(fn);

  // Update the ref synchronously before React commits the current render.
  // Using useLayoutEffect (not useEffect) guarantees the ref is fresh before
  // any child effects or paint, so event handlers see the latest closure.
  useLayoutEffect(() => {
    ref.current = fn;
  });

  // Stable wrapper — identity never changes, so React.memo compare succeeds.
  return useCallback((...args: TArgs) => {
    return ref.current(...args);
  }, []);
}
