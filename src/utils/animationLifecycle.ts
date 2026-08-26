export interface StartableAnimation {
  start(): void;
  stop(): void;
}

export interface StoppableAnimation {
  stop(): void;
}

export function startAnimationWithCleanup(
  animation: StartableAnimation,
): () => void {
  animation.start();
  return () => animation.stop();
}

export function clearTimeoutHandles(
  handles: Set<ReturnType<typeof setTimeout>>,
): void {
  handles.forEach(clearTimeout);
  handles.clear();
}

/**
 * Tear down a whole fall run set: stop every in-flight sequence, forget every
 * run descriptor, and (optionally) snap the animated values back to rest
 * before dropping them.
 *
 * `runs` replaces what used to be a pair of maps holding native-value
 * listeners and the offsets they streamed back. The fall is now sampled
 * analytically from its run descriptor, so there is nothing to unsubscribe.
 */
export function clearFallResources<
  TAnimation extends StoppableAnimation,
  TRun,
  TValue,
>(
  activeAnimations: Map<string, TAnimation>,
  runs: Map<string, TRun>,
  animatedValues: Map<string, TValue>,
  resetValue?: (value: TValue) => void,
): void {
  activeAnimations.forEach(animation => animation.stop());
  activeAnimations.clear();
  runs.clear();
  if (resetValue) {
    animatedValues.forEach(resetValue);
  }
  animatedValues.clear();
}

/**
 * Decide whether a finished sequence still owns its cell's shared resources.
 *
 * Returns false when the sequence has been superseded (an interrupting clear
 * re-seeded the value and registered a new sequence) — the successor owns
 * every cleanup decision from then on, including a late `finished: true`
 * callback from the predecessor. Returns false for an interrupted run too, so
 * only a run that both owns the cell AND completed counts toward the settle
 * accounting.
 */
export function releaseOwnedFall<TSequence, TRun>(
  activeAnimations: Map<string, TSequence>,
  runs: Map<string, TRun>,
  id: string,
  sequence: TSequence,
  finished: boolean,
): boolean {
  if (activeAnimations.get(id) !== sequence) return false;

  activeAnimations.delete(id);
  if (!finished) return false;

  runs.delete(id);
  return true;
}
