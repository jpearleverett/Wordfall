import { generateBoard } from '../boardGenerator';
import { isDeadEnd, isDeadEndNoGravity, isDeadEndShrinkingBoard, isDeadEndGravityFlip, findWordInGrid } from '../solver';
import { removeCellsAndApplyGravity } from '../gravity';
import type { BoardConfig } from '../../types';

const HEAVY: BoardConfig = { rows: 8, cols: 7, wordCount: 8, minWordLength: 3, maxWordLength: 6, difficulty: 'expert' };

function pct(a: number[], p: number) { const s=[...a].sort((x,y)=>x-y); return s[Math.min(s.length-1, Math.floor(s.length*p))]; }

jest.setTimeout(600000);

test('audit solver cost', () => {
  const res: Record<string, number[]> = { classic: [], noGravity: [], shrinking: [], flip: [] };
  for (let seed = 1; seed <= 60; seed++) {
    const b = generateBoard(HEAVY, seed);
    if (!b) continue;
    // simulate a few clears (classic gravity) to get mid-game states
    let grid = b.grid;
    let remaining: string[] = b.words.map((w:any)=>typeof w==="string"?w:w.word);
    for (let step = 0; step < 4 && remaining.length > 2; step++) {
      const w = remaining[0];
      const occ = findWordInGrid(grid, w, 1);
      if (occ.length === 0) break;
      grid = removeCellsAndApplyGravity(grid, occ[0]);
      remaining = remaining.slice(1);
      let t = Date.now(); isDeadEnd(grid, remaining); res.classic.push(Date.now()-t);
      t = Date.now(); isDeadEndNoGravity(grid, remaining); res.noGravity.push(Date.now()-t);
      t = Date.now(); isDeadEndShrinkingBoard(grid, remaining, 2); res.shrinking.push(Date.now()-t);
      t = Date.now(); isDeadEndGravityFlip(grid, remaining, 'down'); res.flip.push(Date.now()-t);
    }
  }
  for (const k of Object.keys(res)) {
    const a = res[k];
    console.log(k, 'n=', a.length, 'p50', pct(a,0.5), 'p95', pct(a,0.95), 'max', Math.max(...a));
  }
});
