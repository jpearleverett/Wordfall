/**
 * Feel-polish tests — lock the Remote-Config defaults + pure math used by
 * the multi-tile bloom particle effects in GameScreen.
 *
 * The spawnTileBloom state-queue flow is exercised via manual + Maestro
 * smoke — these unit tests pin the tunable defaults and canonical grid
 * geometry so a later layout refactor can't silently throw particles
 * outside the grid.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getRemoteBoolean, getRemoteNumber } from '../services/remoteConfig';
import { CELL_GAP, MAX_GRID_WIDTH, SCREEN_WIDTH } from '../constants';
import {
  CellBound,
  computeGridGeometry,
  computeGridMetrics,
  GRID_FRAME_ALLOWANCE,
} from '../components/game/gridGeometry';
import { Grid } from '../types';

const GAME_SCREEN_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../screens/GameScreen.tsx'),
  'utf8',
);

function makeGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      id: `${row}-${col}`,
      letter: 'A',
    })),
  );
}

function center(bound: CellBound): { x: number; y: number } {
  return {
    x: bound.x + bound.w / 2,
    y: bound.y + bound.h / 2,
  };
}

describe('feel-polish — Remote Config defaults', () => {
  it('ships tileBloomEnabled=true so word-finds spawn per-tile particles', () => {
    expect(getRemoteBoolean('tileBloomEnabled')).toBe(true);
  });

  it('ships tileBloomParticlesPerTile=2 as a conservative default', () => {
    expect(getRemoteNumber('tileBloomParticlesPerTile')).toBe(2);
  });
});

describe('feel-polish — shared gameplay contracts', () => {
  it('uses the centralized fail-closed reduce-motion hook', () => {
    expect(GAME_SCREEN_SOURCE).toContain(
      "import { useReduceMotion } from '../hooks/useReduceMotion';",
    );
    expect(GAME_SCREEN_SOURCE).toContain('const reduceMotion = useReduceMotion();');
    expect(GAME_SCREEN_SOURCE).not.toContain('AccessibilityInfo.isReduceMotionEnabled()');
    expect(GAME_SCREEN_SOURCE).not.toContain(
      "AccessibilityInfo.addEventListener('reduceMotionChanged'",
    );
  });

  it('routes particle origins through the canonical null-slot helper', () => {
    expect(GAME_SCREEN_SOURCE).toContain('gridSlotCenter(gridGeometry, row, col)');
  });
});

describe('feel-polish — authoritative grid geometry', () => {
  const grid = makeGrid(5, 5);
  const metrics = computeGridMetrics(
    5,
    5,
    MAX_GRID_WIDTH,
    400,
    CELL_GAP,
    GRID_FRAME_ALLOWANCE,
  );
  const geometry = computeGridGeometry(grid, metrics.cellSize, CELL_GAP);

  it('returns distinct centers for distinct engine slots', () => {
    const topLeft = center(geometry.byPosition.get('0,0')!);
    const bottomRight = center(geometry.byPosition.get('4,4')!);
    expect(bottomRight.x).toBeGreaterThan(topLeft.x);
    expect(bottomRight.y).toBeGreaterThan(topLeft.y);
  });

  it('centers the geometry symmetrically in the measured grid area', () => {
    const gridLeft = (SCREEN_WIDTH - geometry.width) / 2;
    const topLeft = center(geometry.byPosition.get('0,0')!);
    const topRight = center(geometry.byPosition.get('0,4')!);
    const midX = gridLeft + (topLeft.x + topRight.x) / 2;
    expect(Math.abs(midX - SCREEN_WIDTH / 2)).toBeLessThanOrEqual(CELL_GAP);
  });

  it('keeps every cell center inside the measured grid area', () => {
    const sixGrid = makeGrid(6, 6);
    const sixMetrics = computeGridMetrics(
      6,
      6,
      MAX_GRID_WIDTH,
      400,
      CELL_GAP,
      GRID_FRAME_ALLOWANCE,
    );
    const sixGeometry = computeGridGeometry(sixGrid, sixMetrics.cellSize, CELL_GAP);
    const gridLeft = (SCREEN_WIDTH - sixGeometry.width) / 2;
    for (const bound of sixGeometry.bounds) {
      const { x } = center(bound);
      expect(gridLeft + x).toBeGreaterThan(0);
      expect(gridLeft + x).toBeLessThan(SCREEN_WIDTH);
    }
  });
});

describe('feel-polish — multi-tile bloom capping', () => {
  // Mirrors GameScreen's MAX_BLOOM_PARTICLES (36 → 48 in burst v2,
  // round-3 blind review: bursts still read as "sparse particles").
  const MAX_BLOOM_PARTICLES = 48;

  function computeTileCount(wordLen: number, perTile: number): number {
    const maxTiles = Math.max(1, Math.floor(MAX_BLOOM_PARTICLES / perTile));
    return Math.min(wordLen, maxTiles);
  }

  it('lets a 10-letter word with perTile=2 bloom every tile (<=48 particles)', () => {
    expect(computeTileCount(10, 2)).toBe(10); // 10*2=20 <= 48
  });

  it('caps a 30-letter degenerate word with perTile=2 at 24 tiles', () => {
    // Should never exceed MAX_BLOOM_PARTICLES / perTile = 24.
    expect(computeTileCount(30, 2)).toBe(24);
  });

  it('honors perTile=1 all the way up to 48 cells', () => {
    expect(computeTileCount(60, 1)).toBe(48);
  });

  it('never drops below 1 tile', () => {
    expect(computeTileCount(1, 100)).toBe(1);
  });
});
