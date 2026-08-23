import * as fs from 'fs';
import * as path from 'path';
import { applyGravityInDirection } from '../../../engine/gravity';
import { Grid } from '../../../types';
import * as gridGeometryModule from '../gridGeometry';
import {
  computeGridTransition,
  computeGridGeometry,
  computeGridMetrics,
  decideGridTransitionUpdate,
  hitTestGridGeometry,
} from '../gridGeometry';

const cell = (id: string) => ({ id, letter: id });
const source: Grid = [
  [cell('A'), null, cell('C')],
  [null, cell('B'), null],
  [null, null, null],
];
const GRID_SOURCE = fs.readFileSync(path.resolve(__dirname, '../../Grid.tsx'), 'utf8');

test.each([
  ['down', 2, 0],
  ['up', 0, 0],
] as const)('%s gravity renders and hits the engine row', (direction, row, col) => {
  const grid = applyGravityInDirection(source, direction);
  const geometry = computeGridGeometry(grid, 40, 4);
  const bound = geometry.byCellId.get('A')!;
  expect(bound.row).toBe(row);
  expect(bound.y).toBe(row * 44);
  expect(hitTestGridGeometry(geometry, bound.x + 20, bound.y + 20, false))
    .toEqual({ row, col });
});

test.each([
  ['left', 1],
  ['right', 2],
] as const)('%s gravity preserves the engine row and horizontal slot', (direction, expectedCol) => {
  const grid = applyGravityInDirection(source, direction);
  const geometry = computeGridGeometry(grid, 40, 4);
  const bound = geometry.byCellId.get('C')!;
  expect(bound.row).toBe(0);
  expect(bound.col).toBe(expectedCol);
  expect(bound.x).toBe(2 + expectedCol * 44);
  expect(hitTestGridGeometry(geometry, bound.x + 20, bound.y + 20, false))
    .toEqual({ row: 0, col: expectedCol });
});

test('fixed holes are not collapsed into another visual row', () => {
  const geometry = computeGridGeometry(source, 40, 4);
  expect(geometry.byCellId.get('B')?.y).toBe(44);
  expect(hitTestGridGeometry(geometry, 2 + 44, 20, false)).toBeNull();
});

test('wildcard mode returns the addressed empty slot', () => {
  const geometry = computeGridGeometry(source, 40, 4);
  expect(hitTestGridGeometry(geometry, 2 + 44 + 20, 20, true))
    .toEqual({ row: 0, col: 1 });
});

test('invalid dimensions return stable empty metrics without NaN', () => {
  expect(computeGridMetrics(0, 0, 375, 400, 4, 58)).toEqual({
    cellSize: 0,
    stride: 0,
    gridWidth: 0,
    gridHeight: 0,
  });
});

test('canonical centers exactly match the rendered Grid coordinate space', () => {
  const geometry = computeGridGeometry([[cell('A')]], 40, 4);
  const bound = geometry.byCellId.get('A')!;
  const frameInset = /width:\s*gridWidth \+ 2,\s*height:\s*gridHeight \+ 2/.test(GRID_SOURCE)
    ? 1
    : 0;
  const padsBothAxes = /padding:\s*CELL_GAP \/ 2/.test(GRID_SOURCE);
  const hasHorizontalPadding = /paddingHorizontal:\s*CELL_GAP \/ 2/.test(GRID_SOURCE);
  const renderedPaddingX = padsBothAxes || hasHorizontalPadding ? 2 : 0;
  const renderedPaddingY = padsBothAxes ? 2 : 0;
  const renderedCenter = {
    x: frameInset + renderedPaddingX + 22,
    y: frameInset + renderedPaddingY + 22,
  };

  expect({ x: bound.x + bound.w / 2, y: bound.y + bound.h / 2 })
    .toEqual(renderedCenter);
});

test('hit boundaries split rendered row and column gaps at slot midlines', () => {
  const geometry = computeGridGeometry([
    [cell('A'), cell('B')],
    [cell('C'), cell('D')],
  ], 40, 4);

  expect(hitTestGridGeometry(geometry, 24, 0, false)).toEqual({ row: 0, col: 0 });
  expect(hitTestGridGeometry(geometry, 24, 43.999, false)).toEqual({ row: 0, col: 0 });
  expect(hitTestGridGeometry(geometry, 24, 44, false)).toEqual({ row: 1, col: 0 });
  expect(hitTestGridGeometry(geometry, 24, 87.999, false)).toEqual({ row: 1, col: 0 });
  expect(hitTestGridGeometry(geometry, 24, 88, false)).toBeNull();

  expect(hitTestGridGeometry(geometry, 1.999, 22, false)).toBeNull();
  expect(hitTestGridGeometry(geometry, 2, 22, false)).toEqual({ row: 0, col: 0 });
  expect(hitTestGridGeometry(geometry, 45.999, 22, false)).toEqual({ row: 0, col: 0 });
  expect(hitTestGridGeometry(geometry, 46, 22, false)).toEqual({ row: 0, col: 1 });
  expect(hitTestGridGeometry(geometry, 89.999, 22, false)).toEqual({ row: 0, col: 1 });
  expect(hitTestGridGeometry(geometry, 90, 22, false)).toBeNull();
});

test('sparse rendered slots remain empty except during wildcard placement', () => {
  const geometry = computeGridGeometry(source, 40, 4);
  expect(hitTestGridGeometry(geometry, 68, 22, false)).toBeNull();
  expect(hitTestGridGeometry(geometry, 68, 22, true)).toEqual({ row: 0, col: 1 });
  expect(hitTestGridGeometry(geometry, 68, 66, false)).toEqual({ row: 1, col: 1 });
});

test('just-cleared null slots retain the same canonical particle center', () => {
  type SlotCenter = (
    geometry: ReturnType<typeof computeGridGeometry>,
    row: number,
    col: number,
  ) => { x: number; y: number } | null;
  const gridSlotCenter = (
    gridGeometryModule as unknown as { gridSlotCenter?: SlotCenter }
  ).gridSlotCenter;
  expect(gridSlotCenter).toEqual(expect.any(Function));
  if (!gridSlotCenter) return;

  const occupied = computeGridGeometry([
    [cell('A'), cell('B')],
    [cell('C'), cell('D')],
  ], 40, 4);
  const cleared = computeGridGeometry([
    [cell('A'), null],
    [cell('C'), cell('D')],
  ], 40, 4);
  expect(cleared.byPosition.has('0,1')).toBe(false);
  expect(gridSlotCenter(cleared, 0, 1)).toEqual(gridSlotCenter(occupied, 0, 1));
});

test.each([
  ['negative cell size', -1, 4],
  ['NaN cell size', Number.NaN, 4],
  ['infinite cell size', Number.POSITIVE_INFINITY, 4],
  ['negative gap', 40, -1],
  ['NaN gap', 40, Number.NaN],
  ['infinite gap', 40, Number.POSITIVE_INFINITY],
])('%s returns stable empty geometry', (_label, cellSize, gap) => {
  const geometry = computeGridGeometry(source, cellSize, gap);
  expect(geometry).toEqual({
    rows: 0,
    cols: 0,
    stride: 0,
    padding: 0,
    width: 0,
    height: 0,
    bounds: [],
    byCellId: new Map(),
    byPosition: new Map(),
  });
});

describe('grid transition diff', () => {
  test('inverse transform paints a moved tile at its previous visual position', () => {
    const previous = new Map([
      ['A', { cellId: 'A', row: 0, col: 0, x: 2, y: 0, w: 44, h: 44 }],
    ]);
    const next = new Map([
      ['A', { cellId: 'A', row: 2, col: 0, x: 2, y: 88, w: 44, h: 44 }],
    ]);

    const diff = computeGridTransition(previous, next, new Map());

    expect(diff.falls).toEqual([{ id: 'A', dx: 0, dy: -88, col: 0 }]);
    expect(next.get('A')!.y + diff.falls[0].dy).toBe(previous.get('A')!.y);
  });

  test('successor fall starts from an interrupted tile current visual offset', () => {
    const previous = new Map([
      ['A', { cellId: 'A', row: 0, col: 0, x: 2, y: 0, w: 44, h: 44 }],
    ]);
    const next = new Map([
      ['A', { cellId: 'A', row: 2, col: 0, x: 2, y: 88, w: 44, h: 44 }],
    ]);
    const live = new Map([['A', { x: 0, y: 30 }]]);

    expect(computeGridTransition(previous, next, live).falls[0].dy).toBe(-58);
  });

  test('removed cells become stable ghost entries, not destination tiles', () => {
    const previous = new Map([
      ['A', { cellId: 'A', row: 0, col: 0, x: 2, y: 0, w: 44, h: 44 }],
    ]);

    const diff = computeGridTransition(previous, new Map(), new Map());

    expect(diff.falls).toHaveLength(0);
    expect(diff.ghosts[0]).toMatchObject({ id: 'A', x: 2, y: 0 });
  });

  test('removed falling cells ghost from their current visual offset', () => {
    const previous = new Map([
      ['A', { cellId: 'A', row: 0, col: 0, x: 2, y: 0, w: 44, h: 44 }],
    ]);
    const live = new Map([['A', { x: 5, y: 30 }]]);

    const diff = computeGridTransition(previous, new Map(), live);

    expect(diff.ghosts).toEqual([{ id: 'A', x: 7, y: 30, col: 0 }]);
  });

  test('horizontal movement uses the same ID-based inverse transform', () => {
    const previous = new Map([
      ['A', { cellId: 'A', row: 0, col: 2, x: 90, y: 0, w: 44, h: 44 }],
    ]);
    const next = new Map([
      ['A', { cellId: 'A', row: 0, col: 0, x: 2, y: 0, w: 44, h: 44 }],
    ]);

    expect(computeGridTransition(previous, next, new Map()).falls).toEqual([
      { id: 'A', dx: 88, dy: 0, col: 0 },
    ]);
  });
});

describe('grid transition update decision', () => {
  const grid = [[cell('A')]];
  const state = {
    grid,
    cellSize: 40,
    rows: 1,
    cols: 1,
  };

  test('resets when geometry changes without a new grid object', () => {
    expect(decideGridTransitionUpdate(state, {
      ...state,
      cellSize: 41,
    })).toBe('reset');
  });

  test('transitions a new grid object in unchanged geometry', () => {
    expect(decideGridTransitionUpdate(state, {
      ...state,
      grid: [[cell('A')]],
    })).toBe('transition');
  });

  test('does nothing when grid identity and geometry are unchanged', () => {
    expect(decideGridTransitionUpdate(state, state)).toBe('none');
  });
});
