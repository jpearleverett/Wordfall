import { rollBonusTile } from '../bonusTile';
import { generateBoard } from '../../engine/boardGenerator';
import { BoardConfig } from '../../types';

const CONFIG: BoardConfig = {
  rows: 6,
  cols: 6,
  wordCount: 4,
  minWordLength: 3,
  maxWordLength: 5,
  difficulty: 'easy',
};

describe('rollBonusTile', () => {
  it('is deterministic for the same board', () => {
    const board = generateBoard(CONFIG, 4242);
    const a = rollBonusTile(board);
    const b = rollBonusTile(board);
    expect(a).toEqual(b);
  });

  it('hits roughly the configured rate across many boards', () => {
    let hits = 0;
    const total = 60;
    for (let seed = 1; seed <= total; seed++) {
      const board = generateBoard(CONFIG, seed * 9973);
      if (rollBonusTile(board)) hits++;
    }
    // ~35% target; allow a generous band for the small sample.
    expect(hits).toBeGreaterThanOrEqual(total * 0.15);
    expect(hits).toBeLessThanOrEqual(total * 0.55);
  });

  it('bonus cell belongs to the bonus word and exists on the grid', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const board = generateBoard(CONFIG, seed * 7717);
      const tile = rollBonusTile(board);
      if (!tile) continue;
      const wp = board.words.find(w => w.word === tile.word);
      expect(wp).toBeDefined();
      const ids = wp!.positions.map(p => board.grid[p.row][p.col]?.id);
      expect(ids).toContain(tile.cellId);
    }
  });

  it('payout is one of the three tiers', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const board = generateBoard(CONFIG, seed * 31337);
      const tile = rollBonusTile(board);
      if (tile) expect([10, 25, 50]).toContain(tile.coins);
    }
  });
});
