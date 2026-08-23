import { applyGravityInDirection } from '../../../engine/gravity';
import { Grid } from '../../../types';
import {
  computeGridGeometry,
  computeGridMetrics,
  hitTestGridGeometry,
} from '../gridGeometry';

const cell = (id: string) => ({ id, letter: id });
const source: Grid = [
  [cell('A'), null, cell('C')],
  [null, cell('B'), null],
  [null, null, null],
];

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
