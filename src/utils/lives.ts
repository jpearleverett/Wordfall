/**
 * Lives refill math, shared between EconomyContext (writer) and economyStore
 * (read-side selectors). Pure — no React, no AsyncStorage. Lifted out of
 * EconomyContext so the store can compute current lives without creating an
 * import cycle.
 */
import { LIVES } from '../constants';

export interface LivesData {
  current: number;
  lastRefillTime: number;
}

export function computeRefilledLives(livesData: LivesData): LivesData {
  const now = Date.now();
  const elapsed = now - livesData.lastRefillTime;
  const refillMs = LIVES.refillMinutes * 60 * 1000;
  const livesEarned = Math.floor(elapsed / refillMs);

  if (livesEarned <= 0 || livesData.current >= LIVES.max) {
    return livesData;
  }

  const newCurrent = Math.min(livesData.current + livesEarned, LIVES.max);
  const newLastRefill =
    newCurrent >= LIVES.max
      ? now
      : livesData.lastRefillTime + livesEarned * refillMs;

  return { current: newCurrent, lastRefillTime: newLastRefill };
}
