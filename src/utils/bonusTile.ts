import { Board } from '../types';

export interface BonusTile {
  /** The hidden word whose find pays the bonus. */
  word: string;
  /** Cell carrying the coin badge — ID travels with the tile through gravity. */
  cellId: string;
  /** Coin payout: mostly 10, sometimes 25, rare 50 jackpot. */
  coins: number;
}

/**
 * Roll the bonus coin tile for a board (in-puzzle variable reward).
 * Pure hash of the board's word list, so a given board always rolls the
 * same tile — ~35% of boards get one. Returns null when the board misses
 * the roll or the chosen cell can't be resolved.
 */
export function rollBonusTile(board: Board): BonusTile | null {
  const wordsKey = board.words.map(w => w.word).join(',');
  let h = 0;
  for (let i = 0; i < wordsKey.length; i++) h = (h * 31 + wordsKey.charCodeAt(i)) | 0;
  h = Math.abs(h);
  if (h % 100 >= 35) return null;
  const wp = board.words[h % board.words.length];
  if (!wp || wp.positions.length === 0) return null;
  const pos = wp.positions[Math.floor(wp.positions.length / 2)];
  const cellId = board.grid[pos.row]?.[pos.col]?.id ?? null;
  if (!cellId) return null;
  const coins = h % 10 === 0 ? 50 : h % 3 === 0 ? 25 : 10;
  return { word: wp.word, cellId, coins };
}
