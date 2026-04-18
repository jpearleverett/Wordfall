/**
 * Tiny pub/sub so the four board-gen fallback sites in App.tsx can trigger
 * an inline banner instead of the intrusive system Alert.alert, without
 * having to thread state down through every screen wrapper.
 */

type Listener = () => void;

let subscribers = new Set<Listener>();

export function subscribeBoardGenNotice(listener: Listener): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function emitBoardGenNotice(): void {
  for (const listener of subscribers) {
    try {
      listener();
    } catch {
      // listeners must not throw; swallow for isolation
    }
  }
}
