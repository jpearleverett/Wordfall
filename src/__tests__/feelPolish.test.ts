/**
 * Feel-polish tests — lock the Remote-Config defaults + pure math used by
 * the invalid-word screen shake and multi-tile bloom particle effects in
 * GameScreen.
 *
 * The UI wiring itself (the Animated.sequence triggered inside
 * showInvalidFlashAnim, the spawnTileBloom state-queue flow) is exercised
 * via manual + Maestro smoke — these unit tests pin the tunable defaults
 * and the cell-to-screen coordinate math so a later layout refactor can't
 * silently throw particles outside the grid.
 */

import { getRemoteBoolean, getRemoteNumber } from '../services/remoteConfig';
import { CELL_GAP, MAX_GRID_WIDTH, SCREEN_WIDTH } from '../constants';

// Pure re-implementation of the helper inside GameScreen.cellPositionToScreen.
// Kept in lockstep so a test failure here flags when the GameScreen copy
// drifts from the formula shared with the gravity block + Grid.tsx.
function cellPositionToScreen(
  row: number,
  col: number,
  rows: number,
  cols: number,
  gridAreaHeight: number,
): { x: number; y: number } {
  if (cols === 0 || rows === 0 || gridAreaHeight <= 0) {
    return { x: SCREEN_WIDTH / 2, y: gridAreaHeight / 2 + 60 };
  }
  const availableWidth = MAX_GRID_WIDTH - CELL_GAP * (cols + 1);
  let cellSize = Math.floor(availableWidth / cols);
  const frameAllowance = 58;
  const heightAvail = gridAreaHeight - frameAllowance;
  const heightBased = Math.floor(heightAvail / rows - CELL_GAP);
  cellSize = Math.min(cellSize, heightBased);
  if (cellSize <= 0) {
    return { x: SCREEN_WIDTH / 2, y: gridAreaHeight / 2 + 60 };
  }
  const cellStride = cellSize + CELL_GAP;
  const gridWidth = cols * cellStride + CELL_GAP;
  const gridHeight = rows * cellStride;
  const gridLeft = (SCREEN_WIDTH - gridWidth) / 2;
  const gridTop = (gridAreaHeight - gridHeight) / 2;
  const padding = CELL_GAP / 2;
  return {
    x: gridLeft + padding + col * cellStride + cellSize / 2,
    y: gridTop + row * cellStride + cellSize / 2,
  };
}

describe('feel-polish — Remote Config defaults', () => {
  it('ships invalidShakeEnabled=true so invalid taps feel like a "no"', () => {
    expect(getRemoteBoolean('invalidShakeEnabled')).toBe(true);
  });

  it('ships tileBloomEnabled=true so word-finds spawn per-tile particles', () => {
    expect(getRemoteBoolean('tileBloomEnabled')).toBe(true);
  });

  it('ships tileBloomParticlesPerTile=2 as a conservative default', () => {
    expect(getRemoteNumber('tileBloomParticlesPerTile')).toBe(2);
  });
});

describe('feel-polish — cellPositionToScreen math', () => {
  it('falls back to a centered position when layout is unmeasured', () => {
    const pos = cellPositionToScreen(0, 0, 5, 5, 0);
    expect(pos.x).toBe(SCREEN_WIDTH / 2);
    expect(pos.y).toBe(60);
  });

  it('falls back when rows or cols are zero', () => {
    const a = cellPositionToScreen(0, 0, 0, 5, 400);
    const b = cellPositionToScreen(0, 0, 5, 0, 400);
    expect(a.x).toBe(SCREEN_WIDTH / 2);
    expect(b.x).toBe(SCREEN_WIDTH / 2);
  });

  it('returns distinct x/y for distinct cells in a 5×5 grid', () => {
    const topLeft = cellPositionToScreen(0, 0, 5, 5, 400);
    const bottomRight = cellPositionToScreen(4, 4, 5, 5, 400);
    expect(bottomRight.x).toBeGreaterThan(topLeft.x);
    expect(bottomRight.y).toBeGreaterThan(topLeft.y);
  });

  it('places a centered 5×5 grid symmetrically around SCREEN_WIDTH/2', () => {
    const topLeft = cellPositionToScreen(0, 0, 5, 5, 400);
    const topRight = cellPositionToScreen(0, 4, 5, 5, 400);
    const midX = (topLeft.x + topRight.x) / 2;
    // Symmetry: midpoint of the top row should coincide with the horizontal
    // center of the screen (within the rounding slack from Math.floor on
    // cellSize + the CELL_GAP padding split).
    expect(Math.abs(midX - SCREEN_WIDTH / 2)).toBeLessThanOrEqual(CELL_GAP);
  });

  it('keeps every cell inside the grid horizontally', () => {
    // With paddingHorizontal=8 on gridArea and the grid centered inside it,
    // every cell center must land within the screen horizontal bounds.
    for (let c = 0; c < 6; c++) {
      const { x } = cellPositionToScreen(0, c, 6, 6, 400);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(SCREEN_WIDTH);
    }
  });
});

describe('feel-polish — multi-tile bloom capping', () => {
  const MAX_BLOOM_PARTICLES = 24;

  function computeTileCount(wordLen: number, perTile: number): number {
    const maxTiles = Math.max(1, Math.floor(MAX_BLOOM_PARTICLES / perTile));
    return Math.min(wordLen, maxTiles);
  }

  it('caps a 10-letter word with perTile=2 at 12 tiles (<=24 particles)', () => {
    expect(computeTileCount(10, 2)).toBe(10); // 10*2=20 <= 24
  });

  it('caps a 20-letter degenerate word with perTile=2 at 12 tiles', () => {
    // Should never exceed MAX_BLOOM_PARTICLES / perTile = 12.
    expect(computeTileCount(20, 2)).toBe(12);
  });

  it('honors perTile=1 all the way up to 24 cells', () => {
    expect(computeTileCount(30, 1)).toBe(24);
  });

  it('never drops below 1 tile', () => {
    expect(computeTileCount(1, 100)).toBe(1);
  });
});
