export interface StartableAnimation {
  start(): void;
  stop(): void;
}

export interface StoppableAnimation {
  stop(): void;
}

export interface RemovableResource {
  remove(): void;
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

export function clearAnimationResources<
  TAnimation extends StoppableAnimation,
  TListener extends RemovableResource,
  TOffset,
  TValue,
>(
  activeAnimations: Map<string, TAnimation>,
  listeners: Map<string, TListener>,
  liveOffsets: Map<string, TOffset>,
  animatedValues: Map<string, TValue>,
  resetValue?: (value: TValue) => void,
): void {
  activeAnimations.forEach(animation => animation.stop());
  activeAnimations.clear();
  listeners.forEach(listener => listener.remove());
  listeners.clear();
  liveOffsets.clear();
  if (resetValue) {
    animatedValues.forEach(resetValue);
  }
  animatedValues.clear();
}

export function releaseOwnedAnimation<
  TSequence,
  TListener extends RemovableResource,
  TOffset,
>(
  activeAnimations: Map<string, TSequence>,
  listeners: Map<string, TListener>,
  liveOffsets: Map<string, TOffset>,
  id: string,
  sequence: TSequence,
  finished: boolean,
): boolean {
  if (activeAnimations.get(id) !== sequence) return false;

  activeAnimations.delete(id);
  if (!finished) return false;

  listeners.get(id)?.remove();
  listeners.delete(id);
  liveOffsets.delete(id);
  return true;
}
