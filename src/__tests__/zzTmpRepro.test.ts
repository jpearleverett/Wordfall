import { applyGravityInDirection, removeCells } from '../engine/gravity';
import { Cell, Grid } from '../types';
import { computeGridGeometry } from '../components/game/gridGeometry';
import { EMPTY_CASCADE_STATE, type CascadeFrame, planCascade } from '../components/game/cascadePlan';
import { clearFallResources } from '../utils/animationLifecycle';

let nextId = 0;
const cell = (l: string): Cell => ({ id: `c${nextId++}`, letter: l } as Cell);
function board(rows: number, cols: number): Grid {
  nextId = 0;
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => cell('A')));
}
function frameOf(grid: Grid, cellSize = 50): CascadeFrame {
  const g = computeGridGeometry(grid, cellSize, 4);
  return { grid, bounds: g.byCellId, cellSize, rows: grid.length, cols: grid[0]?.length ?? 0, stride: g.stride, padding: g.padding };
}

function simulate(reduceMotion: boolean) {
  const rows = 7, cols = 8;
  let grid = board(rows, cols);
  const map = new Map<string, object>();
  const active = new Map<string, { stop(): void }>();
  const runs = new Map<string, unknown>();
  let prev: CascadeFrame | null = null;
  const creationsPerClear: number[] = [];

  const render = (g: Grid) => {
    const frame = frameOf(g);
    const { decision, plan } = planCascade(prev, frame, { ...EMPTY_CASCADE_STATE, runs }, 0, reduceMotion);
    if (decision !== 'none') {
      if (plan.kind === 'snap') clearFallResources(active, runs, map);
      else if (plan.kind === 'animate') {
        for (const f of plan.falls) if (!map.has(f.id)) map.set(f.id, { x: f.current.x, y: f.current.y });
      }
      prev = frame;
    }
    let created = 0;
    for (const row of frame.grid) for (const c of row) {
      if (c && !map.has(c.id)) { map.set(c.id, {}); created++; }
    }
    return created;
  };

  render(grid); // initialize
  // 12 word clears of 4 tiles each from the bottom rows
  for (let w = 0; w < 12; w++) {
    const positions: Array<[number, number]> = [];
    for (let k = 0; k < 4; k++) positions.push([rows - 1, (w * 4 + k) % cols]);
    const alive = positions.filter(([r, c]) => grid[r]?.[c]);
    if (alive.length === 0) continue;
    grid = applyGravityInDirection(removeCells(grid, alive.map(([row, col]) => ({ row, col }))), 'down');
    creationsPerClear.push(render(grid));
  }
  return creationsPerClear;
}

it('repro', () => {
  const rm = simulate(true);
  const normal = simulate(false);
  // eslint-disable-next-line no-console
  console.log('reduceMotion creations per clear:', rm, 'total', rm.reduce((a, b) => a + b, 0));
  // eslint-disable-next-line no-console
  console.log('normal    creations per clear:', normal, 'total', normal.reduce((a, b) => a + b, 0));
});
